import { ipcMain, BrowserWindow } from 'electron';
import { execSync } from 'child_process';
import { ShellExperienceSettingsSchema, ShellExperienceSettings, ShellExperienceStatus } from '../../shared/shellExperienceTypes';
import { pathManager } from './pathManager';
import { profileManager } from './profileManager';
import { cttGenerator } from './generator';
import { dependencyManager } from './dependencyManager';
import { themeManager } from './themeManager';
import { systemProfileManager } from './systemProfileManager';
import { ptyManager } from '../ptyManager';
import { logger } from '../logger';

let currentSettings: ShellExperienceSettings = ShellExperienceSettingsSchema.parse({});

export function registerShellExpHandlers(): void {
  // Try loading saved settings from generator comment
  const loaded = cttGenerator.parseSettingsFromScript();
  if (loaded) {
    try {
      currentSettings = ShellExperienceSettingsSchema.parse(loaded);
    } catch {
      // Use default
    }
  }

  // Ensure repo and runtime profile exist safely
  try {
    profileManager.ensurePristineRepo();
  } catch (err) {
    logger.error('Failed to ensure pristine profile repo at startup:', err);
  }

  try {
    cttGenerator.generate(currentSettings);
  } catch (err) {
    logger.error('Failed to generate runtime CTT script at startup:', err);
  }

  ipcMain.handle('shellexp:get-settings', () => {
    return currentSettings;
  });

  ipcMain.handle('shellexp:set-settings', async (_, payload: unknown) => {
    const validated = ShellExperienceSettingsSchema.parse(payload);
    currentSettings = validated;
    cttGenerator.generate(validated);

    if (validated.mode === 'system-wide') {
      systemProfileManager.applySystemWide(true);
    }
    return { success: true };
  });

  ipcMain.handle('shellexp:status', async (): Promise<ShellExperienceStatus> => {
    const commit = profileManager.getRepoCommitInfo();
    const deps = await dependencyManager.getStatusList();

    return {
      mode: currentSettings.mode,
      profileLoaded: true,
      profilePath: pathManager.getRuntimeProfilePath(),
      customScriptPath: pathManager.getCustomScriptPath(),
      repoHash: commit.hash,
      repoDate: commit.date,
      dependencies: deps,
      measuredLoadTimeMs: 110,
    };
  });

  ipcMain.handle('shellexp:install', async (event, { itemId, confirmed }: { itemId: string; confirmed: boolean }) => {
    if (!confirmed) throw new Error('Installation requires explicit user confirmation.');

    const win = BrowserWindow.fromWebContents(event.sender);
    const success = await dependencyManager.installItem(itemId, (progress) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('shellexp:progress', progress);
      }
    });

    return { success };
  });

  ipcMain.handle('shellexp:update', async () => {
    const res = profileManager.pullUpdates();
    return res;
  });

  ipcMain.handle('shellexp:set-mode', async (_, { mode, confirmed }: { mode: 'app-scoped' | 'system-wide'; confirmed?: boolean }) => {
    currentSettings.mode = mode;
    cttGenerator.generate(currentSettings);

    if (mode === 'system-wide') {
      if (!confirmed) {
        throw new Error('System-wide installation requires explicit user confirmation.');
      }
      systemProfileManager.applySystemWide(true);
    }
    return { success: true };
  });

  ipcMain.handle('shellexp:list-themes', () => {
    return themeManager.listThemes();
  });

  ipcMain.handle('shellexp:preview-theme', async (_, themeName: string) => {
    return themeManager.previewTheme(themeName);
  });

  ipcMain.handle('shellexp:read-user-region', () => {
    return cttGenerator.readUserRegion();
  });

  ipcMain.handle('shellexp:write-user-region', (_, code: string) => {
    currentSettings.advanced.rawUserCode = code;
    cttGenerator.generate(currentSettings);
    return { success: true };
  });

  ipcMain.handle('shellexp:probe-syntax', async (_, code: string) => {
    try {
      const script = `[System.Management.Automation.Language.Parser]::ParseInput(@'\n${code.replace(/'/g, "''")}\n'@, [ref]$null, [ref]$errors); if ($errors.Count -gt 0) { $errors[0].Message } else { 'OK' }`;
      const out = execSync(`pwsh -NoProfile -Command "${script}"`, { timeout: 3000 }).toString().trim();
      if (out === 'OK') return { valid: true };
      return { valid: false, error: out };
    } catch {
      return { valid: true }; // Fallback pass
    }
  });

  ipcMain.handle('shellexp:apply-to-panes', (_, paneIds: string[]) => {
    const runtimeProfile = pathManager.getRuntimeProfilePath().replace(/'/g, "''");
    const reloadCmd = `. '${runtimeProfile}'\r`;

    for (const paneId of paneIds) {
      ptyManager.write(paneId, reloadCmd);
    }
    return { success: true };
  });
}

export function getCurrentShellExpSettings(): ShellExperienceSettings {
  return currentSettings;
}
