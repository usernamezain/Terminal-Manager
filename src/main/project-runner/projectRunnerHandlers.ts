import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc';
import { sessionManager } from '../sessionManager';
import { settingsStore } from '../settingsStore';
import { scriptRunner } from '../scripts/scriptRunner';
import { identifyShellType } from '../../shared/terminalUtils';
import {
  ProjectCommand,
  RunTarget,
  EcosystemType,
  CustomProjectCommand,
} from '../../shared/projectRunnerTypes';
import { detectProject } from './projectDetector';
import { renderCommandString } from './commandBuilder';
import { projectRunnerStore } from './projectRunnerStore';
import { watchProjectManifests } from './projectRunnerWatcher';
import { validatePackageInput } from './packageValidator';
import { searchPackages } from './packageSearcher';
import { logger } from '../logger';

export function registerProjectRunnerHandlers(): void {
  // 1. Detect
  ipcMain.handle(
    IPC_CHANNELS.PROJECT_RUNNER_DETECT,
    async (event, { cwd, shellType, forceRefresh }: { cwd: string; shellType?: any; forceRefresh?: boolean }) => {
      try {
        const settings = settingsStore.get();
        const project = detectProject(cwd, shellType || 'powershell', settings.projectRunner, forceRefresh);

        if (project && project.rootPath) {
          // Set up manifest watcher
          watchProjectManifests(project.rootPath, (changedFolder) => {
            const senderWin = BrowserWindow.fromWebContents(event.sender);
            if (senderWin && !senderWin.isDestroyed()) {
              senderWin.webContents.send('project-runner:changed', { folder: changedFolder });
            }
          });

          // Enrich with stored project data
          const stored = projectRunnerStore.get(project.rootPath);
          if (stored.primaryCommandId) {
            // Find command matching primary
            for (const eco of project.ecosystems) {
              for (const grp of eco.groups) {
                const found = grp.commands.find((c) => c.id === stored.primaryCommandId);
                if (found) {
                  project.primaryCommand = found;
                  break;
                }
              }
            }
          }
        }

        return project;
      } catch (err: any) {
        logger.error(`[ProjectRunner] Detection failed for cwd "${cwd}": ${err.message}`);
        return null;
      }
    }
  );

  // 2. Run
  ipcMain.handle(
    IPC_CHANNELS.PROJECT_RUNNER_RUN,
    async (
      _event,
      {
        sessionId,
        command,
        target = 'terminal',
        sessionCwd,
      }: {
        sessionId: string;
        command: ProjectCommand;
        target?: RunTarget;
        sessionCwd?: string;
      }
    ) => {
      try {
        // Handle Script Runner target
        if (target === 'script-runner') {
          scriptRunner.enqueue(
            [
              {
                scriptId: `pr-${Date.now()}`,
                scriptName: command.label,
                content: command.commandText,
                type: 'powershell',
                source: 'inline',
                cwd: command.cwd || sessionCwd,
              },
            ],
            true
          );
          if (command.cwd || sessionCwd) {
            projectRunnerStore.recordRun(command.cwd || sessionCwd!, command.id);
          }
          return { status: 'enqueued' };
        }

        const details = sessionManager.getDetails(sessionId);
        const shellType = identifyShellType(details?.shellPath);
        const rendered = renderCommandString(command, shellType, sessionCwd || details?.cwd);

        // Copy only target
        if (target === 'copy') {
          sessionManager.write(sessionId, rendered);
          return { status: 'copied', commandText: rendered };
        }

        // Check if foreground process is busy
        const processes = await sessionManager.getProcesses(sessionId);
        const rootPid = details?.pid;
        const isBusy =
          processes.length > 1 ||
          (processes.length === 1 && rootPid !== undefined && processes[0]?.pid !== rootPid);


        if (isBusy) {
          return {
            status: 'busy',
            commandText: rendered,
            runningProcesses: processes,
          };
        }

        // Execute directly in terminal
        sessionManager.write(sessionId, `${rendered}\r`);
        const runCwd = command.cwd || sessionCwd || details?.cwd;
        if (runCwd) {
          projectRunnerStore.recordRun(runCwd, command.id);
        }


        return { status: 'executed', commandText: rendered };
      } catch (err: any) {
        logger.error(`[ProjectRunner] Run command failed: ${err.message}`);
        throw err;
      }
    }
  );

  // 3. Stop
  ipcMain.handle(IPC_CHANNELS.PROJECT_RUNNER_STOP, async (_event, { sessionId }: { sessionId: string }) => {
    sessionManager.write(sessionId, '\x03');
    return { success: true };
  });

  // 4. Restart
  ipcMain.handle(
    IPC_CHANNELS.PROJECT_RUNNER_RESTART,
    async (
      _event,
      {
        sessionId,
        command,
        sessionCwd,
      }: {
        sessionId: string;
        command: ProjectCommand;
        sessionCwd?: string;
      }
    ) => {
      sessionManager.write(sessionId, '\x03');
      await new Promise((res) => setTimeout(res, 200));

      const details = sessionManager.getDetails(sessionId);
      const shellType = identifyShellType(details?.shellPath);
      const rendered = renderCommandString(command, shellType, sessionCwd || details?.cwd);
      sessionManager.write(sessionId, `${rendered}\r`);

      return { success: true };
    }
  );

  // 5. Store Get
  ipcMain.handle(
    IPC_CHANNELS.PROJECT_RUNNER_STORE_GET,
    async (_event, { projectPath }: { projectPath: string }) => {
      return projectRunnerStore.get(projectPath);
    }
  );

  // 6. Store Save
  ipcMain.handle(
    IPC_CHANNELS.PROJECT_RUNNER_STORE_SAVE,
    async (
      _event,
      {
        action,
        projectPath,
        payload,
      }: {
        action: 'pin' | 'hide' | 'primary' | 'add-custom' | 'remove-custom' | 'clear';
        projectPath: string;
        payload?: any;
      }
    ) => {
      if (action === 'pin' && payload?.commandId) {
        projectRunnerStore.togglePinned(projectPath, payload.commandId);
      } else if (action === 'hide' && payload?.commandId) {
        projectRunnerStore.toggleHidden(projectPath, payload.commandId);
      } else if (action === 'primary' && payload?.commandId) {
        projectRunnerStore.setPrimary(projectPath, payload.commandId);
      } else if (action === 'add-custom' && payload?.customCommand) {
        projectRunnerStore.addCustomCommand(projectPath, payload.customCommand as CustomProjectCommand);
      } else if (action === 'remove-custom' && payload?.customCommandId) {
        projectRunnerStore.removeCustomCommand(projectPath, payload.customCommandId);
      } else if (action === 'clear') {
        projectRunnerStore.clearAll(projectPath);
      }

      return projectRunnerStore.get(projectPath);
    }
  );

  // 7. Validate Package
  ipcMain.handle(
    IPC_CHANNELS.PROJECT_RUNNER_VALIDATE_PACKAGE,
    async (
      _event,
      {
        ecosystem,
        input,
        version,
        allowAdvanced,
      }: {
        ecosystem: EcosystemType;
        input: string;
        version?: string;
        allowAdvanced?: boolean;
      }
    ) => {
      return validatePackageInput(ecosystem, input, version, allowAdvanced);
    }
  );

  // 8. Search Packages
  ipcMain.handle(
    IPC_CHANNELS.PROJECT_RUNNER_SEARCH_PACKAGES,
    async (
      _event,
      {
        ecosystem,
        query,
        isOffline,
      }: {
        ecosystem: EcosystemType;
        query: string;
        isOffline?: boolean;
      }
    ) => {
      const settings = settingsStore.get();
      const offline = isOffline ?? settings.projectRunner?.offlineMode ?? false;
      const suggestOnline = settings.projectRunner?.suggestFromInternet ?? true;

      return searchPackages(ecosystem, query, offline || !suggestOnline);
    }
  );
}
