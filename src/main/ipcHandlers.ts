import { ipcMain, BrowserWindow } from 'electron';
import {
  PtyCreateSchema,
  PtyWriteSchema,
  PtyResizeSchema,
  PtyKillSchema,
  PtyAckSchema,
  SettingsSetSchema,
  IPC_CHANNELS,
} from '../shared/ipc';
import { ptyManager } from './ptyManager';
import { settingsStore } from './settingsStore';
import { detectShells } from './shellDetector';
import { logger } from './logger';

import { registerToolsHandlers } from './tools/toolsHandlers';

export function setupIpcHandlers(mainWindow: BrowserWindow): void {
  registerToolsHandlers(mainWindow);

  // PTY Create
  ipcMain.handle(IPC_CHANNELS.PTY_CREATE, async (_event, args) => {
    logger.info('IPC handle pty:create', args);
    const parsed = PtyCreateSchema.safeParse(args);
    if (!parsed.success) {
      throw new Error(`Invalid pty:create payload: ${parsed.error.message}`);
    }
    return ptyManager.create(parsed.data, mainWindow);
  });

  // PTY Write
  ipcMain.handle(IPC_CHANNELS.PTY_WRITE, async (_event, args) => {
    const parsed = PtyWriteSchema.safeParse(args);
    if (!parsed.success) {
      throw new Error(`Invalid pty:write payload: ${parsed.error.message}`);
    }
    ptyManager.write(parsed.data.id, parsed.data.data);
  });

  // PTY Resize
  ipcMain.handle(IPC_CHANNELS.PTY_RESIZE, async (_event, args) => {
    const parsed = PtyResizeSchema.safeParse(args);
    if (!parsed.success) {
      throw new Error(`Invalid pty:resize payload: ${parsed.error.message}`);
    }
    ptyManager.resize(parsed.data);
  });

  // PTY Kill
  ipcMain.handle(IPC_CHANNELS.PTY_KILL, async (_event, args) => {
    const parsed = PtyKillSchema.safeParse(args);
    if (!parsed.success) {
      throw new Error(`Invalid pty:kill payload: ${parsed.error.message}`);
    }
    ptyManager.kill(parsed.data.id);
  });

  // PTY Ack
  ipcMain.handle(IPC_CHANNELS.PTY_ACK, async (_event, args) => {
    const parsed = PtyAckSchema.safeParse(args);
    if (!parsed.success) {
      throw new Error(`Invalid pty:ack payload: ${parsed.error.message}`);
    }
    ptyManager.handleAck(parsed.data.id, parsed.data.length);
  });

  // Settings Get
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async () => {
    return settingsStore.get();
  });

  // Settings Set
  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, async (_event, args) => {
    const parsed = SettingsSetSchema.safeParse(args);
    if (!parsed.success) {
      throw new Error(`Invalid settings:set payload: ${parsed.error.message}`);
    }
    return settingsStore.set(parsed.data);
  });

  // Shells Detect
  ipcMain.handle(IPC_CHANNELS.SHELLS_DETECT, async () => {
    return detectShells();
  });

  // Window Controls
  ipcMain.handle(IPC_CHANNELS.WINDOW_MINIMIZE, async () => {
    if (!mainWindow.isDestroyed()) mainWindow.minimize();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_MAXIMIZE, async () => {
    if (!mainWindow.isDestroyed()) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_UNMAXIMIZE, async () => {
    if (!mainWindow.isDestroyed()) mainWindow.unmaximize();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE, async () => {
    if (!mainWindow.isDestroyed()) mainWindow.close();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_IS_MAXIMIZED, async () => {
    return !mainWindow.isDestroyed() && mainWindow.isMaximized();
  });

  ipcMain.handle('app:shell-memory', async () => {
    const pids = ptyManager.getActivePids();
    if (pids.length === 0) return { count: 0, totalMemoryMb: 0, formatted: '0 MB' };

    try {
      const { execSync } = require('child_process');
      const psCmd = `Get-CimInstance Win32_Process | Where-Object { $_.Name -match 'powershell|pwsh|conhost|OpenConsole' } | Select-Object WorkingSetSize | ConvertTo-Json`;
      const out = execSync(`powershell -NoProfile -Command "${psCmd.replace(/\n/g, ' ')}"`, { timeout: 3000, stdio: 'pipe' }).toString();
      const parsed = JSON.parse(out);
      const list = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
      const totalBytes = list.reduce((acc: number, p: any) => acc + (p.WorkingSetSize || 0), 0);
      const totalMb = Math.round(totalBytes / (1024 * 1024));
      const formatted = totalMb >= 1024 ? `${(totalMb / 1024).toFixed(2)} GB` : `${totalMb} MB`;
      return { count: pids.length, totalMemoryMb: totalMb, formatted };
    } catch {
      const approxMb = pids.length * 115;
      return { count: pids.length, totalMemoryMb: approxMb, formatted: `${approxMb} MB` };
    }
  });
}
