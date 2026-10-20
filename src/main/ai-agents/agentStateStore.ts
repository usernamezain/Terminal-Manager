import fs from 'fs';
import path from 'path';
import { app, safeStorage } from 'electron';
import { AgentUserState, AgentLaunchMode } from '../../shared/agentTypes';
import { logger } from '../logger';

interface StoredAgentState {
  version: number;
  agents: Record<string, {
    lastFolder?: string;
    lastMode?: AgentLaunchMode;
    recentFolders: string[];
    encryptedEnv?: Record<string, string>; // base64 encrypted values
  }>;
}

class AgentStateStore {
  private storePath: string | null = null;
  private state: StoredAgentState = { version: 1, agents: {} };
  private isLoaded = false;

  private getStorePath(): string {
    if (!this.storePath) {
      const userData = app?.getPath ? app.getPath('userData') : path.join(process.cwd(), 'userData');
      this.storePath = path.join(userData, 'agents.state.json');
    }
    return this.storePath;
  }

  private load(): void {
    if (this.isLoaded) return;
    this.isLoaded = true;
    const p = this.getStorePath();
    if (!fs.existsSync(p)) return;

    try {
      const raw = fs.readFileSync(p, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.agents === 'object') {
        this.state = parsed;
      }
    } catch (err) {
      logger.warn('[AgentStateStore] Failed reading agents.state.json:', err);
    }
  }

  private save(): void {
    const p = this.getStorePath();
    try {
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const tempFile = `${p}.tmp.${Date.now()}`;
      fs.writeFileSync(tempFile, JSON.stringify(this.state, null, 2), 'utf8');
      fs.renameSync(tempFile, p);
    } catch (err) {
      logger.error('[AgentStateStore] Failed saving agents.state.json:', err);
    }
  }

  public getAgentState(agentId: string): AgentUserState {
    this.load();
    const entry = this.state.agents[agentId];
    return {
      lastFolder: entry?.lastFolder,
      lastMode: entry?.lastMode,
      recentFolders: entry?.recentFolders || [],
    };
  }

  public recordLaunch(agentId: string, folder: string, mode: AgentLaunchMode): void {
    this.load();
    if (!this.state.agents[agentId]) {
      this.state.agents[agentId] = { recentFolders: [] };
    }
    const agent = this.state.agents[agentId]!;
    agent.lastFolder = folder;
    agent.lastMode = mode;

    if (folder) {
      const norm = path.normalize(folder);
      const filtered = agent.recentFolders.filter((f) => path.normalize(f).toLowerCase() !== norm.toLowerCase());
      agent.recentFolders = [norm, ...filtered].slice(0, 8);
    }

    this.save();
  }

  public isEncryptionAvailable(): boolean {
    try {
      return Boolean(safeStorage && safeStorage.isEncryptionAvailable());
    } catch {
      return false;
    }
  }

  public setAgentEnv(agentId: string, env: Record<string, string>): { success: boolean; error?: string } {
    this.load();
    if (!this.isEncryptionAvailable()) {
      return { success: false, error: 'OS Secure Storage is not available on this system.' };
    }

    if (!this.state.agents[agentId]) {
      this.state.agents[agentId] = { recentFolders: [] };
    }

    const encryptedMap: Record<string, string> = {};
    for (const [k, v] of Object.entries(env)) {
      if (!k.trim()) continue;
      const trimmedVal = v.trim();
      if (!trimmedVal) continue;
      try {
        const encrypted = safeStorage.encryptString(trimmedVal);
        encryptedMap[k.trim()] = encrypted.toString('base64');
      } catch (err: any) {
        return { success: false, error: `Failed encrypting variable ${k}: ${err?.message || err}` };
      }
    }

    this.state.agents[agentId]!.encryptedEnv = encryptedMap;
    this.save();
    return { success: true };
  }

  public getDecryptedEnv(agentId: string): Record<string, string> {
    this.load();
    const agent = this.state.agents[agentId];
    if (!agent || !agent.encryptedEnv || !this.isEncryptionAvailable()) {
      return {};
    }

    const decrypted: Record<string, string> = {};
    for (const [k, b64] of Object.entries(agent.encryptedEnv)) {
      try {
        const buf = Buffer.from(b64, 'base64');
        const plaintext = safeStorage.decryptString(buf);
        decrypted[k] = plaintext;
      } catch (err) {
        logger.warn(`[AgentStateStore] Failed decrypting key ${k} for agent ${agentId}:`, err);
      }
    }
    return decrypted;
  }

  public getMaskedEnv(agentId: string): Record<string, string> {
    this.load();
    const agent = this.state.agents[agentId];
    if (!agent || !agent.encryptedEnv) return {};

    const masked: Record<string, string> = {};
    for (const k of Object.keys(agent.encryptedEnv)) {
      masked[k] = '••••••••';
    }
    return masked;
  }

  public clearAllData(): void {
    this.state = { version: 1, agents: {} };
    this.save();
  }
}

export const agentStateStore = new AgentStateStore();
