import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { ShellInfo } from '../shared/types';
import { logger } from './logger';

export function whichSync(cmd: string): string | null {
  const isWin = process.platform === 'win32';
  const pathEnv = process.env.PATH || '';
  const delimiter = isWin ? ';' : ':';
  const dirs = pathEnv.split(delimiter);

  const extensions = isWin
    ? path.extname(cmd)
      ? ['']
      : ['.exe', '.cmd', '.bat', '']
    : [''];

  for (const dir of dirs) {
    if (!dir) continue;
    for (const ext of extensions) {
      const fullPath = path.resolve(dir, cmd + ext);
      if (fs.existsSync(fullPath)) {
        try {
          const stat = fs.statSync(fullPath);
          if (stat.isFile()) {
            return fullPath;
          }
        } catch {
          // ignore
        }
      }
    }
  }

  return null;
}

let cachedShells: ShellInfo[] | null = null;
let isScanningWslDistros = false;

function scanWslDistrosAsync(absWsl: string): void {
  if (isScanningWslDistros) return;
  isScanningWslDistros = true;

  execFile(absWsl, ['-l', '-q'], { encoding: 'buffer', timeout: 2000 }, (error, stdout) => {
    isScanningWslDistros = false;
    if (error || !stdout || !cachedShells) return;

    try {
      let decoded = '';
      if (stdout.length >= 2 && stdout[1] === 0) {
        decoded = stdout.toString('utf16le');
      } else {
        decoded = stdout.toString('utf8');
      }

      const distros = decoded
        .replace(/\0/g, '')
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.toLowerCase().includes('docker'));

      let changed = false;
      for (const distro of distros) {
        const id = `wsl-${distro.toLowerCase()}`;
        if (!cachedShells.some((s) => s.id === id)) {
          cachedShells.push({
            id,
            name: `WSL (${distro})`,
            path: absWsl,
            args: ['-d', distro],
            icon: 'linux',
          });
          changed = true;
        }
      }
      if (changed) {
        logger.debug('[ShellDetector] Discovered additional WSL distros asynchronously:', distros);
      }
    } catch {}
  });
}

export function detectShells(forceRefresh = false): ShellInfo[] {
  if (cachedShells && !forceRefresh) {
    return cachedShells;
  }

  const isWin = process.platform === 'win32';
  const isMac = process.platform === 'darwin';
  const shells: ShellInfo[] = [];

  if (isWin) {
    const systemRoot = process.env.SystemRoot || 'C:\\Windows';
    const system32 = path.join(systemRoot, 'System32');

    // 1. PowerShell 7+ (pwsh)
    const pwshCandidate =
      whichSync('pwsh.exe') ||
      [
        'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
        'C:\\Program Files (x86)\\PowerShell\\7\\pwsh.exe',
        path.join(process.env.LOCALAPPDATA || '', 'Microsoft\\PowerShell\\7\\pwsh.exe'),
      ].find((p) => p && fs.existsSync(p));

    if (pwshCandidate && fs.existsSync(pwshCandidate)) {
      shells.push({
        id: 'pwsh',
        name: 'PowerShell 7',
        path: path.resolve(pwshCandidate),
        icon: 'terminal',
      });
    }

    // 2. Windows PowerShell (powershell.exe)
    const winPsPath = path.join(system32, 'WindowsPowerShell\\v1.0\\powershell.exe');
    const powershellCandidate = fs.existsSync(winPsPath) ? winPsPath : whichSync('powershell.exe');
    if (powershellCandidate && fs.existsSync(powershellCandidate)) {
      shells.push({
        id: 'powershell',
        name: 'Windows PowerShell',
        path: path.resolve(powershellCandidate),
        icon: 'terminal',
      });
    }

    // 3. Command Prompt (cmd.exe)
    const cmdCandidate =
      process.env.ComSpec && fs.existsSync(process.env.ComSpec)
        ? process.env.ComSpec
        : path.join(system32, 'cmd.exe');
    if (cmdCandidate && fs.existsSync(cmdCandidate)) {
      shells.push({
        id: 'cmd',
        name: 'Command Prompt',
        path: path.resolve(cmdCandidate),
        icon: 'terminal',
      });
    }

    // 4. Git Bash
    const gitBashCandidate =
      [
        'C:\\Program Files\\Git\\bin\\bash.exe',
        'C:\\Program Files\\Git\\git-bash.exe',
        'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
        path.join(process.env.LOCALAPPDATA || '', 'Programs\\Git\\bin\\bash.exe'),
      ].find((p) => p && fs.existsSync(p)) || whichSync('bash.exe');

    if (gitBashCandidate && fs.existsSync(gitBashCandidate)) {
      shells.push({
        id: 'git-bash',
        name: 'Git Bash',
        path: path.resolve(gitBashCandidate),
        icon: 'terminal',
      });
    }

    // 5. WSL (wsl.exe)
    const wslCandidate = path.join(system32, 'wsl.exe');
    if (fs.existsSync(wslCandidate)) {
      const absWsl = path.resolve(wslCandidate);
      shells.push({
        id: 'wsl',
        name: 'WSL (Default)',
        path: absWsl,
        icon: 'linux',
      });

      // Scan distros non-blocking asynchronously
      scanWslDistrosAsync(absWsl);
    }
  } else if (isMac) {
    const candidates = ['/bin/zsh', '/bin/bash', '/opt/homebrew/bin/bash'];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        shells.push({
          id: path.basename(p),
          name: path.basename(p),
          path: p,
          icon: 'terminal',
        });
      }
    }
  } else {
    // Linux
    const candidates = ['/bin/bash', '/usr/bin/bash', '/bin/zsh', '/usr/bin/zsh'];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        shells.push({
          id: path.basename(p),
          name: path.basename(p),
          path: p,
          icon: 'terminal',
        });
      }
    }
  }

  logger.info(`Detected ${shells.length} shells on system:`, shells);
  cachedShells = shells;
  return shells;
}
