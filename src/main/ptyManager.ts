import * as pty from 'node-pty';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { BrowserWindow } from 'electron';
import { PtyCreateArgs, PtyResizeArgs } from '../shared/types';
import { logger } from './logger';
import { detectShells, whichSync } from './shellDetector';
import { pathManager } from './shell-experience/pathManager';
import { getCurrentShellExpSettings } from './shell-experience/shellExpHandlers';
import { shellPool } from './shellPool';

interface PtySession {
  id: string;
  ptyProcess: pty.IPty;
  pid: number;
  unackedBytes: number;
  isPaused: boolean;
  batchBuffer: string[];
  batchSize: number;
  batchTimer: NodeJS.Timeout | null;
}

const HIGH_WATERMARK = 512 * 1024; // 512 KB
const LOW_WATERMARK = 128 * 1024;  // 128 KB
const BATCH_INTERVAL_MS = 6;
const BATCH_SIZE_THRESHOLD = 64 * 1024; // 64 KB

export class PtyManager {
  private sessions: Map<string, PtySession> = new Map();
  private nextId = 1;

  public create(args: PtyCreateArgs, window: BrowserWindow): { id: string; pid?: number } {
    const id = `pty-${this.nextId++}`;
    const detected = detectShells();

    if (detected.length === 0) {
      const err = 'No verified shell executable found on system.';
      logger.error(`PTY [${id}] spawn failed: ${err}`);
      throw new Error(err);
    }

    // Check warm shell pool hit
    if (!args.shellPath && (!args.shellArgs || args.shellArgs.length === 0)) {
      const warm = shellPool.acquire();
      if (warm) {
        logger.info(`[PTY] Warm shell pool hit for [${id}] (PID ${warm.pid})`);
        const session: PtySession = {
          id: warm.id,
          ptyProcess: warm.ptyProcess,
          pid: warm.pid,
          unackedBytes: 0,
          isPaused: false,
          batchBuffer: [],
          batchSize: 0,
          batchTimer: null,
        };

        this.sessions.set(warm.id, session);

        if (args.cols && args.rows) {
          try { warm.ptyProcess.resize(args.cols, args.rows); } catch {}
        }

        if (args.cwd && fs.existsSync(args.cwd)) {
          warm.ptyProcess.write(`Set-Location '${args.cwd.replace(/'/g, "''")}'\r`);
        }

        warm.ptyProcess.onData((data: string) => {
          this.handlePtyData(session, data, window);
        });

        warm.ptyProcess.onExit(({ exitCode }) => {
          logger.info(`PTY [${warm.id}] exited with code ${exitCode}`);
          this.flushBatch(session, window);
          if (!window.isDestroyed()) {
            window.webContents.send('pty:exit', { id: warm.id, exitCode });
          }
          this.cleanupSession(warm.id);
        });

        return { id: warm.id, pid: warm.pid };
      }
    }

    let shellPath = '';
    let shellArgs: string[] = args.shellArgs || [];
    let requestedName = args.shellPath || 'Requested Shell';
    let triggeredFallback = false;

    // Resolve requested shell
    if (args.shellPath) {
      if (fs.existsSync(args.shellPath)) {
        shellPath = path.resolve(args.shellPath);
      } else {
        const resolvedWhich = whichSync(args.shellPath);
        if (resolvedWhich && fs.existsSync(resolvedWhich)) {
          shellPath = resolvedWhich;
        }
      }
    }

    // Fallback if requested shell is missing or not provided
    if (!shellPath && detected[0]) {
      const defaultShell = detected[0];
      shellPath = defaultShell.path;
      if (defaultShell.args && shellArgs.length === 0) {
        shellArgs = defaultShell.args;
      }
      if (args.shellPath) {
        triggeredFallback = true;
      }
    }

    if (!shellPath) {
      throw new Error(`Failed to resolve valid shell path on system.`);
    }

    // Validate CWD
    const userHome = process.env.USERPROFILE || process.env.HOME || process.cwd();
    let cwd = args.cwd && fs.existsSync(args.cwd) ? args.cwd : userHome;
    if (!fs.existsSync(cwd)) {
      cwd = process.cwd();
    }

    // Check if spawning PowerShell with Shell Experience active (App-scoped)
    const isPowerShell = shellPath.toLowerCase().includes('pwsh') || shellPath.toLowerCase().includes('powershell');
    let shellExpEnvExtra: { [key: string]: string } = {};

    if (isPowerShell) {
      try {
        const settings = getCurrentShellExpSettings();

        if (settings.mode === 'app-scoped') {
          const runtimeProfile = pathManager.getRuntimeProfilePath().replace(/'/g, "''");
          shellArgs = ['-NoLogo', '-NoProfile', '-NoExit', '-Command', `. '${runtimeProfile}'`];
          const activeThemeFile = path.join(pathManager.getThemesDir(), `${settings.activeTheme}.omp.json`);
          const binDir = pathManager.getBinDir();
          shellExpEnvExtra = {
            POSH_THEME: activeThemeFile,
            PATH: `${binDir};${process.env.PATH || ''}`,
          };
        }
      } catch (e) {
        // Fall back to normal spawn
      }
    }

    // Sanitize Environment
    const env = {
      ...process.env,
      COLORTERM: 'truecolor',
      TERM: 'xterm-256color',
      ...shellExpEnvExtra,
    } as { [key: string]: string };

    logger.info(
      `Spawning PTY [${id}]: shell='${shellPath}', args=${JSON.stringify(shellArgs)}, cwd='${cwd}', cols=${args.cols}, rows=${args.rows}`
    );

    try {
      const ptyProcess = pty.spawn(shellPath, shellArgs, {
        name: 'xterm-256color',
        cols: args.cols || 80,
        rows: args.rows || 24,
        cwd,
        env,
        useConpty: process.platform === 'win32',
      });

      const session: PtySession = {
        id,
        ptyProcess,
        pid: ptyProcess.pid,
        unackedBytes: 0,
        isPaused: false,
        batchBuffer: [],
        batchSize: 0,
        batchTimer: null,
      };

      this.sessions.set(id, session);

      // Send fallback toast notification if fallback was triggered
      if (triggeredFallback && !window.isDestroyed()) {
        const activeShellName =
          detected.find((s) => s.path === shellPath)?.name || shellPath || 'Fallback Shell';
        window.webContents.send('pty:fallback', {
          id,
          requested: requestedName,
          actual: activeShellName,
          message: `'${requestedName}' not found. Defaulting to ${activeShellName}.`,
        });
      }

      ptyProcess.onData((data: string) => {
        this.handlePtyData(session, data, window);
      });

      ptyProcess.onExit(({ exitCode }) => {
        logger.info(`PTY [${id}] exited with code ${exitCode}`);
        this.flushBatch(session, window);
        if (!window.isDestroyed()) {
          window.webContents.send('pty:exit', { id, exitCode });
        }
        this.cleanupSession(id);
      });

      return { id, pid: ptyProcess.pid };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error(
        `Failed to spawn PTY [${id}] with shell='${shellPath}', args=${JSON.stringify(shellArgs)}, cwd='${cwd}':`,
        errorMessage
      );
      throw new Error(`Failed to spawn shell '${shellPath}': ${errorMessage}`);
    }
  }

  private handlePtyData(session: PtySession, chunk: string, window: BrowserWindow): void {
    session.batchBuffer.push(chunk);
    session.batchSize += chunk.length;
    session.unackedBytes += chunk.length;

    // Backpressure flow control
    if (!session.isPaused && session.unackedBytes > HIGH_WATERMARK) {
      session.isPaused = true;
      try {
        session.ptyProcess.pause();
        logger.warn(`PTY [${session.id}] paused due to backpressure (${session.unackedBytes} bytes unacked)`);
      } catch (err) {
        logger.error(`Failed to pause PTY [${session.id}]`, err);
      }
    }

    if (session.batchSize >= BATCH_SIZE_THRESHOLD) {
      this.flushBatch(session, window);
    } else if (!session.batchTimer) {
      session.batchTimer = setTimeout(() => {
        this.flushBatch(session, window);
      }, BATCH_INTERVAL_MS);
    }
  }

  public getActivePids(): number[] {
    const pids: number[] = [];
    for (const s of this.sessions.values()) {
      if (s.pid) pids.push(s.pid);
    }
    return pids;
  }

  private flushBatch(session: PtySession, window: BrowserWindow): void {
    if (session.batchTimer) {
      clearTimeout(session.batchTimer);
      session.batchTimer = null;
    }
    if (session.batchBuffer.length === 0) return;

    const data = session.batchBuffer.join('');
    session.batchBuffer = [];
    session.batchSize = 0;

    if (!window.isDestroyed()) {
      window.webContents.send('pty:data', { id: session.id, data });
    }
  }

  public handleAck(id: string, length: number): void {
    const session = this.sessions.get(id);
    if (!session) return;

    session.unackedBytes = Math.max(0, session.unackedBytes - length);

    if (session.isPaused && session.unackedBytes < LOW_WATERMARK) {
      session.isPaused = false;
      try {
        session.ptyProcess.resume();
        logger.info(`PTY [${id}] resumed (${session.unackedBytes} bytes unacked)`);
      } catch (err) {
        logger.error(`Failed to resume PTY [${id}]`, err);
      }
    }
  }

  public write(id: string, data: string): void {
    const session = this.sessions.get(id);
    if (session) {
      try {
        session.ptyProcess.write(data);
      } catch (err) {
        logger.error(`Error writing to PTY [${id}]`, err);
      }
    }
  }

  public resize(args: PtyResizeArgs): void {
    const session = this.sessions.get(args.id);
    if (session && args.cols > 0 && args.rows > 0) {
      try {
        session.ptyProcess.resize(args.cols, args.rows);
      } catch (err) {
        logger.error(`Error resizing PTY [${args.id}] to ${args.cols}x${args.rows}:`, err);
      }
    }
  }

  public kill(id: string): void {
    const session = this.sessions.get(id);
    if (!session) return;

    logger.info(`Killing PTY session [${id}] PID ${session.pid}`);
    this.killProcessTree(session.pid);
    this.cleanupSession(id);
  }

  public killAll(): void {
    logger.info(`Killing all PTY sessions (${this.sessions.size} active)`);
    shellPool.drain();
    for (const [id, session] of this.sessions.entries()) {
      this.killProcessTree(session.pid);
      this.cleanupSession(id);
    }
  }

  private killProcessTree(pid: number): void {
    if (!pid) return;

    if (process.platform === 'win32') {
      exec(`taskkill /F /T /PID ${pid}`, (err) => {
        if (err) {
          logger.warn(`Taskkill warning for PID ${pid}: ${err.message}`);
        }
      });
    } else {
      try {
        process.kill(-pid, 'SIGKILL');
      } catch {
        try {
          process.kill(pid, 'SIGKILL');
        } catch {
          // ignore
        }
      }
    }
  }

  private cleanupSession(id: string): void {
    const session = this.sessions.get(id);
    if (!session) return;

    if (session.batchTimer) {
      clearTimeout(session.batchTimer);
    }
    this.sessions.delete(id);
  }
}

export const ptyManager = new PtyManager();
