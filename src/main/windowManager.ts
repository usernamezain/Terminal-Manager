import { BrowserWindow } from 'electron';
import { logger } from './logger';

export type WindowType = 'main' | 'terminal';

export interface ManagedWindow {
  id: number;
  browserWindow: BrowserWindow;
  type: WindowType;
  sessionIds: string[];
}

export class WindowManager {
  private windows: Map<number, ManagedWindow> = new Map();

  public register(win: BrowserWindow, type: WindowType, initialSessionId?: string): ManagedWindow {
    const managed: ManagedWindow = {
      id: win.id,
      browserWindow: win,
      type,
      sessionIds: initialSessionId ? [initialSessionId] : [],
    };

    this.windows.set(win.id, managed);
    logger.info(`[WindowManager] Registered window #${win.id} (type: ${type})`);

    win.on('closed', () => {
      this.unregister(win.id);
    });

    return managed;
  }

  public unregister(windowId: number): void {
    if (this.windows.has(windowId)) {
      const entry = this.windows.get(windowId);
      this.windows.delete(windowId);
      logger.info(`[WindowManager] Unregistered window #${windowId} (type: ${entry?.type})`);
    }
  }

  public get(windowId: number): ManagedWindow | undefined {
    return this.windows.get(windowId);
  }

  public fromWebContents(sender: Electron.WebContents): ManagedWindow | undefined {
    const win = BrowserWindow.fromWebContents(sender);
    if (!win) return undefined;
    return this.windows.get(win.id);
  }

  public getMainWindow(): BrowserWindow | null {
    for (const mw of this.windows.values()) {
      if (mw.type === 'main' && !mw.browserWindow.isDestroyed()) {
        return mw.browserWindow;
      }
    }
    return null;
  }

  public getTerminalWindows(): BrowserWindow[] {
    const terminals: BrowserWindow[] = [];
    for (const mw of this.windows.values()) {
      if (mw.type === 'terminal' && !mw.browserWindow.isDestroyed()) {
        terminals.push(mw.browserWindow);
      }
    }
    return terminals;
  }

  public getAll(): ManagedWindow[] {
    return Array.from(this.windows.values());
  }

  public attachSession(windowId: number, sessionId: string): void {
    const mw = this.windows.get(windowId);
    if (mw && !mw.sessionIds.includes(sessionId)) {
      mw.sessionIds.push(sessionId);
    }
  }

  public detachSession(windowId: number, sessionId: string): void {
    const mw = this.windows.get(windowId);
    if (mw) {
      mw.sessionIds = mw.sessionIds.filter((id) => id !== sessionId);
    }
  }

  public findWindowBySession(sessionId: string): ManagedWindow | undefined {
    for (const mw of this.windows.values()) {
      if (mw.sessionIds.includes(sessionId)) {
        return mw;
      }
    }
    return undefined;
  }

  public hasAnyWindows(): boolean {
    return this.windows.size > 0;
  }
}

export const windowManager = new WindowManager();
