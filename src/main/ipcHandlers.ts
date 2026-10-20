import { ipcMain, BrowserWindow, app, dialog, shell } from 'electron';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import {
  PtyCreateSchema,
  PtyWriteSchema,
  PtyResizeSchema,
  PtyKillSchema,
  PtyAckSchema,
  SettingsSetSchema,
  ProfileSchema,
  ProfileSetDefaultSchema,
  ProfileDeleteSchema,
  IPC_CHANNELS,
} from '../shared/ipc';
import { scriptsStore } from './scripts/scriptsStore';
import { scriptRunner } from './scripts/scriptRunner';
import { interpreterDetector } from './scripts/interpreterDetector';
import { ptyManager, sessionManager } from './sessionManager';
import { standaloneWindowManager } from './standaloneWindowManager';
import {
  registerExplorerContextMenu,
  unregisterExplorerContextMenu,
  isExplorerContextMenuRegistered,
} from './registryIntegration';
import { setupJumpList } from './trayManager';
import { settingsStore } from './settingsStore';
import { profilesStore } from './profilesStore';
import { detectShells } from './shellDetector';
import { logger } from './logger';
import { mainPerfTracker } from './perfTracker';
import { shellPool } from './shellPool';
import { logHop } from './launchDebugger';

import { windowManager } from './windowManager';
import { snippetsStore } from './snippetsStore';
import { registerProjectRunnerHandlers } from './project-runner/projectRunnerHandlers';
import { registerAgentHandlers } from './ai-agents/agentHandlers';

let ipcHandlersInitialized = false;

export function setupIpcHandlers(mainWindow?: BrowserWindow): void {
  if (ipcHandlersInitialized) {
    return;
  }
  ipcHandlersInitialized = true;

  registerProjectRunnerHandlers();
  registerAgentHandlers();


  // PTY Create
  ipcMain.handle(IPC_CHANNELS.PTY_CREATE, async (event, args) => {
    logger.info('IPC handle pty:create', args);
    logHop('H5', { channel: 'pty:create', payload: args });
    const parsed = PtyCreateSchema.safeParse(args);
    if (!parsed.success) {
      throw new Error(`Invalid pty:create payload: ${parsed.error.message}`);
    }
    const callerWin = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    return ptyManager.create(parsed.data, callerWin);
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

  // Session Attach
  ipcMain.handle(IPC_CHANNELS.SESSION_ATTACH, async (_event, args: { sessionId: string }) => {
    const win = BrowserWindow.fromWebContents(_event.sender);
    if (!win) return false;
    return sessionManager.attach(args.sessionId, win);
  });

  // Session Detach
  ipcMain.handle(IPC_CHANNELS.SESSION_DETACH, async (_event, args: { sessionId: string }) => {
    return sessionManager.detach(args.sessionId);
  });

  // Session List
  ipcMain.handle(IPC_CHANNELS.SESSION_LIST, async () => {
    return sessionManager.list();
  });

  // Session Dock to Main
  ipcMain.handle(IPC_CHANNELS.SESSION_DOCK, async (event, args?: { sessionId?: string }) => {
    let sId = args?.sessionId;
    if (!sId) {
      const callerWin = BrowserWindow.fromWebContents(event.sender);
      if (callerWin) {
        sId = standaloneWindowManager.getSessionIdByWindow(callerWin);
      }
    }
    if (!sId) return false;
    return standaloneWindowManager.dockToMain(sId, () => windowManager.getMainWindow());
  });

  // Session Pop Out
  ipcMain.handle(IPC_CHANNELS.SESSION_POP_OUT, async (_event, args: { sessionId: string }) => {
    return Boolean(standaloneWindowManager.popOut(args.sessionId, () => windowManager.getMainWindow()));
  });

  // Session Standalone Close Action
  ipcMain.handle(
    IPC_CHANNELS.SESSION_STANDALONE_CLOSE,
    async (_event, args: { sessionId: string; action: 'dock' | 'background' | 'terminate' }) => {
      const win = BrowserWindow.fromWebContents(_event.sender);
      if (args.action === 'dock') {
        standaloneWindowManager.dockToMain(args.sessionId, () => windowManager.getMainWindow());
      } else if (args.action === 'background') {
        sessionManager.detach(args.sessionId);
        if (win && !win.isDestroyed()) win.destroy();
      } else if (args.action === 'terminate') {
        sessionManager.kill(args.sessionId);
        if (win && !win.isDestroyed()) win.destroy();
      }
    }
  );

  // Session Create Tab in Main Window (e.g. from Standalone Project Runner)
  ipcMain.handle(
    IPC_CHANNELS.SESSION_CREATE_TAB,
    async (_event, args: { cwd?: string; command?: string }) => {
      const { openTerminalFromRequest } = await import('./launchManager');
      const res = openTerminalFromRequest(
        {
          cwd: args?.cwd,
          mode: 'tab',
        },
        () => {
          const mw = windowManager.getMainWindow();
          if (mw && !mw.isDestroyed()) {
            mw.show();
            mw.focus();
          }
          return mw!;
        }
      );

      if (res.sessionId && args?.command) {
        setTimeout(() => {
          sessionManager.write(res.sessionId, `${args.command}\r`);
        }, 400);
      }
      return res;
    }
  );

  // System Registry Status
  ipcMain.handle(IPC_CHANNELS.SYSTEM_REGISTRY_GET_STATUS, async () => {
    return isExplorerContextMenuRegistered();
  });

  // System Registry Repair
  ipcMain.handle(IPC_CHANNELS.SYSTEM_REGISTRY_REPAIR, async () => {
    const res = await registerExplorerContextMenu();
    setupJumpList();
    return res;
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

    // Sync Windows startup login item
    if (typeof parsed.data.startWithWindows === 'boolean') {
      try {
        app.setLoginItemSettings({
          openAtLogin: parsed.data.startWithWindows,
          args: ['--hidden'],
        });
      } catch (err) {
        logger.warn('[Settings] Failed to set login item settings:', err);
      }
    }

    // Sync Explorer context menu
    if (typeof parsed.data.explorerContextMenu === 'boolean') {
      try {
        if (parsed.data.explorerContextMenu) {
          await registerExplorerContextMenu();
        } else {
          await unregisterExplorerContextMenu();
        }
      } catch (err) {
        logger.warn('[Settings] Failed to update explorer context menu:', err);
      }
    }

    return settingsStore.set(parsed.data);
  });

  // Shells Detect
  ipcMain.handle(IPC_CHANNELS.SHELLS_DETECT, async () => {
    return detectShells();
  });

  // Profiles Get
  ipcMain.handle(IPC_CHANNELS.PROFILES_GET, async () => {
    return profilesStore.getAll();
  });

  // Profiles Save
  ipcMain.handle(IPC_CHANNELS.PROFILES_SAVE, async (_event, args) => {
    const parsed = ProfileSchema.safeParse(args);
    if (!parsed.success) {
      throw new Error(`Invalid profile payload: ${parsed.error.message}`);
    }
    return profilesStore.save(parsed.data);
  });

  // Profiles Set Default
  ipcMain.handle(IPC_CHANNELS.PROFILES_SET_DEFAULT, async (_event, args) => {
    const parsed = ProfileSetDefaultSchema.safeParse(args);
    if (!parsed.success) {
      throw new Error(`Invalid set-default profile payload: ${parsed.error.message}`);
    }
    return profilesStore.setDefault(parsed.data.id);
  });

  // Profiles Delete
  ipcMain.handle(IPC_CHANNELS.PROFILES_DELETE, async (_event, args) => {
    const parsed = ProfileDeleteSchema.safeParse(args);
    if (!parsed.success) {
      throw new Error(`Invalid delete profile payload: ${parsed.error.message}`);
    }
    return profilesStore.delete(parsed.data.id);
  });

  // Profiles Auto Detect & Merge
  ipcMain.handle(IPC_CHANNELS.PROFILES_DETECT, async () => {
    return profilesStore.detectAndMerge();
  });

  // Window Controls
  ipcMain.handle(IPC_CHANNELS.WINDOW_MINIMIZE, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) win.minimize();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_MAXIMIZE, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_UNMAXIMIZE, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) win.unmaximize();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) win.close();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_IS_MAXIMIZED, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return Boolean(win && !win.isDestroyed() && win.isMaximized());
  });

  // Typed Window Handshake (Renderer is ready and mounted)
  ipcMain.handle(IPC_CHANNELS.WINDOW_READY, async (event, args?: { windowId?: number; sessionId?: string }) => {
    const callerWin = BrowserWindow.fromWebContents(event.sender);
    if (!callerWin) return { success: false, error: 'Caller window not found' };

    const managed = windowManager.get(callerWin.id);
    const sId =
      args?.sessionId ||
      managed?.sessionIds[0] ||
      standaloneWindowManager.getSessionIdByWindow(callerWin);

    if (sId) {
      return standaloneWindowManager.completeHandshake(sId, callerWin);
    }
    return { success: true, isMain: true };
  });

  ipcMain.handle('app:shell-memory', async () => {
    const pids = ptyManager.getActivePids();
    if (pids.length === 0) return { count: 0, totalMemoryMb: 0, formatted: '0 MB' };

    try {
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

  ipcMain.handle('perf:get-main-timestamps', async () => {
    return mainPerfTracker.getTimestamps();
  });

  ipcMain.handle('perf:log-summary', async (_event, summary) => {
    logger.info('[Perf Timeline Summary]', JSON.stringify(summary, null, 2));
  });

  ipcMain.handle('app:pool-status', async () => {
    return shellPool.getStatus();
  });

  // =========================================================================
  // Log Detector IPC Handlers
  // =========================================================================

  ipcMain.handle(IPC_CHANNELS.APP_GET_RECENT_LOGS, async () => {
    return logger.getRecentLogs();
  });

  ipcMain.handle(IPC_CHANNELS.APP_GET_LOG_TAIL, async (_event, args?: { maxBytes?: number; maxLines?: number }) => {
    return logger.getLogTail(args?.maxBytes, args?.maxLines);
  });

  ipcMain.handle(IPC_CHANNELS.APP_CLEAR_RECENT_LOGS, async () => {
    logger.clearRecentLogs();
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.APP_OPEN_LOG_FILE, async () => {
    await logger.openLogFile();
  });

  ipcMain.handle(IPC_CHANNELS.APP_OPEN_LOG_FOLDER, async () => {
    await logger.openLogFolder();
  });

  ipcMain.handle(IPC_CHANNELS.APP_SEND_RENDERER_LOG, async (_event, payload) => {
    if (payload && typeof payload.message === 'string') {
      logger.addEntry({
        level: payload.level || 'info',
        message: payload.message,
        details: payload.details,
        source: payload.source || 'renderer',
        category: payload.category,
      });
    }
  });

  // =========================================================================
  // Script Runner IPC Handlers
  // =========================================================================

  ipcMain.handle(IPC_CHANNELS.SCRIPTS_GET_ALL, async () => {
    return scriptsStore.getAllScripts();
  });

  ipcMain.handle(IPC_CHANNELS.SCRIPTS_SAVE, async (_event, script) => {
    return scriptsStore.saveScript(script);
  });

  ipcMain.handle(IPC_CHANNELS.SCRIPTS_DELETE, async (_event, { id }) => {
    return scriptsStore.deleteScript(id);
  });

  ipcMain.handle(IPC_CHANNELS.SCRIPTS_IMPORT, async (event) => {
    const callerWin = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    const res = await dialog.showOpenDialog(callerWin!, {
      title: 'Import Scripts',
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Supported Scripts',
          extensions: ['ps1', 'bat', 'cmd', 'js', 'mjs', 'cjs', 'ts', 'py', 'sh', 'vbs', 'json'],
        },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (res.canceled || res.filePaths.length === 0) return [];

    const importedScripts: any[] = [];
    for (const filePath of res.filePaths) {
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.json') {
        // Maybe an exported JSON bundle
        try {
          const raw = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(raw);
          const list = Array.isArray(data) ? data : (data.scripts || [data]);
          for (const s of list) {
            if (s.name && s.type) {
              const saved = scriptsStore.saveScript({
                ...s,
                id: `script-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                isImported: true,
                hasApprovedRun: false,
              });
              importedScripts.push(saved);
            }
          }
        } catch (err) {
          logger.error(`[IPC] Failed to import JSON file ${filePath}:`, err);
        }
      } else {
        const type = interpreterDetector.detectTypeFromExtension(filePath);
        const name = path.basename(filePath, ext);
        const saved = scriptsStore.saveScript({
          id: `script-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name,
          type,
          source: 'file',
          filePath,
          args: [],
          env: {},
          timeoutSeconds: 0,
          visibility: 'hidden',
          onFailure: 'stop',
          isImported: true,
          hasApprovedRun: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        importedScripts.push(saved);
      }
    }
    return importedScripts;
  });

  ipcMain.handle(IPC_CHANNELS.SCRIPTS_EXPORT, async (event, { scriptIds }) => {
    const callerWin = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    const res = await dialog.showSaveDialog(callerWin!, {
      title: 'Export Scripts',
      defaultPath: 'scripts-export.json',
      filters: [{ name: 'JSON Bundle', extensions: ['json'] }],
    });

    if (res.canceled || !res.filePath) return { success: false };

    const all = scriptsStore.getAllScripts();
    const toExport = scriptIds && scriptIds.length > 0
      ? all.filter((s) => scriptIds.includes(s.id))
      : all;

    fs.writeFileSync(res.filePath, JSON.stringify(toExport, null, 2), 'utf8');
    return { success: true, filePath: res.filePath };
  });

  ipcMain.handle(IPC_CHANNELS.SCRIPTS_GET_SEQUENCES, async () => {
    return scriptsStore.getAllSequences();
  });

  ipcMain.handle(IPC_CHANNELS.SCRIPTS_SAVE_SEQUENCE, async (_event, seq) => {
    return scriptsStore.saveSequence(seq);
  });

  ipcMain.handle(IPC_CHANNELS.SCRIPTS_DELETE_SEQUENCE, async (_event, { id }) => {
    return scriptsStore.deleteSequence(id);
  });

  ipcMain.handle(IPC_CHANNELS.SCRIPTS_GET_INTERPRETERS, async (_event, { forceRefresh }) => {
    return interpreterDetector.detectAll(forceRefresh);
  });

  ipcMain.handle(IPC_CHANNELS.SCRIPTS_RUNNER_GET_STATE, async () => {
    return scriptRunner.getState();
  });

  ipcMain.handle(IPC_CHANNELS.SCRIPTS_RUNNER_ENQUEUE, async (_event, { items, startImmediately }) => {
    return scriptRunner.enqueue(items, startImmediately ?? true);
  });

  ipcMain.handle(IPC_CHANNELS.SCRIPTS_RUNNER_LOAD_SEQUENCE, async (_event, { sequenceId, runImmediately }) => {
    return scriptRunner.loadSequence(sequenceId, runImmediately ?? true);
  });

  ipcMain.handle(IPC_CHANNELS.SCRIPTS_RUNNER_START, async () => {
    scriptRunner.startQueue();
  });

  ipcMain.handle(IPC_CHANNELS.SCRIPTS_RUNNER_PAUSE, async () => {
    scriptRunner.pauseQueue();
  });

  ipcMain.handle(IPC_CHANNELS.SCRIPTS_RUNNER_RESUME, async () => {
    scriptRunner.resumeQueue();
  });

  ipcMain.handle(IPC_CHANNELS.SCRIPTS_RUNNER_STOP, async () => {
    scriptRunner.stopQueue();
  });

  ipcMain.handle(IPC_CHANNELS.SCRIPTS_RUNNER_SKIP, async () => {
    scriptRunner.skipCurrent();
  });

  ipcMain.handle(IPC_CHANNELS.SCRIPTS_RUNNER_RETRY_FAILED, async () => {
    scriptRunner.retryFailed();
  });

  ipcMain.handle(IPC_CHANNELS.SCRIPTS_RUNNER_RESUME_FROM, async (_event, { queueId }) => {
    scriptRunner.resumeFromHere(queueId);
  });

  ipcMain.handle(IPC_CHANNELS.SCRIPTS_RUNNER_REORDER, async (_event, { orderedQueueIds }) => {
    return scriptRunner.reorderQueue(orderedQueueIds);
  });

  ipcMain.handle(IPC_CHANNELS.SCRIPTS_RUNNER_REMOVE_ITEM, async (_event, { queueId }) => {
    return scriptRunner.removeItem(queueId);
  });

  ipcMain.handle(IPC_CHANNELS.SCRIPTS_RUNNER_CLEAR, async () => {
    scriptRunner.clearQueue();
  });

  ipcMain.handle(IPC_CHANNELS.SCRIPTS_RUNNER_GET_OUTPUT, async (_event, { queueId }) => {
    return scriptRunner.getLiveOutput(queueId);
  });

  ipcMain.handle(IPC_CHANNELS.SCRIPTS_GET_HISTORY, async () => {
    return scriptsStore.getHistory();
  });

  ipcMain.handle(IPC_CHANNELS.SCRIPTS_DELETE_HISTORY, async (_event, { id }) => {
    return scriptsStore.deleteHistoryRecord(id);
  });

  ipcMain.handle(IPC_CHANNELS.SCRIPTS_CLEAR_HISTORY, async () => {
    scriptsStore.clearHistory();
  });

  ipcMain.handle(IPC_CHANNELS.SCRIPTS_OPEN_LOG, async (_event, { logPath }) => {
    if (logPath && fs.existsSync(logPath)) {
      shell.openPath(logPath);
    }
  });

  // =========================================================================
  // Snippets IPC Handlers
  // =========================================================================

  ipcMain.handle(IPC_CHANNELS.SNIPPETS_GET, async () => {
    return snippetsStore.getAll();
  });

  ipcMain.handle(IPC_CHANNELS.SNIPPETS_SAVE, async (_event, snippet) => {
    return snippetsStore.save(snippet);
  });

  ipcMain.handle(IPC_CHANNELS.SNIPPETS_DELETE, async (_event, { id }) => {
    return snippetsStore.delete(id);
  });

  ipcMain.handle(IPC_CHANNELS.SNIPPETS_IMPORT, async (_event, { snippets }) => {
    return snippetsStore.import(snippets);
  });

  // =========================================================================
  // Session Inspection & System Handlers
  // =========================================================================

  ipcMain.handle(IPC_CHANNELS.SESSION_DETAILS, async (_event, { sessionId }) => {
    return sessionManager.getDetails(sessionId);
  });

  ipcMain.handle(IPC_CHANNELS.SESSION_PROCESSES, async (_event, { sessionId }) => {
    return sessionManager.getProcesses(sessionId);
  });

  ipcMain.handle(IPC_CHANNELS.SESSION_KILL_PROCESS_TREE, async (_event, { pid }) => {
    return sessionManager.killProcessTree(pid);
  });

  ipcMain.handle(IPC_CHANNELS.SYSTEM_OPEN_EXTERNAL, async (_event, { url }) => {
    if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:'))) {
      await shell.openExternal(url);
    }
  });

  ipcMain.handle(IPC_CHANNELS.SYSTEM_OPEN_PATH, async (_event, { path: targetPath }) => {
    if (targetPath) {
      return shell.openPath(targetPath);
    }
    return '';
  });

  ipcMain.handle(IPC_CHANNELS.SYSTEM_SHOW_ITEM_IN_FOLDER, async (_event, { path: targetPath }) => {
    if (targetPath && fs.existsSync(targetPath)) {
      shell.showItemInFolder(targetPath);
    }
  });

  ipcMain.handle(IPC_CHANNELS.SYSTEM_OPEN_IN_EDITOR, async (_event, { filePath, line, col }) => {
    if (!filePath) return false;
    try {
      const lineArg = line ? (col ? `${filePath}:${line}:${col}` : `${filePath}:${line}`) : filePath;
      execSync(`code -g "${lineArg}"`, { stdio: 'ignore' });
      return true;
    } catch {
      try {
        const res = await shell.openPath(filePath);
        return res === '';
      } catch {
        return false;
      }
    }
  });

  ipcMain.handle(IPC_CHANNELS.SYSTEM_OPEN_FOLDER_PICKER, async (event) => {
    const callerWin = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    const res = await dialog.showOpenDialog(callerWin!, {
      properties: ['openDirectory'],
      title: 'Select Folder',
    });
    if (res.canceled || res.filePaths.length === 0) return null;
    return res.filePaths[0];
  });

  ipcMain.handle(IPC_CHANNELS.SYSTEM_SAVE_FILE, async (event, { defaultPath, content }) => {
    const callerWin = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    const res = await dialog.showSaveDialog(callerWin!, {
      defaultPath,
      title: 'Export Terminal Output',
      filters: [
        { name: 'Text Document (*.txt)', extensions: ['txt'] },
        { name: 'HTML Document (*.html)', extensions: ['html'] },
        { name: 'All Files (*.*)', extensions: ['*'] },
      ],
    });
    if (res.canceled || !res.filePath) return false;
    fs.writeFileSync(res.filePath, content, 'utf8');
    return true;
  });

  // Diagnostics and Issue Reporting Handlers
  ipcMain.handle('app:copy-diagnostics', async () => {
    const { generateDiagnosticsReport } = await import('./diagnosticsManager');
    return await generateDiagnosticsReport();
  });

  ipcMain.handle('app:report-issue', async (_event, args?: { type?: 'bug' | 'feature' }) => {
    const issueType = args?.type || 'bug';
    const version = app.getVersion() || '0.1.0';
    const osVer = `Windows (${process.arch})`;
    const baseUrl = 'https://github.com/mughaldev0/Terminal-Manager/issues/new';
    let targetUrl = baseUrl;

    if (issueType === 'bug') {
      const params = new URLSearchParams({
        template: 'bug_report.yml',
        'app-version': version,
        'windows-version': osVer,
      });
      targetUrl = `${baseUrl}?${params.toString()}`;
    } else {
      targetUrl = `${baseUrl}?template=feature_request.yml`;
    }

    await shell.openExternal(targetUrl);
    return { success: true };
  });
}
