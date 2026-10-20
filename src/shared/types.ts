import { ScriptRunnerSettings } from './scriptRunnerTypes';
import { ProjectRunnerSettings } from './projectRunnerTypes';
export * from './logTypes';

export type WindowMaterial = 'mica' | 'acrylic' | 'solid';
export type UiDensity = 'compact' | 'normal' | 'comfortable';
export type AnimationLevel = 'full' | 'reduced' | 'off';
export type CursorStyle = 'block' | 'underline' | 'bar';
export type ThemeName = 'midnight' | 'graphite';

export type RightClickAction = 'contextMenu' | 'copyOrPaste' | 'paste';

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
  keepRunningInBackground: boolean;
  startWithWindows: boolean;
  startMinimizedToTray: boolean;
  openFolderTerminalsIn: 'standalone' | 'tab';
  explorerContextMenu: boolean;
  rightClickAction: RightClickAction;
  confirmMultiLinePaste: boolean;
  shellIntegration: boolean;
  showSearchTheWeb: boolean;
  defaultSearchEngine: 'google' | 'bing' | 'duckduckgo';
  clipboardHistorySize: number;
  actionsPanelPinned: boolean;
  contextMenuVisibility?: Record<string, boolean>;
  scriptRunner?: Partial<ScriptRunnerSettings>;
  projectRunner?: Partial<ProjectRunnerSettings>;
  aiAgents?: {
    defaultLaunchMode?: 'terminal' | 'tab' | 'window';
    showInExplorerMenu?: boolean;
    showInTrayMenu?: boolean;
    extraPathDirs?: string[];
    autoRescanOnStart?: boolean;
  };
}

export * from './scriptRunnerTypes';
export * from './snippetTypes';
export * from './terminalUtils';
export * from './projectRunnerTypes';
export * from './agentTypes';


export interface SessionInfo {
  id: string;
  pid: number;
  profileId?: string;
  title: string;
  cwd: string;
  attachedWindowId: number | null;
  createdAt: number;
}

export interface ShellInfo {
  id: string;
  name: string;
  path: string;
  icon?: string;
  args?: string[];
}

export interface TerminalProfile {
  id: string;
  name: string;
  shellPath: string;
  shellArgs: string[];
  cwd?: string;
  icon?: string;
  color?: string;
  env?: Record<string, string>;
  isDefault?: boolean;
  elevate?: boolean;
  tabTitle?: string;
  fontFamily?: string;
  fontSize?: number;
}

export interface PtyCreateArgs {
  profileId?: string;
  cwd?: string;
  cols: number;
  rows: number;
  admin?: boolean;
  shellPath?: string;
  shellArgs?: string[];
  env?: Record<string, string>;
  title?: string;
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
  ready: (payload?: { windowId?: number; sessionId?: string }) => Promise<any>;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  commandLine?: string;
  memory?: number;
}

export interface SessionDetails extends SessionInfo {
  shell?: string;
  shellPath?: string;
  shellArgs?: string[];
  profileName?: string;
  env?: Record<string, string>;
  cols?: number;
  rows?: number;
  uptime?: number;
  encoding?: string;
}

export interface PtyApi {
  create: (args: PtyCreateArgs) => Promise<{ id: string; pid?: number }>;
  write: (id: string, data: string) => Promise<void>;
  resize: (id: string, cols: number, rows: number) => Promise<void>;
  kill: (id: string) => Promise<void>;
  ack: (id: string, length: number) => Promise<void>;
  onData: (callback: (data: PtyDataEvent) => void) => () => void;
  onExit: (callback: (exit: PtyExitEvent) => void) => () => void;
  onFallback: (callback: (fallback: PtyFallbackEvent) => void) => () => void;
}

export interface SessionApi {
  attach: (sessionId: string) => Promise<boolean>;
  detach: (sessionId: string) => Promise<boolean>;
  list: () => Promise<SessionInfo[]>;
  getDetails?: (sessionId: string) => Promise<SessionDetails | null>;
  getProcesses?: (sessionId: string) => Promise<ProcessInfo[]>;
  killProcessTree?: (pid: number) => Promise<boolean>;
  dock: (sessionId: string) => Promise<boolean>;
  popOut: (sessionId: string) => Promise<boolean>;
  closeStandalone: (sessionId: string, action: 'dock' | 'background' | 'terminate') => Promise<void>;
  createTab?: (cwd?: string, command?: string) => Promise<{ sessionId: string; windowId?: number }>;
  onDockTab: (callback: (data: { sessionId: string; profileId?: string; title: string; cwd?: string }) => void) => () => void;
  onTabPoppedOut: (callback: (data: { sessionId: string }) => void) => () => void;
}

export interface SnippetsApi {
  getAll: () => Promise<import('./snippetTypes').Snippet[]>;
  save: (snippet: import('./snippetTypes').Snippet) => Promise<import('./snippetTypes').Snippet>;
  delete: (id: string) => Promise<boolean>;
  import: (snippets: import('./snippetTypes').Snippet[]) => Promise<import('./snippetTypes').Snippet[]>;
}

export interface SystemApi {
  getRegistryStatus: () => Promise<boolean>;
  repairRegistry: () => Promise<{ success: boolean; message: string }>;
  openExternal?: (url: string) => Promise<void>;
  openPath?: (path: string) => Promise<string>;
  showItemInFolder?: (path: string) => Promise<void>;
  openInEditor?: (filePath: string, line?: number, col?: number) => Promise<boolean>;
  openFolderPicker?: () => Promise<string | null>;
  saveFile?: (defaultPath: string, content: string) => Promise<boolean>;
}

export interface WindowApi {
  platform: NodeJS.Platform;
  isE2E: boolean;
  pty: PtyApi;
  settings: {
    get: () => Promise<AppSettings>;
    set: (settings: Partial<AppSettings>) => Promise<AppSettings>;
  };
  shells: {
    detect: () => Promise<ShellInfo[]>;
  };
  profiles: {
    getAll: () => Promise<TerminalProfile[]>;
    save: (profile: TerminalProfile) => Promise<TerminalProfile>;
    setDefault: (id: string) => Promise<boolean>;
    delete: (id: string) => Promise<boolean>;
    detect: () => Promise<TerminalProfile[]>;
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
  admin?: {
    getStatus: () => Promise<import('./adminTypes').AdminHelperStatus>;
    connect: () => Promise<{ success: boolean; status: import('./adminTypes').AdminHelperStatus }>;
  };
  window: WindowControlApi;
  session?: SessionApi;
  system?: SystemApi;
  snippets?: SnippetsApi;
  app?: {
    getShellMemory: () => Promise<{ count: number; totalMemoryMb: number; formatted: string }>;
    onNavigate: (callback: (destination: string) => void) => () => void;
    onVisibility?: (callback: (visible: boolean) => void) => () => void;
    onToast: (callback: (data: { type: string; message: string }) => void) => () => void;
    copyDiagnostics?: () => Promise<string>;
    reportIssue?: (type?: 'bug' | 'feature') => Promise<{ success: boolean }>;
    getRecentLogs?: () => Promise<import('./logTypes').LogEntry[]>;
    getLogTail?: (maxBytes?: number, maxLines?: number) => Promise<import('./logTypes').LogEntry[]>;
    clearRecentLogs?: () => Promise<boolean>;
    openLogFile?: () => Promise<void>;
    openLogFolder?: () => Promise<void>;
    sendLog?: (entry: { level: import('./logTypes').LogLevel; message: string; details?: unknown; source?: import('./logTypes').LogSource; category?: string }) => Promise<void>;
    onLogEntry?: (callback: (entry: import('./logTypes').LogEntry) => void) => () => void;
  };
  perf?: {
    getMainTimestamps: () => Promise<Record<string, number>>;
    logSummary: (summary: any) => Promise<void>;
  };
  scripts?: ScriptRunnerApi;
  projectRunner?: ProjectRunnerApi;
  aiAgents?: AiAgentsApi;
}

export interface AiAgentsApi {
  getAll: () => Promise<import('./agentTypes').AgentWithState[]>;
  detectAll: (args?: { force?: boolean }) => Promise<import('./agentTypes').AgentWithState[]>;
  scanAll: (force?: boolean) => Promise<import('./agentTypes').AgentWithState[]>;
  getPrereqs: () => Promise<import('./agentTypes').PrerequisiteItem[]>;
  getPrerequisites: () => Promise<import('./agentTypes').PrerequisiteItem[]>;
  addCustom: (input: any) => Promise<{ success: boolean; agent?: import('./agentTypes').AgentCatalogEntry; error?: string }>;
  addCustomAgent: (input: import('./agentTypes').CustomAgentInput) => Promise<{ success: boolean; agent?: import('./agentTypes').AgentCatalogEntry; error?: string }>;
  deleteCustom: (id: string) => Promise<{ success: boolean; error?: string }>;
  deleteCustomAgent: (args: { id: string }) => Promise<{ success: boolean; error?: string }>;
  launch: (args: import('./agentTypes').AgentLaunchRequest & { confirmedDangerous?: boolean }) => Promise<any>;
  install: (args: { agentId: string; methodId?: string; runAsAdmin?: boolean; cwd?: string }) => Promise<{ success: boolean; sessionId?: string; error?: string }>;
  update: (args: { agentId: string; cwd?: string }) => Promise<{ success: boolean; sessionId?: string; error?: string }>;
  uninstall: (args: { agentId: string }) => Promise<{ success: boolean; message?: string; manualInstructions?: string; error?: string }>;
  installPrereq: (args: { wingetId: string; name: string }) => Promise<{ success: boolean; sessionId?: string; error?: string }>;
  installPrerequisite: (args: { id: string }) => Promise<{ success: boolean; sessionId?: string; error?: string }>;
  addToPath: (args: { agentId?: string; dirPath?: string }) => Promise<{ success: boolean; message?: string; error?: string }>;
  getState: (args: { agentId: string }) => Promise<{ userState: import('./agentTypes').AgentUserState; maskedEnv: Record<string, string>; encryptionAvailable: boolean }>;
  getEnv: (agentId: string) => Promise<{ maskedEnv: Record<string, string>; isEncryptionAvailable: boolean }>;
  saveEnv: (args: { agentId: string; env: Record<string, string> }) => Promise<{ success: boolean; error?: string }>;
  setEnv: (args: { agentId: string; env: Record<string, string> }) => Promise<{ success: boolean; error?: string }>;
  clearData: () => Promise<{ success: boolean }>;
  onStatusChanged: (callback: (payload: { agentId: string; state: import('./agentTypes').AgentDetectionState }) => void) => () => void;
  onPrereqsChanged: (callback: () => void) => () => void;
}

export interface ProjectRunnerApi {
  detect: (args: { cwd: string; shellType?: import('./terminalUtils').ShellType; forceRefresh?: boolean }) => Promise<import('./projectRunnerTypes').ProjectInfo | null>;
  run: (args: {
    sessionId: string;
    command: import('./projectRunnerTypes').ProjectCommand;
    target?: import('./projectRunnerTypes').RunTarget;
    sessionCwd?: string;
  }) => Promise<{ status: 'executed' | 'busy' | 'copied' | 'enqueued'; commandText?: string; runningProcesses?: any[] }>;
  stop: (args: { sessionId: string }) => Promise<{ success: boolean }>;
  restart: (args: { sessionId: string; command: import('./projectRunnerTypes').ProjectCommand; sessionCwd?: string }) => Promise<{ success: boolean }>;
  getStore: (args: { projectPath: string }) => Promise<import('./projectRunnerTypes').StoredProjectData>;
  saveStore: (args: {
    action: 'pin' | 'hide' | 'primary' | 'add-custom' | 'remove-custom' | 'clear';
    projectPath: string;
    payload?: any;
  }) => Promise<import('./projectRunnerTypes').StoredProjectData>;
  validatePackage: (args: {
    ecosystem: import('./projectRunnerTypes').EcosystemType;
    input: string;
    version?: string;
    allowAdvanced?: boolean;
  }) => Promise<{ valid: boolean; packages: string[]; error?: string }>;
  searchPackages: (args: {
    ecosystem: import('./projectRunnerTypes').EcosystemType;
    query: string;
    isOffline?: boolean;
  }) => Promise<import('./projectRunnerTypes').PackageSearchResult[]>;
  onChanged: (callback: (data: { folder: string }) => void) => () => void;
}

export interface ScriptRunnerApi {

  getAll: () => Promise<import('./scriptRunnerTypes').ScriptDefinition[]>;
  save: (script: import('./scriptRunnerTypes').ScriptDefinition) => Promise<import('./scriptRunnerTypes').ScriptDefinition>;
  delete: (id: string) => Promise<boolean>;
  import: () => Promise<import('./scriptRunnerTypes').ScriptDefinition[]>;
  export: (scriptIds: string[]) => Promise<{ success: boolean; filePath?: string }>;
  getSequences: () => Promise<import('./scriptRunnerTypes').ScriptSequence[]>;
  saveSequence: (seq: import('./scriptRunnerTypes').ScriptSequence) => Promise<import('./scriptRunnerTypes').ScriptSequence>;
  deleteSequence: (id: string) => Promise<boolean>;
  getInterpreters: (forceRefresh?: boolean) => Promise<import('./scriptRunnerTypes').InterpreterInfo[]>;
  getRunnerState: () => Promise<import('./scriptRunnerTypes').RunnerState>;
  enqueue: (
    items: Array<Partial<import('./scriptRunnerTypes').QueueItem> & { scriptId: string }>,
    startImmediately?: boolean
  ) => Promise<{ addedCount: number; message: string }>;
  loadSequence: (sequenceId: string, runImmediately?: boolean) => Promise<boolean>;
  start: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  skip: () => Promise<void>;
  retryFailed: () => Promise<void>;
  resumeFromHere: (queueId: string) => Promise<void>;
  reorder: (orderedQueueIds: string[]) => Promise<boolean>;
  removeItem: (queueId: string) => Promise<boolean>;
  clear: () => Promise<void>;
  getOutput: (queueId?: string) => Promise<string>;
  getHistory: () => Promise<import('./scriptRunnerTypes').HistoryRecord[]>;
  deleteHistory: (id: string) => Promise<boolean>;
  clearHistory: () => Promise<void>;
  openLog: (logPath: string) => Promise<void>;
  onRunnerState: (callback: (state: import('./scriptRunnerTypes').RunnerState) => void) => () => void;
  onOutput: (callback: (data: { queueId: string; chunk: string; full: string }) => void) => () => void;
}

declare global {
  interface Window {
    api: WindowApi;
  }
}
