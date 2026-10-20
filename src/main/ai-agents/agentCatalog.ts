import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import {
  AgentCatalogEntry,
  AgentCatalogFile,
  AgentCatalogFileSchema,
  AgentCatalogEntrySchema,
  CustomAgentCreateSchema,
  CustomAgentInput,
  parseArgsString,
} from '../../shared/agentTypes';
import { logger } from '../logger';

// Built-in fallback catalog if JSON file cannot be loaded
import bundledCatalog from '../../../resources/agents.catalog.json';

export class AgentCatalogManager {
  private customCatalogPath: string | null = null;
  private cachedAgents: AgentCatalogEntry[] = [];

  constructor(customPath?: string) {
    if (customPath) {
      this.customCatalogPath = customPath;
    }
  }

  public setCustomPath(p: string): void {
    this.customCatalogPath = p;
  }

  private getCustomPath(): string {
    if (!this.customCatalogPath) {
      const userData = app?.getPath ? app.getPath('userData') : path.join(process.cwd(), 'userData');
      this.customCatalogPath = path.join(userData, 'agents.custom.json');
    }
    return this.customCatalogPath;
  }

  private loadBundledCatalog(): AgentCatalogEntry[] {
    const rootDir = app?.getAppPath ? app.getAppPath() : process.cwd();
    const candidatePaths = [
      path.join(rootDir, 'resources', 'agents.catalog.json'),
      path.join(process.resourcesPath || '', 'resources', 'agents.catalog.json'),
      path.join(process.resourcesPath || '', 'agents.catalog.json'),
      path.join(__dirname, '../../resources/agents.catalog.json'),
      path.join(__dirname, '../../../resources/agents.catalog.json'),
    ];

    for (const p of candidatePaths) {
      try {
        if (fs.existsSync(p)) {
          const raw = fs.readFileSync(p, 'utf8');
          const parsed = JSON.parse(raw);
          const validated = AgentCatalogFileSchema.safeParse(parsed);
          if (validated.success) {
            return validated.data.agents;
          } else {
            logger.warn(`[AgentCatalog] Validation error parsing ${p}:`, validated.error.message);
          }
        }
      } catch (err) {
        logger.warn(`[AgentCatalog] Failed reading candidate ${p}:`, err);
      }
    }

    // Fallback to imported bundled catalog
    try {
      const validated = AgentCatalogFileSchema.safeParse(bundledCatalog);
      if (validated.success) {
        return validated.data.agents;
      }
    } catch {}

    return (bundledCatalog as unknown as AgentCatalogFile).agents || [];
  }

  private loadCustomCatalog(): AgentCatalogEntry[] {
    const customPath = this.getCustomPath();
    if (!fs.existsSync(customPath)) {
      return [];
    }

    try {
      const raw = fs.readFileSync(customPath, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const validList: AgentCatalogEntry[] = [];
        for (const item of parsed) {
          const res = AgentCatalogEntrySchema.safeParse(item);
          if (res.success) {
            validList.push({ ...res.data, isCustom: true });
          } else {
            logger.warn(`[AgentCatalog] Skipping invalid custom agent:`, res.error.message);
          }
        }
        return validList;
      }
    } catch (err) {
      logger.error(`[AgentCatalog] Failed reading custom catalog:`, err);
    }
    return [];
  }

  public getAllAgents(): AgentCatalogEntry[] {
    const bundled = this.loadBundledCatalog();
    const custom = this.loadCustomCatalog();

    // Map by ID, custom agents take precedence or append
    const map = new Map<string, AgentCatalogEntry>();
    for (const b of bundled) {
      map.set(b.id, b);
    }
    for (const c of custom) {
      map.set(c.id, { ...c, isCustom: true });
    }

    this.cachedAgents = Array.from(map.values());
    return this.cachedAgents;
  }

  public getAgentById(id: string): AgentCatalogEntry | undefined {
    const all = this.getAllAgents();
    return all.find((a) => a.id.toLowerCase() === id.toLowerCase() || (a.altCommands && a.altCommands.includes(id.toLowerCase())));
  }

  public addCustomAgent(input: CustomAgentInput): { success: boolean; agent?: AgentCatalogEntry; error?: string } {
    const validation = CustomAgentCreateSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.errors.map((e) => e.message).join(', ') };
    }

    const data = validation.data;
    const sanitizedId = `custom-${data.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;

    const customEntry: AgentCatalogEntry = {
      id: sanitizedId,
      name: data.name.trim(),
      vendor: 'Custom',
      description: `User-defined agent (${data.command})`,
      command: data.command.trim(),
      versionArgs: ['--version'],
      installMethods: data.installCommand
        ? [
            {
              id: 'custom-install',
              label: 'Custom Install Command',
              shell: data.installShell || 'powershell',
              command: data.installCommand.trim(),
              requires: [],
              isScriptPipe: data.installCommand.includes('|'),
              source: 'local',
              recommended: true,
            },
          ]
        : [],
      signIn: {
        type: 'none',
        instructions: data.signInNote || 'Self-configured / manual setup',
      },
      cost: {
        note: 'User configured',
        verifiedOn: new Date().toISOString().split('T')[0] || '2026-10-13',
      },
      docsUrl: data.docsUrl || 'https://google.com',
      status: 'active',
      windows: 'native',
      resumeArgs: data.defaultArgs ? parseArgsString(data.defaultArgs) : undefined,
      isCustom: true,
    };

    const currentCustom = this.loadCustomCatalog();
    currentCustom.push(customEntry);

    try {
      const customPath = this.getCustomPath();
      const dir = path.dirname(customPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(customPath, JSON.stringify(currentCustom, null, 2), 'utf8');
      return { success: true, agent: customEntry };
    } catch (err: any) {
      logger.error('[AgentCatalog] Failed saving custom agent:', err);
      return { success: false, error: err?.message || String(err) };
    }
  }

  public deleteCustomAgent(id: string): { success: boolean; error?: string } {
    const isBundled = this.loadBundledCatalog().some((b) => b.id === id);
    if (isBundled) {
      return { success: false, error: 'Cannot delete built-in bundled agent' };
    }
    const currentCustom = this.loadCustomCatalog();
    const filtered = currentCustom.filter((a) => a.id !== id);
    if (filtered.length === currentCustom.length) {
      return { success: false, error: 'Custom agent not found' };
    }

    try {
      const customPath = this.getCustomPath();
      fs.writeFileSync(customPath, JSON.stringify(filtered, null, 2), 'utf8');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  }
}

export const agentCatalog = new AgentCatalogManager();
