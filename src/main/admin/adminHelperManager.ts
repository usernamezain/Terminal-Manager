import { spawn, ChildProcess } from 'child_process';
import net from 'net';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { EventEmitter } from 'events';
import { logger } from '../logger';
import { AdminHelperStatus } from '../../shared/adminTypes';

export class AdminHelperManager extends EventEmitter {
  private helperProcess: ChildProcess | null = null;
  private socket: net.Socket | null = null;
  private pipeName: string = '';
  private token: string = '';
  private status: AdminHelperStatus = { state: 'disconnected' };
  private buffer: string = '';
  private ptyDataCallbacks = new Map<string, (data: string) => void>();
  private ptyExitCallbacks = new Map<string, (code: number) => void>();

  public getStatus(): AdminHelperStatus {
    return this.status;
  }

  public async ensureHelperConnected(): Promise<boolean> {
    if (this.status.state === 'connected' && this.socket && !this.socket.destroyed) {
      return true;
    }

    if (this.status.state === 'starting') {
      // Wait up to 10 seconds for starting helper
      return new Promise((resolve) => {
        const check = setInterval(() => {
          if (this.status.state === 'connected') {
            clearInterval(check);
            resolve(true);
          } else if (this.status.state === 'disconnected') {
            clearInterval(check);
            resolve(false);
          }
        }, 200);
        setTimeout(() => {
          clearInterval(check);
          resolve(this.status.state === 'connected');
        }, 10000);
      });
    }

    this.setStatus({ state: 'starting' });

    const isE2E = process.env.TERMINAL_MANAGER_E2E === '1';
    const isWin = process.platform === 'win32';

    if (!isWin && !isE2E) {
      this.setStatus({ state: 'disconnected', error: 'Admin helper is only supported on Windows' });
      return false;
    }

    const randomId = crypto.randomBytes(8).toString('hex');
    this.pipeName = isWin ? `\\\\.\\pipe\\terminal-manager-admin-${randomId}` : `/tmp/terminal-manager-admin-${randomId}.sock`;
    this.token = crypto.randomBytes(16).toString('hex');

    const helperScript = path.resolve(__dirname, '../../helper/adminHelper.js');
    const helperTsScript = path.resolve(__dirname, '../../src/helper/adminHelper.ts');
    
    let targetScript = helperScript;
    if (!fs.existsSync(targetScript) && fs.existsSync(helperTsScript)) {
      targetScript = helperTsScript;
    }

    if (isE2E) {
      logger.info('[AdminHelper] Running in E2E stub mode');
      // In E2E, spawn node directly without elevation
      this.helperProcess = spawn(process.execPath, [targetScript, `--pipe=${this.pipeName}`, `--token=${this.token}`], {
        stdio: 'ignore',
        detached: true,
      });
    } else {
      logger.info(`[AdminHelper] Spawning elevated helper process via UAC prompt for pipe: ${this.pipeName}`);
      const psCommand = `Start-Process -FilePath "${process.execPath}" -ArgumentList '"${targetScript}" "--pipe=${this.pipeName}" "--token=${this.token}"' -Verb RunAs -WindowStyle Hidden`;
      this.helperProcess = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psCommand], {
        stdio: 'ignore',
      });
    }

    // Try connecting to named pipe with retry loop
    const connected = await this.connectSocketWithRetry(15, 500);
    if (!connected) {
      this.setStatus({ state: 'disconnected', error: 'Failed to connect to elevated admin helper pipe' });
      return false;
    }

    return true;
  }

  private connectSocketWithRetry(maxAttempts: number, intervalMs: number): Promise<boolean> {
    return new Promise((resolve) => {
      let attempts = 0;
      const attemptConnect = () => {
        attempts++;
        const sock = net.connect(this.pipeName, () => {
          this.socket = sock;
          this.setupSocketListeners();
          // Perform auth handshake
          sock.write(JSON.stringify({ type: 'auth', token: this.token }) + '\n');
        });

        sock.once('error', () => {
          sock.destroy();
          if (attempts < maxAttempts) {
            setTimeout(attemptConnect, intervalMs);
          } else {
            resolve(false);
          }
        });
      };

      attemptConnect();
    });
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('data', (data) => {
      this.buffer += data.toString('utf8');
      const lines = this.buffer.split('\n');
      this.buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.type === 'auth:ok') {
            this.setStatus({ state: 'connected', pipeName: this.pipeName, pid: this.helperProcess?.pid });
            logger.info('[AdminHelper] Connected & Authenticated successfully');
          } else if (msg.type === 'pty:data') {
            const cb = this.ptyDataCallbacks.get(msg.id);
            if (cb) cb(msg.data);
          } else if (msg.type === 'pty:exit') {
            const cb = this.ptyExitCallbacks.get(msg.id);
            if (cb) cb(msg.exitCode);
          }
        } catch (e) {
          logger.error('[AdminHelper] Socket message parse error:', e);
        }
      }
    });

    this.socket.on('close', () => {
      logger.warn('[AdminHelper] Socket connection closed');
      this.setStatus({ state: 'disconnected', error: 'Admin session ended - Reconnect' });
      this.emit('disconnected');
    });

    this.socket.on('error', (err) => {
      logger.error('[AdminHelper Socket Error]', err);
    });
  }

  public async createPty(args: {
    id: string;
    cols: number;
    rows: number;
    cwd?: string;
    shellPath?: string;
    shellArgs?: string[];
    onData: (data: string) => void;
    onExit: (code: number) => void;
  }): Promise<boolean> {
    const ok = await this.ensureHelperConnected();
    if (!ok || !this.socket) return false;

    this.ptyDataCallbacks.set(args.id, args.onData);
    this.ptyExitCallbacks.set(args.id, args.onExit);

    const msg = {
      type: 'create',
      payload: {
        id: args.id,
        cols: args.cols,
        rows: args.rows,
        cwd: args.cwd,
        shellPath: args.shellPath,
        shellArgs: args.shellArgs,
      },
    };

    this.socket.write(JSON.stringify(msg) + '\n');
    return true;
  }

  public writePty(id: string, data: string): void {
    if (this.socket && !this.socket.destroyed) {
      this.socket.write(JSON.stringify({ type: 'write', payload: { id, data } }) + '\n');
    }
  }

  public resizePty(id: string, cols: number, rows: number): void {
    if (this.socket && !this.socket.destroyed) {
      this.socket.write(JSON.stringify({ type: 'resize', payload: { id, cols, rows } }) + '\n');
    }
  }

  public killPty(id: string): void {
    if (this.socket && !this.socket.destroyed) {
      this.socket.write(JSON.stringify({ type: 'kill', payload: { id } }) + '\n');
    }
    this.ptyDataCallbacks.delete(id);
    this.ptyExitCallbacks.delete(id);
  }

  public shutdown(): void {
    if (this.socket && !this.socket.destroyed) {
      this.socket.write(JSON.stringify({ type: 'shutdown' }) + '\n');
      this.socket.destroy();
    }
    this.setStatus({ state: 'disconnected' });
  }

  private setStatus(status: AdminHelperStatus): void {
    this.status = status;
    this.emit('status-changed', status);
  }
}

export const adminHelperManager = new AdminHelperManager();
