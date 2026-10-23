import { BrowserWindow, dialog } from 'electron';
import fs from 'fs';
import { logger } from './logger';
import { sessionManager } from './sessionManager';
import { getAppIconPath } from './registryIntegration';
import { profilesStore } from './profilesStore';
import { windowManager } from './windowManager';
import { settingsStore } from './settingsStore';
import { getCommonWebPreferences, attachWindowSafetyNets, getRendererHtmlPath, DEBUG } from './windowConfig';

export class StandaloneWindowManager {
  private windows: Map<string, BrowserWindow> = new Map(); // sessionId -> BrowserWindow
  private handshakeCompleted: Set<string> = new Set();
  private isDockingInProgress: Set<string> = new Set();

  public create(
    sessionId: string,
    profileId?: string,
    cwd?: string,
    getMainWindow?: () => BrowserWindow | null
  ): BrowserWindow {
    // If window already exists for this session, focus it
    const existing = this.windows.get(sessionId);
    if (existing && !existing.isDestroyed()) {
      existing.show();
      existing.focus();
      return existing;
    }

    let iconPath = getAppIconPath();
    if (profileId) {
      const profile = profilesStore.getById(profileId);
      if (profile?.icon && fs.existsSync(profile.icon)) {
        iconPath = profile.icon;
      }
    }

    logger.info(
      `[StandaloneWindow] Creating standalone window for session ${sessionId} (profile: ${profileId || 'default'}, cwd: ${cwd || 'default'})`
    );

    const win = new BrowserWindow({
      width: 860,
      height: 540,
      minWidth: 420,
      minHeight: 280,
      frame: false,
      backgroundColor: '#0B0D10',
      show: false, // Keep hidden until handshake & attach complete
      icon: iconPath,
      webPreferences: getCommonWebPreferences(),
    });

    this.windows.set(sessionId, win);
    this.handshakeCompleted.delete(sessionId);
    windowManager.register(win, 'terminal', sessionId);

    // Attach safety nets (crash reload, unresponsive monitor, etc.)
    attachWindowSafetyNets(win, 'standalone');

    // Allow F12 and Ctrl+Shift+I to toggle DevTools cleanly
    win.webContents.on('before-input-event', (_event, input) => {
      if (input.type === 'keyDown' && (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i'))) {
        win.webContents.toggleDevTools();
      }
    });

    // Open DevTools only when explicitly requested
    const shouldAutoOpenDevTools = Boolean(process.env.DEVTOOLS === '1' || process.env.OPEN_DEVTOOLS === '1');
    if (shouldAutoOpenDevTools && process.env.TERMINAL_MANAGER_E2E !== '1') {
      win.webContents.openDevTools({ mode: 'right' });
    }

    // Safety timeout: if handshake takes > 3 seconds, show window with error state fallback
    const handshakeTimeout = setTimeout(() => {
      if (!win.isDestroyed() && !this.handshakeCompleted.has(sessionId)) {
        logger.warn(`[StandaloneWindow] Handshake for session ${sessionId} exceeded 3000ms. Showing fallback UI.`);
        if (!win.isVisible()) {
          win.show();
          win.focus();
        }
        win.webContents.send('window:handshake-timeout', { sessionId });
      }
    }, 3000);

    win.once('closed', () => {
      clearTimeout(handshakeTimeout);
      this.windows.delete(sessionId);
      this.handshakeCompleted.delete(sessionId);
      windowManager.unregister(win.id);
    });

    win.on('close', (e) => {
      if (DEBUG) {
        logger.info(`[DEBUG Hop: Close Event] Standalone window #${win.id} received close event (session: ${sessionId})`);
      }

      if (this.isDockingInProgress.has(sessionId)) {
        return; // Allow close without prompt during docking
      }

      const session = sessionManager.get(sessionId);
      if (session) {
        e.preventDefault();

        dialog
          .showMessageBox(win, {
            type: 'question',
            buttons: ['Dock to Main Window', 'Keep in Background', 'Terminate Session', 'Cancel'],
            defaultId: 0,
            cancelId: 3,
            title: 'Close Terminal',
            message: `Terminal session "${session.title}" is still running.`,
            detail: 'What would you like to do with this active session?',
          })
          .then(({ response }) => {
            if (response === 0) {
              // Dock to main window
              this.dockToMain(sessionId, getMainWindow);
            } else if (response === 1) {
              // Keep in background
              sessionManager.detach(sessionId);
              this.windows.delete(sessionId);
              windowManager.unregister(win.id);
              win.destroy();
            } else if (response === 2) {
              // Terminate session
              sessionManager.kill(sessionId);
              this.windows.delete(sessionId);
              windowManager.unregister(win.id);
              win.destroy();
            }
            // response === 3: Cancel (do nothing, window stays open)
          });
      } else {
        this.windows.delete(sessionId);
        windowManager.unregister(win.id);
      }
    });

    const devServerUrl = process.env.VITE_DEV_SERVER_URL;
    const queryString = `mode=standalone&sessionId=${encodeURIComponent(sessionId)}`;

    if (devServerUrl) {
      win.loadURL(`${devServerUrl}?${queryString}`).catch((err) => {
        logger.warn(`Failed to load dev server for standalone window, fallback to file:`, err);
        const prodPath = getRendererHtmlPath();
        win.loadFile(prodPath, { search: queryString });
      });
    } else {
      const prodPath = getRendererHtmlPath();
      win.loadFile(prodPath, { search: queryString });
    }

    return win;
  }

  /**
   * Complete the typed handshake initiated by the renderer once its listeners are ready.
   */
  public completeHandshake(sessionId: string, win: BrowserWindow): any {
    const session = sessionManager.get(sessionId);
    if (!session) {
      logger.error(`[StandaloneWindow] Handshake requested for unknown session [${sessionId}]`);
      return { success: false, error: `Session ${sessionId} not found` };
    }

    const settings = settingsStore.get();
    const profile = session.profileId ? profilesStore.getById(session.profileId) : profilesStore.getDefault();

    // Attach session to window (routes future data events)
    sessionManager.attach(sessionId, win);
    this.handshakeCompleted.add(sessionId);

    // Show and focus window immediately after attach
    if (!win.isDestroyed()) {
      if (!win.isVisible()) {
        win.show();
      }
      win.focus();
    }

    logger.info(`[StandaloneWindow] Handshake completed successfully for session [${sessionId}] on window #${win.id}`);

    return {
      success: true,
      sessionId,
      profileId: session.profileId,
      profile,
      title: session.title,
      cwd: session.cwd,
      theme: settings.theme,
      settings,
      scrollback: session.ringBuffer.getAll(),
    };
  }

  public getSessionIdByWindow(win: BrowserWindow): string | undefined {
    for (const [sId, w] of this.windows.entries()) {
      if (w.id === win.id) return sId;
    }
    return undefined;
  }

  public dockToMain(sessionId: string, getMainWindow?: () => BrowserWindow | null): boolean {
    const session = sessionManager.get(sessionId);
    if (!session) {
      logger.warn(`[StandaloneWindow] dockToMain: session [${sessionId}] not found`);
      return false;
    }

    this.isDockingInProgress.add(sessionId);

    // Atomic detach from standalone window (buffer while detached)
    sessionManager.detach(sessionId);

    const win = this.windows.get(sessionId);
    if (win && !win.isDestroyed()) {
      this.windows.delete(sessionId);
      windowManager.unregister(win.id);
      setImmediate(() => {
        if (!win.isDestroyed()) {
          win.destroy();
        }
      });
    }

    this.isDockingInProgress.delete(sessionId);

    // Get or show main window
    let mainWin = getMainWindow ? getMainWindow() : windowManager.getMainWindow();
    if (!mainWin || mainWin.isDestroyed()) {
      try {
        const { showMainWindow } = require('./index');
        showMainWindow();
        mainWin = windowManager.getMainWindow();
      } catch (err) {
        logger.error('[StandaloneWindow] Failed to resurrect main window for docking:', err);
      }
    }

    if (mainWin && !mainWin.isDestroyed()) {
      if (!mainWin.isVisible()) mainWin.show();
      if (mainWin.isMinimized()) mainWin.restore();
      mainWin.focus();

      // Send dock-tab IPC
      mainWin.webContents.send('session:dock-tab', {
        sessionId,
        profileId: session.profileId,
        title: session.title,
        cwd: session.cwd,
      });

      // Atomic re-attach to main window
      sessionManager.attach(sessionId, mainWin);
      logger.info(`[StandaloneWindow] Docked session [${sessionId}] back to main window #${mainWin.id}`);
      return true;
    }

    logger.error(`[StandaloneWindow] Failed to find or restore main window for docking session [${sessionId}]`);
    return false;
  }

  public popOut(sessionId: string, getMainWindow?: () => BrowserWindow | null): BrowserWindow | null {
    const session = sessionManager.get(sessionId);
    if (!session) return null;

    // Detach from main window (buffers in ringBuffer)
    sessionManager.detach(sessionId);

    const mainWin = getMainWindow ? getMainWindow() : windowManager.getMainWindow();
    if (mainWin && !mainWin.isDestroyed()) {
      mainWin.webContents.send('session:tab-popped-out', { sessionId });
    }

    return this.create(sessionId, session.profileId, session.cwd, getMainWindow);
  }

  public getWindow(sessionId: string): BrowserWindow | undefined {
    return this.windows.get(sessionId);
  }

  public getAll(): BrowserWindow[] {
    return Array.from(this.windows.values());
  }
}

export const standaloneWindowManager = new StandaloneWindowManager();
