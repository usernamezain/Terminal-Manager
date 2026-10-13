import * as pty from 'node-pty';
import path from 'path';
import { logger } from './logger';

import { detectShells } from './shellDetector';
import { pathManager } from './shell-experience/pathManager';
import { getCurrentShellExpSettings } from './shell-experience/shellExpHandlers';

export interface WarmSession {
  id: string;
  ptyProcess: pty.IPty;
  pid: number;
}

export class ShellPoolManager {
  private pool: WarmSession[] = [];
  private poolSize = 2; // Default 2 pre-spawned background shells
  private nextId = 9000;
  private isRefilling = false;

  public setPoolSize(size: number): void {
    this.poolSize = Math.max(0, Math.min(4, size));
    if (this.pool.length > this.poolSize) {
      const extra = this.pool.splice(this.poolSize);
      extra.forEach((s) => {
        try { s.ptyProcess.kill(); } catch {}
      });
    } else if (this.pool.length < this.poolSize) {
      this.scheduleRefill();
    }
  }

  public getPoolSize(): number {
    return this.poolSize;
  }

  public getStatus(): { poolSize: number; activePoolCount: number } {
    return {
      poolSize: this.poolSize,
      activePoolCount: this.pool.length,
    };
  }

  public acquire(): WarmSession | null {
    if (this.pool.length === 0) return null;
    const session = this.pool.shift() || null;
    this.scheduleRefill(50);
    return session;
  }

  public scheduleRefill(delayMs = 100): void {
    if (this.poolSize === 0 || this.isRefilling) return;
    setTimeout(() => this.refill(), delayMs);
  }

  public refill(): void {
    if (this.isRefilling || this.pool.length >= this.poolSize) return;
    this.isRefilling = true;

    try {
      const detected = detectShells();
      if (detected.length === 0) {
        this.isRefilling = false;
        return;
      }

      const defaultShell = detected[0];
      if (!defaultShell) {
        this.isRefilling = false;
        return;
      }

      let shellPath = defaultShell.path;
      let shellArgs: string[] = defaultShell.args || [];
      const userHome = process.env.USERPROFILE || process.env.HOME || process.cwd();

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
        } catch {}
      }

      const env = {
        ...process.env,
        COLORTERM: 'truecolor',
        TERM: 'xterm-256color',
        ...shellExpEnvExtra,
      } as { [key: string]: string };

      const id = `pty-warm-${this.nextId++}`;
      logger.info(`[ShellPool] Pre-spawning warm background PTY [${id}]`);

      const ptyProcess = pty.spawn(shellPath, shellArgs, {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: userHome,
        env,
        useConpty: process.platform === 'win32',
      });

      this.pool.push({
        id,
        ptyProcess,
        pid: ptyProcess.pid,
      });

      logger.info(`[ShellPool] Warm shell [${id}] (PID ${ptyProcess.pid}) added to pool. Total pool count: ${this.pool.length}`);
    } catch (err) {
      logger.warn('[ShellPool] Failed to pre-spawn warm shell:', err);
    } finally {
      this.isRefilling = false;
      if (this.pool.length < this.poolSize) {
        this.scheduleRefill(1500);
      }
    }
  }

  public drain(): void {
    logger.info(`[ShellPool] Draining ${this.pool.length} warm pooled shells`);
    for (const s of this.pool) {
      try {
        s.ptyProcess.kill();
      } catch {}
    }
    this.pool = [];
  }
}

export const shellPool = new ShellPoolManager();
