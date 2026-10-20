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
  profiles: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.PROFILES_GET),
    save: (profile) => ipcRenderer.invoke(IPC_CHANNELS.PROFILES_SAVE, profile),
    setDefault: (id) => ipcRenderer.invoke(IPC_CHANNELS.PROFILES_SET_DEFAULT, { id }),
    delete: (id) => ipcRenderer.invoke(IPC_CHANNELS.PROFILES_DELETE, { id }),
    detect: () => ipcRenderer.invoke(IPC_CHANNELS.PROFILES_DETECT),
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
    ready: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_READY),
  },
  session: {
    attach: (sessionId: string) => ipcRenderer.invoke(IPC_CHANNELS.SESSION_ATTACH, { sessionId }),
    detach: (sessionId: string) => ipcRenderer.invoke(IPC_CHANNELS.SESSION_DETACH, { sessionId }),
    list: () => ipcRenderer.invoke(IPC_CHANNELS.SESSION_LIST),
    dock: (sessionId: string) => ipcRenderer.invoke(IPC_CHANNELS.SESSION_DOCK, { sessionId }),
    popOut: (sessionId: string) => ipcRenderer.invoke(IPC_CHANNELS.SESSION_POP_OUT, { sessionId }),
    closeStandalone: (sessionId: string, action: 'dock' | 'background' | 'terminate') =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION_STANDALONE_CLOSE, { sessionId, action }),
    createTab: (cwd?: string, command?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION_CREATE_TAB, { cwd, command }),
    getDetails: (sessionId: string) => ipcRenderer.invoke(IPC_CHANNELS.SESSION_DETAILS, { sessionId }),
    getProcesses: (sessionId: string) => ipcRenderer.invoke(IPC_CHANNELS.SESSION_PROCESSES, { sessionId }),
    killProcessTree: (pid: number) => ipcRenderer.invoke(IPC_CHANNELS.SESSION_KILL_PROCESS_TREE, { pid }),
    onDockTab: (callback: (data: { sessionId: string; profileId?: string; title: string; cwd?: string }) => void) => {
      const listener = (_event: unknown, payload: any) => callback(payload);
      ipcRenderer.on('session:dock-tab', listener);
      return () => {
        ipcRenderer.removeListener('session:dock-tab', listener);
      };
    },
    onTabPoppedOut: (callback: (data: { sessionId: string }) => void) => {
      const listener = (_event: unknown, payload: any) => callback(payload);
      ipcRenderer.on('session:tab-popped-out', listener);
      return () => {
        ipcRenderer.removeListener('session:tab-popped-out', listener);
      };
    },
  },
  system: {
    getRegistryStatus: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_REGISTRY_GET_STATUS),
    repairRegistry: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_REGISTRY_REPAIR),
    openExternal: (url: string) => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_OPEN_EXTERNAL, { url }),
    openPath: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_OPEN_PATH, { path }),
    showItemInFolder: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_SHOW_ITEM_IN_FOLDER, { path }),
    openInEditor: (filePath: string, line?: number, col?: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_OPEN_IN_EDITOR, { filePath, line, col }),
    openFolderPicker: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_OPEN_FOLDER_PICKER),
    saveFile: (defaultPath: string, content: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_SAVE_FILE, { defaultPath, content }),
  },
  snippets: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.SNIPPETS_GET),
    save: (snippet: any) => ipcRenderer.invoke(IPC_CHANNELS.SNIPPETS_SAVE, snippet),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.SNIPPETS_DELETE, { id }),
    import: (snippets: any[]) => ipcRenderer.invoke(IPC_CHANNELS.SNIPPETS_IMPORT, { snippets }),
  },
  app: {
    getShellMemory: () => ipcRenderer.invoke('app:shell-memory'),
    onNavigate: (callback: (destination: string) => void) => {
      const listener = (_event: unknown, payload: string) => callback(payload);
      ipcRenderer.on('app:navigate', listener);
      return () => {
        ipcRenderer.removeListener('app:navigate', listener);
      };
    },
    onVisibility: (callback: (visible: boolean) => void) => {
      const listener = (_event: unknown, visible: boolean) => callback(visible);
      ipcRenderer.on('app:visibility', listener);
      return () => {
        ipcRenderer.removeListener('app:visibility', listener);
      };
    },
    onToast: (callback: (data: { type: string; message: string }) => void) => {
      const listener = (_event: unknown, payload: { type: string; message: string }) => callback(payload);
      ipcRenderer.on('toast:show', listener);
      return () => {
        ipcRenderer.removeListener('toast:show', listener);
      };
    },
    copyDiagnostics: () => ipcRenderer.invoke('app:copy-diagnostics'),
    reportIssue: (type?: 'bug' | 'feature') => ipcRenderer.invoke('app:report-issue', { type }),
    getRecentLogs: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_RECENT_LOGS),
    getLogTail: (maxBytes?: number, maxLines?: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.APP_GET_LOG_TAIL, { maxBytes, maxLines }),
    clearRecentLogs: () => ipcRenderer.invoke(IPC_CHANNELS.APP_CLEAR_RECENT_LOGS),
    openLogFile: () => ipcRenderer.invoke(IPC_CHANNELS.APP_OPEN_LOG_FILE),
    openLogFolder: () => ipcRenderer.invoke(IPC_CHANNELS.APP_OPEN_LOG_FOLDER),
    sendLog: (entry: any) => ipcRenderer.invoke(IPC_CHANNELS.APP_SEND_RENDERER_LOG, entry),
    onLogEntry: (callback: (entry: any) => void) => {
      const listener = (_event: unknown, payload: any) => callback(payload);
      ipcRenderer.on(IPC_CHANNELS.APP_LOG_ENTRY, listener);
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.APP_LOG_ENTRY, listener);
      };
    },
  },
  perf: {
    getMainTimestamps: () => ipcRenderer.invoke('perf:get-main-timestamps'),
    logSummary: (summary: any) => ipcRenderer.invoke('perf:log-summary', summary),
  },
  scripts: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_GET_ALL),
    save: (script) => ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_SAVE, script),
    delete: (id) => ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_DELETE, { id }),
    import: () => ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_IMPORT),
    export: (scriptIds) => ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_EXPORT, { scriptIds }),
    getSequences: () => ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_GET_SEQUENCES),
    saveSequence: (seq) => ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_SAVE_SEQUENCE, seq),
    deleteSequence: (id) => ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_DELETE_SEQUENCE, { id }),
    getInterpreters: (forceRefresh) => ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_GET_INTERPRETERS, { forceRefresh }),
    getRunnerState: () => ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_RUNNER_GET_STATE),
    enqueue: (items, startImmediately) =>
      ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_RUNNER_ENQUEUE, { items, startImmediately }),
    loadSequence: (sequenceId, runImmediately) =>
      ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_RUNNER_LOAD_SEQUENCE, { sequenceId, runImmediately }),
    start: () => ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_RUNNER_START),
    pause: () => ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_RUNNER_PAUSE),
    resume: () => ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_RUNNER_RESUME),
    stop: () => ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_RUNNER_STOP),
    skip: () => ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_RUNNER_SKIP),
    retryFailed: () => ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_RUNNER_RETRY_FAILED),
    resumeFromHere: (queueId) => ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_RUNNER_RESUME_FROM, { queueId }),
    reorder: (orderedQueueIds) => ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_RUNNER_REORDER, { orderedQueueIds }),
    removeItem: (queueId) => ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_RUNNER_REMOVE_ITEM, { queueId }),
    clear: () => ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_RUNNER_CLEAR),
    getOutput: (queueId) => ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_RUNNER_GET_OUTPUT, { queueId }),
    getHistory: () => ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_GET_HISTORY),
    deleteHistory: (id) => ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_DELETE_HISTORY, { id }),
    clearHistory: () => ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_CLEAR_HISTORY),
    openLog: (logPath) => ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_OPEN_LOG, { logPath }),
    onRunnerState: (callback) => {
      const listener = (_event: unknown, payload: any) => callback(payload);
      ipcRenderer.on('scripts:runner-state', listener);
      return () => {
        ipcRenderer.removeListener('scripts:runner-state', listener);
      };
    },
    onOutput: (callback) => {
      const listener = (_event: unknown, payload: any) => callback(payload);
      ipcRenderer.on('scripts:output', listener);
      return () => {
        ipcRenderer.removeListener('scripts:output', listener);
      };
    },
  },
  projectRunner: {
    detect: (args) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_RUNNER_DETECT, args),
    run: (args) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_RUNNER_RUN, args),
    stop: (args) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_RUNNER_STOP, args),
    restart: (args) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_RUNNER_RESTART, args),
    getStore: (args) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_RUNNER_STORE_GET, args),
    saveStore: (args) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_RUNNER_STORE_SAVE, args),
    validatePackage: (args) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_RUNNER_VALIDATE_PACKAGE, args),
    searchPackages: (args) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_RUNNER_SEARCH_PACKAGES, args),
    onChanged: (callback) => {
      const listener = (_event: unknown, payload: any) => callback(payload);
      ipcRenderer.on('project-runner:changed', listener);
      return () => {
        ipcRenderer.removeListener('project-runner:changed', listener);
      };
    },
  },
  aiAgents: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.AI_AGENTS_GET_ALL),
    detectAll: (args) => ipcRenderer.invoke(IPC_CHANNELS.AI_AGENTS_DETECT_ALL, args),
    scanAll: (force) => ipcRenderer.invoke(IPC_CHANNELS.AI_AGENTS_DETECT_ALL, { force }),
    getPrereqs: () => ipcRenderer.invoke(IPC_CHANNELS.AI_AGENTS_GET_PREREQS),
    getPrerequisites: () => ipcRenderer.invoke(IPC_CHANNELS.AI_AGENTS_GET_PREREQS),
    addCustom: (input) => ipcRenderer.invoke(IPC_CHANNELS.AI_AGENTS_ADD_CUSTOM, input),
    addCustomAgent: (input) => ipcRenderer.invoke(IPC_CHANNELS.AI_AGENTS_ADD_CUSTOM, input),
    deleteCustom: (id) => ipcRenderer.invoke(IPC_CHANNELS.AI_AGENTS_DELETE_CUSTOM, { id }),
    deleteCustomAgent: (args) => ipcRenderer.invoke(IPC_CHANNELS.AI_AGENTS_DELETE_CUSTOM, args),
    launch: (args) => ipcRenderer.invoke(IPC_CHANNELS.AI_AGENTS_LAUNCH, args),
    install: (args) => ipcRenderer.invoke(IPC_CHANNELS.AI_AGENTS_INSTALL, args),
    update: (args) => ipcRenderer.invoke(IPC_CHANNELS.AI_AGENTS_UPDATE, args),
    uninstall: (args) => ipcRenderer.invoke(IPC_CHANNELS.AI_AGENTS_UNINSTALL, args),
    installPrereq: (args) => ipcRenderer.invoke(IPC_CHANNELS.AI_AGENTS_INSTALL_PREREQ, args),
    installPrerequisite: (args) => {
      // Find wingetId or default name
      return ipcRenderer.invoke(IPC_CHANNELS.AI_AGENTS_INSTALL_PREREQ, {
        wingetId: args.id === 'node' ? 'OpenJS.NodeJS.LTS' : args.id === 'git' ? 'Git.Git' : args.id === 'python' ? 'Python.Python.3.12' : args.id === 'uv' ? 'astral-sh.uv' : args.id,
        name: args.id,
      });
    },
    addToPath: (args) => ipcRenderer.invoke(IPC_CHANNELS.AI_AGENTS_ADD_TO_PATH, args),
    getState: (args) => ipcRenderer.invoke(IPC_CHANNELS.AI_AGENTS_GET_STATE, args),
    getEnv: async (agentId) => {
      const res = await ipcRenderer.invoke(IPC_CHANNELS.AI_AGENTS_GET_STATE, { agentId });
      return { maskedEnv: res.maskedEnv, isEncryptionAvailable: res.encryptionAvailable };
    },
    saveEnv: (args) => ipcRenderer.invoke(IPC_CHANNELS.AI_AGENTS_SAVE_ENV, args),
    setEnv: (args) => ipcRenderer.invoke(IPC_CHANNELS.AI_AGENTS_SAVE_ENV, args),
    clearData: () => ipcRenderer.invoke(IPC_CHANNELS.AI_AGENTS_CLEAR_DATA),
    onStatusChanged: (callback) => {
      const listener = (_event: unknown, payload: any) => callback(payload);
      ipcRenderer.on('ai-agents:status-changed', listener);
      return () => {
        ipcRenderer.removeListener('ai-agents:status-changed', listener);
      };
    },
    onPrereqsChanged: (callback) => {
      const listener = () => callback();
      ipcRenderer.on('ai-agents:prereqs-changed', listener);
      return () => {
        ipcRenderer.removeListener('ai-agents:prereqs-changed', listener);
      };
    },
  },
};

contextBridge.exposeInMainWorld('api', api);

