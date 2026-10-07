import { contextBridge, ipcRenderer } from 'electron';
import {
  PtyCreateArgs,
  PtyDataEvent,
  PtyExitEvent,
  PtyFallbackEvent,
  AppSettings,
  WindowApi,
} from '../shared/types';
import { IPC_CHANNELS } from '../shared/ipc';

const api: WindowApi = {
  platform: process.platform,
  isE2E: process.env.TERMINAL_MANAGER_E2E === '1',
  pty: {
    create: (args: PtyCreateArgs) => ipcRenderer.invoke(IPC_CHANNELS.PTY_CREATE, args),
    write: (id: string, data: string) => ipcRenderer.invoke(IPC_CHANNELS.PTY_WRITE, { id, data }),
    resize: (id: string, cols: number, rows: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.PTY_RESIZE, { id, cols, rows }),
    kill: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PTY_KILL, { id }),
    ack: (id: string, length: number) => ipcRenderer.invoke(IPC_CHANNELS.PTY_ACK, { id, length }),
    onData: (callback: (data: PtyDataEvent) => void) => {
      const listener = (_event: unknown, payload: PtyDataEvent) => callback(payload);
      ipcRenderer.on(IPC_CHANNELS.PTY_DATA, listener);
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.PTY_DATA, listener);
      };
    },
    onExit: (callback: (exit: PtyExitEvent) => void) => {
      const listener = (_event: unknown, payload: PtyExitEvent) => callback(payload);
      ipcRenderer.on(IPC_CHANNELS.PTY_EXIT, listener);
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.PTY_EXIT, listener);
      };
    },
    onFallback: (callback: (fallback: PtyFallbackEvent) => void) => {
      const listener = (_event: unknown, payload: PtyFallbackEvent) => callback(payload);
      ipcRenderer.on(IPC_CHANNELS.PTY_FALLBACK, listener);
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.PTY_FALLBACK, listener);
      };
    },
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
    set: (settings: Partial<AppSettings>) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, settings),
  },
  shells: {
    detect: () => ipcRenderer.invoke(IPC_CHANNELS.SHELLS_DETECT),
  },
  shellexp: {
    getSettings: () => ipcRenderer.invoke('shellexp:get-settings'),
    setSettings: (settings: any) => ipcRenderer.invoke('shellexp:set-settings', settings),
    getStatus: () => ipcRenderer.invoke('shellexp:status'),
    status: () => ipcRenderer.invoke('shellexp:status'),
    install: (args: { itemId: string; confirmed: boolean }) => ipcRenderer.invoke('shellexp:install', args),
    update: () => ipcRenderer.invoke('shellexp:update'),
    setMode: (mode: 'app-scoped' | 'system-wide') => ipcRenderer.invoke('shellexp:set-mode', mode),
    listThemes: () => ipcRenderer.invoke('shellexp:list-themes'),
    previewTheme: (themeName: string) => ipcRenderer.invoke('shellexp:preview-theme', themeName),
    readUserRegion: () => ipcRenderer.invoke('shellexp:read-user-region'),
    writeUserRegion: (code: string) => ipcRenderer.invoke('shellexp:write-user-region', code),
    probeSyntax: (code: string) => ipcRenderer.invoke('shellexp:probe-syntax', code),
    applyToPanes: (paneIds: string[]) => ipcRenderer.invoke('shellexp:apply-to-panes', paneIds),
    onProgress: (callback: (progress: any) => void) => {
      const listener = (_event: unknown, payload: any) => callback(payload);
      ipcRenderer.on('shellexp:progress', listener);
      return () => {
        ipcRenderer.removeListener('shellexp:progress', listener);
      };
    },
  },
  tools: {
    getStatus: () => ipcRenderer.invoke('tools:status'),
    build: () => ipcRenderer.invoke('tools:build'),
    update: () => ipcRenderer.invoke('tools:update'),
    pin: (ref: string | null) => ipcRenderer.invoke('tools:pin', { ref }),
    customize: (config: any) => ipcRenderer.invoke('tools:customize', { config }),
    rebuild: () => ipcRenderer.invoke('tools:rebuild'),
    launch: (args: any) => ipcRenderer.invoke('tools:launch', args),
    dryRun: (args: any) => ipcRenderer.invoke('tools:dryRun', args),
    onBuildProgress: (callback: (progress: any) => void) => {
      const listener = (_event: unknown, payload: any) => callback(payload);
      ipcRenderer.on('tools:build-progress', listener);
      return () => {
        ipcRenderer.removeListener('tools:build-progress', listener);
      };
    },
  },
  admin: {
    getStatus: () => ipcRenderer.invoke('admin:status'),
    connect: () => ipcRenderer.invoke('admin:connect'),
  },
  window: {
    minimize: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE),
    maximize: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MAXIMIZE),
    unmaximize: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_UNMAXIMIZE),
    close: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE),
    isMaximized: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_IS_MAXIMIZED),
  },
  app: {
    getShellMemory: () => ipcRenderer.invoke('app:shell-memory'),
  },
};

contextBridge.exposeInMainWorld('api', api);
