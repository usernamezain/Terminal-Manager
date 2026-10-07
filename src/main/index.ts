import { app, BrowserWindow, shell, session } from 'electron';
import path from 'path';
import fs from 'fs';
import { logger } from './logger';
import { settingsStore } from './settingsStore';
import { setupIpcHandlers } from './ipcHandlers';
import { ptyManager } from './ptyManager';
import { registerShellExpHandlers } from './shell-experience/shellExpHandlers';

let mainWindow: BrowserWindow | null = null;

// Support custom --user-data-dir flag for test isolation
const userDataArg = process.argv.find((arg) => arg.startsWith('--user-data-dir='));
if (userDataArg) {
  const customUserDataPath = userDataArg.split('=')[1];
  if (customUserDataPath) {
    app.setPath('userData', customUserDataPath);
  }
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  logger.warn('[Single Instance] Secondary instance launch blocked by single-instance lock. Quitting secondary process.');
  app.quit();
} else {
  app.on('second-instance', () => {
    logger.info('[Single Instance] Secondary instance detected. Focusing main window.');
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function createWindow(): void {
  app.setName('terminal-manager');
  logger.init();
  logger.info(`[UserData Truth] Base Path: ${app.getPath('userData')}`);
  logger.info(`[UserData Truth] Tools Path: ${path.join(app.getPath('userData'), 'tools')}`);
  settingsStore.init();
  const currentSettings = settingsStore.get();

  const isWin = process.platform === 'win32';
  const isMac = process.platform === 'darwin';
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  const preloadPath = path.join(__dirname, '../preload/index.js');
  logger.info(`[Preload Check] Path: ${preloadPath}, Exists: ${fs.existsSync(preloadPath)}`);

  // Configure CSP via Session headers
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const cspHeader = isDev
      ? "default-src 'self' http://localhost:* ws://localhost:*; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' http://localhost:* ws://localhost:*;"
      : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self';";

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [cspHeader],
      },
    });
  });

  const windowOptions: Electron.BrowserWindowConstructorOptions = {
    width: 1200,
    height: 800,
    minWidth: 640,
    minHeight: 400,
    frame: false,
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    backgroundColor: '#0B0D10',
    show: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
  };

  // Windows 11 Mica / Acrylic material support
  if (isWin) {
    if (currentSettings.windowMaterial === 'mica') {
      windowOptions.backgroundMaterial = 'mica';
    } else if (currentSettings.windowMaterial === 'acrylic') {
      windowOptions.backgroundMaterial = 'acrylic';
    }
  } else if (isMac) {
    windowOptions.vibrancy = 'under-window';
    windowOptions.visualEffectState = 'active';
  }

  mainWindow = new BrowserWindow(windowOptions);

  // Ready to show
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Renderer crash, unresponsive, & load logging
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    logger.error(`[Render Process Gone] Reason: ${details.reason}, Exit Code: ${details.exitCode}`);
    if (mainWindow && !mainWindow.isDestroyed() && details.reason !== 'clean-exit') {
      logger.info('[Crash Recovery] Auto-reloading renderer process after crash...');
      mainWindow.webContents.reload();
    }
  });

  mainWindow.on('unresponsive', () => {
    logger.warn('[Window Unresponsive] Main window has stopped responding.');
  });

  mainWindow.webContents.on('preload-error', (_event, preloadErrPath, error) => {
    logger.error(`[Preload Error] Path: ${preloadErrPath}`, error);
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    logger.error(`[Load Failed] Code ${errorCode}: ${errorDescription} at ${validatedURL}`);
  });

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (level >= 2) {
      logger.warn(`[Renderer Console L${level}] ${message} (${sourceId}:${line})`);
    }
  });

  // Open DevTools automatically in dev mode (skip during automated E2E testing)
  if (isDev && process.env.TERMINAL_MANAGER_E2E !== '1') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Block external navigation and new windows for security
  mainWindow.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Setup IPC Handlers
  setupIpcHandlers(mainWindow);
  registerShellExpHandlers();

  // Load URL or File
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    logger.info(`[Renderer Load] Loading Dev Server URL: ${devServerUrl}`);
    mainWindow.loadURL(devServerUrl).catch((err) => {
      logger.warn(`Failed to load dev server URL ${devServerUrl}, loading index.html file fallback`, err);
      const prodPath = path.join(__dirname, '../renderer/index.html');
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadFile(prodPath);
      }
    });
  } else {
    const prodPath = path.join(__dirname, '../renderer/index.html');
    logger.info(`[Renderer Load] Loading Production File: ${prodPath}`);
    mainWindow.loadFile(prodPath);
  }

  mainWindow.on('closed', () => {
    ptyManager.killAll();
    mainWindow = null;
  });
}

app.on('child-process-gone', (_event, details) => {
  logger.warn(`[Child Process Gone] Type: ${details.type}, Name: ${details.name}, Reason: ${details.reason}, Exit Code: ${details.exitCode}`);
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  ptyManager.killAll();
});

app.on('window-all-closed', () => {
  ptyManager.killAll();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
