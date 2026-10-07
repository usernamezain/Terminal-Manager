import { LayoutNode, SplitNode, PaneNode, Direction, DropZone } from './types';

export function getAllPanes(node: LayoutNode): PaneNode[] {
  if (node.type === 'pane') {
    return [node];
  }
  return [...getAllPanes(node.children[0]), ...getAllPanes(node.children[1])];
}

export function findNode(node: LayoutNode, id: string): LayoutNode | null {
  if (node.id === id) return node;
  if (node.type === 'split') {
    const left = findNode(node.children[0], id);
    if (left) return left;
    return findNode(node.children[1], id);
  }
  return null;
}

export function findParent(node: LayoutNode, childId: string): SplitNode | null {
  if (node.type === 'split') {
    if (node.children[0].id === childId || node.children[1].id === childId) {
      return node;
    }
    const left = findParent(node.children[0], childId);
    if (left) return left;
    return findParent(node.children[1], childId);
  }
  return null;
}

export function splitPane(
  root: LayoutNode,
  targetPaneId: string,
  direction: Direction,
  newPane: PaneNode,
  splitId?: string
): LayoutNode {
  if (root.id === targetPaneId) {
    const id = splitId || `split-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const split: SplitNode = {
      id,
      type: 'split',
      direction,
      ratio: 0.5,
      children: [root, newPane],
    };
    return split;
  }

  if (root.type === 'split') {
    return {
      ...root,
      children: [
        splitPane(root.children[0], targetPaneId, direction, newPane, splitId),
        splitPane(root.children[1], targetPaneId, direction, newPane, splitId),
      ],
    };
  }

  return root;
}

export function closePane(root: LayoutNode, paneId: string): LayoutNode | null {
  if (root.id === paneId) {
    return null;
  }

  if (root.type === 'split') {
    const [c0, c1] = root.children;
    if (c0.id === paneId) return cloneTree(c1);
    if (c1.id === paneId) return cloneTree(c0);

    const newC0 = closePane(c0, paneId);
    const newC1 = closePane(c1, paneId);

    if (!newC0) return newC1;
    if (!newC1) return newC0;

    return {
      ...root,
      children: [newC0, newC1],
    };
  }

  return root;
}

export function swapPanes(root: LayoutNode, paneIdA: string, paneIdB: string): LayoutNode {
  const nodeA = findNode(root, paneIdA) as PaneNode | null;
  const nodeB = findNode(root, paneIdB) as PaneNode | null;
  if (!nodeA || !nodeB) return root;

  function replace(node: LayoutNode): LayoutNode {
    if (node.id === paneIdA) return nodeB!;
    if (node.id === paneIdB) return nodeA!;
    if (node.type === 'split') {
      return {
        ...node,
        children: [replace(node.children[0]), replace(node.children[1])],
      };
    }
    return node;
  }

  return replace(root);
}

export function movePane(
  root: LayoutNode,
  sourceId: string,
  targetId: string,
  zone: DropZone
): LayoutNode {
  if (sourceId === targetId) return root;

  if (zone === 'center') {
    return swapPanes(root, sourceId, targetId);
  }

  const sourcePane = findNode(root, sourceId) as PaneNode | null;
  if (!sourcePane) return root;

  // 1. Remove source
  const withoutSource = closePane(root, sourceId);
  if (!withoutSource) return root;

  // 2. Determine direction
  const direction: Direction = zone === 'left' || zone === 'right' ? 'row' : 'column';

  // 3. Insert into target
  return splitPane(withoutSource, targetId, direction, sourcePane);
}

export function setRatio(root: LayoutNode, splitId: string, ratio: number): LayoutNode {
  const clamped = Math.max(0.15, Math.min(0.85, ratio));
  if (root.id === splitId && root.type === 'split') {
    return { ...root, ratio: clamped };
  }
  if (root.type === 'split') {
    return {
      ...root,
      children: [
        setRatio(root.children[0], splitId, clamped),
        setRatio(root.children[1], splitId, clamped),
      ],
    };
  }
  return root;
}

export function equalize(root: LayoutNode): LayoutNode {
  if (root.type === 'split') {
    return {
      ...root,
      ratio: 0.5,
      children: [equalize(root.children[0]), equalize(root.children[1])],
    };
  }
  return root;
}

export function toGrid(panes: PaneNode[]): LayoutNode {
  if (panes.length === 0) {
    throw new Error('Cannot build grid from 0 panes');
  }
  if (panes.length === 1) {
    return panes[0]!;
  }

  const mid = Math.floor(panes.length / 2);
  const leftPanes = panes.slice(0, mid);
  const rightPanes = panes.slice(mid);

  const leftNode = toGrid(leftPanes);
  const rightNode = toGrid(rightPanes);

  return {
    id: `grid-split-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    type: 'split',
    direction: panes.length <= 4 ? 'row' : 'column',
    ratio: 0.5,
    children: [leftNode, rightNode],
  };
}

export function fromGrid(gridRoot: LayoutNode): LayoutNode {
  const panes = getAllPanes(gridRoot);
  if (panes.length === 0) return gridRoot;
  let root: LayoutNode = panes[0]!;
  for (let i = 1; i < panes.length; i++) {
    const dir: Direction = i % 2 === 0 ? 'column' : 'row';
    root = splitPane(root, panes[i - 1]!.id, dir, panes[i]!);
  }
  return root;
}

export function detachPaneToNewTab(
  root: LayoutNode,
  paneId: string
): { newRoot: LayoutNode | null; detachedPane: PaneNode | null } {
  const node = findNode(root, paneId) as PaneNode | null;
  if (!node) return { newRoot: root, detachedPane: null };
  const newRoot = closePane(root, paneId);
  return { newRoot, detachedPane: node };
}

export function mergeTabIntoSplit(
  root: LayoutNode,
  targetPaneId: string,
  incomingNode: LayoutNode,
  direction: Direction = 'row'
): LayoutNode {
  const targetPane = findNode(root, targetPaneId) as PaneNode | null;
  if (!targetPane) return root;

  const incomingPanes = getAllPanes(incomingNode);
  let updated = root;
  for (const p of incomingPanes) {
    updated = splitPane(updated, targetPaneId, direction, p);
  }
  return updated;
}

export function duplicatePane(pane: PaneNode, newId: string, newSessionId: string): PaneNode {
  return {
    ...pane,
    id: newId,
    sessionId: newSessionId,
  };
}

export function cloneTree(node: LayoutNode): LayoutNode {
  if (node.type === 'pane') {
    return { ...node };
  }
  return {
    ...node,
    children: [cloneTree(node.children[0]), cloneTree(node.children[1])],
  };
}
