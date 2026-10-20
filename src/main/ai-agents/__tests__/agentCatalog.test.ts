import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { AgentCatalogManager } from '../agentCatalog';
import { AgentCatalogFileSchema } from '../../../shared/agentTypes';

describe('AI Agent Catalog & Custom Merging Tests', () => {
  const catalogPath = path.resolve(__dirname, '../../../../resources/agents.catalog.json');

  it('bundled catalog file exists and matches AgentCatalogFileSchema', () => {
    expect(fs.existsSync(catalogPath)).toBe(true);
    const content = fs.readFileSync(catalogPath, 'utf8');
    const parsed = JSON.parse(content);

    const validated = AgentCatalogFileSchema.safeParse(parsed);
    expect(validated.success).toBe(true);
    if (!validated.success) {
      console.error(validated.error);
    }
  });

  it('bundled catalog contains all 15 required and candidate agents', () => {
    const content = fs.readFileSync(catalogPath, 'utf8');
    const parsed = JSON.parse(content);
    const ids = parsed.agents.map((a: any) => a.id);

    const requiredIds = [
      'claude',
      'agy',
      'codex',
      'copilot',
      'opencode',
      'hermes',
      'kimi',
      'qwen',
      'aider',
      'goose',
      'kiro-cli',
      'cursor-agent',
      'cline',
      'openhands',
      'gemini',
    ];

    for (const reqId of requiredIds) {
      expect(ids).toContain(reqId);
    }
  });

  it('gemini is marked as legacy and has migration instructions', () => {
    const content = fs.readFileSync(catalogPath, 'utf8');
    const parsed = JSON.parse(content);
    const gemini = parsed.agents.find((a: any) => a.id === 'gemini');
    expect(gemini).toBeDefined();
    expect(gemini.status).toBe('legacy');
    expect(gemini.installMethods.length).toBe(0);
    expect(gemini.cost.note).toContain('June 18, 2026');
  });

  it('all active catalog entries have verifiedOn: "2026-10-13" and valid docsUrl', () => {
    const content = fs.readFileSync(catalogPath, 'utf8');
    const parsed = JSON.parse(content);

    for (const agent of parsed.agents) {
      expect(agent.docsUrl).toMatch(/^https?:\/\//);
      expect(agent.cost.verifiedOn).toBe('2026-10-13');
      expect(['active', 'legacy', 'unverified']).toContain(agent.status);
      expect(['native', 'wsl-only', 'unknown']).toContain(agent.windows);
    }
  });

  describe('Custom Agent Merging & Persistence', () => {
    let tempDir: string;
    let customFile: string;
    let catalog: AgentCatalogManager;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-cat-test-'));
      customFile = path.join(tempDir, 'agents.custom.json');
      catalog = new AgentCatalogManager(customFile);
    });

    afterEach(() => {
      try {
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      } catch {}
    });

    it('merges custom agents on top of bundled catalog', () => {
      const initialCount = catalog.getAllAgents().length;

      const addResult = catalog.addCustomAgent({
        name: 'My Custom Agent',
        command: 'my-agent',
        installCommand: 'npm install -g my-agent',
        installShell: 'powershell',
        signInNote: 'Set MY_AGENT_KEY',
        docsUrl: 'https://example.com/docs',
      });

      expect(addResult.success).toBe(true);
      expect(addResult.agent).toBeDefined();
      expect(addResult.agent?.isCustom).toBe(true);

      const updatedAgents = catalog.getAllAgents();
      expect(updatedAgents.length).toBe(initialCount + 1);

      const found = catalog.getAgentById(addResult.agent!.id);
      expect(found).toBeDefined();
      expect(found?.name).toBe('My Custom Agent');
      expect(found?.isCustom).toBe(true);
      expect(found?.installMethods[0]?.command).toBe('npm install -g my-agent');

      // Verify custom agent persisted to disk
      expect(fs.existsSync(customFile)).toBe(true);
      const diskContent = JSON.parse(fs.readFileSync(customFile, 'utf8'));
      const list = Array.isArray(diskContent) ? diskContent : diskContent.agents;
      expect(list.some((a: any) => a.name === 'My Custom Agent')).toBe(true);
    });

    it('persists default launch arguments as resumeArgs on custom agent', () => {
      const addResult = catalog.addCustomAgent({
        name: 'Agent With Args',
        command: 'args-agent',
        defaultArgs: '--dangerously-skip-permissions --model "gpt 4o"',
      });

      expect(addResult.success).toBe(true);
      expect(addResult.agent?.resumeArgs).toEqual(['--dangerously-skip-permissions', '--model', 'gpt 4o']);
    });

    it('allows deleting a custom agent and preserves disk state', () => {
      const addResult = catalog.addCustomAgent({
        name: 'Agent To Delete',
        command: 'agent-del',
      });
      expect(addResult.success).toBe(true);
      const agentId = addResult.agent!.id;

      const delResult = catalog.deleteCustomAgent(agentId);
      expect(delResult.success).toBe(true);
      expect(catalog.getAgentById(agentId)).toBeUndefined();
    });

    it('prevents deleting a bundled agent', () => {
      const delResult = catalog.deleteCustomAgent('claude');
      expect(delResult.success).toBe(false);
      expect(delResult.error).toContain('Cannot delete built-in');
    });
  });
});
