import { create } from 'zustand';

export type PaneStatus = 'spawning' | 'running' | 'exited' | 'error';

export interface Pane {
  id: string;
  title: string;
  cwd: string;
  status: PaneStatus;
  exitCode?: number;
  errorMessage?: string;
  ptyId?: string;
  shellPath?: string;
}

export type LayoutNode =
  | { type: 'pane'; paneId: string }
  | { type: 'split'; direction: 'horizontal' | 'vertical'; ratio: number; children: [LayoutNode, LayoutNode] };

export interface Tab {
  id: string;
  title: string;
  rootNode: LayoutNode;
}

interface WorkspaceState {
  tabs: Tab[];
  panes: Record<string, Pane>;
  activeTabId: string;
  activePaneId: string;
  sidebarExpanded: boolean;
  activeNavTab: 'terminals' | 'profiles' | 'tools' | 'settings' | 'customize-tools';

  setSidebarExpanded: (expanded: boolean) => void;
  toggleSidebar: () => void;
  setActiveNavTab: (nav: 'terminals' | 'profiles' | 'tools' | 'settings' | 'customize-tools') => void;

  setPaneTitle: (paneId: string, title: string) => void;
  setPaneCwd: (paneId: string, cwd: string) => void;
  setPaneStatus: (paneId: string, status: PaneStatus, exitCode?: number, errorMessage?: string) => void;
  setPanePtyId: (paneId: string, ptyId: string) => void;
}

const DEFAULT_PANE_ID = 'pane-1';
const DEFAULT_TAB_ID = 'tab-1';

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  tabs: [
    {
      id: DEFAULT_TAB_ID,
      title: 'Terminal 1',
      rootNode: { type: 'pane', paneId: DEFAULT_PANE_ID },
    },
  ],
  panes: {
    [DEFAULT_PANE_ID]: {
      id: DEFAULT_PANE_ID,
      title: 'PowerShell',
      cwd: '~',
      status: 'spawning',
    },
  },
  activeTabId: DEFAULT_TAB_ID,
  activePaneId: DEFAULT_PANE_ID,
  sidebarExpanded: false,
  activeNavTab: 'terminals',

  setSidebarExpanded: (expanded) => set({ sidebarExpanded: expanded }),
  toggleSidebar: () => set((state) => ({ sidebarExpanded: !state.sidebarExpanded })),
  setActiveNavTab: (nav) => set({ activeNavTab: nav }),

  setPaneTitle: (paneId, title) =>
    set((state) => {
      const pane = state.panes[paneId];
      if (!pane) return state;
      return {
        panes: {
          ...state.panes,
          [paneId]: { ...pane, title },
        },
      };
    }),

  setPaneCwd: (paneId, cwd) =>
    set((state) => {
      const pane = state.panes[paneId];
      if (!pane) return state;
      return {
        panes: {
          ...state.panes,
          [paneId]: { ...pane, cwd },
        },
      };
    }),

  setPaneStatus: (paneId, status, exitCode, errorMessage) =>
    set((state) => {
      const pane = state.panes[paneId];
      if (!pane) return state;
      return {
        panes: {
          ...state.panes,
          [paneId]: { ...pane, status, exitCode, errorMessage },
        },
      };
    }),

  setPanePtyId: (paneId, ptyId) =>
    set((state) => {
      const pane = state.panes[paneId];
      if (!pane) return state;
      return {
        panes: {
          ...state.panes,
          [paneId]: { ...pane, ptyId },
        },
      };
    }),
}));
