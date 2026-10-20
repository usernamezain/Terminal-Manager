import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../terminal/registry/TerminalRegistry', () => ({
  terminalRegistry: {
    unregister: vi.fn(),
    register: vi.fn(),
    attach: vi.fn(),
    detach: vi.fn(),
    get: vi.fn(),
  },
}));

import { useWorkspaceStore } from '../useWorkspaceStore';

describe('useWorkspaceStore Docking Unit Tests', () => {
  beforeEach(() => {
    // Reset state before test
    const tabId = 'tab-test-1';
    const paneId = 'pane-test-1';
    useWorkspaceStore.setState({
      tabs: [
        {
          id: tabId,
          title: 'Terminal 1',
          mode: 'split',
          root: {
            id: paneId,
            type: 'pane',
            sessionId: 'pty-1',
            title: 'PowerShell',
          },
          focusedPaneId: paneId,
        },
      ],
      activeTabId: tabId,
    });
  });

  it('handles popping out a tab and replaces it with a clean placeholder if it was the only tab', () => {
    useWorkspaceStore.getState().handleTabPoppedOut('pty-1');

    const state = useWorkspaceStore.getState();
    expect(state.tabs.length).toBe(1);
    const firstTab = state.tabs[0];
    expect(firstTab?.root.type).toBe('pane');
    if (firstTab?.root.type === 'pane') {
      expect(firstTab.root.sessionId).toBe('');
    }
  });

  it('handles docking a session back and replaces the empty placeholder tab', () => {
    // Step 1: Pop out
    useWorkspaceStore.getState().handleTabPoppedOut('pty-1');
    expect(useWorkspaceStore.getState().tabs.length).toBe(1);

    // Step 2: Dock back
    useWorkspaceStore.getState().dockTab({
      sessionId: 'pty-1',
      title: 'PowerShell Restored',
      cwd: 'C:\\Users\\Test',
    });

    const state = useWorkspaceStore.getState();
    expect(state.tabs.length).toBe(1);
    const root = state.tabs[0]?.root;
    expect(root?.type).toBe('pane');
    if (root?.type === 'pane') {
      expect(root.sessionId).toBe('pty-1');
      expect(root.title).toBe('PowerShell Restored');
      expect(root.cwd).toBe('C:\\Users\\Test');
    }
  });

  it('preserves existing active tabs when docking a session into a multi-tab window', () => {
    // Dock an additional session
    useWorkspaceStore.getState().dockTab({
      sessionId: 'pty-2',
      title: 'Second Terminal',
      cwd: 'C:\\Projects\\App',
    });

    const state = useWorkspaceStore.getState();
    expect(state.tabs.length).toBe(2);
    expect(state.activeTabId).toBe(state.tabs[1]?.id);
    const root = state.tabs[1]?.root;
    if (root?.type === 'pane') {
      expect(root.cwd).toBe('C:\\Projects\\App');
    }
  });

  it('successfully completes 5 full cycles of pop-out and dock without state corruption', () => {
    for (let cycle = 1; cycle <= 5; cycle++) {
      // Pop out
      useWorkspaceStore.getState().handleTabPoppedOut('pty-1');
      let state = useWorkspaceStore.getState();
      expect(state.tabs.length).toBe(1);
      let root = state.tabs[0]?.root;
      if (root?.type === 'pane') {
        expect(root.sessionId).toBe('');
      }

      // Dock back
      useWorkspaceStore.getState().dockTab({
        sessionId: 'pty-1',
        title: `Terminal Cycle ${cycle}`,
        cwd: `C:\\Cycle\\${cycle}`,
      });
      state = useWorkspaceStore.getState();
      expect(state.tabs.length).toBe(1);
      root = state.tabs[0]?.root;
      if (root?.type === 'pane') {
        expect(root.sessionId).toBe('pty-1');
        expect(root.title).toBe(`Terminal Cycle ${cycle}`);
        expect(root.cwd).toBe(`C:\\Cycle\\${cycle}`);
      }
    }
  });

  it('handles popping out and docking multiple independent sessions without crosstalk', () => {
    // Add two more tabs
    useWorkspaceStore.getState().dockTab({
      sessionId: 'pty-2',
      title: 'Terminal 2',
      cwd: 'C:\\Repo\\Two',
    });
    useWorkspaceStore.getState().dockTab({
      sessionId: 'pty-3',
      title: 'Terminal 3',
      cwd: 'C:\\Repo\\Three',
    });

    let state = useWorkspaceStore.getState();
    expect(state.tabs.length).toBe(3);

    // Pop out pty-2 only
    useWorkspaceStore.getState().handleTabPoppedOut('pty-2');
    state = useWorkspaceStore.getState();
    expect(state.tabs.length).toBe(2);
    expect(state.tabs.some((t) => (t.root as any).sessionId === 'pty-1')).toBe(true);
    expect(state.tabs.some((t) => (t.root as any).sessionId === 'pty-3')).toBe(true);
    expect(state.tabs.some((t) => (t.root as any).sessionId === 'pty-2')).toBe(false);

    // Dock pty-2 back
    useWorkspaceStore.getState().dockTab({
      sessionId: 'pty-2',
      title: 'Terminal 2 Restored',
      cwd: 'C:\\Repo\\Two',
    });
    state = useWorkspaceStore.getState();
    expect(state.tabs.length).toBe(3);
    const docked = state.tabs.find((t) => (t.root as any).sessionId === 'pty-2');
    expect(docked).toBeDefined();
    expect((docked?.root as any).cwd).toBe('C:\\Repo\\Two');
  });
});
