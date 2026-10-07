import fs from 'fs';
import path from 'path';
import { app } from 'electron';

class Logger {
  private logPath: string = '';
  private initialized: boolean = false;

  public init(): void {
    if (this.initialized) return;
    try {
      const userDataDir = app.getPath('userData');
      this.logPath = path.join(userDataDir, 'terminal-manager.log');
      this.rotateIfNeeded();
      this.initialized = true;
      this.info('Logger initialized at ' + this.logPath);
    } catch (err) {
      console.error('Failed to initialize logger:', err);
    }
  }

  private rotateIfNeeded(): void {
    if (!fs.existsSync(this.logPath)) return;
    try {
      const stats = fs.statSync(this.logPath);
      if (stats.size > 5 * 1024 * 1024) {
        const backupPath = `${this.logPath}.1`;
        if (fs.existsSync(backupPath)) {
          fs.unlinkSync(backupPath);
        }
        fs.renameSync(this.logPath, backupPath);
      }
    } catch (e) {
      console.error('Failed to rotate log file:', e);
    }
  }

  private write(level: string, message: string, details?: unknown): void {
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] [${level}] ${message}${
      details !== undefined ? ' ' + JSON.stringify(details) : ''
    }\n`;

    console.log(`[${level}] ${message}`, details ?? '');

    if (this.initialized && this.logPath) {
      try {
        fs.appendFileSync(this.logPath, formatted, 'utf8');
      } catch (err) {
        console.error('Failed to write to log file:', err);
      }
    }
  }

  public info(message: string, details?: unknown): void {
    this.write('INFO', message, details);
  }

  public warn(message: string, details?: unknown): void {
    this.write('WARN', message, details);
  }

  public error(message: string, details?: unknown): void {
    this.write('ERROR', message, details);
  }
}

export const logger = new Logger();
