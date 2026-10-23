import { app, BrowserWindow, shell, session, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { logger } from './logger';
import { settingsStore } from './settingsStore';
import { profilesStore } from './profilesStore';
import { setupIpcHandlers } from './ipcHandlers';
import { sessionManager } from './sessionManager';
import { registerShellExpHandlers } from './shell-experience/shellExpHandlers';
import { shellPool } from './shellPool';
import { mainPerfTracker } from './perfTracker';
import { parseCliArgs, ParsedCliArgs } from './cliHandler';
import { initTray, showBackgroundNotification, setupJumpList } from './trayManager';
import { windowManager } from './windowManager';
import { openTerminalFromRequest } from './launchManager';
import {
  getAppIconPath,
  registerExplorerContextMenu,
} from './registryIntegration';
import { scriptRunner } from './scripts/scriptRunner';
import { scriptsStore } from './scripts/scriptsStore';
import { logHop } from './launchDebugger';
import { launchAgent } from './ai-agents/agentLauncher';
import { agentDetector } from './ai-agents/agentDetector';
import { updateAgentExplorerMenu } from './ai-agents/agentRegistryExplorer';
import { getCommonWebPreferences, attachWindowSafetyNets, getRendererHtmlPath } from './windowConfig';
import { startupScheduler } from './startupScheduler';
import { timerService } from './timerService';

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

// Support custom --user-data-dir flag for test isolation
const userDataArg = process.argv.find((arg) => arg.startsWith('--user-data-dir='));
if (userDataArg) {
  const customUserDataPath = userDataArg.split('=')[1];
  if (customUserDataPath) {
    app.setPath('userData', customUserDataPath);
  }
}

// Log cold-start H1
logHop('H1', { event: 'cold-start', argv: process.argv });

// Single instance lock
const isE2E = Boolean(process.env.TERMINAL_MANAGER_E2E);
const gotTheLock = isE2E ? true : app.requestSingleInstanceLock();
if (!gotTheLock) {
  logger.warn('[Single Instance] Secondary instance launch blocked by single-instance lock. Quitting secondary process.');
  app.quit();
  process.exit(0);
} else {
  app.on('second-instance', (_event, commandLine) => {
    logger.info('[Single Instance] Secondary instance launch detected with args:', commandLine);
    logHop('H1', { event: 'second-instance', commandLine });
    handleCliLaunch(parseCliArgs(commandLine));
  });
}

function cleanupObsoleteToolsData(): void {
  try {
    const toolsDir = path.join(app.getPath('userData'), 'tools');
    if (!fs.existsSync(toolsDir)) return;

    const obsoleteNames = ['winutil-upstream', 'winutil-build', 'last-good', 'customization.json', 'winutil.ps1'];
    for (const name of obsoleteNames) {
      const itemPath = path.join(toolsDir, name);
      if (fs.existsSync(itemPath)) {
        fs.rmSync(itemPath, { recursive: true, force: true });
        logger.info(`[Migration] Removed obsolete System Tools artifact: ${itemPath}`);
      }
    }
  } catch (err) {
    logger.warn('[Migration] Cleanup of obsolete tools data warning:', err);
  }
}

export function showMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow(true);
  } else {
    if (!mainWindow.isVisible()) {
      mainWindow.show();
      timerService.setAppVisibility(true);
      try {
        mainWindow.webContents.send('app:visibility', true);
      } catch {}
    }
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
}

export function confirmQuit(): void {
  const activeSessions = sessionManager.list();
  const runnerState = scriptRunner.getState();
  const isQueueRunning = runnerState.status === 'running';

  if (isQueueRunning || activeSessions.length > 0) {
    const focusedWin = BrowserWindow.getFocusedWindow() || mainWindow;
    const title = isQueueRunning ? 'Quit Terminal Manager?' : 'Quit Terminal Manager?';
    const message = isQueueRunning
      ? 'A script execution queue is running. Quit and cancel it?'
      : `There are ${activeSessions.length} active terminal session(s) running.`;
    const detail = isQueueRunning
      ? 'Quitting will cancel all currently running and queued scripts.'
      : 'Closing will terminate all active background and standalone sessions. Do you want to quit?';

    dialog
      .showMessageBox(focusedWin || undefined as any, {
        type: 'question',
        buttons: ['Quit and Cancel', 'Cancel'],
        defaultId: 1,
        cancelId: 1,
        title,
        message,
        detail,
      })
      .then(({ response }) => {
        if (response === 0) {
          isQuitting = true;
          scriptRunner.handleAppQuit();
          sessionManager.killAll();
          app.quit();
        }
      });
  } else {
    isQuitting = true;
    scriptRunner.handleAppQuit();
    sessionManager.killAll();
    app.quit();
  }
}

function handleCliLaunch(cliArgs: ParsedCliArgs): void {
  // Support running sequence from CLI
  if (cliArgs.runSequence) {
    const target = cliArgs.runSequence.trim().toLowerCase();
    const sequences = scriptsStore.getAllSequences();
    const found = sequences.find(
      (s) => s.id.toLowerCase() === target || s.name.toLowerCase() === target
    );
    if (found) {
      logger.info(`[CLI Launch] Running requested sequence: "${found.name}" (${found.id})`);
      scriptRunner.loadSequence(found.id, true);
      if (!cliArgs.hidden) {
        showMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('app:navigate', 'scripts');
        }
      }
    } else {
      logger.warn(`[CLI Launch] Requested sequence not found: "${cliArgs.runSequence}"`);
    }
  }

  if (cliArgs.hidden) {
    logger.info('[CLI Launch] Launched with --hidden. Running in background tray.');
    return;
  }

  // Handle AI Agent direct launch from CLI / Explorer
  if (cliArgs.agent) {
    const launchMode = cliArgs.mode === 'window' ? 'window' : cliArgs.mode === 'tab' ? 'tab' : 'auto';
    launchAgent(
      {
        agentId: cliArgs.agent,
        cwd: cliArgs.cwd || cliArgs.rawCwd,
        mode: launchMode as any,
        resume: cliArgs.resume,
      },
      showMainWindow
    ).catch((err) => {
      logger.error('[CLI Launch] Failed launching AI agent:', err);
    });
    return;
  }

  // Handle direct navigation to AI Agents panel
  if (cliArgs.agentsPanel) {
    showMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('app:navigate', 'agents');
    }
    return;
  }

  const hasSpecificTerminalTarget = Boolean(
    cliArgs.cwd ||
    cliArgs.rawCwd ||
    cliArgs.profile ||
    cliArgs.newWindow ||
    cliArgs.dock ||
    cliArgs.cwdNotFound
  );

  if (hasSpecificTerminalTarget) {
    const mode = cliArgs.newWindow ? 'window' : cliArgs.dock ? 'tab' : 'auto';
    openTerminalFromRequest(
      {
        cwd: cliArgs.cwd || cliArgs.rawCwd,
        profileId: cliArgs.profile,
        mode,
      },
      showMainWindow
    );
    return;
  }

  // Normal activation: show main window
  showMainWindow();
}

function createWindow(showImmediately = true): void {
  app.setName('terminal-manager');
  const currentSettings = settingsStore.get();

  const isWin = process.platform === 'win32';
  const isMac = process.platform === 'darwin';
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const iconPath = getAppIconPath();

  // Configure CSP via Session headers safely
  session.defaultSession.webRequest.onHeadersReceived(
    { urls: ['http://*/*', 'https://*/*', 'file://*/*'] },
    (details, callback) => {
      const responseHeaders = details.responseHeaders || {};
      const cspHeader = isDev
        ? "default-src 'self' http://localhost:* ws://localhost:*; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' http://localhost:* ws://localhost:*;"
        : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self';";

      callback({
        responseHeaders: {
          ...responseHeaders,
          'Content-Security-Policy': [cspHeader],
        },
      });
    }
  );

  const windowOptions: Electron.BrowserWindowConstructorOptions = {
    width: 1200,
    height: 800,
    minWidth: 640,
    minHeight: 400,
    frame: false,
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    backgroundColor: '#0B0D10',
    show: false,
    icon: iconPath,
    webPreferences: getCommonWebPreferences(),
  };

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
  windowManager.register(mainWindow, 'main');
  mainPerfTracker.record('windowCreated');

  const showWindow = () => {
    if (showImmediately && mainWindow && !mainWindow.isDestroyed()) {
      if (!mainWindow.isVisible()) {
        mainWindow.show();
        mainWindow.focus();
        mainPerfTracker.record('readyToShow');
        mainPerfTracker.record('windowVisible');
        startupScheduler.onFirstWindowReady();
      }
    }
  };

  mainWindow.once('ready-to-show', showWindow);
  if (showImmediately) {
    setTimeout(showWindow, 1200);
  }

  // Intercept window close for background (tray) mode
  mainWindow.on('close', (event) => {
    if (!isQuitting && settingsStore.get().keepRunningInBackground) {
      event.preventDefault();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.hide();
        timerService.setAppVisibility(false);
        try {
          mainWindow.webContents.send('app:visibility', false);
        } catch {}
        showBackgroundNotification();
      }
    }
  });

  mainWindow.on('closed', () => {
    if (mainWindow) {
      windowManager.unregister(mainWindow.id);
    }
    mainWindow = null;
  });

  // Attach responsiveness monitoring and crash recovery
  attachWindowSafetyNets(mainWindow, 'main');

  // Allow F12 and Ctrl+Shift+I to toggle DevTools cleanly
  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.type === 'keyDown') {
      if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
        mainWindow?.webContents.toggleDevTools();
      }
    }
  });

  // Open DevTools only when explicitly requested via DEVTOOLS=1
  const shouldAutoOpenDevTools = Boolean(process.env.DEVTOOLS === '1' || process.env.OPEN_DEVTOOLS === '1');
  if (shouldAutoOpenDevTools && process.env.TERMINAL_MANAGER_E2E !== '1') {
    mainWindow.webContents.openDevTools({ mode: 'right' });
  }

  // Block external navigation
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

  // Load URL or File
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    logger.info(`[Renderer Load] Loading Dev Server URL: ${devServerUrl}`);
    mainWindow.loadURL(devServerUrl).catch((err) => {
      logger.warn(`Failed to load dev server URL ${devServerUrl}, loading index.html file fallback`, err);
      const prodPath = getRendererHtmlPath();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadFile(prodPath).catch(() => {});
      }
    });
  } else {
    const prodPath = getRendererHtmlPath();
    logger.info(`[Renderer Load] Loading Production File: ${prodPath}`);
    mainWindow.loadFile(prodPath).catch(() => {});
  }
}

app.on('child-process-gone', (_event, details) => {
  logger.warn(`[Child Process Gone] Type: ${details.type}, Name: ${details.name}, Reason: ${details.reason}, Exit Code: ${details.exitCode}`);
});

app.whenReady().then(() => {
  mainPerfTracker.record('appReady');
  logger.init();
  settingsStore.init();
  profilesStore.init();
  setupIpcHandlers();

  const cliArgs = parseCliArgs(process.argv);
  const settings = settingsStore.get();

  // Schedule deferred tasks after ready-to-show
  startupScheduler.schedule('trayAndJumpList', 'deferred', () => {
    initTray(() => mainWindow, () => showMainWindow(), () => confirmQuit());
    setupJumpList();
  });

  startupScheduler.schedule('explorerContextMenu', 'deferred', async () => {
    await registerExplorerContextMenu().catch((err) => {
      logger.warn('[Startup] Context menu sync warning:', err);
    });
  });

  // Schedule background idle tasks
  startupScheduler.schedule('agentDiscovery', 'idle', async () => {
    await agentDetector.scanAll(false).catch((err) => {
      logger.warn('[Startup] Agent scan warning:', err);
    });
    await updateAgentExplorerMenu().catch((err) => {
      logger.warn('[Startup] Agent Explorer menu sync warning:', err);
    });
  });

  startupScheduler.schedule('cleanupAndTooling', 'idle', () => {
    cleanupObsoleteToolsData();
    registerShellExpHandlers();
    shellPool.scheduleRefill(50);
  });

  startupScheduler.schedule('startupSequences', 'idle', () => {
    try {
      const startupSequences = scriptsStore.getAllSequences().filter((s) => s.runOnAppStart);
      for (const seq of startupSequences) {
        logger.info(`[Startup] Auto-executing sequence configured for app start: "${seq.name}" (${seq.id})`);
        scriptRunner.loadSequence(seq.id, true);
      }
    } catch (err) {
      logger.warn('[Startup] Failed to evaluate startup sequences:', err);
    }
  });

  // Determine initial window presentation
  const shouldStartHidden = cliArgs.hidden || settings.startMinimizedToTray;
  const hasSpecificTarget = Boolean(
    cliArgs.cwd ||
    cliArgs.rawCwd ||
    cliArgs.profile ||
    cliArgs.newWindow ||
    cliArgs.dock ||
    cliArgs.cwdNotFound ||
    cliArgs.agent ||
    cliArgs.agentsPanel
  );

  if (hasSpecificTarget) {
    handleCliLaunch(cliArgs);
  } else if (!shouldStartHidden) {
    createWindow(true);
  } else {
    logger.info('[Startup] Starting minimized to system tray.');
    createWindow(false);
  }

  app.on('activate', () => {
    showMainWindow();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  scriptRunner.handleAppQuit();
  sessionManager.killAll();
});

app.on('window-all-closed', () => {
  const keepRunning = settingsStore.get().keepRunningInBackground;
  if (!keepRunning && process.platform !== 'darwin') {
    if (!windowManager.hasAnyWindows() && sessionManager.list().length === 0) {
      isQuitting = true;
      sessionManager.killAll();
      app.quit();
    }
  }
});
