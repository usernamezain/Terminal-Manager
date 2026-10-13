import { Tray, Menu, app, BrowserWindow, dialog, nativeImage, Notification } from 'electron';
import path from 'path';
import fs from 'fs';
import { logger } from './logger';
import { profilesStore } from './profilesStore';
import { openTerminalFromRequest } from './launchManager';
import { scriptsStore } from './scripts/scriptsStore';
import { scriptRunner } from './scripts/scriptRunner';

let tray: Tray | null = null;
let hasShownBackgroundNotification = false;

function getTrayIconPath(): string {
  const candidates = [
    path.join(__dirname, '../../build/icons/tray.png'),
    path.join(app.getAppPath(), 'build/icons/tray.png'),
    path.join(process.resourcesPath || '', 'build/icons/tray.png'),
    path.join(process.resourcesPath || '', 'tray.png'),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return path.resolve(p);
  }

  return path.join(__dirname, '../../build/icons/icon-16x16.png');
}

export function showBackgroundNotification(): void {
  if (hasShownBackgroundNotification) return;
  hasShownBackgroundNotification = true;

  if (Notification.isSupported()) {
    try {
      const notification = new Notification({
        title: 'Terminal Manager',
        body: 'Terminal Manager is still running in the background tray.',
        icon: getTrayIconPath(),
        silent: true,
      });
      notification.show();
    } catch (err) {
      logger.warn('[Tray] Could not display background notification:', err);
    }
  }
}

export function setupJumpList(): void {
  if (process.platform !== 'win32') return;

  try {
    const exe = app.getPath('exe');
    const profiles = profilesStore.getAll();

    const tasks: Electron.Task[] = [
      {
        program: exe,
        arguments: '--new-window',
        title: 'New Terminal',
        description: 'Open a new standalone terminal window',
        iconPath: exe,
        iconIndex: 0,
      },
      {
        program: exe,
        arguments: '--new-window --cwd "%USERPROFILE%"',
        title: 'New Terminal in Home Folder',
        description: 'Open a terminal in your home directory',
        iconPath: exe,
        iconIndex: 0,
      },
    ];

    // Add profile tasks (up to 4)
    for (const p of profiles.slice(0, 4)) {
      tasks.push({
        program: exe,
        arguments: `--profile "${p.id}"`,
        title: `Profile: ${p.name}`,
        description: `Open terminal with ${p.name}`,
        iconPath: exe,
        iconIndex: 0,
      });
    }

    app.setUserTasks(tasks);
    logger.info('[JumpList] Windows JumpList tasks successfully updated.');
  } catch (err) {
    logger.warn('[JumpList] Failed to update JumpList tasks:', err);
  }
}

export function initTray(
  getMainWindow: () => BrowserWindow | null,
  showMainWindow: () => void,
  confirmQuit: () => void
): Tray {
  if (tray) return tray;

  const iconPath = getTrayIconPath();
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);
  tray.setToolTip('Terminal Manager');

  // Left click toggles main window
  tray.on('click', () => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      if (win.isVisible() && !win.isMinimized() && win.isFocused()) {
        win.hide();
      } else {
        win.show();
        if (win.isMinimized()) win.restore();
        win.focus();
      }
    } else {
      showMainWindow();
    }
  });

  const updateMenu = () => {
    if (!tray || tray.isDestroyed()) return;

    const profiles = profilesStore.getAll();
    const profileMenuItems = profiles.map((p) => ({
      label: p.name,
      click: () => {
        openTerminalFromRequest({ profileId: p.id, cwd: p.cwd, mode: 'auto' }, showMainWindow);
      },
    }));

    const runnerState = scriptRunner.getState();
    const isQueueRunning = runnerState.status === 'running';
    const sequences = scriptsStore.getAllSequences();

    const sequenceMenuItems = sequences.map((seq) => ({
      label: seq.name,
      click: () => {
        scriptRunner.loadSequence(seq.id, true);
        showMainWindow();
        const win = getMainWindow();
        if (win && !win.isDestroyed()) {
          win.webContents.send('app:navigate', 'scripts');
        }
      },
    }));

    const menuTemplate: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'Open Terminal Manager',
        click: () => showMainWindow(),
      },
      {
        label: 'New Terminal',
        click: () => {
          openTerminalFromRequest({ mode: 'auto' }, showMainWindow);
        },
      },
      {
        label: 'New Terminal in...',
        click: async () => {
          const res = await dialog.showOpenDialog({
            title: 'Select Directory for New Terminal',
            properties: ['openDirectory'],
          });
          if (!res.canceled && res.filePaths[0]) {
            const selectedFolder = res.filePaths[0];
            openTerminalFromRequest({ cwd: selectedFolder, mode: 'auto' }, showMainWindow);
          }
        },
      },
      {
        label: 'Profiles',
        submenu: profileMenuItems.length > 0 ? profileMenuItems : [{ label: 'No profiles found', enabled: false }],
      },
      { type: 'separator' },
      {
        label: 'Script Runner',
        click: () => {
          showMainWindow();
          const win = getMainWindow();
          if (win && !win.isDestroyed()) {
            win.webContents.send('app:navigate', 'scripts');
          }
        },
      },
    ];

    if (sequenceMenuItems.length > 0) {
      menuTemplate.push({
        label: 'Run Sequence',
        submenu: sequenceMenuItems,
      });
    }

    if (isQueueRunning) {
      menuTemplate.push({
        label: 'Stop Running Queue',
        click: () => {
          scriptRunner.stopQueue();
        },
      });
    }

    menuTemplate.push(
      { type: 'separator' },
      {
        label: 'Settings',
        click: () => {
          showMainWindow();
          const win = getMainWindow();
          if (win && !win.isDestroyed()) {
            win.webContents.send('app:navigate', 'settings');
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => confirmQuit(),
      }
    );

    const contextMenu = Menu.buildFromTemplate(menuTemplate);

    tray.setContextMenu(contextMenu);
  };

  // Re-build context menu on right-click to reflect current profiles
  tray.on('right-click', () => {
    updateMenu();
  });

  updateMenu();
  setupJumpList();

  return tray;
}

export function destroyTray(): void {
  if (tray && !tray.isDestroyed()) {
    tray.destroy();
    tray = null;
  }
}
