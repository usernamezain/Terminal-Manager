export type WindowMaterial = 'mica' | 'acrylic' | 'solid';
export type UiDensity = 'compact' | 'normal' | 'comfortable';
export type AnimationLevel = 'full' | 'reduced' | 'off';
export type CursorStyle = 'block' | 'underline' | 'bar';
export type ThemeName = 'midnight' | 'graphite';

export interface AppSettings {
  version: number;
  theme: ThemeName;
  accent: string;
  windowMaterial: WindowMaterial;
  uiDensity: UiDensity;
  animationLevel: AnimationLevel;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  cursorStyle: CursorStyle;
  cursorBlink: boolean;
  scrollback: number;
  defaultShell: string;
}

export interface ShellInfo {
  id: string;
  name: string;
  path: string;
  icon?: string;
  args?: string[];
}

export interface PtyCreateArgs {
  profileId?: string;
  cwd?: string;
  cols: number;
  rows: number;
  admin?: boolean;
  shellPath?: string;
  shellArgs?: string[];
}

export interface PtyResizeArgs {
  id: string;
  cols: number;
  rows: number;
}

export interface PtyWriteArgs {
  id: string;
  data: string;
}

export interface PtyAckArgs {
  id: string;
  length: number;
}

export interface PtyKillArgs {
  id: string;
}

export interface PtyDataEvent {
  id: string;
  data: string;
}

export interface PtyExitEvent {
  id: string;
  exitCode: number;
}

export interface PtyFallbackEvent {
  id: string;
  requested: string;
  actual: string;
  message: string;
}

export interface WindowControlApi {
  minimize: () => void;
  maximize: () => void;
  unmaximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;
}

export interface WindowApi {
  platform: string;
  isE2E?: boolean;
  pty: {
    create: (args: PtyCreateArgs) => Promise<{ id: string; pid?: number }>;
    write: (id: string, data: string) => Promise<void>;
    resize: (id: string, cols: number, rows: number) => Promise<void>;
    kill: (id: string) => Promise<void>;
    ack: (id: string, length: number) => Promise<void>;
    onData: (callback: (data: PtyDataEvent) => void) => () => void;
    onExit: (callback: (exit: PtyExitEvent) => void) => () => void;
    onFallback: (callback: (fallback: PtyFallbackEvent) => void) => () => void;
  };
  settings: {
    get: () => Promise<AppSettings>;
    set: (settings: Partial<AppSettings>) => Promise<AppSettings>;
  };
  shells: {
    detect: () => Promise<ShellInfo[]>;
  };
  shellexp?: {
    getSettings: () => Promise<any>;
    setSettings: (settings: any) => Promise<{ success: boolean }>;
    getStatus: () => Promise<any>;
    status: () => Promise<any>;
    install: (args: { itemId: string; confirmed: boolean }) => Promise<{ success: boolean }>;
    update: () => Promise<{ success: boolean; commits: string[] }>;
    setMode: (mode: 'app-scoped' | 'system-wide') => Promise<{ success: boolean }>;
    listThemes: () => Promise<any[]>;
    previewTheme: (themeName: string) => Promise<string>;
    readUserRegion: () => Promise<string>;
    writeUserRegion: (code: string) => Promise<{ success: boolean }>;
    probeSyntax: (code: string) => Promise<{ valid: boolean; error?: string }>;
    applyToPanes: (paneIds: string[]) => Promise<{ success: boolean }>;
    onProgress: (callback: (progress: any) => void) => () => void;
  };
  tools?: {
    getStatus: () => Promise<import('./toolsTypes').SystemToolsStatus>;
    build: () => Promise<{ success: boolean; hash?: string; error?: string }>;
    update: () => Promise<{ success: boolean; commits: string[] }>;
    pin: (ref: string | null) => Promise<import('./toolsTypes').SystemToolsStatus>;
    customize: (config: any) => Promise<{ success: boolean }>;
    rebuild: () => Promise<{ success: boolean; hash?: string; error?: string }>;
    launch: (args: import('./toolsTypes').LaunchToolsArgs) => Promise<{ success: boolean; ptyId?: string; productName?: string; error?: string; fixSuggestion?: string }>;
    dryRun: (args: { patchContent?: string }) => Promise<{ valid: boolean; message: string }>;
    onBuildProgress: (callback: (event: import('./toolsTypes').BuildProgressEvent) => void) => () => void;
  };
  admin?: {
    getStatus: () => Promise<import('./adminTypes').AdminHelperStatus>;
    connect: () => Promise<{ success: boolean; status: import('./adminTypes').AdminHelperStatus }>;
  };
  window: WindowControlApi;
  app?: {
    getShellMemory: () => Promise<{ count: number; totalMemoryMb: number; formatted: string }>;
  };
}

declare global {
  interface Window {
    api: WindowApi;
  }
}
