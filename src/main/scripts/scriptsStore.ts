import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { logger } from '../logger';
import {
  ScriptDefinition,
  ScriptSequence,
  HistoryRecord,
} from '../../shared/scriptRunnerTypes';

interface ScriptsData {
  version: number;
  scripts: ScriptDefinition[];
  sequences: ScriptSequence[];
}

interface HistoryData {
  version: number;
  records: HistoryRecord[];
}

const DEFAULT_STARTER_SCRIPTS: ScriptDefinition[] = [
  {
    id: 'script-sysinfo',
    name: 'System Health Check',
    description: 'Displays system OS version, CPU, and memory utilization',
    type: 'powershell',
    source: 'inline',
    content: `# Terminal Manager - System Health Check
Write-Host "=== System Health Overview ===" -ForegroundColor Cyan
Get-CimInstance Win32_OperatingSystem | Select-Object Caption, OSArchitecture, Version, TotalVisibleMemorySize, FreePhysicalMemory | Format-List
Write-Host "Uptime Check:" -ForegroundColor Green
(Get-Date) - (gcim Win32_OperatingSystem).LastBootUpTime
Write-Host "Completed successfully!" -ForegroundColor Green
`,
    args: [],
    env: {},
    timeoutSeconds: 30,
    visibility: 'hidden',
    onFailure: 'stop',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'script-gitstatus',
    name: 'Git Status Summary',
    description: 'Inspects current git branch and uncommitted working directory changes',
    type: 'command',
    source: 'inline',
    content: 'git status --short --branch',
    args: [],
    env: {},
    timeoutSeconds: 15,
    visibility: 'hidden',
    onFailure: 'continue',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'script-node-env',
    name: 'Node Environment Probe',
    description: 'Prints current Node.js and npm versions and platform architecture',
    type: 'node',
    source: 'inline',
    content: `console.log("Node Runtime:", process.version);
console.log("Platform & Arch:", process.platform, process.arch);
console.log("V8 Version:", process.versions.v8);
console.log("Memory Usage (MB):", Math.round(process.memoryUsage().heapUsed / 1024 / 1024));
`,
    args: [],
    env: {},
    timeoutSeconds: 15,
    visibility: 'hidden',
    onFailure: 'stop',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

const DEFAULT_STARTER_SEQUENCES: ScriptSequence[] = [
  {
    id: 'seq-dev-check',
    name: 'Development Diagnostics',
    description: 'Runs system health check and node environment check sequentially',
    scriptIds: ['script-sysinfo', 'script-node-env'],
    runOnAppStart: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

export class ScriptsStore {
  private scriptsFilePath: string = '';
  private historyFilePath: string = '';
  private scripts: Map<string, ScriptDefinition> = new Map();
  private sequences: Map<string, ScriptSequence> = new Map();
  private history: HistoryRecord[] = [];
  private maxHistoryRecords = 100;

  constructor(customUserDataPath?: string) {
    if (customUserDataPath) {
      this.initPaths(customUserDataPath);
    }
  }

  public init(): void {
    if (!this.scriptsFilePath) {
      const userData = app?.getPath ? app.getPath('userData') : process.cwd();
      this.initPaths(userData);
    }
    this.loadScripts();
    this.loadHistory();
  }

  private initPaths(baseDir: string): void {
    this.scriptsFilePath = path.join(baseDir, 'scripts.json');
    this.historyFilePath = path.join(baseDir, 'script-history.json');
  }

  // Scripts CRUD
  public getAllScripts(): ScriptDefinition[] {
    return Array.from(this.scripts.values());
  }

  public getScript(id: string): ScriptDefinition | undefined {
    return this.scripts.get(id);
  }

  public saveScript(script: ScriptDefinition): ScriptDefinition {
    const now = Date.now();
    const updated: ScriptDefinition = {
      ...script,
      updatedAt: now,
      createdAt: script.createdAt || now,
    };
    this.scripts.set(updated.id, updated);
    this.persistScripts();
    return updated;
  }

  public deleteScript(id: string): boolean {
    const deleted = this.scripts.delete(id);
    if (deleted) {
      // Remove from any sequences containing it
      for (const seq of this.sequences.values()) {
        if (seq.scriptIds.includes(id)) {
          seq.scriptIds = seq.scriptIds.filter((sId) => sId !== id);
          seq.updatedAt = Date.now();
        }
      }
      this.persistScripts();
    }
    return deleted;
  }

  // Sequences CRUD
  public getAllSequences(): ScriptSequence[] {
    return Array.from(this.sequences.values());
  }

  public getSequence(id: string): ScriptSequence | undefined {
    return this.sequences.get(id);
  }

  public saveSequence(seq: ScriptSequence): ScriptSequence {
    const now = Date.now();
    const updated: ScriptSequence = {
      ...seq,
      updatedAt: now,
      createdAt: seq.createdAt || now,
    };
    this.sequences.set(updated.id, updated);
    this.persistScripts();
    return updated;
  }

  public deleteSequence(id: string): boolean {
    const deleted = this.sequences.delete(id);
    if (deleted) {
      this.persistScripts();
    }
    return deleted;
  }

  // History CRUD
  public getHistory(): HistoryRecord[] {
    return [...this.history];
  }

  public addHistoryRecord(record: HistoryRecord): void {
    this.history.unshift(record);
    if (this.history.length > this.maxHistoryRecords) {
      this.history = this.history.slice(0, this.maxHistoryRecords);
    }
    this.persistHistory();
  }

  public deleteHistoryRecord(id: string): boolean {
    const initialLen = this.history.length;
    this.history = this.history.filter((h) => h.id !== id);
    if (this.history.length !== initialLen) {
      this.persistHistory();
      return true;
    }
    return false;
  }

  public clearHistory(): void {
    this.history = [];
    this.persistHistory();
  }

  // Persistence helpers (atomic write via temp file then rename)
  private loadScripts(): void {
    try {
      if (fs.existsSync(this.scriptsFilePath)) {
        const raw = fs.readFileSync(this.scriptsFilePath, 'utf8');
        const data = JSON.parse(raw) as ScriptsData;
        this.scripts.clear();
        this.sequences.clear();
        for (const s of data.scripts || []) {
          this.scripts.set(s.id, s);
        }
        for (const seq of data.sequences || []) {
          this.sequences.set(seq.id, seq);
        }
        logger.info(`[ScriptsStore] Loaded ${this.scripts.size} scripts and ${this.sequences.size} sequences.`);
      } else {
        // Seed default starter scripts & sequences
        for (const s of DEFAULT_STARTER_SCRIPTS) {
          this.scripts.set(s.id, s);
        }
        for (const seq of DEFAULT_STARTER_SEQUENCES) {
          this.sequences.set(seq.id, seq);
        }
        this.persistScripts();
        logger.info('[ScriptsStore] Initialized scripts.json with default starter scripts.');
      }
    } catch (err) {
      logger.error('[ScriptsStore] Failed to load scripts.json:', err);
    }
  }

  private persistScripts(): void {
    if (!this.scriptsFilePath) return;
    const data: ScriptsData = {
      version: 1,
      scripts: Array.from(this.scripts.values()),
      sequences: Array.from(this.sequences.values()),
    };
    this.writeAtomic(this.scriptsFilePath, JSON.stringify(data, null, 2));
  }

  private loadHistory(): void {
    try {
      if (fs.existsSync(this.historyFilePath)) {
        const raw = fs.readFileSync(this.historyFilePath, 'utf8');
        const data = JSON.parse(raw) as HistoryData;
        this.history = data.records || [];
      }
    } catch (err) {
      logger.warn('[ScriptsStore] Failed to load script-history.json:', err);
    }
  }

  private persistHistory(): void {
    if (!this.historyFilePath) return;
    const data: HistoryData = {
      version: 1,
      records: this.history,
    };
    this.writeAtomic(this.historyFilePath, JSON.stringify(data, null, 2));
  }

  private writeAtomic(filePath: string, content: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempPath = `${filePath}.${Date.now()}-${Math.random().toString(36).substring(2, 6)}.tmp`;
    try {
      fs.writeFileSync(tempPath, content, 'utf8');
      fs.renameSync(tempPath, filePath);
    } catch (err) {
      logger.error(`[ScriptsStore] Atomic write failed for ${filePath}:`, err);
      if (fs.existsSync(tempPath)) {
        try { fs.unlinkSync(tempPath); } catch {}
      }
    }
  }
}

export const scriptsStore = new ScriptsStore();
