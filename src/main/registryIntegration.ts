import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { logger } from './logger';

export interface RegistryResult {
  success: boolean;
  message: string;
}

const REG_KEYS = [
  {
    base: 'HKCU\\Software\\Classes\\Directory\\Background\\shell\\TerminalManager',
    label: 'Open in Terminal Manager',
    param: '%V',
    newWindow: false,
  },
  {
    base: 'HKCU\\Software\\Classes\\Directory\\shell\\TerminalManager',
    label: 'Open in Terminal Manager',
    param: '%1',
    newWindow: false,
  },
  {
    base: 'HKCU\\Software\\Classes\\Drive\\shell\\TerminalManager',
    label: 'Open in Terminal Manager',
    param: '%1',
    newWindow: false,
  },
  {
    base: 'HKCU\\Software\\Classes\\Directory\\Background\\shell\\TerminalManagerNewWin',
    label: 'Open in Terminal Manager (New Window)',
    param: '%V',
    newWindow: true,
  },
  {
    base: 'HKCU\\Software\\Classes\\Directory\\shell\\TerminalManagerNewWin',
    label: 'Open in Terminal Manager (New Window)',
    param: '%1',
    newWindow: true,
  },
  {
    base: 'HKCU\\Software\\Classes\\Drive\\shell\\TerminalManagerNewWin',
    label: 'Open in Terminal Manager (New Window)',
    param: '%1',
    newWindow: true,
  },
];

function runReg(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    execFile('reg.exe', args, (err, stdout, stderr) => {
      resolve({
        stdout: stdout || '',
        stderr: stderr || '',
        code: err ? (err as any).code || 1 : 0,
      });
    });
  });
}

/**
 * Gets the valid icon file path (.ico) on disk.
 */
export function getAppIconPath(): string {
  const rootDir = app?.getAppPath ? app.getAppPath() : process.cwd();
  // Check build/icons/icon.ico relative to app root
  const candidates = [
    path.join(__dirname, '../../build/icons/icon.ico'),
    path.join(rootDir, 'build/icons/icon.ico'),
    path.join(process.resourcesPath || '', 'icon.ico'),
    path.join(process.resourcesPath || '', 'build/icons/icon.ico'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return path.resolve(candidate);
    }
  }

  return app?.getPath ? app.getPath('exe') : process.execPath;
}

/**
 * Resolves the actual app executable path for registry registration.
 * Never returns node.exe, even in development or during test execution.
 */
export function getAppExePath(): string {
  if (app?.isPackaged && app?.getPath) {
    return app.getPath('exe');
  }

  // In development / unpackaged mode, target electron.exe in node_modules
  const rootDir = app?.getAppPath ? app.getAppPath() : process.cwd();
  const localElectron = path.join(rootDir, 'node_modules', 'electron', 'dist', 'electron.exe');
  if (fs.existsSync(localElectron)) {
    return path.resolve(localElectron);
  }

  if (app?.getPath) {
    try {
      const p = app.getPath('exe');
      if (p && !p.toLowerCase().endsWith('node.exe')) {
        return path.resolve(p);
      }
    } catch {}
  }

  return process.execPath;
}

/**
 * Generates the command line invocation for Windows Explorer context menu.
 */
export function getCommandLine(param: string, newWindow: boolean): string {
  const exePath = getAppExePath();
  const flags = newWindow ? '--new-window ' : '';

  if (app?.isPackaged) {
    return `"${exePath}" ${flags}--cwd="${param}"`;
  } else {
    const appPath = app?.getAppPath ? app.getAppPath() : process.cwd();
    return `"${exePath}" "${appPath}" ${flags}--cwd="${param}"`;
  }
}

/**
 * Checks if the context menu keys are currently registered in HKCU.
 */
export async function isExplorerContextMenuRegistered(): Promise<boolean> {
  if (process.platform !== 'win32') return false;

  const firstItem = REG_KEYS[0];
  if (!firstItem) return false;
  const res = await runReg(['query', firstItem.base]);
  return res.code === 0;
}

/**
 * Registers HKCU Explorer context menu entries safely using execFile.
 */
export async function registerExplorerContextMenu(): Promise<RegistryResult> {
  if (process.platform !== 'win32') {
    return { success: false, message: 'Explorer context menu is only supported on Windows.' };
  }

  const iconPath = getAppIconPath();
  logger.info(`[Registry] Registering Explorer context menu using icon: ${iconPath}`);

  try {
    for (const item of REG_KEYS) {
      // 1. Set default label
      await runReg(['add', item.base, '/ve', '/d', item.label, '/f']);

      // 2. Set Icon
      await runReg(['add', item.base, '/v', 'Icon', '/d', iconPath, '/f']);

      // 3. Set command subkey
      const cmdKey = `${item.base}\\command`;
      const cmdVal = getCommandLine(item.param, item.newWindow);
      await runReg(['add', cmdKey, '/ve', '/d', cmdVal, '/f']);
    }

    logger.info('[Registry] Successfully registered Explorer context menu in HKCU.');
    return { success: true, message: 'Context menu successfully registered.' };
  } catch (err: any) {
    logger.error('[Registry] Failed to register Explorer context menu:', err);
    return { success: false, message: `Failed to register: ${err?.message || err}` };
  }
}

/**
 * Removes HKCU Explorer context menu entries.
 */
export async function unregisterExplorerContextMenu(): Promise<RegistryResult> {
  if (process.platform !== 'win32') {
    return { success: false, message: 'Explorer context menu is only supported on Windows.' };
  }

  logger.info('[Registry] Unregistering Explorer context menu from HKCU.');

  try {
    for (const item of REG_KEYS) {
      await runReg(['delete', item.base, '/f']);
    }

    logger.info('[Registry] Successfully removed Explorer context menu keys.');
    return { success: true, message: 'Context menu successfully removed.' };
  } catch (err: any) {
    logger.error('[Registry] Failed to delete Explorer context menu keys:', err);
    return { success: false, message: `Failed to remove: ${err?.message || err}` };
  }
}
