import React, { useState, useRef } from 'react';
import { Direction } from './types';
import { useWorkspaceStore } from './useWorkspaceStore';
import { terminalRegistry } from '../terminal/registry/TerminalRegistry';
import styles from './Layout.module.css';

interface SplitterProps {
  splitId: string;
  direction: Direction;
  parentRef: React.RefObject<HTMLDivElement | null>;
}

export const Splitter: React.FC<SplitterProps> = ({ splitId, direction, parentRef }) => {
  const [isDragging, setIsDragging] = useState(false);
  const setRatio = useWorkspaceStore((s) => s.setRatio);
  const equalize = useWorkspaceStore((s) => s.equalize);
  const rafId = useRef<number | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);

    const parentElem = parentRef.current;
    if (!parentElem) return;

    const parentRect = parentElem.getBoundingClientRect();
    const isRow = direction === 'row';

    const onPointerMove = (moveEvt: PointerEvent) => {
      if (rafId.current) cancelAnimationFrame(rafId.current);

      rafId.current = requestAnimationFrame(() => {
        let rawRatio = isRow
          ? (moveEvt.clientX - parentRect.left) / parentRect.width
          : (moveEvt.clientY - parentRect.top) / parentRect.height;

        // Snapping logic (25%, 33.3%, 50%, 66.6%, 75%)
        if (!moveEvt.altKey) {
          const snapTargets = [0.25, 0.333, 0.5, 0.666, 0.75];
          for (const target of snapTargets) {
            if (Math.abs(rawRatio - target) < 0.02) {
              rawRatio = target;
              break;
            }
          }
        }

        setRatio(splitId, rawRatio);
      });
    };

    const onPointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

      // Final exact fit and PTY resize on mouseup
      const activeTab = useWorkspaceStore.getState().tabs.find(t => t.id === useWorkspaceStore.getState().activeTabId);
      if (activeTab) {
        terminalRegistry.scheduleFit(activeTab.focusedPaneId);
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const handleDoubleClick = () => {
    equalize();
  };

  return (
    <div
      className={`${styles.splitter} ${direction === 'row' ? styles.splitterRow : styles.splitterColumn} ${
        isDragging ? styles.splitterDragging : ''
      }`}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      title="Drag to resize split (Hold Alt to disable snap, double-click to equalize)"
    >
      <div className={styles.splitterLine} />
    </div>
  );
};
