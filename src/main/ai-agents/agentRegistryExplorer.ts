import { execFile } from 'child_process';
import { app } from 'electron';
import { getAppIconPath, getAppExePath } from '../registryIntegration';
import { agentDetector } from './agentDetector';
import { settingsStore } from '../settingsStore';
import { logger } from '../logger';

const REG_ROOTS = [
  { base: 'HKCU\\Software\\Classes\\Directory\\Background\\shell\\TerminalManagerAgents', param: '%V' },
  { base: 'HKCU\\Software\\Classes\\Directory\\shell\\TerminalManagerAgents', param: '%1' },
  { base: 'HKCU\\Software\\Classes\\Drive\\shell\\TerminalManagerAgents', param: '%1' },
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

function getAgentCommandLine(agentId?: string, param = '%V'): string {
  const exePath = getAppExePath();
  const agentFlag = agentId ? `--agent="${agentId}" ` : '--agents-panel ';

  if (app?.isPackaged) {
    return `"${exePath}" ${agentFlag}--cwd="${param}"`;
  } else {
    const appPath = app?.getAppPath ? app.getAppPath() : process.cwd();
    return `"${exePath}" "${appPath}" ${agentFlag}--cwd="${param}"`;
  }
}

let syncTimeout: NodeJS.Timeout | null = null;

/**
 * Removes all AI Agents Explorer context menu registry keys.
 */
export async function unregisterAgentExplorerMenu(): Promise<void> {
  if (process.platform !== 'win32') return;

  for (const root of REG_ROOTS) {
    try {
      await runReg(['delete', root.base, '/f']);
    } catch {}
  }
  logger.info('[AgentRegistry] Removed AI Agents Explorer context menu keys.');
}

/**
 * Updates Explorer context menu registry entries with currently installed agents (up to 16).
 */
export async function updateAgentExplorerMenu(): Promise<void> {
  if (process.platform !== 'win32') return;

  const settings = settingsStore.get();
  const isEnabled = settings.aiAgents?.showInExplorerMenu !== false;

  if (!isEnabled) {
    await unregisterAgentExplorerMenu();
    return;
  }

  const installed = agentDetector.getInstalledFromDiskCache().slice(0, 16);
  if (installed.length === 0) {
    // If no agents are installed, unregister or show single Choose Agent
    await unregisterAgentExplorerMenu();
    return;
  }

  const iconPath = getAppIconPath();

  for (const root of REG_ROOTS) {
    try {
      // 1. Parent Cascading Menu Entry
      await runReg(['add', root.base, '/ve', '/d', 'AI Agents (Terminal Manager)', '/f']);
      await runReg(['add', root.base, '/v', 'Icon', '/d', iconPath, '/f']);
      await runReg(['add', root.base, '/v', 'SubCommands', '/d', '', '/f']);

      // Clear existing child keys by deleting the shell subkey
      const shellKey = `${root.base}\\shell`;
      await runReg(['delete', shellKey, '/f']);

      // 2. Add child entries for each installed agent
      for (let idx = 0; idx < installed.length; idx++) {
        const ag = installed[idx]!;
        const childKey = `${shellKey}\\agent_${ag.id}`;
        await runReg(['add', childKey, '/ve', '/d', ag.name, '/f']);
        await runReg(['add', childKey, '/v', 'Icon', '/d', iconPath, '/f']);

        const cmdKey = `${childKey}\\command`;
        const cmdVal = getAgentCommandLine(ag.id, root.param);
        await runReg(['add', cmdKey, '/ve', '/d', cmdVal, '/f']);
      }

      // 3. Add "Choose agent..." entry at the bottom
      const chooseKey = `${shellKey}\\agent_choose`;
      await runReg(['add', chooseKey, '/ve', '/d', 'Choose agent...', '/f']);
      await runReg(['add', chooseKey, '/v', 'Icon', '/d', iconPath, '/f']);
      const chooseCmdKey = `${chooseKey}\\command`;
      const chooseCmdVal = getAgentCommandLine(undefined, root.param);
      await runReg(['add', chooseCmdKey, '/ve', '/d', chooseCmdVal, '/f']);
    } catch (err) {
      logger.warn(`[AgentRegistry] Failed writing keys for ${root.base}:`, err);
    }
  }

  logger.info(`[AgentRegistry] Registered ${installed.length} agents in Explorer cascading menu.`);
}

/**
 * Debounced sync of Explorer cascading menu registry (1 second delay).
 */
export function scheduleAgentExplorerSync(): void {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    updateAgentExplorerMenu().catch((err) => {
      logger.warn('[AgentRegistry] Debounced sync error:', err);
    });
  }, 1000);
}
