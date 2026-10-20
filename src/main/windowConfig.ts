import { app, BrowserWindow, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { logger } from './logger';

export const DEBUG = Boolean(process.env.TERMINAL_DEBUG || process.env.DEBUG);

/**
 * Returns the verified preload script path in both development and production.
 */
export function getPreloadPath(): string {
  // In built bundle (dist/main/index.js), '../preload/index.js' resolves to dist/preload/index.js
  const primaryPath = path.resolve(__dirname, '../preload/index.js');
  if (fs.existsSync(primaryPath)) {
    return primaryPath;
  }

  // Fallback for packaged app or alternative build structure
  const appPath = app.getAppPath();
  const altPath = path.resolve(appPath, 'dist/preload/index.js');
  if (fs.existsSync(altPath)) {
    return altPath;
  }

  if (DEBUG) {
    logger.warn(`[Preload] Preload script not found at ${primaryPath} or ${altPath}`);
  }
  return primaryPath;
}

/**
 * Centralized WebPreferences factory shared by ALL BrowserWindow types.
 */
export function getCommonWebPreferences(): Electron.WebPreferences {
  const preload = getPreloadPath();
  if (DEBUG) {
    logger.info(`[WebPreferences] Resolved preload script: ${preload}`);
  }
  return {
    preload,
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    webSecurity: true,
    allowRunningInsecureContent: false,
    spellcheck: false,
  };
}

/**
 * Attach responsiveness monitoring and crash recovery to any window.
 */
export function attachWindowSafetyNets(win: BrowserWindow, windowType: 'main' | 'standalone' | 'other'): void {
  let unresponsiveTimer: NodeJS.Timeout | null = null;

  win.on('unresponsive', () => {
    logger.warn(`[Window Unresponsive] Window #${win.id} (${windowType}) has stopped responding.`);
    if (unresponsiveTimer) clearTimeout(unresponsiveTimer);

    // After 5 seconds of continuous unresponsiveness, offer recovery dialog
    unresponsiveTimer = setTimeout(() => {
      if (win.isDestroyed()) return;
      dialog
        .showMessageBox(win, {
          type: 'warning',
          buttons: ['Wait', 'Reload Window', 'Close Window'],
          defaultId: 0,
          cancelId: 0,
          title: 'Window Unresponsive',
          message: `The terminal window #${win.id} is not responding.`,
          detail: 'You can wait for it to recover, reload the window, or close it.',
        })
        .then(({ response }) => {
          if (win.isDestroyed()) return;
          if (response === 1) {
            logger.info(`[Window Recovery] Reloading unresponsive window #${win.id}`);
            win.webContents.reload();
          } else if (response === 2) {
            logger.info(`[Window Recovery] Closing unresponsive window #${win.id}`);
            win.close();
          }
        })
        .catch(() => {});
    }, 5000);
  });

  win.on('responsive', () => {
    logger.info(`[Window Responsive] Window #${win.id} (${windowType}) has recovered.`);
    if (unresponsiveTimer) {
      clearTimeout(unresponsiveTimer);
      unresponsiveTimer = null;
    }
  });

  win.webContents.on('render-process-gone', (_event, details) => {
    logger.error(`[Render Process Gone] Window #${win.id} (${windowType}). Reason: ${details.reason}, ExitCode: ${details.exitCode}`);
    if (!win.isDestroyed() && details.reason !== 'clean-exit') {
      logger.info(`[Crash Recovery] Auto-reloading renderer process for window #${win.id}...`);
      win.webContents.reload();
    }
  });

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    logger.error(`[Did Fail Load] Window #${win.id} (${windowType}) failed to load ${validatedURL}: [${errorCode}] ${errorDescription}`);
  });

  // Block external navigation and window opening
  win.webContents.on('will-navigate', (event, url) => {
    event.preventDefault();
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'https:' || parsed.protocol === 'mailto:') {
        shell.openExternal(url);
      }
    } catch {}
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'https:' || parsed.protocol === 'mailto:') {
        shell.openExternal(url);
      }
    } catch {}
    return { action: 'deny' };
  });

  // Deny all web permission requests
  win.webContents.session.setPermissionRequestHandler((_webContents, permission, callback) => {
    logger.warn(`[Security] Denied permission request "${permission}" for window #${win.id}`);
    callback(false);
  });
  win.webContents.session.setPermissionCheckHandler(() => false);

  if (DEBUG) {
    win.webContents.on('console-message', (_event, level, message, line, sourceId) => {
      logger.debug(`[Renderer Console win#${win.id} lvl:${level}] ${message} (${sourceId}:${line})`);
    });
  }
}
