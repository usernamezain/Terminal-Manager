import { BrowserWindow } from 'electron';
import { logger } from './logger';
import { settingsStore } from './settingsStore';
import { profilesStore } from './profilesStore';
import { sessionManager } from './sessionManager';
import { resolveLaunchCwd } from './cliHandler';
import { standaloneWindowManager } from './standaloneWindowManager';
import { windowManager } from './windowManager';
import { logHop } from './launchDebugger';

export interface OpenTerminalRequest {
  cwd?: string;
  profileId?: string;
  mode?: 'window' | 'tab' | 'auto';
  showMainWindowFn?: () => BrowserWindow;
  env?: Record<string, string>;
  title?: string;
}

const DEBUG = Boolean(process.env.TERMINAL_DEBUG || process.env.DEBUG);

/**
 * Unified entry point for all launch requests:
 * CLI, second-instance, Explorer context menu, system tray, and Windows Jump List.
 */
export function openTerminalFromRequest(
  request: OpenTerminalRequest,
  showMainWindowFn?: () => void
): { sessionId: string; windowId?: number } {
  logHop('H4', request);

  if (DEBUG) {
    logger.info('[DEBUG Hop: Launch Request]', JSON.stringify(request));
  }

  // 1. Resolve Profile
  let targetProfile = profilesStore.getDefault();
  if (request.profileId) {
    const matched =
      profilesStore.getById(request.profileId) ||
      profilesStore.getAll().find((p) => p.name.toLowerCase() === request.profileId!.toLowerCase());
    if (matched) {
      targetProfile = matched;
    } else {
      logger.warn(`[Launch] Requested profile "${request.profileId}" not found. Falling back to default.`);
    }
  }

  // 2. Resolve CWD
  const { cwd: resolvedCwd, requestedCwdInvalid } = resolveLaunchCwd(request.cwd, targetProfile);

  if (DEBUG) {
    logger.info(`[DEBUG Hop: CWD Resolved] requested="${request.cwd}" -> resolved="${resolvedCwd}" (invalid: ${requestedCwdInvalid || 'none'})`);
  }

  // 3. Create Session in Main Process (never decides CWD in renderer)
  const session = sessionManager.create({
    profileId: targetProfile?.id,
    cwd: resolvedCwd,
    cols: 80,
    rows: 24,
    env: request.env,
    title: request.title,
  });

  if (DEBUG) {
    logger.info(`[DEBUG Hop: Session Created] sessionId="${session.id}" pid=${session.pid} cwd="${resolvedCwd}"`);
  }

  // 4. Determine Presentation Mode
  const settings = settingsStore.get();
  let effectiveMode: 'window' | 'tab' = 'window';

  if (request.mode === 'window') {
    effectiveMode = 'window';
  } else if (request.mode === 'tab') {
    effectiveMode = 'tab';
  } else {
    // 'auto': check Settings > General "Open folder terminals in"
    const settingPref = settings.openFolderTerminalsIn || 'standalone';
    effectiveMode = settingPref === 'tab' ? 'tab' : 'window';
  }

  if (DEBUG) {
    logger.info(`[DEBUG Hop: Mode Selected] mode="${effectiveMode}"`);
  }

  // 5. Present Window / Tab
  if (effectiveMode === 'window') {
    const win = standaloneWindowManager.create(
      session.id,
      targetProfile?.id,
      resolvedCwd,
      () => windowManager.getMainWindow()
    );

    if (DEBUG) {
      logger.info(`[DEBUG Hop: Window Created] Standalone BrowserWindow #${win.id} for session ${session.id}`);
    }

    if (requestedCwdInvalid) {
      const sendToast = () => {
        if (!win.isDestroyed()) {
          win.webContents.send('toast:show', {
            type: 'warning',
            message: `Folder not found: "${requestedCwdInvalid}"`,
          });
        }
      };
      if (win.webContents.isLoading()) {
        win.webContents.once('did-finish-load', sendToast);
      } else {
        sendToast();
      }
    }

    return { sessionId: session.id, windowId: win.id };
  } else {
    // Mode is 'tab' in main window
    if (showMainWindowFn) {
      showMainWindowFn();
    }
    const mainWin = windowManager.getMainWindow();

    if (mainWin && !mainWin.isDestroyed()) {
      if (DEBUG) {
        logger.info(`[DEBUG Hop: Window Reused] Docking session ${session.id} as tab in main window #${mainWin.id}`);
      }

      mainWin.webContents.send('session:dock-tab', {
        sessionId: session.id,
        profileId: targetProfile?.id,
        title: request.title || targetProfile?.name || 'Terminal',
        cwd: resolvedCwd,
      });

      sessionManager.attach(session.id, mainWin);

      if (requestedCwdInvalid) {
        const sendToast = () => {
          if (!mainWin.isDestroyed()) {
            mainWin.webContents.send('toast:show', {
              type: 'warning',
              message: `Folder not found: "${requestedCwdInvalid}"`,
            });
          }
        };
        if (mainWin.webContents.isLoading()) {
          mainWin.webContents.once('did-finish-load', sendToast);
        } else {
          sendToast();
        }
      }

      return { sessionId: session.id, windowId: mainWin.id };
    }

    return { sessionId: session.id };
  }
}
