import { AgentLaunchRequest, parseArgsString } from '../../shared/agentTypes';
export { parseArgsString };
import { agentCatalog } from './agentCatalog';
import { agentDetector } from './agentDetector';
import { agentStateStore } from './agentStateStore';
import { sessionManager } from '../sessionManager';
import { openTerminalFromRequest } from '../launchManager';
import { resolveLaunchCwd } from '../cliHandler';
import { profilesStore } from '../profilesStore';
import { quoteForShell, ShellType, identifyShellType } from '../../shared/terminalUtils';
import { logger } from '../logger';

export const DANGEROUS_FLAGS = [
  '--dangerously-skip-permissions',
  '--yolo',
  '--full-auto',
  '--auto-approve',
  '--force-auto',
  '--no-confirm',
  '--yes',
];

export interface LaunchAgentResult {
  success: boolean;
  sessionId?: string;
  windowId?: number;
  busy?: boolean;
  requiresDangerousConfirm?: boolean;
  dangerousFlag?: string;
  error?: string;
  requestedCwdInvalid?: string;
}

/**
 * Checks if arguments contain known dangerous permission-skipping flags.
 */
export function checkDangerousArgs(args: string[]): { hasDangerous: boolean; flag?: string } {
  for (const a of args) {
    const trimmed = a.trim().toLowerCase();
    for (const d of DANGEROUS_FLAGS) {
      if (trimmed === d || trimmed.startsWith(`${d}=`)) {
        return { hasDangerous: true, flag: d };
      }
    }
  }
  return { hasDangerous: false };
}


/**
 * Builds the shell-safe execution string for an agent binary.
 */
export function buildAgentCommandString(shellType: ShellType, exe: string, args: string[]): string {
  const quotedExe = quoteForShell(shellType, exe);
  const quotedArgs = args.map((a) => quoteForShell(shellType, a)).join(' ');

  if (shellType === 'powershell') {
    return quotedArgs ? `& ${quotedExe} ${quotedArgs}` : `& ${quotedExe}`;
  } else if (shellType === 'cmd') {
    return quotedArgs ? `${quotedExe} ${quotedArgs}` : quotedExe;
  } else {
    // bash / wsl / sh
    return quotedArgs ? `${quotedExe} ${quotedArgs}` : quotedExe;
  }
}

/**
 * Core function to launch an AI agent in a chosen folder and presentation mode.
 */
export async function launchAgent(
  req: AgentLaunchRequest & { confirmedDangerous?: boolean },
  showMainWindowFn?: () => void
): Promise<LaunchAgentResult> {
  const entry = agentCatalog.getAgentById(req.agentId);
  if (!entry) {
    return { success: false, error: `Agent "${req.agentId}" not found in catalog.` };
  }

  // 1. Resolve executable
  const state = agentDetector.getAgentState(entry.id);
  const targetExe = state?.resolvedPath || entry.command;

  // 2. Resolve arguments
  const extraArgs = req.extraArgs || [];
  const dangerousCheck = checkDangerousArgs(extraArgs);
  if (dangerousCheck.hasDangerous && !req.confirmedDangerous) {
    return {
      success: false,
      requiresDangerousConfirm: true,
      dangerousFlag: dangerousCheck.flag,
    };
  }

  const finalArgs: string[] = [];
  if (req.resume && entry.resumeArgs) {
    finalArgs.push(...entry.resumeArgs);
  }
  finalArgs.push(...extraArgs);

  // 3. Resolve working directory
  const defaultProfile = profilesStore.getDefault();
  const { cwd: resolvedCwd, requestedCwdInvalid } = resolveLaunchCwd(req.cwd, defaultProfile);
  if (req.cwd && requestedCwdInvalid) {
    try {
      const { windowManager } = require('../windowManager');
      const win = windowManager.getMainWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send('toast:show', {
          type: 'error',
          message: `Folder not found: "${req.cwd}"`,
        });
      }
    } catch {}
    return {
      success: false,
      error: `Folder not found: "${req.cwd}"`,
      requestedCwdInvalid,
    };
  }

  // 4. Resolve saved decrypted environment variables
  const envVars = agentStateStore.getDecryptedEnv(entry.id);

  // Record launch state in persistent store
  agentStateStore.recordLaunch(entry.id, resolvedCwd, req.mode);

  // 5. Handle "this terminal" mode
  if (req.mode === 'terminal') {
    if (!req.sessionId) {
      return { success: false, error: 'No terminal session ID provided for current terminal launch.' };
    }

    try {
      const procs = await sessionManager.getProcesses(req.sessionId);
      if (procs && procs.length > 0) {
        return {
          success: false,
          busy: true,
          sessionId: req.sessionId,
        };
      }
    } catch {}

    const sessionObj = sessionManager.getSession(req.sessionId);
    const shellType: ShellType = sessionObj?.shellPath ? identifyShellType(sessionObj.shellPath) : 'powershell';
    const cmdStr = buildAgentCommandString(shellType, targetExe, finalArgs);

    sessionManager.write(req.sessionId, `${cmdStr}\r`);
    return { success: true, sessionId: req.sessionId };
  }

  // 6. Handle "tab", "split", and "window" modes
  const effectiveMode = req.mode === 'window' ? 'window' : 'tab';

  const launchRes = openTerminalFromRequest(
    {
      cwd: resolvedCwd,
      mode: effectiveMode,
      title: entry.name,
      env: envVars,
    },
    showMainWindowFn
  );

  if (!launchRes.sessionId) {
    return { success: false, error: 'Failed to create terminal session.' };
  }

  // Wait for shell ready before typing agent command
  const sessionObj = sessionManager.getSession(launchRes.sessionId);
  const shellType: ShellType = sessionObj?.shellPath ? identifyShellType(sessionObj.shellPath) : 'powershell';
  const cmdStr = buildAgentCommandString(shellType, targetExe, finalArgs);

  setTimeout(() => {
    try {
      sessionManager.write(launchRes.sessionId, `${cmdStr}\r`);
    } catch (err) {
      logger.warn('[AgentLauncher] Failed typing command to new session:', err);
    }
  }, 450);

  return {
    success: true,
    sessionId: launchRes.sessionId,
    windowId: launchRes.windowId,
    requestedCwdInvalid,
  };
}
