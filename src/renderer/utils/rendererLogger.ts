import { useLogStore } from '../store/useLogStore';
import { LogEntry, LogLevel } from '../../shared/logTypes';
import { safeStringify } from './safeSerialize';

let initialized = false;
let logCounter = 0;
let isInternalLogging = false;

// Batch queue for incoming logs to avoid blocking the React render loop
let pendingBatch: LogEntry[] = [];
let batchTimeout: ReturnType<typeof setTimeout> | null = null;
const BATCH_INTERVAL_MS = 250;
const MAX_BATCH_SIZE = 500;

function flushBatch() {
  batchTimeout = null;
  if (pendingBatch.length === 0) {
    return;
  }
  const toFlush = pendingBatch.slice(0, MAX_BATCH_SIZE);
  pendingBatch = pendingBatch.slice(MAX_BATCH_SIZE);

  isInternalLogging = true;
  try {
    useLogStore.getState().addLogs(toFlush);
  } catch (_) {
    // Suppress store errors during flush
  } finally {
    isInternalLogging = false;
  }

  // If backlog remains, schedule next 250ms batch
  if (pendingBatch.length > 0) {
    batchTimeout = setTimeout(flushBatch, BATCH_INTERVAL_MS);
  }
}

function queueLog(entry: LogEntry) {
  pendingBatch.push(entry);
  if (!batchTimeout) {
    batchTimeout = setTimeout(flushBatch, BATCH_INTERVAL_MS);
  }
}

function formatConsoleArgs(args: unknown[]): { message: string; details?: unknown } {
  if (args.length === 0) return { message: '' };

  const first = args[0];
  let message: string;

  if (typeof first === 'string') {
    message = first;
  } else if (first instanceof Error) {
    message = first.message || first.name || 'Error';
  } else if (typeof first === 'object' && first !== null) {
    message = safeStringify(first);
  } else {
    message = String(first);
  }

  let details: unknown = undefined;
  if (args.length > 1) {
    if (args.length === 2 && typeof args[1] === 'object' && args[1] !== null) {
      details = args[1];
    } else {
      details = args.slice(1);
    }
  } else if (first instanceof Error) {
    details = {
      name: first.name,
      message: first.message,
      stack: first.stack,
    };
  }

  return { message, details };
}

export function initRendererLogger(): () => void {
  if (initialized) return () => {};
  initialized = true;

  const originalConsole = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console),
  };

  const createInterceptor = (level: LogLevel, orig: (...args: unknown[]) => void) => {
    return (...args: unknown[]) => {
      // Always forward to native browser console
      orig(...args);

      // Reentrancy guard: NEVER intercept if we are already inside a logger or store update
      if (isInternalLogging) return;

      try {
        const { message, details } = formatConsoleArgs(args);

        // Filter internal noisy logs or infinite loop candidates
        if (
          !message ||
          message.includes('[useLogStore]') ||
          message.includes('[LogDetector]') ||
          message.includes('app:get-log-tail') ||
          message.includes('app:get-recent-logs') ||
          message.includes('app:log-entry') ||
          message.includes('app:open-log-file') ||
          message.includes('app:open-log-folder') ||
          message.includes('Autofill.enable') ||
          message.includes('Autofill.setAddresses') ||
          message.includes('Download the React DevTools')
        ) {
          return;
        }

        logCounter++;
        const entry: LogEntry = {
          id: `renderer-${Date.now()}-${logCounter}`,
          timestamp: Date.now(),
          level,
          source: 'renderer',
          message: message.slice(0, 4000), // Protect against multi-megabyte giant logs
          details,
        };

        queueLog(entry);
      } catch (_) {
        // Silently preserve stability
      }
    };
  };

  console.log = createInterceptor('info', originalConsole.log);
  console.info = createInterceptor('info', originalConsole.info);
  console.warn = createInterceptor('warn', originalConsole.warn);
  console.error = createInterceptor('error', originalConsole.error);
  console.debug = createInterceptor('debug', originalConsole.debug);

  // Global uncaught errors
  const handleError = (event: ErrorEvent) => {
    if (isInternalLogging) return;
    try {
      logCounter++;
      const entry: LogEntry = {
        id: `err-${Date.now()}-${logCounter}`,
        timestamp: Date.now(),
        level: 'error',
        source: 'renderer',
        category: 'UncaughtError',
        message: event.message || 'Uncaught window error',
        details: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
        },
      };
      queueLog(entry);
    } catch (_) {}
  };

  // Global unhandled promise rejections
  const handleRejection = (event: PromiseRejectionEvent) => {
    if (isInternalLogging) return;
    try {
      logCounter++;
      const reason = event.reason;
      const msg = reason instanceof Error ? reason.message : String(reason);
      const entry: LogEntry = {
        id: `rejection-${Date.now()}-${logCounter}`,
        timestamp: Date.now(),
        level: 'error',
        source: 'renderer',
        category: 'UnhandledRejection',
        message: `Unhandled Promise Rejection: ${msg}`,
        details: reason instanceof Error ? { name: reason.name, stack: reason.stack } : reason,
      };
      queueLog(entry);
    } catch (_) {}
  };

  window.addEventListener('error', handleError);
  window.addEventListener('unhandledrejection', handleRejection);

  // Subscribe to real-time Main process logs
  let unsubMain: (() => void) | undefined;
  if (window.api?.app?.onLogEntry) {
    unsubMain = window.api.app.onLogEntry((entry: LogEntry) => {
      if (entry && typeof entry === 'object') {
        queueLog(entry);
      }
    });
  }

  // Fetch initial bounded logs from Main process
  if (window.api?.app?.getLogTail) {
    window.api.app
      .getLogTail(256 * 1024, 1000)
      .then((tail) => {
        if (Array.isArray(tail) && tail.length > 0) {
          const currentLogs = useLogStore.getState().logs;
          const merged = [...tail, ...currentLogs].sort((a, b) => a.timestamp - b.timestamp);
          useLogStore.getState().setLogs(merged);
        }
      })
      .catch(() => {});
  } else if (window.api?.app?.getRecentLogs) {
    window.api.app
      .getRecentLogs()
      .then((recent) => {
        if (Array.isArray(recent) && recent.length > 0) {
          const currentLogs = useLogStore.getState().logs;
          const merged = [...recent, ...currentLogs].sort((a, b) => a.timestamp - b.timestamp);
          useLogStore.getState().setLogs(merged);
        }
      })
      .catch(() => {});
  }

  // Initial greeting log
  queueLog({
    id: `init-${Date.now()}`,
    timestamp: Date.now(),
    level: 'info',
    source: 'system',
    category: 'LogDetector',
    message: 'Log Detector active. Capturing all Main, Renderer, IPC, and PTY events in realtime.',
  });

  return () => {
    if (batchTimeout) {
      clearTimeout(batchTimeout);
      batchTimeout = null;
    }
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.debug = originalConsole.debug;
    window.removeEventListener('error', handleError);
    window.removeEventListener('unhandledrejection', handleRejection);
    if (unsubMain) unsubMain();
    initialized = false;
  };
}
