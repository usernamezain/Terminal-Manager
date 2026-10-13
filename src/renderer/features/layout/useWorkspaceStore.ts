import { create } from 'zustand';
import { Workspace, Tab, PaneNode, DropZone, Direction } from './types';
import {
  getAllPanes,
  splitPane as treeSplitPane,
  closePane as treeClosePane,
  movePane as treeMovePane,
  swapPanes as treeSwapPanes,
  setRatio as treeSetRatio,
  equalize as treeEqualize,
  toGrid as treeToGrid,
  findNode,
} from './treeUtils';
import { terminalRegistry } from '../terminal/registry/TerminalRegistry';
import { useProfilesStore } from '../../store/useProfilesStore';

interface UndoCloseEntry {
  tabId: string;
  pane: PaneNode;
  timestamp: number;
}

interface WorkspaceState extends Workspace {
  undoStack: UndoCloseEntry[];
  toastMessage: string | null;
  draggedPaneId: string | null;
  isBroadcastInput: boolean;
  toggleBroadcastInput: () => void;

  // Tab Actions
  setActiveTab: (tabId: string) => void;
  newTab: (shellPath?: string, shellArgs?: string[], profileId?: string, cwd?: string) => Promise<void>;
  closeTab: (tabId: string) => void;
  renameTab: (tabId: string, title: string) => void;
  setTabColor: (tabId: string, color?: string) => void;
  togglePinTab: (tabId: string) => void;
  reorderTabs: (sourceIdx: number, targetIdx: number) => void;

  // Pane Actions
  setFocusedPane: (paneId: string) => void;
  splitPane: (direction: Direction, shellPath?: string, shellArgs?: string[], profileId?: string) => Promise<string>;
  closePane: (paneId: string) => Promise<void>;
  undoClosePane: () => Promise<void>;
  movePane: (sourceId: string, targetId: string, zone: DropZone) => void;
  swapPanes: (paneIdA: string, paneIdB: string) => void;
  setRatio: (splitId: string, ratio: number) => void;
  equalize: () => void;
  toggleGridMode: () => void;
  toggleMaximizePane: (paneId?: string) => void;
  spatialFocus: (direction: 'up' | 'down' | 'left' | 'right') => void;
  duplicatePane: (paneId: string) => Promise<void>;
  spawnN: (count: number) => Promise<void>;
  ensurePtyForPane: (paneId: string, cols?: number, rows?: number, shellPath?: string, shellArgs?: string[]) => Promise<string>;
  setToast: (msg: string | null) => void;
  setDraggedPaneId: (paneId: string | null) => void;
  dockTab: (data: { sessionId: string; profileId?: string; title: string; cwd?: string }) => void;
  handleTabPoppedOut: (sessionId: string) => void;
}

const initialPaneId = 'pane-1';
const initialTabId = 'tab-1';
const initialRoot: PaneNode = {
  id: initialPaneId,
  type: 'pane',
  sessionId: '',
  title: 'PowerShell',
};

const pendingPtyCreations = new Map<string, Promise<string>>();

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  tabs: [
    {
      id: initialTabId,
      title: 'Terminal 1',
      mode: 'split',
      root: initialRoot,
      focusedPaneId: initialPaneId,
    },
  ],
  activeTabId: initialTabId,
  undoStack: [],
  toastMessage: null,
  draggedPaneId: null,
  isBroadcastInput: false,
  toggleBroadcastInput: () => set((state) => ({ isBroadcastInput: !state.isBroadcastInput })),

  setActiveTab: (tabId) => {
    set({ activeTabId: tabId });
  },

  newTab: async (shellPath, shellArgs, profileId, cwd) => {
    const { tabs, toastMessage } = get();
    const count = tabs.reduce((sum, t) => sum + getAllPanes(t.root).length, 0);

    if (count >= 30 && !toastMessage) {
      set({ toastMessage: 'Warning: 30+ terminals open. Memory usage may be high.' });
    }

    const tabId = `tab-${Date.now()}`;
    const paneId = `pane-${Date.now()}`;
    let ptyId = `pty-${Date.now()}`;

    const profiles = useProfilesStore.getState().profiles;
    const profile = profileId
      ? profiles.find((p) => p.id === profileId)
      : (!shellPath ? profiles.find((p) => p.isDefault) : undefined);

    const targetShellPath = shellPath || profile?.shellPath;
    const targetShellArgs = shellArgs || profile?.shellArgs;

    try {
      if (window.api?.pty) {
        const res = await window.api.pty.create({
          cols: 80,
          rows: 24,
          shellPath: targetShellPath,
          shellArgs: targetShellArgs,
          profileId: profile?.id || profileId,
          cwd,
        });
        if (res.id) ptyId = res.id;
      }
    } catch (e) {
      console.error('Failed to create PTY for new tab:', e);
    }

    const title = profile?.name || (targetShellPath ? targetShellPath.split('\\').pop() || 'Terminal' : 'PowerShell');
    const newPane: PaneNode = {
      id: paneId,
      type: 'pane',
      sessionId: ptyId,
      title,
    };

    const newTabObj: Tab = {
      id: tabId,
      title: profile?.tabTitle || title || `Terminal ${tabs.length + 1}`,
      color: profile?.color,
      mode: 'split',
      root: newPane,
      focusedPaneId: paneId,
    };

    set({
      tabs: [...tabs, newTabObj],
      activeTabId: tabId,
    });
  },

  dockTab: (data) => {
    const { tabs } = get();
    const tabId = `tab-${Date.now()}`;
    const paneId = `pane-${Date.now()}`;

    const newPane: PaneNode = {
      id: paneId,
      type: 'pane',
      sessionId: data.sessionId,
      title: data.title || 'Terminal',
    };

    const newTabObj: Tab = {
      id: tabId,
      title: data.title || `Terminal ${tabs.length + 1}`,
      mode: 'split',
      root: newPane,
      focusedPaneId: paneId,
    };

    set({
      tabs: [...tabs, newTabObj],
      activeTabId: tabId,
    });
  },

  handleTabPoppedOut: (sessionId) => {
    const { tabs, activeTabId } = get();
    // Find tab containing this sessionId
    const targetTab = tabs.find((t) => {
      const panes = getAllPanes(t.root);
      return panes.some((p) => p.sessionId === sessionId);
    });

    if (targetTab) {
      // Unregister from terminal DOM registry without killing pty process
      const panes = getAllPanes(targetTab.root);
      for (const p of panes) {
        terminalRegistry.unregister(p.id);
      }

      const remaining = tabs.filter((t) => t.id !== targetTab.id);
      if (remaining.length === 0) {
        const newTId = `tab-${Date.now()}`;
        const newPId = `pane-${Date.now()}`;
        const freshTab: Tab = {
          id: newTId,
          title: 'Terminal 1',
          mode: 'split',
          root: {
            id: newPId,
            type: 'pane',
            sessionId: '',
            title: 'PowerShell',
          },
          focusedPaneId: newPId,
        };
        set({ tabs: [freshTab], activeTabId: newTId });
      } else {
        let nextActive = activeTabId;
        if (activeTabId === targetTab.id) {
          nextActive = remaining[0]?.id || '';
        }
        set({ tabs: remaining, activeTabId: nextActive });
      }
    }
  },

  closeTab: (tabId) => {
    const { tabs, activeTabId } = get();
    const tabToClose = tabs.find((t) => t.id === tabId);
    if (!tabToClose) return;

    // Cleanup PTYs & Registry entries
    const panes = getAllPanes(tabToClose.root);
    for (const p of panes) {
      terminalRegistry.unregister(p.id);
    }

    const remaining = tabs.filter((t) => t.id !== tabId);
    if (remaining.length === 0) {
      // Re-create initial tab
      const newTId = `tab-${Date.now()}`;
      const newPId = `pane-${Date.now()}`;
      const freshTab: Tab = {
        id: newTId,
        title: 'Terminal 1',
        mode: 'split',
        root: {
          id: newPId,
          type: 'pane',
          sessionId: 'pty-fresh',
          title: 'PowerShell',
        },
        focusedPaneId: newPId,
      };
      set({ tabs: [freshTab], activeTabId: newTId });
      return;
    }

    let nextActiveId = activeTabId;
    if (activeTabId === tabId) {
      const closedIdx = tabs.findIndex((t) => t.id === tabId);
      nextActiveId = remaining[Math.max(0, closedIdx - 1)]?.id || '';
    }

    set({ tabs: remaining, activeTabId: nextActiveId });
  },

  splitPane: async (direction, shellPath, shellArgs, profileId) => {
    const { tabs, activeTabId } = get();
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab) return '';

    const focusedId = activeTab.focusedPaneId;
    const newPaneId = `pane-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    let ptyId = `pty-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const profiles = useProfilesStore.getState().profiles;
    const profile = profileId
      ? profiles.find((p) => p.id === profileId)
      : (!shellPath ? profiles.find((p) => p.isDefault) : undefined);

    const targetShellPath = shellPath || profile?.shellPath;
    const targetShellArgs = shellArgs || profile?.shellArgs;

    try {
      if (window.api?.pty) {
        const res = await window.api.pty.create({
          cols: 80,
          rows: 24,
          shellPath: targetShellPath,
          shellArgs: targetShellArgs,
          profileId: profile?.id || profileId,
        });
        if (res.id) ptyId = res.id;
      }
    } catch (e) {
      console.error('Failed to create PTY for split:', e);
    }

    const title = profile?.name || (targetShellPath ? targetShellPath.split('\\').pop() || 'Terminal' : 'PowerShell');
    const newPane: PaneNode = {
      id: newPaneId,
      type: 'pane',
      sessionId: ptyId,
      title,
    };

    const newRoot = treeSplitPane(activeTab.root, focusedId, direction, newPane);

    set({
      tabs: tabs.map((t) =>
        t.id === activeTabId ? { ...t, root: newRoot, focusedPaneId: newPaneId } : t
      ),
    });

    return newPaneId;
  },

  closePane: async (paneId) => {
    const { tabs, activeTabId, undoStack } = get();
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab) return;

    const targetNode = findNode(activeTab.root, paneId) as PaneNode | null;
    if (targetNode) {
      set({
        undoStack: [
          ...undoStack,
          { tabId: activeTabId, pane: { ...targetNode }, timestamp: Date.now() },
        ],
        toastMessage: 'Pane closed. Click to Undo.',
      });
    }

    terminalRegistry.unregister(paneId);
    const newRoot = treeClosePane(activeTab.root, paneId);

    if (!newRoot) {
      get().closeTab(activeTabId);
      return;
    }

    const remainingPanes = getAllPanes(newRoot);
    const nextFocused = remainingPanes[0]?.id || '';

    set({
      tabs: tabs.map((t) =>
        t.id === activeTabId
          ? { ...t, root: newRoot, focusedPaneId: nextFocused, maximizedPaneId: t.maximizedPaneId === paneId ? undefined : t.maximizedPaneId }
          : t
      ),
    });
  },

  undoClosePane: async () => {
    const { undoStack } = get();
    if (undoStack.length === 0) return;

    const entry = undoStack[undoStack.length - 1];
    if (!entry) return;
    set({ undoStack: undoStack.slice(0, -1), toastMessage: null });

    const { tabs, activeTabId } = get();
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab) return;

    await get().splitPane('row');
  },

  movePane: (sourceId, targetId, zone) => {
    const { tabs, activeTabId } = get();
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab) return;

    const newRoot = treeMovePane(activeTab.root, sourceId, targetId, zone);
    set({
      tabs: tabs.map((t) => (t.id === activeTabId ? { ...t, root: newRoot } : t)),
    });
  },

  swapPanes: (paneIdA, paneIdB) => {
    const { tabs, activeTabId } = get();
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab) return;

    const newRoot = treeSwapPanes(activeTab.root, paneIdA, paneIdB);
    set({
      tabs: tabs.map((t) => (t.id === activeTabId ? { ...t, root: newRoot } : t)),
    });
  },

  setRatio: (splitId, ratio) => {
    const { tabs, activeTabId } = get();
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab) return;

    const newRoot = treeSetRatio(activeTab.root, splitId, ratio);
    set({
      tabs: tabs.map((t) => (t.id === activeTabId ? { ...t, root: newRoot } : t)),
    });
  },

  equalize: () => {
    const { tabs, activeTabId } = get();
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab) return;

    const newRoot = treeEqualize(activeTab.root);
    set({
      tabs: tabs.map((t) => (t.id === activeTabId ? { ...t, root: newRoot } : t)),
    });
  },

  toggleGridMode: () => {
    const { tabs, activeTabId } = get();
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab) return;

    const currentMode = activeTab.mode;
    const panes = getAllPanes(activeTab.root);
    const newMode = currentMode === 'split' ? 'grid' : 'split';
    const newRoot = treeToGrid(panes);

    set({
      tabs: tabs.map((t) => (t.id === activeTabId ? { ...t, mode: newMode, root: newRoot } : t)),
    });
  },

  toggleMaximizePane: (paneId) => {
    const { tabs, activeTabId } = get();
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab) return;

    const targetId = paneId || activeTab.focusedPaneId;
    const isCurrentlyMaximized = activeTab.maximizedPaneId === targetId;

    set({
      tabs: tabs.map((t) =>
        t.id === activeTabId
          ? { ...t, maximizedPaneId: isCurrentlyMaximized ? undefined : targetId }
          : t
      ),
    });
  },

  setFocusedPane: (paneId) => {
    const { tabs, activeTabId } = get();
    set({
      tabs: tabs.map((t) => (t.id === activeTabId ? { ...t, focusedPaneId: paneId } : t)),
    });
    terminalRegistry.focus(paneId);
  },

  spatialFocus: (direction) => {
    const { tabs, activeTabId } = get();
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab) return;

    const currentPane = terminalRegistry.get(activeTab.focusedPaneId);
    if (!currentPane || !currentPane.hostSlot) return;

    const currentRect = currentPane.hostSlot.getBoundingClientRect();
    const panes = getAllPanes(activeTab.root).filter((p) => p.id !== activeTab.focusedPaneId);

    let bestPaneId = '';
    let minDistance = Infinity;

    for (const p of panes) {
      const entry = terminalRegistry.get(p.id);
      if (!entry || !entry.hostSlot) continue;
      const rect = entry.hostSlot.getBoundingClientRect();

      let dx = 0;
      let dy = 0;
      let isValid = false;

      if (direction === 'right' && rect.left >= currentRect.right - 5) {
        dx = rect.left - currentRect.right;
        dy = Math.abs(rect.top - currentRect.top);
        isValid = true;
      } else if (direction === 'left' && rect.right <= currentRect.left + 5) {
        dx = currentRect.left - rect.right;
        dy = Math.abs(rect.top - currentRect.top);
        isValid = true;
      } else if (direction === 'down' && rect.top >= currentRect.bottom - 5) {
        dy = rect.top - currentRect.bottom;
        dx = Math.abs(rect.left - currentRect.left);
        isValid = true;
      } else if (direction === 'up' && rect.bottom <= currentRect.top + 5) {
        dy = currentRect.top - rect.bottom;
        dx = Math.abs(rect.left - currentRect.left);
        isValid = true;
      }

      if (isValid) {
        const dist = dx * dx + dy * dy;
        if (dist < minDistance) {
          minDistance = dist;
          bestPaneId = p.id;
        }
      }
    }

    if (bestPaneId) {
      get().setFocusedPane(bestPaneId);
    }
  },

  duplicatePane: async (_paneId) => {
    await get().splitPane('row');
  },

  spawnN: async (count) => {
    for (let i = 0; i < count; i++) {
      const paneId = await get().splitPane(i % 2 === 0 ? 'row' : 'column');
      if (paneId) {
        await terminalRegistry.waitForOutput(paneId, 10000);
      }
    }
  },

  renameTab: (tabId, title) => {
    set({
      tabs: get().tabs.map((t) => (t.id === tabId ? { ...t, title } : t)),
    });
  },

  setTabColor: (tabId, color) => {
    set({
      tabs: get().tabs.map((t) => (t.id === tabId ? { ...t, color } : t)),
    });
  },

  togglePinTab: (tabId) => {
    set({
      tabs: get().tabs.map((t) => (t.id === tabId ? { ...t, pinned: !t.pinned } : t)),
    });
  },

  reorderTabs: (sourceIdx, targetIdx) => {
    const tabs = [...get().tabs];
    const [moved] = tabs.splice(sourceIdx, 1);
    if (moved) tabs.splice(targetIdx, 0, moved);
    set({ tabs });
  },

  ensurePtyForPane: async (paneId: string, cols = 120, rows = 30, shellPath?: string, shellArgs?: string[]) => {
    const { tabs } = get();
    let currentTabId = '';
    let currentPane: PaneNode | null = null;

    for (const t of tabs) {
      const p = findNode(t.root, paneId) as PaneNode | null;
      if (p) {
        currentPane = p;
        currentTabId = t.id;
        break;
      }
    }

    if (!currentPane) return '';

    if (
      currentPane.sessionId &&
      currentPane.sessionId !== '' &&
      !currentPane.sessionId.startsWith('pty-1') &&
      currentPane.sessionId !== 'pty-fresh'
    ) {
      return currentPane.sessionId;
    }

    if (pendingPtyCreations.has(paneId)) {
      return pendingPtyCreations.get(paneId)!;
    }

    const creationPromise = (async () => {
      let ptyId = `pty-${Date.now()}`;
      try {
        if (window.api?.pty) {
          const res = await window.api.pty.create({ cols, rows, shellPath, shellArgs });
          if (res.id) ptyId = res.id;
        }
      } catch (e) {
        console.error(`Failed to create PTY for pane [${paneId}]:`, e);
      }

      const updateTree = (node: any): any => {
        if (node.id === paneId && node.type === 'pane') {
          return { ...node, sessionId: ptyId };
        }
        if (node.type === 'split') {
          return {
            ...node,
            children: [updateTree(node.children[0]), updateTree(node.children[1])],
          };
        }
        return node;
      };

      set((state) => ({
        tabs: state.tabs.map((t) =>
          t.id === currentTabId ? { ...t, root: updateTree(t.root) } : t
        ),
      }));

      pendingPtyCreations.delete(paneId);
      return ptyId;
    })();

    pendingPtyCreations.set(paneId, creationPromise);
    return creationPromise;
  },

  setToast: (msg) => set({ toastMessage: msg }),
  setDraggedPaneId: (paneId) => set({ draggedPaneId: paneId }),
}));
