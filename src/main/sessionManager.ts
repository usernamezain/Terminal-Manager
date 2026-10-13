import * as pty from 'node-pty';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { BrowserWindow, webContents } from 'electron';
import { PtyCreateArgs, PtyResizeArgs, SessionInfo } from '../shared/types';
import { logger } from './logger';
import { detectShells, whichSync } from './shellDetector';
import { pathManager } from './shell-experience/pathManager';
import { getCurrentShellExpSettings } from './shell-experience/shellExpHandlers';
import { shellPool } from './shellPool';
import { profilesStore } from './profilesStore';
import { resolveLaunchCwd } from './cliHandler';
import { windowManager } from './windowManager';
import { logHop } from './launchDebugger';

export class OutputRingBuffer {
  private chunks: string[] = [];
  private totalChars: number = 0;
  private readonly maxChars: number;

  constructor(maxChars: number = 1.5 * 1024 * 1024) {
    this.maxChars = maxChars;
  }

  public write(data: string): void {
    if (!data) return;
    this.chunks.push(data);
    this.totalChars += data.length;

    while (this.totalChars > this.maxChars && this.chunks.length > 1) {
      const removed = this.chunks.shift();
      if (removed) {
        this.totalChars -= removed.length;
      }
    }
  }

  public getAll(): string {
    return this.chunks.join('');
  }

  public clear(): void {
    this.chunks = [];
    this.totalChars = 0;
  }
}

export interface TerminalSession {
  id: string;
  ptyProcess: pty.IPty;
  pid: number;
  profileId?: string;
  title: string;
  cwd: string;
  attachedWindowId: number | null;
  attachedWebContentsId: number | null;
  ringBuffer: OutputRingBuffer;
  unackedBytes: number;
  isPaused: boolean;
  batchBuffer: string[];
  batchSize: number;
  batchTimer: NodeJS.Timeout | null;
  lastFlushTime: number;
  createdAt: number;
  shellPath?: string;
  shellArgs?: string[];
  env?: Record<string, string>;
}

const HIGH_WATERMARK = 1024 * 1024; // 1024 KB
const LOW_WATERMARK = 256 * 1024;   // 256 KB
const BATCH_INTERVAL_MS = 6;
const BATCH_SIZE_THRESHOLD = 64 * 1024; // 64 KB

export class SessionManager {
  private sessions: Map<string, TerminalSession> = new Map();
  private nextId = 1;

  public create(args: PtyCreateArgs, targetWindow?: BrowserWindow): { id: string; pid?: number } {
    logHop('H5', { method: 'sessionManager.create', args });
    const id = `pty-${this.nextId++}`;
    const detected = detectShells();

    if (detected.length === 0) {
      const err = 'No verified shell executable found on system.';
      logger.error(`Session [${id}] spawn failed: ${err}`);
      throw new Error(err);
    }

    const profile = args.profileId
      ? profilesStore.getById(args.profileId)
      : (!args.shellPath ? profilesStore.getDefault() : undefined);

    const { cwd: resolvedCwd, requestedCwdInvalid } = resolveLaunchCwd(args.cwd, profile);

    const isSimpleWarmCandidate =
      !args.cwd &&
      !args.shellPath &&
      (!args.shellArgs || args.shellArgs.length === 0) &&
      (!profile || (!profile.env || Object.keys(profile.env).length === 0));

    // Check warm shell pool hit (only valid when no custom CWD requested)
    if (isSimpleWarmCandidate) {
      const warm = shellPool.acquire();
      if (warm) {
        logger.info(`[Session] Warm shell pool hit for [${id}] (PID ${warm.pid})`);
        const session: TerminalSession = {
          id: warm.id,
          ptyProcess: warm.ptyProcess,
          pid: warm.pid,
          profileId: profile?.id,
          title: profile?.name || 'PowerShell',
          cwd: resolvedCwd,
          attachedWindowId: targetWindow && !targetWindow.isDestroyed() ? targetWindow.id : null,
          attachedWebContentsId: targetWindow && !targetWindow.isDestroyed() ? targetWindow.webContents.id : null,
          ringBuffer: new OutputRingBuffer(),
          unackedBytes: 0,
          isPaused: false,
          batchBuffer: [],
          batchSize: 0,
          batchTimer: null,
          lastFlushTime: Date.now(),
          createdAt: Date.now(),
        };

        this.sessions.set(warm.id, session);

        if (args.cols && args.rows) {
          try { warm.ptyProcess.resize(args.cols, args.rows); } catch {}
        }

        if (targetWindow && !targetWindow.isDestroyed()) {
          windowManager.attachSession(targetWindow.id, warm.id);
        }

        warm.ptyProcess.onData((data: string) => {
          this.handlePtyData(session, data);
        });

        warm.ptyProcess.onExit(({ exitCode }) => {
          logger.info(`Session [${warm.id}] exited with code ${exitCode}`);
          this.flushBatch(session);
          this.notifyExit(session, exitCode);
          this.cleanupSession(warm.id);
        });

        return { id: warm.id, pid: warm.pid };
      }
    }

    let shellPath = '';
    let shellArgs: string[] = (args.shellArgs && args.shellArgs.length > 0)
      ? [...args.shellArgs]
      : (profile?.shellArgs ? [...profile.shellArgs] : []);
    const requestedTarget = args.shellPath || profile?.shellPath;
    const requestedName = requestedTarget || 'Requested Shell';
    let triggeredFallback = false;

    // Resolve requested shell
    if (requestedTarget) {
      if (fs.existsSync(requestedTarget)) {
        shellPath = path.resolve(requestedTarget);
      } else {
        const resolvedWhich = whichSync(requestedTarget);
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
      if (requestedTarget) {
        triggeredFallback = true;
      }
    }

    if (!shellPath) {
      throw new Error(`Failed to resolve valid shell path on system.`);
    }

    const cwd = resolvedCwd;

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
    const profileEnv = profile?.env || {};
    const env = {
      ...process.env,
      COLORTERM: 'truecolor',
      TERM: 'xterm-256color',
      ...shellExpEnvExtra,
      ...profileEnv,
    } as { [key: string]: string };

    const sessionTitle = profile?.name || (shellPath ? path.basename(shellPath, path.extname(shellPath)) : 'Terminal');

    logger.info(
      `Spawning Session [${id}]: shell='${shellPath}', args=${JSON.stringify(shellArgs)}, cwd='${cwd}', cols=${args.cols}, rows=${args.rows}`
    );

    const spawnOptions = {
      name: 'xterm-256color',
      cols: args.cols || 80,
      rows: args.rows || 24,
      cwd,
      env,
      useConpty: process.platform === 'win32',
    };

    logHop('H6', {
      file: shellPath,
      args: shellArgs,
      options: {
        name: spawnOptions.name,
        cols: spawnOptions.cols,
        rows: spawnOptions.rows,
        cwd: spawnOptions.cwd,
        useConpty: spawnOptions.useConpty,
      },
    });

    try {
      const ptyProcess = pty.spawn(shellPath, shellArgs, spawnOptions);



      const session: TerminalSession = {
        id,
        ptyProcess,
        pid: ptyProcess.pid,
        profileId: profile?.id,
        title: sessionTitle,
        cwd,
        attachedWindowId: targetWindow && !targetWindow.isDestroyed() ? targetWindow.id : null,
        attachedWebContentsId: targetWindow && !targetWindow.isDestroyed() ? targetWindow.webContents.id : null,
        ringBuffer: new OutputRingBuffer(),
        unackedBytes: 0,
        isPaused: false,
        batchBuffer: [],
        batchSize: 0,
        batchTimer: null,
        lastFlushTime: Date.now(),
        createdAt: Date.now(),
        shellPath,
        shellArgs,
        env,
      };

      this.sessions.set(id, session);

      if (targetWindow && !targetWindow.isDestroyed()) {
        windowManager.attachSession(targetWindow.id, id);
      }

      // Send fallback toast notification if fallback was triggered
      if (triggeredFallback && targetWindow && !targetWindow.isDestroyed()) {
        const activeShellName =
          detected.find((s) => s.path === shellPath)?.name || shellPath || 'Fallback Shell';
        targetWindow.webContents.send('pty:fallback', {
          id,
          requested: requestedName,
          actual: activeShellName,
          message: `'${requestedName}' not found. Defaulting to ${activeShellName}.`,
        });
      }

      // Notify if requested folder was not found
      if (requestedCwdInvalid && targetWindow && !targetWindow.isDestroyed()) {
        targetWindow.webContents.send('toast:show', {
          type: 'warning',
          message: `Folder not found: "${requestedCwdInvalid}"`,
        });
      }

      ptyProcess.onData((data: string) => {
        this.handlePtyData(session, data);
      });

      ptyProcess.onExit(({ exitCode }) => {
        logger.info(`Session [${id}] exited with code ${exitCode}`);
        this.flushBatch(session);
        this.notifyExit(session, exitCode);
        this.cleanupSession(id);
      });

      return { id, pid: ptyProcess.pid };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error(
        `Failed to spawn Session [${id}] with shell='${shellPath}', args=${JSON.stringify(shellArgs)}, cwd='${cwd}':`,
        errorMessage
      );
      throw new Error(`Failed to spawn shell '${shellPath}': ${errorMessage}`);
    }
  }

  public attach(sessionId: string, window: BrowserWindow): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || window.isDestroyed()) return false;

    session.attachedWindowId = window.id;
    session.attachedWebContentsId = window.webContents.id;
    windowManager.attachSession(window.id, sessionId);

    logger.info(`[Session] Attached session [${sessionId}] to window ${window.id}`);

    // Replay scrollback buffer so xterm restores its view
    const scrollback = session.ringBuffer.getAll();
    if (scrollback && !window.isDestroyed()) {
      window.webContents.send('pty:data', { id: sessionId, data: scrollback });
    }

    return true;
  }

  public detach(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    if (session.attachedWindowId) {
      windowManager.detachSession(session.attachedWindowId, sessionId);
    }

    logger.info(`[Session] Detached session [${sessionId}] from window ${session.attachedWindowId}`);
    session.attachedWindowId = null;
    session.attachedWebContentsId = null;
    return true;
  }

  public list(): SessionInfo[] {
    return Array.from(this.sessions.values()).map((s) => ({
      id: s.id,
      pid: s.pid,
      profileId: s.profileId,
      title: s.title,
      cwd: s.cwd,
      attachedWindowId: s.attachedWindowId,
      createdAt: s.createdAt,
    }));
  }

  public get(sessionId: string): TerminalSession | undefined {
    return this.sessions.get(sessionId);
  }

  private handlePtyData(session: TerminalSession, chunk: string): void {
    // 1. Always record in ring buffer (up to 1.5 MB)
    session.ringBuffer.write(chunk);

    // 2. If no window attached, don't accumulate unacked backpressure
    if (session.attachedWebContentsId === null) {
      session.unackedBytes = 0;
      return;
    }

    const now = Date.now();
    const isIdle = (now - session.lastFlushTime) > 8;

    session.batchBuffer.push(chunk);
    session.batchSize += chunk.length;
    session.unackedBytes += chunk.length;

    // Backpressure flow control
    if (!session.isPaused && session.unackedBytes > HIGH_WATERMARK) {
      session.isPaused = true;
      try {
        session.ptyProcess.pause();
        logger.warn(`Session [${session.id}] paused due to backpressure (${session.unackedBytes} bytes unacked)`);
      } catch (err) {
        logger.error(`Failed to pause Session [${session.id}]`, err);
      }
    }

    // Adaptive flush
    if (isIdle || session.batchSize >= BATCH_SIZE_THRESHOLD) {
      this.flushBatch(session);
    } else if (!session.batchTimer) {
      session.batchTimer = setTimeout(() => {
        this.flushBatch(session);
      }, BATCH_INTERVAL_MS);
    }
  }

  private flushBatch(session: TerminalSession): void {
    if (session.batchTimer) {
      clearTimeout(session.batchTimer);
      session.batchTimer = null;
    }
    if (session.batchBuffer.length === 0) return;

    session.lastFlushTime = Date.now();
    const data = session.batchBuffer.join('');
    session.batchBuffer = [];
    session.batchSize = 0;

    if (session.attachedWebContentsId !== null) {
      const contents = webContents.fromId(session.attachedWebContentsId);
      if (contents && !contents.isDestroyed()) {
        contents.send('pty:data', { id: session.id, data });
      }
    }
  }

  private notifyExit(session: TerminalSession, exitCode: number): void {
    if (session.attachedWebContentsId !== null) {
      const contents = webContents.fromId(session.attachedWebContentsId);
      if (contents && !contents.isDestroyed()) {
        contents.send('pty:exit', { id: session.id, exitCode });
      }
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
        logger.info(`Session [${id}] resumed (${session.unackedBytes} bytes unacked)`);
      } catch (err) {
        logger.error(`Failed to resume Session [${id}]`, err);
      }
    }
  }

  public write(id: string, data: string): void {
    const session = this.sessions.get(id);
    if (session) {
      try {
        session.ptyProcess.write(data);
      } catch (err) {
        logger.error(`Error writing to Session [${id}]`, err);
      }
    }
  }

  public resize(args: PtyResizeArgs): void {
    const session = this.sessions.get(args.id);
    if (session && args.cols > 0 && args.rows > 0) {
      try {
        session.ptyProcess.resize(args.cols, args.rows);
      } catch (err) {
        logger.error(`Error resizing Session [${args.id}] to ${args.cols}x${args.rows}:`, err);
      }
    }
  }

  public kill(id: string): void {
    const session = this.sessions.get(id);
    if (!session) return;

    logger.info(`Killing Session [${id}] PID ${session.pid}`);
    this.killProcessTree(session.pid);
    this.cleanupSession(id);
  }

  public killAll(): void {
    logger.info(`Killing all Sessions (${this.sessions.size} active)`);
    shellPool.drain();
    for (const [id, session] of this.sessions.entries()) {
      this.killProcessTree(session.pid);
      this.cleanupSession(id);
    }
  }

  public getActivePids(): number[] {
    const pids: number[] = [];
    for (const s of this.sessions.values()) {
      if (s.pid) pids.push(s.pid);
    }
    return pids;
  }

  public getDetails(sessionId: string): any {
    const s = this.sessions.get(sessionId);
    if (!s) return null;
    return {
      id: s.id,
      pid: s.pid,
      profileId: s.profileId,
      title: s.title,
      cwd: s.cwd,
      attachedWindowId: s.attachedWindowId,
      createdAt: s.createdAt,
      shellPath: s.shellPath,
      shellArgs: s.shellArgs,
      env: s.env,
      cols: s.ptyProcess?.cols,
      rows: s.ptyProcess?.rows,
    };
  }

  public async getProcesses(sessionId: string): Promise<Array<{ pid: number; name: string; commandLine?: string }>> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.pid) return [];
    const rootPid = session.pid;

    if (process.platform === 'win32') {
      try {
        const psCmd = `Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -eq ${rootPid} -or $_.ParentProcessId -eq ${rootPid} } | Select-Object ProcessId, Name, CommandLine | ConvertTo-Json`;
        const out = execSync(`powershell -NoProfile -Command "${psCmd.replace(/\n/g, ' ')}"`, { timeout: 3000, stdio: 'pipe' }).toString();
        const parsed = JSON.parse(out);
        const list = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
        return list.map((p: any) => ({
          pid: p.ProcessId,
          name: p.Name,
          commandLine: p.CommandLine,
        }));
      } catch {
        return [{ pid: rootPid, name: session.shellPath || 'shell' }];
      }
    }

    return [{ pid: rootPid, name: session.shellPath || 'shell' }];
  }

  public killProcessTree(pid: number): boolean {
    if (!pid) return false;

    if (process.platform === 'win32') {
      try {
        execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'pipe' });
        return true;
      } catch (err: any) {
        logger.warn(`Taskkill warning for PID ${pid}: ${err.message}`);
        return false;
      }
    } else {
      try {
        process.kill(-pid, 'SIGKILL');
        return true;
      } catch {
        try {
          process.kill(pid, 'SIGKILL');
          return true;
        } catch {
          return false;
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

export const sessionManager = new SessionManager();
// Alias for backward compatibility
export const ptyManager = sessionManager;
