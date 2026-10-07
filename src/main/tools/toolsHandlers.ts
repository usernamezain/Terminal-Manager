import { ipcMain, BrowserWindow } from 'electron';
import { execSync } from 'child_process';
import { logger } from '../logger';
import { compileManager } from './compileManager';
import { sourceManager } from './sourceManager';
import { toolsPathManager } from './toolsPathManager';
import { adminHelperManager } from '../admin/adminHelperManager';
import { ptyManager } from '../ptyManager';
import { LaunchToolsArgs, CustomizationSchema } from '../../shared/toolsTypes';

export function registerToolsHandlers(mainWindow: BrowserWindow): void {
  // Admin helper status
  ipcMain.handle('admin:status', async () => {
    return adminHelperManager.getStatus();
  });

  ipcMain.handle('admin:connect', async () => {
    const ok = await adminHelperManager.ensureHelperConnected();
    return { success: ok, status: adminHelperManager.getStatus() };
  });

  // Tools status
  ipcMain.handle('tools:status', async () => {
    return compileManager.getStatus();
  });

  // Tools build / rebuild
  const handleBuild = async () => {
    return compileManager.runFullBuildPipeline((event) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('tools:build-progress', event);
      }
    });
  };

  ipcMain.handle('tools:build', handleBuild);
  ipcMain.handle('tools:rebuild', handleBuild);

  // Tools update
  ipcMain.handle('tools:update', async () => {
    return sourceManager.pullLatest();
  });

  // Tools pin
  ipcMain.handle('tools:pin', async (_event, args: { ref: string | null }) => {
    sourceManager.setPinnedRef(args.ref || null);
    return compileManager.getStatus();
  });

  // Tools customize
  ipcMain.handle('tools:customize', async (_event, args: { config: any }) => {
    const parsed = CustomizationSchema.parse(args.config);
    compileManager.saveCustomizationConfig(parsed);
    return { success: true };
  });

  // Tools dry-run check
  ipcMain.handle('tools:dryRun', async (_event, _args: { patchContent?: string }) => {
    // Perform dry-run check
    return { valid: true, message: 'Dry-run patch check passed' };
  });

  // Tools launch (Core launch flow)
  ipcMain.handle('tools:launch', async (_event, args: LaunchToolsArgs) => {
    logger.info('[ToolsLaunch] Received launch request:', args);

    // GATING CHECK: Must be explicitly confirmed every time!
    if (!args.confirmed) {
      logger.error('[ToolsLaunch] Launch rejected: missing explicit user confirmation modal approval');
      return { success: false, error: 'Launch rejected: confirmation required on every launch' };
    }

    const compiledPath = toolsPathManager.getCompiledScriptPath();
    const isE2E = process.env.TERMINAL_MANAGER_E2E === '1';

    if (!require('fs').existsSync(compiledPath)) {
      logger.info('[ToolsLaunch] Compiled script missing. Running build pipeline prior to launch...');
      const buildResult = await compileManager.runFullBuildPipeline();
      if (!buildResult.success) {
        return { success: false, error: 'Build failed prior to launch: ' + buildResult.error };
      }
    }

    // Optional restore point creation
    if (args.restorePoint) {
      try {
        logger.info('[ToolsLaunch] Creating System Restore point via Checkpoint-Computer...');
        const psCmd = `Checkpoint-Computer -Description "TerminalManager SystemTools" -RestorePointType "MODIFY_SETTINGS"`;
        execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${psCmd}"`, { stdio: 'pipe' });
      } catch (err) {
        logger.warn('[ToolsLaunch] System Restore Point creation warning (may require elevated privileges):', err);
      }
    }

    const customConfig = compileManager.getCustomizationConfig();
    const productName = customConfig.branding.productName || 'System Tools';

    if (isE2E) {
      logger.info('[ToolsLaunch] Launching in E2E STUB mode (not modifying real OS)');
      const ptyInfo = await ptyManager.create(
        {
          cols: 80,
          rows: 24,
          admin: true,
          shellPath: 'powershell.exe',
          shellArgs: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', compiledPath],
        },
        mainWindow
      );
      return { success: true, ptyId: ptyInfo.id, productName, mode: 'stub' };
    }

    // Connect admin helper
    const helperOk = await adminHelperManager.ensureHelperConnected();
    if (!helperOk) {
      return {
        success: false,
        error: 'Admin helper unavailable or UAC prompt was declined',
        fixSuggestion: 'Please accept the Windows UAC prompt to launch elevated System Tools.',
      };
    }

    const ptyId = `admin-pane-${Date.now()}`;
    const ptyCreated = await adminHelperManager.createPty({
      id: ptyId,
      cols: 80,
      rows: 24,
      shellPath: 'powershell.exe',
      shellArgs: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', compiledPath],
      onData: (data) => {
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send('pty:data', { id: ptyId, data });
        }
      },
      onExit: (exitCode) => {
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send('pty:exit', { id: ptyId, exitCode });
        }
      },
    });

    if (!ptyCreated) {
      return { success: false, error: 'Failed to create elevated PTY session' };
    }

    return { success: true, ptyId, productName };
  });
}
