import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { app } from 'electron';
import {
  AgentCatalogEntry,
  AgentDetectionState,
  AgentWithState,
  PrerequisiteItem,
  AgentCacheData,
} from '../../shared/agentTypes';
import { refreshEnvPath, expandWindowsEnv } from './envPathHelper';
import { agentCatalog } from './agentCatalog';
import { logger } from '../logger';

const VERSION_PROBE_TIMEOUT_MS = 4000;

export class AgentDetector {
  private cache: Map<string, AgentDetectionState> = new Map();
  private lastScanTime = 0;
  public isScanning = false;
  private scanPromise: Promise<AgentWithState[]> | null = null;
  private cachedPrereqs: PrerequisiteItem[] = [];

  private getCacheFilePath(): string {
    const userData = app?.getPath ? app.getPath('userData') : path.join(process.cwd(), 'userData');
    return path.join(userData, 'agents.cache.json');
  }

  /**
   * Resolves an executable on Windows using where.exe with the specified PATH.
   */
  public async resolveWhere(cmd: string, envPath: string): Promise<string[]> {
    if (process.platform !== 'win32') {
      return [];
    }

    return new Promise((resolve) => {
      execFile(
        'where.exe',
        [cmd],
        {
          env: { ...process.env, PATH: envPath },
          timeout: 3000,
        },
        (err, stdout) => {
          if (err || !stdout) {
            resolve([]);
            return;
          }
          const results = stdout
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0 && fs.existsSync(s));
          resolve(results);
        }
      );
    });
  }

  /**
   * Checks known and common directories for an agent's executable when not on PATH.
   */
  public checkKnownAndCommonDirs(entry: AgentCatalogEntry): string | null {
    const candidatesDirs: string[] = [];

    if (entry.knownInstallDirs) {
      for (const d of entry.knownInstallDirs) {
        candidatesDirs.push(expandWindowsEnv(d));
      }
    }

    // Standard developer candidate paths
    candidatesDirs.push(
      path.join(os.homedir(), '.local', 'bin'),
      path.join(os.homedir(), '.opencode', 'bin'),
      path.join(os.homedir(), 'AppData', 'Local', 'hermes'),
      path.join(os.homedir(), 'AppData', 'Local', 'agy', 'bin'),
      path.join(os.homedir(), 'AppData', 'Roaming', 'npm'),
      path.join(os.homedir(), 'AppData', 'Local', 'uv', 'tools'),
      path.join(os.homedir(), '.cargo', 'bin'),
      path.join(os.homedir(), 'scoop', 'shims'),
      path.join(process.env.ProgramData || 'C:\\ProgramData', 'chocolatey', 'bin')
    );

    const exts = ['.exe', '.cmd', '.bat', '.ps1', ''];
    const namesToCheck = [entry.command, ...(entry.altCommands || [])];

    for (const dir of candidatesDirs) {
      if (!dir || !fs.existsSync(dir)) continue;
      for (const name of namesToCheck) {
        for (const ext of exts) {
          const testPath = path.join(dir, `${name}${ext}`);
          try {
            if (fs.existsSync(testPath) && fs.statSync(testPath).isFile()) {
              return testPath;
            }
          } catch {}
        }
      }
    }

    return null;
  }

  /**
   * Executes a version probe on the binary with a 4s timeout.
   */
  public async probeVersion(
    exePath: string,
    args: string[],
    envPath: string
  ): Promise<{ version?: string; error?: string; output?: string }> {
    return new Promise((resolve) => {
      let resolved = false;

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve({ version: 'unknown', error: 'Version probe timed out (4s)' });
        }
      }, VERSION_PROBE_TIMEOUT_MS);

      execFile(
        exePath,
        args,
        {
          timeout: VERSION_PROBE_TIMEOUT_MS,
          env: { ...process.env, PATH: envPath },
          windowsHide: true,
        },
        (err, stdout, stderr) => {
          clearTimeout(timer);
          if (resolved) return;
          resolved = true;

          const combined = `${stdout || ''}\n${stderr || ''}`.trim();
          if (err && !combined) {
            resolve({ error: err.message || 'Execution failed' });
            return;
          }

          // Try to extract version from output
          const semverMatch = combined.match(/v?([0-9]+\.[0-9]+(\.[0-9]+[a-zA-Z0-9_.-]*)?)/i);
          if (semverMatch && semverMatch[1]) {
            resolve({ version: semverMatch[1], output: combined });
          } else if (combined) {
            const firstLine = combined.split(/\r?\n/)[0]?.trim();
            resolve({ version: firstLine && firstLine.length <= 40 ? firstLine : 'unknown', output: combined });
          } else {
            resolve({ version: 'unknown', output: combined });
          }
        }
      );
    });
  }

  /**
   * Probes a single agent entry.
   */
  public async probeAgent(entry: AgentCatalogEntry, envPath: string): Promise<AgentDetectionState> {
    const isWslOnly = entry.windows === 'wsl-only';

    // 1. Try resolving via where.exe
    let resolvedLocations = await this.resolveWhere(entry.command, envPath);
    if (resolvedLocations.length === 0 && entry.altCommands) {
      for (const alt of entry.altCommands) {
        resolvedLocations = await this.resolveWhere(alt, envPath);
        if (resolvedLocations.length > 0) break;
      }
    }

    let isOffPath = false;
    let targetExe: string | null = resolvedLocations[0] || null;

    // 2. If not found on PATH, check known install dirs
    if (!targetExe) {
      const offPathMatch = this.checkKnownAndCommonDirs(entry);
      if (offPathMatch) {
        targetExe = offPathMatch;
        isOffPath = true;
      }
    }

    // 3. If still not found
    if (!targetExe) {
      return {
        status: isWslOnly ? 'wsl_only' : 'not_installed',
        lastChecked: Date.now(),
      };
    }

    // 4. Test version probe
    const versionArgs = entry.versionArgs && entry.versionArgs.length > 0 ? entry.versionArgs : ['--version'];
    const probeRes = await this.probeVersion(targetExe, versionArgs, envPath);

    // 5. Check Antigravity desktop app conflict for 'agy'
    let desktopConflict = false;
    let desktopConflictFix: string | undefined;

    if (entry.id === 'agy') {
      const lowerPath = targetExe.toLowerCase();
      const isDesktopExe =
        lowerPath.endsWith('antigravity.exe') && !lowerPath.includes('bin\\agy');
      const isDesktopOutput =
        probeRes.output?.toLowerCase().includes('electron') ||
        probeRes.output?.toLowerCase().includes('gui') ||
        lowerPath.includes('resources\\app');

      if (isDesktopExe || isDesktopOutput) {
        desktopConflict = true;
        desktopConflictFix =
          "The 'agy' command is resolving to the Antigravity desktop app launcher. Install the CLI via 'npm install -g @google/antigravity-cli' or place '%LOCALAPPDATA%\\agy\\bin' at the top of your User PATH.";
      }
    }

    if (probeRes.error && !fs.existsSync(targetExe)) {
      return {
        status: 'broken',
        resolvedPath: targetExe,
        error: probeRes.error,
        desktopConflict,
        desktopConflictFix,
        lastChecked: Date.now(),
      };
    }

    return {
      status: isOffPath ? 'not_on_path' : 'installed',
      version: probeRes.version || 'unknown',
      resolvedPath: targetExe,
      desktopConflict,
      desktopConflictFix,
      lastChecked: Date.now(),
    };
  }

  /**
   * Probes all prerequisites (node, npm, git, python, uv, winget, wsl).
   */
  public async probePrerequisites(envPath: string): Promise<PrerequisiteItem[]> {
    const list = [
      { id: 'node', name: 'Node.js', wingetId: 'OpenJS.NodeJS.LTS', installUrl: 'https://nodejs.org' },
      { id: 'npm', name: 'npm', wingetId: undefined, installUrl: 'https://nodejs.org' },
      { id: 'git', name: 'Git for Windows', wingetId: 'Git.Git', installUrl: 'https://git-scm.com' },
      { id: 'python', name: 'Python', wingetId: 'Python.Python.3.12', installUrl: 'https://python.org' },
      { id: 'uv', name: 'uv (Astral)', wingetId: 'astral-sh.uv', installUrl: 'https://docs.astral.sh/uv' },
      { id: 'winget', name: 'Windows Package Manager (WinGet)', wingetId: undefined, installUrl: 'https://aka.ms/getwinget' },
      { id: 'wsl', name: 'WSL (Windows Subsystem for Linux)', wingetId: undefined, installUrl: 'https://learn.microsoft.com/windows/wsl/install' },
    ];

    const results: PrerequisiteItem[] = [];

    for (const item of list) {
      let cmd = item.id;
      if (item.id === 'wsl') cmd = 'wsl.exe';
      const locs = await this.resolveWhere(cmd, envPath);
      const isInstalled = locs.length > 0;
      let ver: string | undefined;

      if (isInstalled && locs[0]) {
        const vRes = await this.probeVersion(locs[0], ['--version'], envPath);
        ver = vRes.version;
      }

      results.push({
        id: item.id,
        name: item.name,
        installed: isInstalled,
        version: ver,
        resolvedPath: locs[0],
        wingetId: item.wingetId,
        installUrl: item.installUrl,
      });
    }

    this.cachedPrereqs = results;
    return results;
  }

  /**
   * Scans all agents in parallel with concurrency 4.
   */
  public async scanAll(force = false): Promise<AgentWithState[]> {
    const now = Date.now();
    if (!force && this.scanPromise) {
      return this.scanPromise;
    }
    if (!force && now - this.lastScanTime < 5000 && this.cache.size > 0) {
      return this.getCachedResults();
    }

    this.isScanning = true;
    this.scanPromise = (async () => {
      try {
        const envPath = await refreshEnvPath(force);
        const agents = agentCatalog.getAllAgents();
        const results: AgentWithState[] = [];

        // Concurrency limiter with queue of 4
        const concurrency = 4;
        let index = 0;

        const worker = async () => {
          while (index < agents.length) {
            const currentIdx = index++;
            const entry = agents[currentIdx];
            if (!entry) break;

            try {
              const state = await this.probeAgent(entry, envPath);
              this.cache.set(entry.id, state);
              results[currentIdx] = { entry, state };
            } catch (err: any) {
              const state: AgentDetectionState = {
                status: 'broken',
                error: err?.message || String(err),
                lastChecked: Date.now(),
              };
              this.cache.set(entry.id, state);
              results[currentIdx] = { entry, state };
            }
          }
        };

        const workers = Array.from({ length: Math.min(concurrency, agents.length) }, () => worker());
        await Promise.all(workers);

        // Also refresh prerequisites in parallel
        await this.probePrerequisites(envPath);

        this.lastScanTime = Date.now();
        this.saveCacheFile(results);
        return results;
      } finally {
        this.isScanning = false;
        this.scanPromise = null;
      }
    })();

    return this.scanPromise;
  }

  public getCachedResults(): AgentWithState[] {
    const agents = agentCatalog.getAllAgents();
    return agents.map((entry) => ({
      entry,
      state: this.cache.get(entry.id) || {
        status: 'not_installed',
        lastChecked: 0,
      },
    }));
  }

  public getCachedPrerequisites(): PrerequisiteItem[] {
    return this.cachedPrereqs;
  }

  public getAgentState(agentId: string): AgentDetectionState | undefined {
    return this.cache.get(agentId);
  }

  public getDetectionState(agentId: string): AgentDetectionState | undefined {
    return this.cache.get(agentId);
  }

  /**
   * Writes installed agents cache file for instant tray and explorer menu reading.
   */
  private saveCacheFile(items: AgentWithState[]): void {
    try {
      const cacheFile = this.getCacheFilePath();
      const installedOnly = items
        .filter((i) => i.state.status === 'installed')
        .map((i) => ({
          id: i.entry.id,
          name: i.entry.name,
          command: i.entry.command,
          resolvedPath: i.state.resolvedPath,
          version: i.state.version,
        }));

      const payload: AgentCacheData = {
        updatedAt: Date.now(),
        installedAgents: installedOnly,
      };

      const dir = path.dirname(cacheFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(cacheFile, JSON.stringify(payload, null, 2), 'utf8');
    } catch (err) {
      logger.warn('[AgentDetector] Failed writing agents.cache.json:', err);
    }
  }

  /**
   * Reads cached installed agents from disk (fast, no probing).
   */
  public getInstalledFromDiskCache(): Array<{ id: string; name: string; command: string; resolvedPath?: string; version?: string }> {
    try {
      const cacheFile = this.getCacheFilePath();
      if (fs.existsSync(cacheFile)) {
        const raw = fs.readFileSync(cacheFile, 'utf8');
        const parsed = JSON.parse(raw) as AgentCacheData;
        return parsed.installedAgents || [];
      }
    } catch {}
    return [];
  }
}

export const agentDetector = new AgentDetector();
