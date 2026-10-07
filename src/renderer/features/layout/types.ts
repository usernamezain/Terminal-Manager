export type Direction = 'row' | 'column';

export interface SplitNode {
  id: string;
  type: 'split';
  direction: Direction;
  ratio: number;
  children: [LayoutNode, LayoutNode];
}

export interface PaneNode {
  id: string;
  type: 'pane';
  sessionId: string;
  profileId?: string;
  title: string;
  color?: string;
  isAdmin?: boolean;
  cwd?: string;
  exited?: { code: number };
}

export type LayoutNode = SplitNode | PaneNode;

export interface Tab {
  id: string;
  title: string;
  color?: string;
  pinned?: boolean;
  mode: 'split' | 'grid';
  root: LayoutNode;
  maximizedPaneId?: string;
  focusedPaneId: string;
}

export interface Workspace {
  tabs: Tab[];
  activeTabId: string;
}

export type DropZone = 'left' | 'right' | 'top' | 'bottom' | 'center';
