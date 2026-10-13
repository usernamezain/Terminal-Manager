import { BrowserWindow, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { logger } from './logger';
import { sessionManager } from './sessionManager';
import { getAppIconPath } from './registryIntegration';
import { profilesStore } from './profilesStore';
import { windowManager } from './windowManager';

const DEBUG = Boolean(process.env.TERMINAL_DEBUG || process.env.DEBUG);

export class StandaloneWindowManager {
  private windows: Map<string, BrowserWindow> = new Map(); // sessionId -> BrowserWindow
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

    const preloadPath = path.join(__dirname, '../preload/index.js');
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
      show: false,
      icon: iconPath,
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        webSecurity: true,
        spellcheck: false,
      },
    });

    this.windows.set(sessionId, win);
    windowManager.register(win, 'terminal', sessionId);

    win.once('ready-to-show', () => {
      win.show();
      win.focus();
      sessionManager.attach(sessionId, win);
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

    win.on('closed', () => {
      this.windows.delete(sessionId);
      windowManager.unregister(win.id);
    });

    const devServerUrl = process.env.VITE_DEV_SERVER_URL;
    const query = `?mode=standalone&sessionId=${encodeURIComponent(sessionId)}`;

    if (devServerUrl) {
      win.loadURL(`${devServerUrl}${query}`).catch((err) => {
        logger.warn(`Failed to load dev server for standalone window, fallback to file:`, err);
        const prodPath = path.join(__dirname, '../renderer/index.html');
        win.loadFile(prodPath, { search: query });
      });
    } else {
      const prodPath = path.join(__dirname, '../renderer/index.html');
      win.loadFile(prodPath, { search: query });
    }

    return win;
  }

  public dockToMain(sessionId: string, getMainWindow?: () => BrowserWindow | null): boolean {
    const session = sessionManager.get(sessionId);
    if (!session) return false;

    this.isDockingInProgress.add(sessionId);

    // Detach from standalone window
    sessionManager.detach(sessionId);

    const win = this.windows.get(sessionId);
    if (win && !win.isDestroyed()) {
      this.windows.delete(sessionId);
      windowManager.unregister(win.id);
      win.destroy();
    }

    this.isDockingInProgress.delete(sessionId);

    // Get or create main window
    let mainWin = getMainWindow ? getMainWindow() : windowManager.getMainWindow();
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

      sessionManager.attach(sessionId, mainWin);
      return true;
    }

    return false;
  }

  public popOut(sessionId: string, getMainWindow?: () => BrowserWindow | null): BrowserWindow | null {
    const session = sessionManager.get(sessionId);
    if (!session) return null;

    // Detach from main window
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
