import { describe, it, expect, vi } from 'vitest';
import { AgentDetector } from '../agentDetector';
import { AgentCatalogEntry } from '../../../shared/agentTypes';

describe('AI Agent Detector Unit Tests', () => {
  it('detects Antigravity desktop app conflict when path points to desktop app', async () => {
    const detector = new AgentDetector();

    // Mock resolveWhere to return desktop app path
    vi.spyOn(detector, 'resolveWhere').mockResolvedValue([
      'C:\\Program Files\\Google\\Antigravity\\Antigravity.exe',
    ]);

    const mockAgyEntry: AgentCatalogEntry = {
      id: 'agy',
      name: 'Antigravity CLI',
      vendor: 'Google',
      description: 'Test entry',
      command: 'agy',
      versionArgs: ['--version'],
      installMethods: [],
      signIn: { type: 'browser', instructions: 'Login via browser' },
      cost: { note: 'Free tier', verifiedOn: '2026-10-13' },
      docsUrl: 'https://antigravity.google/docs',
      status: 'active',
      windows: 'native',
    };

    const state = await detector.probeAgent(mockAgyEntry, 'C:\\dummy');

    expect(state.desktopConflict).toBe(true);
    expect(state.desktopConflictFix).toBeDefined();
    expect(state.desktopConflictFix).toContain('Antigravity desktop app');
  });

  it('marks agent as wsl-only when entry specifies wsl-only windows support and not native', async () => {
    const detector = new AgentDetector();
    vi.spyOn(detector, 'resolveWhere').mockResolvedValue([]);

    const mockWslEntry: AgentCatalogEntry = {
      id: 'test-wsl',
      name: 'WSL-Only Agent',
      vendor: 'OpenSource',
      description: 'Runs in WSL only',
      command: 'wsl-agent',
      installMethods: [],
      signIn: { type: 'none', instructions: 'None' },
      cost: { note: 'Free', verifiedOn: '2026-10-13' },
      docsUrl: 'https://example.com',
      status: 'active',
      windows: 'wsl-only',
    };

    const state = await detector.probeAgent(mockWslEntry, 'C:\\dummy');
    expect(state.status).toBe('wsl_only');
  });

  it('marks agent as not_installed when binary is nowhere to be found', async () => {
    const detector = new AgentDetector();
    vi.spyOn(detector, 'resolveWhere').mockResolvedValue([]);

    const mockMissingEntry: AgentCatalogEntry = {
      id: 'missing-agent',
      name: 'Missing Agent',
      vendor: 'None',
      description: 'Does not exist',
      command: 'missing-agent-exe-xyz-123',
      installMethods: [],
      signIn: { type: 'none', instructions: 'None' },
      cost: { note: 'Free', verifiedOn: '2026-10-13' },
      docsUrl: 'https://example.com',
      status: 'active',
      windows: 'native',
    };

    const state = await detector.probeAgent(mockMissingEntry, 'C:\\dummy');
    expect(state.status).toBe('not_installed');
    expect(state.version).toBeUndefined();
  });
});
