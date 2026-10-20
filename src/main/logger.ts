import fs from 'fs';
import path from 'path';
import { app, BrowserWindow, shell } from 'electron';
import { LogEntry, LogLevel, LogSource } from '../shared/logTypes';
import { IPC_CHANNELS } from '../shared/ipc';

class Logger {
  private logPath: string = '';
  private initialized: boolean = false;
  private recentLogs: LogEntry[] = [];
  private readonly maxRecentLogs: number = 2000;
  private logCounter: number = 0;

  public init(): void {
    if (this.initialized) return;
    try {
      const userDataDir = typeof app?.getPath === 'function' ? app.getPath('userData') : process.cwd();
      this.logPath = path.join(userDataDir, 'terminal-manager.log');
      this.rotateIfNeeded();
      this.initialized = true;
      this.info('Logger initialized at ' + this.logPath, { logPath: this.logPath });
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

  public addEntry(entry: {
    level: LogLevel;
    message: string;
    details?: unknown;
    source?: LogSource;
    category?: string;
    timestamp?: number;
  }): LogEntry {
    this.logCounter++;
    const timestamp = entry.timestamp || Date.now();
    const id = `log-${timestamp}-${this.logCounter}`;

    // Extract category if message starts with [Category]
    let category = entry.category;
    let message = entry.message;
    if (!category && message.startsWith('[')) {
      const match = /^\[([^\]]+)\]\s*(.*)$/.exec(message);
      if (match) {
        category = match[1];
        if (match[2]) {
          message = match[2];
        }
      }
    }

    const fullEntry: LogEntry = {
      id,
      timestamp,
      level: entry.level,
      source: entry.source || 'main',
      category,
      message,
      details: entry.details,
    };

    // Keep ring buffer bounded
    this.recentLogs.push(fullEntry);
    if (this.recentLogs.length > this.maxRecentLogs) {
      this.recentLogs.shift();
    }

    // Write to console
    const levelTag = entry.level.toUpperCase();
    console.log(`[${levelTag}]${category ? ` [${category}]` : ''} ${message}`, entry.details ?? '');

    // Write to file
    if (this.initialized && this.logPath) {
      try {
        const isoTime = new Date(timestamp).toISOString();
        const formatted = `[${isoTime}] [${levelTag}]${category ? ` [${category}]` : ''} ${message}${
          entry.details !== undefined ? ' ' + JSON.stringify(entry.details) : ''
        }\n`;
        fs.appendFileSync(this.logPath, formatted, 'utf8');
      } catch (err) {
        console.error('Failed to write to log file:', err);
      }
    }

    // Broadcast in realtime to all renderer windows
    try {
      if (typeof BrowserWindow !== 'undefined' && BrowserWindow.getAllWindows) {
        const windows = BrowserWindow.getAllWindows();
        for (const win of windows) {
          if (!win.isDestroyed()) {
            win.webContents.send(IPC_CHANNELS.APP_LOG_ENTRY, fullEntry);
          }
        }
      }
    } catch (_) {
      // Safe ignore in headless or test environments
    }

    return fullEntry;
  }

  public info(message: string, details?: unknown, source: LogSource = 'main'): void {
    this.addEntry({ level: 'info', message, details, source });
  }

  public warn(message: string, details?: unknown, source: LogSource = 'main'): void {
    this.addEntry({ level: 'warn', message, details, source });
  }

  public error(message: string, details?: unknown, source: LogSource = 'main'): void {
    this.addEntry({ level: 'error', message, details, source });
  }

  public debug(message: string, details?: unknown, source: LogSource = 'main'): void {
    this.addEntry({ level: 'debug', message, details, source });
  }

  public getRecentLogs(): LogEntry[] {
    return [...this.recentLogs];
  }

  /**
   * Bounded log file tail reader.
   * Reads only the last maxBytes (default 256KB) and at most maxLines (default 1000)
   * to guarantee instant response times even on 50MB+ log files.
   */
  public getLogTail(maxBytes = 256 * 1024, maxLines = 1000): LogEntry[] {
    if (!this.logPath || !fs.existsSync(this.logPath)) {
      return this.getRecentLogs().slice(-maxLines);
    }

    try {
      const stats = fs.statSync(this.logPath);
      const fileSize = stats.size;
      if (fileSize === 0) {
        return this.getRecentLogs().slice(-maxLines);
      }

      const bytesToRead = Math.min(fileSize, maxBytes);
      const buffer = Buffer.alloc(bytesToRead);
      const fd = fs.openSync(this.logPath, 'r');
      try {
        fs.readSync(fd, buffer, 0, bytesToRead, fileSize - bytesToRead);
      } finally {
        fs.closeSync(fd);
      }

      const text = buffer.toString('utf8');
      const rawLines = text.split(/\r?\n/).filter(Boolean);
      const recentLines = rawLines.slice(-maxLines);

      const parsedEntries: LogEntry[] = [];
      const logPattern = /^\[([^\]]+)\]\s+\[(INFO|WARN|ERROR|DEBUG)\](?:\s+\[([^\]]+)\])?\s+(.*)$/;

      for (let i = 0; i < recentLines.length; i++) {
        const line = recentLines[i];
        if (!line) continue;
        if (line.length > 5000) {
          parsedEntries.push({
            id: `tail-${i}`,
            timestamp: Date.now(),
            level: 'info',
            source: 'main',
            message: line.slice(0, 5000) + '... [truncated]',
          });
          continue;
        }

        const match = logPattern.exec(line);
        if (match && match[1] && match[2] && match[4] !== undefined) {
          const timestampStr = match[1];
          const levelStr = match[2].toLowerCase() as LogLevel;
          const category = match[3] || undefined;
          let message = match[4];
          let details: unknown = undefined;

          const jsonIdx = message.indexOf(' {');
          if (jsonIdx !== -1) {
            try {
              const candidate = message.slice(jsonIdx + 1);
              details = JSON.parse(candidate);
              message = message.slice(0, jsonIdx);
            } catch (_) {}
          }

          const parsedTime = Date.parse(timestampStr);
          parsedEntries.push({
            id: `tail-${i}-${parsedTime || Date.now()}`,
            timestamp: isNaN(parsedTime) ? Date.now() : parsedTime,
            level: levelStr,
            source: 'main',
            category,
            message: message || '',
            details,
          });
        } else {
          parsedEntries.push({
            id: `tail-${i}`,
            timestamp: Date.now(),
            level: 'info',
            source: 'main',
            message: line,
          });
        }
      }

      if (parsedEntries.length > 0) {
        return parsedEntries;
      }
    } catch (err) {
      console.warn('getLogTail error, falling back to memory logs:', err);
    }

    return this.getRecentLogs().slice(-maxLines);
  }

  public clearRecentLogs(): void {
    this.recentLogs = [];
  }

  public getLogPath(): string {
    return this.logPath;
  }

  public async openLogFile(): Promise<void> {
    if (this.logPath && fs.existsSync(this.logPath)) {
      await shell.openPath(this.logPath);
    }
  }

  public async openLogFolder(): Promise<void> {
    if (this.logPath && fs.existsSync(this.logPath)) {
      shell.showItemInFolder(this.logPath);
    } else {
      const userDataDir = typeof app?.getPath === 'function' ? app.getPath('userData') : process.cwd();
      await shell.openPath(userDataDir);
    }
  }
}

export const logger = new Logger();
