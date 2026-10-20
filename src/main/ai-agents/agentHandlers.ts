import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc';
import { agentCatalog } from './agentCatalog';
import { agentDetector } from './agentDetector';
import { agentInstaller } from './agentInstaller';
import { launchAgent } from './agentLauncher';
import { agentStateStore } from './agentStateStore';
import { addDirectoryToUserPath } from './envPathHelper';
import { scheduleAgentExplorerSync } from './agentRegistryExplorer';
import { showMainWindow } from '../index';
import { logger } from '../logger';

let isRegistered = false;

export function registerAgentHandlers(): void {
  if (isRegistered) return;
  isRegistered = true;

  // Get all agents with cached state
  ipcMain.handle(IPC_CHANNELS.AI_AGENTS_GET_ALL, async () => {
    return agentDetector.getCachedResults();
  });

  // Run full detection rescan
  ipcMain.handle(IPC_CHANNELS.AI_AGENTS_DETECT_ALL, async (_event, args?: { force?: boolean }) => {
    const results = await agentDetector.scanAll(Boolean(args?.force));
    scheduleAgentExplorerSync();
    return results;
  });

  // Get prerequisites
  ipcMain.handle(IPC_CHANNELS.AI_AGENTS_GET_PREREQS, async () => {
    return agentDetector.getCachedPrerequisites();
  });

  // Add custom agent
  ipcMain.handle(IPC_CHANNELS.AI_AGENTS_ADD_CUSTOM, async (_event, input: any) => {
    const res = agentCatalog.addCustomAgent(input);
    if (res.success && res.agent) {
      await agentDetector.probeAgent(res.agent, process.env.PATH || '');
      scheduleAgentExplorerSync();
    }
    return res;
  });

  // Delete custom agent
  ipcMain.handle(IPC_CHANNELS.AI_AGENTS_DELETE_CUSTOM, async (_event, args: { id: string }) => {
    const res = agentCatalog.deleteCustomAgent(args.id);
    if (res.success) {
      scheduleAgentExplorerSync();
    }
    return res;
  });

  // Launch agent
  ipcMain.handle(IPC_CHANNELS.AI_AGENTS_LAUNCH, async (_event, args: any) => {
    return launchAgent(args, showMainWindow);
  });

  // Install agent
  ipcMain.handle(IPC_CHANNELS.AI_AGENTS_INSTALL, async (_event, args: any) => {
    return agentInstaller.installAgent(args);
  });

  // Update agent
  ipcMain.handle(IPC_CHANNELS.AI_AGENTS_UPDATE, async (_event, args: { agentId: string; cwd?: string }) => {
    return agentInstaller.updateAgent(args);
  });

  // Uninstall agent
  ipcMain.handle(IPC_CHANNELS.AI_AGENTS_UNINSTALL, async (_event, args: { agentId: string }) => {
    return agentInstaller.uninstallAgent(args);
  });

  // Install prerequisite
  ipcMain.handle(IPC_CHANNELS.AI_AGENTS_INSTALL_PREREQ, async (_event, args: { wingetId: string; name: string }) => {
    return agentInstaller.installPrerequisite(args.wingetId, args.name);
  });

  // Add directory to user PATH
  ipcMain.handle(IPC_CHANNELS.AI_AGENTS_ADD_TO_PATH, async (_event, args: { dirPath?: string; agentId?: string }) => {
    let targetDir = args.dirPath;
    if (!targetDir && args.agentId) {
      const state = agentDetector.getDetectionState(args.agentId);
      if (state?.resolvedPath) {
        targetDir = require('path').dirname(state.resolvedPath);
      }
    }
    if (!targetDir) {
      return { success: false, message: 'No directory path provided to add to PATH.' };
    }
    const res = await addDirectoryToUserPath(targetDir);
    if (res.success) {
      await agentDetector.scanAll(true);
      scheduleAgentExplorerSync();
    }
    return res;
  });

  // Get agent user state (recent folders, masked env, encryption support)
  ipcMain.handle(IPC_CHANNELS.AI_AGENTS_GET_STATE, async (_event, args: { agentId: string }) => {
    const userState = agentStateStore.getAgentState(args.agentId);
    const maskedEnv = agentStateStore.getMaskedEnv(args.agentId);
    const encryptionAvailable = agentStateStore.isEncryptionAvailable();
    return {
      userState,
      maskedEnv,
      encryptionAvailable,
    };
  });

  // Save secure environment variables
  ipcMain.handle(IPC_CHANNELS.AI_AGENTS_SAVE_ENV, async (_event, args: { agentId: string; env: Record<string, string> }) => {
    return agentStateStore.setAgentEnv(args.agentId, args.env);
  });

  // Clear agent persistent data
  ipcMain.handle(IPC_CHANNELS.AI_AGENTS_CLEAR_DATA, async () => {
    agentStateStore.clearAllData();
    return { success: true };
  });

  logger.info('[AgentHandlers] AI Agents IPC handlers registered.');
}
