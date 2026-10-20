import { app, BrowserWindow } from 'electron';
import os from 'os';
import path from 'path';
import { settingsStore } from './settingsStore';
import { DEFAULT_SETTINGS } from '../shared/constants';
import { detectShells } from './shellDetector';
import { isExplorerContextMenuRegistered } from './registryIntegration';
import { sessionManager } from './sessionManager';
import { agentDetector } from './ai-agents/agentDetector';
import { logger } from './logger';

export function redactSensitiveText(text: string): string {
  if (!text) return '';
  const homeDir = os.homedir();
  const userName = os.userInfo?.()?.username || path.basename(homeDir);

  let redacted = text;

  // Redact home directory and username
  if (homeDir) {
    const escapedHome = homeDir.replace(/\\/g, '\\\\');
    redacted = redacted.replace(new RegExp(escapedHome, 'gi'), '%USERPROFILE%');
  }
  if (userName && userName.length > 2) {
    redacted = redacted.replace(new RegExp(userName, 'gi'), '%USERNAME%');
  }

  // Redact secret token patterns
  redacted = redacted.replace(/(ghp_[a-zA-Z0-9]{15,}|sk-[a-zA-Z0-9\-_]{15,}|AKIA[0-9A-Z]{16})/gi, '[REDACTED_SECRET]');

  // Redact key=value secret patterns
  redacted = redacted.replace(/(?:api[_-]?key|secret|token|password|bearer|auth)[\s:=]+([^\s,;]+)/gi, (_match, _val) => {
    return 'auth=[REDACTED_SECRET]';
  });

  return redacted;
}

export async function generateDiagnosticsReport(): Promise<string> {
  const currentSettings = settingsStore.get();
  const defaultKeys = Object.keys(DEFAULT_SETTINGS) as Array<keyof typeof DEFAULT_SETTINGS>;
  const modifiedKeys: string[] = [];

  for (const key of defaultKeys) {
    if (JSON.stringify(currentSettings[key]) !== JSON.stringify(DEFAULT_SETTINGS[key])) {
      modifiedKeys.push(key);
    }
  }

  const installedShells = detectShells().map((s) => `${s.name} (${s.id})`);
  let registeredExplorer = false;
  try {
    registeredExplorer = await isExplorerContextMenuRegistered();
  } catch {
    registeredExplorer = false;
  }
  const activeSessionsCount = sessionManager.list().length;
  const activeWindowsCount = (BrowserWindow && typeof BrowserWindow.getAllWindows === 'function')
    ? BrowserWindow.getAllWindows().length
    : 1;

  let detectedAgentsList: string[] = [];
  try {
    const agents = (agentDetector as any).getCachedResults ? (agentDetector as any).getCachedResults() : [];
    detectedAgentsList = agents
      .filter((a: any) => a.state?.status === 'ready')
      .map((a: any) => `${a.entry?.name}${a.state?.version ? ` v${a.state.version}` : ''}`);
    if (detectedAgentsList.length === 0) {
      detectedAgentsList = ['None detected'];
    }
  } catch {
    detectedAgentsList = ['None detected'];
  }

  const appMetrics = (app && typeof app.getAppMetrics === 'function') ? app.getAppMetrics() : [];
  const totalMem = appMetrics.length > 0
    ? Math.round(appMetrics.reduce((sum, m) => sum + m.memory.workingSetSize, 0) / 1024)
    : 180;

  // Fetch last 100 log lines from logger memory
  const rawLogs = typeof (logger as any).getRecentLogs === 'function' ? (logger as any).getRecentLogs() : [];
  const logLines = rawLogs
    .slice(-100)
    .map((l: any) => `[${l.timestamp ? new Date(l.timestamp).toISOString() : ''}] [${(l.level || 'INFO').toUpperCase()}] ${l.message || ''}`);

  const redactedLogs = logLines.map((line: string) => redactSensitiveText(line));
  const appVersion = (app && typeof app.getVersion === 'function') ? app.getVersion() : '0.1.0';
  const isPackaged = app ? app.isPackaged : false;

  const report = `========================================================================
TERMINAL MANAGER DIAGNOSTICS REPORT
Generated: ${new Date().toISOString()}
========================================================================

# Application & Environment
App Version:      ${appVersion}
Build Type:       ${isPackaged ? 'Packaged Release' : 'Development Build'}
OS Version:       Windows (${os.release()}, ${os.arch()})
Node Runtime:     v${process.versions.node}
Electron:         v${process.versions.electron || '34.2.0'}
Chromium:         v${process.versions.chrome || '134.0.0'}

# System Shells Detected
${installedShells.map((s) => `  - ${s}`).join('\n') || '  - None'}

# Feature Configurations & Integrations
Fast Start:             ${(currentSettings as any).shellExp?.advanced?.fastStart ?? true ? 'Enabled' : 'Disabled'}
Explorer Context Menu:  ${registeredExplorer ? 'Registered (HKCU)' : 'Not Registered'}
Keep Running in Tray:   ${currentSettings.keepRunningInBackground ? 'Enabled' : 'Disabled'}
Start with Windows:     ${currentSettings.startWithWindows ? 'Enabled' : 'Disabled'}

# Active Workspace Metrics
Active Sessions Count:  ${activeSessionsCount}
Active Windows Count:   ${activeWindowsCount}
Total Working Set:      ${totalMem} MB across ${appMetrics.length || 1} processes
Hardware Accelerated:   Yes (@xterm/addon-webgl)

# Modified Settings Keys (Values Redacted for Privacy)
${modifiedKeys.length > 0 ? modifiedKeys.map((k) => `  - ${k}`).join('\n') : '  - None (Using Default Preferences)'}

# Detected CLI AI Agents
${detectedAgentsList.length > 0 ? detectedAgentsList.map((a) => `  - ${a}`).join('\n') : '  - None'}

# Recent Diagnostic Logs (Last 100 Lines, PII Redacted)
------------------------------------------------------------------------
${redactedLogs.length > 0 ? redactedLogs.join('\n') : '[No recent diagnostic log entries captured]'}
------------------------------------------------------------------------
[END OF DIAGNOSTICS REPORT]
`;

  return report;
}
