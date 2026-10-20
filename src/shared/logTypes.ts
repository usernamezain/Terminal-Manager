export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export type LogSource = 'main' | 'renderer' | 'ipc' | 'pty' | 'system';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  source: LogSource;
  category?: string;
  message: string;
  details?: unknown;
}

export interface LogFilterOptions {
  level?: LogLevel | 'all';
  source?: LogSource | 'all';
  query?: string;
}
