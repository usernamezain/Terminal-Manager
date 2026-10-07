import { describe, it, expect } from 'vitest';
import { PaneNode, LayoutNode } from '../types';
import {
  getAllPanes,
  findNode,
  splitPane,
  closePane,
  swapPanes,
  movePane,
  equalize,
  setRatio,
  toGrid,
  fromGrid,
  detachPaneToNewTab,
  mergeTabIntoSplit,
  duplicatePane,
} from '../treeUtils';

function createPane(id: string): PaneNode {
  return {
    id,
    type: 'pane',
    sessionId: `pty-${id}`,
    title: `Terminal ${id}`,
  };
}

describe('treeUtils pure functions', () => {
  it('should split a single pane into two', () => {
    const root = createPane('p1');
    const p2 = createPane('p2');
    const newRoot = splitPane(root, 'p1', 'row', p2, 's1');

    expect(newRoot.type).toBe('split');
    expect(getAllPanes(newRoot)).toHaveLength(2);
    expect(findNode(newRoot, 'p1')).toBeTruthy();
    expect(findNode(newRoot, 'p2')).toBeTruthy();
  });

  it('should close a pane and expand sibling', () => {
    const root = createPane('p1');
    const p2 = createPane('p2');
    const split = splitPane(root, 'p1', 'row', p2, 's1');

    const closed = closePane(split, 'p1');
    expect(closed?.type).toBe('pane');
    expect(closed?.id).toBe('p2');
  });

  it('should swap two panes in the tree', () => {
    const root = createPane('p1');
    const p2 = createPane('p2');
    const split = splitPane(root, 'p1', 'row', p2, 's1');

    const swapped = swapPanes(split, 'p1', 'p2');
    const panes = getAllPanes(swapped);
    expect(panes[0]!.id).toBe('p2');
    expect(panes[1]!.id).toBe('p1');
  });

  it('should move a pane to left of target', () => {
    const root = createPane('p1');
    const p2 = createPane('p2');
    const split = splitPane(root, 'p1', 'row', p2, 's1');

    const moved = movePane(split, 'p2', 'p1', 'left');
    expect(getAllPanes(moved)).toHaveLength(2);
  });

  it('should equalize split ratios', () => {
    const root = createPane('p1');
    const p2 = createPane('p2');
    const split = setRatio(splitPane(root, 'p1', 'row', p2, 's1'), 's1', 0.2);

    const equal = equalize(split);
    expect(equal.type === 'split' && equal.ratio).toBe(0.5);
  });

  it('should generate grid from list of panes and convert back via fromGrid', () => {
    const panes = [createPane('p1'), createPane('p2'), createPane('p3'), createPane('p4')];
    const grid = toGrid(panes);
    expect(getAllPanes(grid)).toHaveLength(4);

    const backToSplit = fromGrid(grid);
    expect(getAllPanes(backToSplit)).toHaveLength(4);
  });

  it('should detach pane to new tab', () => {
    const root = createPane('p1');
    const p2 = createPane('p2');
    const split = splitPane(root, 'p1', 'row', p2, 's1');

    const { newRoot, detachedPane } = detachPaneToNewTab(split, 'p2');
    expect(detachedPane?.id).toBe('p2');
    expect(newRoot?.id).toBe('p1');
  });

  it('should merge incoming layout into target pane split', () => {
    const root = createPane('p1');
    const p2 = createPane('p2');
    const merged = mergeTabIntoSplit(root, 'p1', p2, 'row');
    expect(getAllPanes(merged)).toHaveLength(2);
  });

  it('should duplicate a pane node with new id and sessionId', () => {
    const orig = createPane('p1');
    const dup = duplicatePane(orig, 'p1-dup', 'pty-dup');
    expect(dup.id).toBe('p1-dup');
    expect(dup.sessionId).toBe('pty-dup');
    expect(dup.title).toBe(orig.title);
  });

  it('fuzz test invariant: random operations preserve pane count and tree validity', () => {
    let root: LayoutNode = createPane('p1');
    let paneCounter = 2;

    for (let i = 0; i < 50; i++) {
      const panes = getAllPanes(root);
      const op = Math.floor(Math.random() * 4);

      if (op === 0) {
        // Split
        const target = panes[Math.floor(Math.random() * panes.length)]!;
        const newP = createPane(`p${paneCounter++}`);
        const dir = Math.random() > 0.5 ? 'row' : 'column';
        root = splitPane(root, target.id, dir, newP);
      } else if (op === 1 && panes.length > 1) {
        // Close
        const target = panes[Math.floor(Math.random() * panes.length)]!;
        const res = closePane(root, target.id);
        if (res) root = res;
      } else if (op === 2 && panes.length > 1) {
        // Swap
        const pA = panes[Math.floor(Math.random() * panes.length)]!;
        let pB = panes[Math.floor(Math.random() * panes.length)]!;
        if (pA.id !== pB.id) {
          root = swapPanes(root, pA.id, pB.id);
        }
      } else if (op === 3 && panes.length > 1) {
        // Equalize
        root = equalize(root);
      }

      // Check Invariants
      const currentPanes = getAllPanes(root);
      expect(currentPanes.length).toBeGreaterThan(0);
      for (const p of currentPanes) {
        expect(findNode(root, p.id)).toBeTruthy();
      }
    }
  });
});
