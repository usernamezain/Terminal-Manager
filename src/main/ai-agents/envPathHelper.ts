import { execFile } from 'child_process';
import os from 'os';
import path from 'path';
import { logger } from '../logger';

let cachedPath: string | null = null;
let lastRefreshedTime = 0;

/**
 * Expands %ENVIRONMENT_VARIABLE% tokens within Windows registry strings.
 */
export function expandWindowsEnv(str: string): string {
  if (!str) return '';
  return str.replace(/%([^%]+)%/g, (_, n) => {
    const key = n.toUpperCase();
    if (process.env[key]) return process.env[key]!;
    if (key === 'USERPROFILE') return os.homedir();
    if (key === 'LOCALAPPDATA') return path.join(os.homedir(), 'AppData', 'Local');
    if (key === 'APPDATA') return path.join(os.homedir(), 'AppData', 'Roaming');
    if (key === 'SYSTEMROOT' || key === 'WINDIR') return process.env.SystemRoot || 'C:\\Windows';
    if (key === 'SYSTEMDRIVE') return process.env.SystemDrive || 'C:';
    if (key === 'PROGRAMFILES') return process.env.ProgramFiles || 'C:\\Program Files';
    if (key === 'PROGRAMFILES(X86)') return process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    if (key === 'PROGRAMDATA') return process.env.ProgramData || 'C:\\ProgramData';
    return `%${n}%`;
  });
}

/**
 * Queries registry via reg.exe safely without shell.
 */
function queryRegValue(key: string, valueName: string): Promise<string> {
  return new Promise((resolve) => {
    execFile('reg.exe', ['query', key, '/v', valueName], (err, stdout) => {
      if (err || !stdout) {
        resolve('');
        return;
      }
      // Output format:
      // ValueName    REG_SZ|REG_EXPAND_SZ    ValueData
      const lines = stdout.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.toLowerCase().startsWith(valueName.toLowerCase())) {
          const parts = trimmed.split(/\s{2,}/);
          if (parts.length >= 3) {
            resolve(parts.slice(2).join(' '));
            return;
          }
        }
      }
      resolve('');
    });
  });
}

/**
 * Refreshes PATH by reading system (HKLM) and user (HKCU) registry keys,
 * expanding variables, and merging with current process.env.PATH.
 */
export async function refreshEnvPath(force = false): Promise<string> {
  const now = Date.now();
  if (!force && cachedPath && now - lastRefreshedTime < 3000) {
    return cachedPath;
  }

  if (process.platform !== 'win32') {
    cachedPath = process.env.PATH || '';
    lastRefreshedTime = now;
    return cachedPath;
  }

  try {
    const [userPathRaw, sysPathRaw] = await Promise.all([
      queryRegValue('HKCU\\Environment', 'Path'),
      queryRegValue('HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment', 'Path'),
    ]);

    const userPath = expandWindowsEnv(userPathRaw);
    const sysPath = expandWindowsEnv(sysPathRaw);
    const procPath = process.env.PATH || '';

    // Split and merge in order: User -> System -> Current process entries
    const allParts: string[] = [];
    const seen = new Set<string>();

    const addEntries = (rawStr: string) => {
      const parts = rawStr.split(';').map((s) => s.trim()).filter(Boolean);
      for (const p of parts) {
        const normalized = path.normalize(p).toLowerCase();
        if (!seen.has(normalized)) {
          seen.add(normalized);
          allParts.push(p);
        }
      }
    };

    if (userPath) addEntries(userPath);
    if (sysPath) addEntries(sysPath);
    if (procPath) addEntries(procPath);

    // Common developer paths that might not be on PATH yet
    const extraCandidates = [
      path.join(os.homedir(), '.local', 'bin'),
      path.join(os.homedir(), 'AppData', 'Roaming', 'npm'),
      path.join(os.homedir(), 'scoop', 'shims'),
      path.join(os.homedir(), '.cargo', 'bin'),
    ];
    for (const extra of extraCandidates) {
      addEntries(extra);
    }

    const merged = allParts.join(';');
    cachedPath = merged;
    lastRefreshedTime = now;
    process.env.PATH = merged;
    return merged;
  } catch (err) {
    logger.warn('[EnvPath] Failed refreshing environment PATH from registry:', err);
    cachedPath = process.env.PATH || '';
    lastRefreshedTime = now;
    return cachedPath;
  }
}

/**
 * Appends a directory to HKCU\Environment\Path and refreshes.
 */
export async function addDirectoryToUserPath(dirPath: string): Promise<{ success: boolean; message: string }> {
  if (process.platform !== 'win32') {
    return { success: false, message: 'Only supported on Windows' };
  }

  const normalized = path.normalize(dirPath.trim());
  try {
    const currentRaw = await queryRegValue('HKCU\\Environment', 'Path');
    const existingParts = currentRaw.split(';').map((s) => s.trim()).filter(Boolean);

    const alreadyPresent = existingParts.some((p) => path.normalize(expandWindowsEnv(p)).toLowerCase() === normalized.toLowerCase());
    if (alreadyPresent) {
      return { success: true, message: `Directory is already in User PATH: ${normalized}` };
    }

    const newPath = currentRaw ? `${currentRaw};${normalized}` : normalized;

    await new Promise<void>((resolve, reject) => {
      execFile('reg.exe', ['add', 'HKCU\\Environment', '/v', 'Path', '/t', 'REG_EXPAND_SZ', '/d', newPath, '/f'], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Refresh cached path
    await refreshEnvPath(true);
    return { success: true, message: `Successfully added ${normalized} to User PATH` };
  } catch (err: any) {
    logger.error(`[EnvPath] Failed adding ${dirPath} to User PATH:`, err);
    return { success: false, message: `Failed adding to PATH: ${err?.message || err}` };
  }
}
