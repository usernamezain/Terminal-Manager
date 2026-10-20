import { z } from 'zod';

export const PtyCreateSchema = z.object({
  profileId: z.string().optional(),
  cwd: z.string().optional(),
  cols: z.number().int().min(1).max(1000),
  rows: z.number().int().min(1).max(1000),
  admin: z.boolean().optional(),
  shellPath: z.string().optional(),
  shellArgs: z.array(z.string()).optional(),
});

export const PtyWriteSchema = z.object({
  id: z.string().min(1),
  data: z.string(),
});

export const PtyResizeSchema = z.object({
  id: z.string().min(1),
  cols: z.number().int().min(1).max(1000),
  rows: z.number().int().min(1).max(1000),
});

export const PtyKillSchema = z.object({
  id: z.string().min(1),
});

export const PtyAckSchema = z.object({
  id: z.string().min(1),
  length: z.number().int().min(0),
});

export const SettingsSetSchema = z.object({
  theme: z.enum(['midnight', 'graphite']).optional(),
  accent: z.string().optional(),
  windowMaterial: z.enum(['mica', 'acrylic', 'solid']).optional(),
  uiDensity: z.enum(['compact', 'normal', 'comfortable']).optional(),
  animationLevel: z.enum(['full', 'reduced', 'off']).optional(),
  fontFamily: z.string().optional(),
  fontSize: z.number().min(8).max(36).optional(),
  lineHeight: z.number().min(0.8).max(3.0).optional(),
  cursorStyle: z.enum(['block', 'underline', 'bar']).optional(),
  cursorBlink: z.boolean().optional(),
  scrollback: z.number().min(100).max(100000).optional(),
  defaultShell: z.string().optional(),
  keepRunningInBackground: z.boolean().optional(),
  startWithWindows: z.boolean().optional(),
  startMinimizedToTray: z.boolean().optional(),
  openFolderTerminalsIn: z.enum(['standalone', 'tab']).optional(),
  explorerContextMenu: z.boolean().optional(),
  rightClickAction: z.enum(['contextMenu', 'copyOrPaste', 'paste']).optional(),
  confirmMultiLinePaste: z.boolean().optional(),
  shellIntegration: z.boolean().optional(),
  showSearchTheWeb: z.boolean().optional(),
  defaultSearchEngine: z.enum(['google', 'bing', 'duckduckgo']).optional(),
  clipboardHistorySize: z.number().min(1).max(100).optional(),
  actionsPanelPinned: z.boolean().optional(),
  contextMenuVisibility: z.record(z.boolean()).optional(),
  scriptRunner: z
    .object({
      defaultOnFailure: z.enum(['stop', 'continue', 'retry']).optional(),
      defaultTimeoutSeconds: z.number().min(0).optional(),
      logRetentionCount: z.number().min(1).optional(),
      notificationsEnabled: z.boolean().optional(),
      preferPwsh: z.boolean().optional(),
    })
    .optional(),
  projectRunner: z
    .object({
      showPlayButton: z.boolean().optional(),
      autoDetect: z.boolean().optional(),
      showPrePostScripts: z.boolean().optional(),
      defaultRunTarget: z.enum(['terminal', 'new-tab']).optional(),
      confirmGlobalInstalls: z.boolean().optional(),
      suggestFromInternet: z.boolean().optional(),
      offlineMode: z.boolean().optional(),
      enabledEcosystems: z.record(z.boolean()).optional(),
    })
    .optional(),
  aiAgents: z
    .object({
      defaultLaunchMode: z.enum(['terminal', 'tab', 'window']).optional(),
      showInExplorerMenu: z.boolean().optional(),
      showInTrayMenu: z.boolean().optional(),
      extraPathDirs: z.array(z.string()).optional(),
      autoRescanOnStart: z.boolean().optional(),
    })
    .optional(),
});

export const ProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  shellPath: z.string().min(1),
  shellArgs: z.array(z.string()).default([]),
  cwd: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  env: z.record(z.string()).optional(),
  isDefault: z.boolean().optional(),
  elevate: z.boolean().optional(),
  tabTitle: z.string().optional(),
  fontFamily: z.string().optional(),
  fontSize: z.number().optional(),
});

export const ProfileSetDefaultSchema = z.object({
  id: z.string().min(1),
});

export const ProfileDeleteSchema = z.object({
  id: z.string().min(1),
});

export const IPC_CHANNELS = {
  PTY_CREATE: 'pty:create',
  PTY_WRITE: 'pty:write',
  PTY_RESIZE: 'pty:resize',
  PTY_KILL: 'pty:kill',
  PTY_ACK: 'pty:ack',
  PTY_DATA: 'pty:data',
  PTY_EXIT: 'pty:exit',
  PTY_FALLBACK: 'pty:fallback',
  SESSION_ATTACH: 'session:attach',
  SESSION_DETACH: 'session:detach',
  SESSION_LIST: 'session:list',
  SESSION_DOCK: 'session:dock',
  SESSION_POP_OUT: 'session:pop-out',
  SESSION_STANDALONE_CLOSE: 'session:standalone-close',
  SESSION_CREATE_TAB: 'session:create-tab',
  SYSTEM_REGISTRY_GET_STATUS: 'system:registry-get-status',
  SYSTEM_REGISTRY_REPAIR: 'system:registry-repair',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SHELLS_DETECT: 'shells:detect',
  PROFILES_GET: 'profiles:get',
  PROFILES_SAVE: 'profiles:save',
  PROFILES_SET_DEFAULT: 'profiles:set-default',
  PROFILES_DELETE: 'profiles:delete',
  PROFILES_DETECT: 'profiles:detect',
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_UNMAXIMIZE: 'window:unmaximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_IS_MAXIMIZED: 'window:isMaximized',
  WINDOW_READY: 'window:ready',

  // Script Runner Channels
  SCRIPTS_GET_ALL: 'scripts:get-all',
  SCRIPTS_SAVE: 'scripts:save',
  SCRIPTS_DELETE: 'scripts:delete',
  SCRIPTS_IMPORT: 'scripts:import',
  SCRIPTS_EXPORT: 'scripts:export',
  SCRIPTS_GET_SEQUENCES: 'scripts:get-sequences',
  SCRIPTS_SAVE_SEQUENCE: 'scripts:save-sequence',
  SCRIPTS_DELETE_SEQUENCE: 'scripts:delete-sequence',
  SCRIPTS_GET_INTERPRETERS: 'scripts:get-interpreters',
  SCRIPTS_RUNNER_GET_STATE: 'scripts:runner-get-state',
  SCRIPTS_RUNNER_ENQUEUE: 'scripts:runner-enqueue',
  SCRIPTS_RUNNER_LOAD_SEQUENCE: 'scripts:runner-load-sequence',
  SCRIPTS_RUNNER_START: 'scripts:runner-start',
  SCRIPTS_RUNNER_PAUSE: 'scripts:runner-pause',
  SCRIPTS_RUNNER_RESUME: 'scripts:runner-resume',
  SCRIPTS_RUNNER_STOP: 'scripts:runner-stop',
  SCRIPTS_RUNNER_SKIP: 'scripts:runner-skip',
  SCRIPTS_RUNNER_RETRY_FAILED: 'scripts:runner-retry-failed',
  SCRIPTS_RUNNER_RESUME_FROM: 'scripts:runner-resume-from',
  SCRIPTS_RUNNER_REORDER: 'scripts:runner-reorder',
  SCRIPTS_RUNNER_REMOVE_ITEM: 'scripts:runner-remove-item',
  SCRIPTS_RUNNER_CLEAR: 'scripts:runner-clear',
  SCRIPTS_RUNNER_GET_OUTPUT: 'scripts:runner-get-output',
  SCRIPTS_GET_HISTORY: 'scripts:get-history',
  SCRIPTS_DELETE_HISTORY: 'scripts:delete-history',
  SCRIPTS_CLEAR_HISTORY: 'scripts:clear-history',
  SCRIPTS_OPEN_LOG: 'scripts:open-log',

  // Snippets Channels
  SNIPPETS_GET: 'snippets:get',
  SNIPPETS_SAVE: 'snippets:save',
  SNIPPETS_DELETE: 'snippets:delete',
  SNIPPETS_IMPORT: 'snippets:import',

  // Session Inspection & System Channels
  SESSION_DETAILS: 'session:details',
  SESSION_PROCESSES: 'session:processes',
  SESSION_KILL_PROCESS_TREE: 'session:kill-process-tree',
  SYSTEM_OPEN_EXTERNAL: 'system:open-external',
  SYSTEM_OPEN_PATH: 'system:open-path',
  SYSTEM_SHOW_ITEM_IN_FOLDER: 'system:show-item-in-folder',
  SYSTEM_OPEN_IN_EDITOR: 'system:open-in-editor',
  SYSTEM_OPEN_FOLDER_PICKER: 'system:open-folder-picker',
  SYSTEM_SAVE_FILE: 'system:save-file',

  // Project Runner Channels
  PROJECT_RUNNER_DETECT: 'project-runner:detect',
  PROJECT_RUNNER_RUN: 'project-runner:run',
  PROJECT_RUNNER_STOP: 'project-runner:stop',
  PROJECT_RUNNER_RESTART: 'project-runner:restart',
  PROJECT_RUNNER_STORE_GET: 'project-runner:store-get',
  PROJECT_RUNNER_STORE_SAVE: 'project-runner:store-save',
  PROJECT_RUNNER_VALIDATE_PACKAGE: 'project-runner:validate-package',
  PROJECT_RUNNER_SEARCH_PACKAGES: 'project-runner:search-packages',

  // AI Agents Channels
  AI_AGENTS_GET_ALL: 'ai-agents:get-all',
  AI_AGENTS_DETECT_ALL: 'ai-agents:detect-all',
  AI_AGENTS_GET_PREREQS: 'ai-agents:get-prereqs',
  AI_AGENTS_ADD_CUSTOM: 'ai-agents:add-custom',
  AI_AGENTS_DELETE_CUSTOM: 'ai-agents:delete-custom',
  AI_AGENTS_LAUNCH: 'ai-agents:launch',
  AI_AGENTS_INSTALL: 'ai-agents:install',
  AI_AGENTS_UPDATE: 'ai-agents:update',
  AI_AGENTS_UNINSTALL: 'ai-agents:uninstall',
  AI_AGENTS_INSTALL_PREREQ: 'ai-agents:install-prereq',
  AI_AGENTS_ADD_TO_PATH: 'ai-agents:add-to-path',
  AI_AGENTS_GET_STATE: 'ai-agents:get-state',
  AI_AGENTS_SAVE_ENV: 'ai-agents:save-env',
  AI_AGENTS_CLEAR_DATA: 'ai-agents:clear-data',

  // Log Detector Channels
  APP_LOG_ENTRY: 'app:log-entry',
  APP_GET_RECENT_LOGS: 'app:get-recent-logs',
  APP_CLEAR_RECENT_LOGS: 'app:clear-recent-logs',
  APP_OPEN_LOG_FILE: 'app:open-log-file',
  APP_OPEN_LOG_FOLDER: 'app:open-log-folder',
  APP_GET_LOG_TAIL: 'app:get-log-tail',
  APP_SEND_RENDERER_LOG: 'app:send-renderer-log',
} as const;


