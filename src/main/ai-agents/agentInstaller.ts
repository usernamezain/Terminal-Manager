import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { agentCatalog } from './agentCatalog';
import { agentDetector } from './agentDetector';
import { refreshEnvPath } from './envPathHelper';
import { sessionManager } from '../sessionManager';
import { windowManager } from '../windowManager';
import { logger } from '../logger';

const MAX_LOG_FILES = 30;

export class AgentInstaller {
  private getLogsDir(): string {
    const userData = app?.getPath ? app.getPath('userData') : path.join(process.cwd(), 'userData');
    const logsDir = path.join(userData, 'logs', 'agent-installs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    return logsDir;
  }

  private rotateLogs(logsDir: string): void {
    try {
      const files = fs
        .readdirSync(logsDir)
        .map((f) => path.join(logsDir, f))
        .filter((f) => fs.statSync(f).isFile())
        .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

      if (files.length > MAX_LOG_FILES) {
        for (const f of files.slice(MAX_LOG_FILES)) {
          try {
            fs.unlinkSync(f);
          } catch {}
        }
      }
    } catch (err) {
      logger.warn('[AgentInstaller] Log rotation error:', err);
    }
  }

  /**
   * Spawns an agent install method inside a visible terminal tab and tracks completion.
   */
  public async installAgent(args: {
    agentId: string;
    methodId: string;
    runAsAdmin?: boolean;
    cwd?: string;
  }): Promise<{ success: boolean; sessionId?: string; error?: string }> {
    const entry = agentCatalog.getAgentById(args.agentId);
    if (!entry) {
      return { success: false, error: `Agent "${args.agentId}" not found.` };
    }

    const method = entry.installMethods.find((m) => m.id === args.methodId) || entry.installMethods[0];
    if (!method) {
      return { success: false, error: `No valid install method found for "${entry.name}".` };
    }

    const commandToRun = method.command;
    const isPwsh = method.shell === 'powershell';

    const shellExe = isPwsh ? 'powershell.exe' : 'cmd.exe';
    const shellArgs = isPwsh
      ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', commandToRun]
      : ['/d', '/c', commandToRun];

    const logsDir = this.getLogsDir();
    const logFile = path.join(logsDir, `${entry.id}-${Date.now()}.log`);
    const startTime = new Date().toISOString();
    let accumulatedOutput = '';

    const tabTitle = `Install ${entry.name}`;
    const mainWin = windowManager.getMainWindow();

    try {
      // Create session in main process
      const session = sessionManager.create({
        shellPath: shellExe,
        shellArgs,
        admin: args.runAsAdmin,
        cwd: args.cwd || osHomeDir(),
        cols: 100,
        rows: 30,
        title: tabTitle,
      });

      if (mainWin && !mainWin.isDestroyed()) {
        mainWin.webContents.send('session:dock-tab', {
          sessionId: session.id,
          title: tabTitle,
          cwd: args.cwd || osHomeDir(),
        });
        sessionManager.attach(session.id, mainWin);
      }

      // Track output and exit
      const rawSession = sessionManager.getSession(session.id);
      if (rawSession?.ptyProcess) {
        rawSession.ptyProcess.onData((data: string) => {
          accumulatedOutput += data;
          if (accumulatedOutput.length > 200 * 1024) {
            accumulatedOutput = accumulatedOutput.slice(-200 * 1024);
          }
        });

        rawSession.ptyProcess.onExit(async ({ exitCode }: { exitCode: number }) => {
          const endTime = new Date().toISOString();
          const logPayload = [
            `--- Install Job Log ---`,
            `Agent: ${entry.name} (${entry.id})`,
            `Command: ${commandToRun}`,
            `Start: ${startTime}`,
            `End: ${endTime}`,
            `Exit Code: ${exitCode}`,
            `--- Terminal Output (Tail) ---`,
            accumulatedOutput,
          ].join('\n');

          try {
            fs.writeFileSync(logFile, logPayload, 'utf8');
            this.rotateLogs(logsDir);
          } catch {}

          // Refresh PATH and re-detect agent
          await refreshEnvPath(true);
          const newState = await agentDetector.probeAgent(entry, process.env.PATH || '');

          if (mainWin && !mainWin.isDestroyed()) {
            if (exitCode === 0) {
              if (newState.status === 'installed') {
                mainWin.webContents.send('toast:show', {
                  type: 'success',
                  message: `Successfully installed ${entry.name} ${newState.version || ''}`.trim(),
                });
              } else if (newState.status === 'not_on_path') {
                mainWin.webContents.send('toast:show', {
                  type: 'warning',
                  message: `Installed ${entry.name}, but not found on PATH. Open a new terminal or click "Add to PATH".`,
                });
              } else {
                mainWin.webContents.send('toast:show', {
                  type: 'info',
                  message: `Completed installer for ${entry.name}. Please restart terminal if not detected.`,
                });
              }
            } else {
              mainWin.webContents.send('toast:show', {
                type: 'error',
                message: `Install failed for ${entry.name} (exit ${exitCode}).`,
              });
            }

            // Notify renderer of changed agent detection state
            mainWin.webContents.send('ai-agents:status-changed', {
              agentId: entry.id,
              state: newState,
            });
          }
        });
      }

      return { success: true, sessionId: session.id };
    } catch (err: any) {
      logger.error(`[AgentInstaller] Failed spawning install job for ${entry.id}:`, err);
      return { success: false, error: err?.message || String(err) };
    }
  }

  /**
   * Installs a prerequisite via winget inside a terminal tab.
   */
  public async installPrerequisite(wingetId: string, name: string): Promise<{ success: boolean; sessionId?: string; error?: string }> {
    const mainWin = windowManager.getMainWindow();
    const tabTitle = `Install ${name}`;
    const cmd = `winget install --id "${wingetId}" --accept-source-agreements --accept-package-agreements`;

    try {
      const session = sessionManager.create({
        shellPath: 'powershell.exe',
        shellArgs: ['-NoProfile', '-Command', cmd],
        cwd: osHomeDir(),
        cols: 100,
        rows: 30,
        title: tabTitle,
      });

      if (mainWin && !mainWin.isDestroyed()) {
        mainWin.webContents.send('session:dock-tab', {
          sessionId: session.id,
          title: tabTitle,
          cwd: osHomeDir(),
        });
        sessionManager.attach(session.id, mainWin);
      }

      const rawSession = sessionManager.getSession(session.id);
      rawSession?.ptyProcess?.onExit(async () => {
        await refreshEnvPath(true);
        await agentDetector.probePrerequisites(process.env.PATH || '');
        if (mainWin && !mainWin.isDestroyed()) {
          mainWin.webContents.send('ai-agents:prereqs-changed');
        }
      });

      return { success: true, sessionId: session.id };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  }

  /**
   * Updates an agent using its updateCommand inside a visible terminal tab.
   */
  public async updateAgent(args: {
    agentId: string;
    cwd?: string;
  }): Promise<{ success: boolean; sessionId?: string; error?: string }> {
    const entry = agentCatalog.getAgentById(args.agentId);
    if (!entry) {
      return { success: false, error: `Agent "${args.agentId}" not found.` };
    }

    const commandToRun = entry.updateCommand;
    if (!commandToRun) {
      const recMethod = entry.installMethods.find((m) => m.recommended) || entry.installMethods[0];
      if (recMethod) {
        return this.installAgent({ agentId: args.agentId, methodId: recMethod.id, cwd: args.cwd });
      }
      return { success: false, error: `No update command defined for "${entry.name}".` };
    }

    const tabTitle = `Update ${entry.name}`;
    const mainWin = windowManager.getMainWindow();

    try {
      const session = sessionManager.create({
        shellPath: 'powershell.exe',
        shellArgs: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', commandToRun],
        cwd: args.cwd || osHomeDir(),
        cols: 100,
        rows: 30,
        title: tabTitle,
      });

      if (mainWin && !mainWin.isDestroyed()) {
        mainWin.webContents.send('session:dock-tab', {
          sessionId: session.id,
          title: tabTitle,
          cwd: args.cwd || osHomeDir(),
        });
        sessionManager.attach(session.id, mainWin);
      }

      const rawSession = sessionManager.getSession(session.id);
      if (rawSession?.ptyProcess) {
        rawSession.ptyProcess.onExit(async ({ exitCode }: { exitCode: number }) => {
          await refreshEnvPath(true);
          const newState = await agentDetector.probeAgent(entry, process.env.PATH || '');
          if (mainWin && !mainWin.isDestroyed()) {
            mainWin.webContents.send('toast:show', {
              type: exitCode === 0 ? 'success' : 'error',
              message: exitCode === 0 ? `Updated ${entry.name} ${newState.version || ''}`.trim() : `Update failed for ${entry.name} (exit ${exitCode}).`,
            });
            mainWin.webContents.send('ai-agents:status-changed', {
              agentId: entry.id,
              state: newState,
            });
          }
        });
      }

      return { success: true, sessionId: session.id };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  }

  /**
   * Uninstalls an agent or provides instructions.
   */
  public async uninstallAgent(args: {
    agentId: string;
  }): Promise<{ success: boolean; message?: string; manualInstructions?: string; error?: string }> {
    const entry = agentCatalog.getAgentById(args.agentId);
    if (!entry) {
      return { success: false, error: `Agent "${args.agentId}" not found.` };
    }

    const hint = entry.uninstallHint || '';
    const npmMatch = hint.match(/npm\s+uninstall\s+-g\s+([^\s']+)/);
    const wingetMatch = hint.match(/winget\s+uninstall\s+([^\s']+)/);

    let uninstallCmd: string | null = null;
    if (npmMatch) {
      uninstallCmd = `npm uninstall -g ${npmMatch[1]}`;
    } else if (wingetMatch) {
      uninstallCmd = `winget uninstall ${wingetMatch[1]}`;
    }

    if (uninstallCmd) {
      const mainWin = windowManager.getMainWindow();
      const tabTitle = `Uninstall ${entry.name}`;
      try {
        const session = sessionManager.create({
          shellPath: 'powershell.exe',
          shellArgs: ['-NoProfile', '-Command', uninstallCmd],
          cwd: osHomeDir(),
          cols: 100,
          rows: 30,
          title: tabTitle,
        });

        if (mainWin && !mainWin.isDestroyed()) {
          mainWin.webContents.send('session:dock-tab', {
            sessionId: session.id,
            title: tabTitle,
            cwd: osHomeDir(),
          });
          sessionManager.attach(session.id, mainWin);
        }

        const rawSession = sessionManager.getSession(session.id);
        rawSession?.ptyProcess?.onExit(async () => {
          await refreshEnvPath(true);
          const newState = await agentDetector.probeAgent(entry, process.env.PATH || '');
          if (mainWin && !mainWin.isDestroyed()) {
            mainWin.webContents.send('toast:show', {
              type: 'info',
              message: `Uninstalled ${entry.name}.`,
            });
            mainWin.webContents.send('ai-agents:status-changed', {
              agentId: entry.id,
              state: newState,
            });
          }
        });

        return { success: true, message: `Uninstalling ${entry.name}...` };
      } catch (err: any) {
        return { success: false, error: err?.message || String(err) };
      }
    }

    return {
      success: true,
      manualInstructions: hint || `To uninstall ${entry.name}, remove its installed files from your user directory.`,
    };
  }
}

function osHomeDir(): string {
  return app?.getPath ? app.getPath('home') : process.env.USERPROFILE || 'C:\\';
}

export const agentInstaller = new AgentInstaller();
