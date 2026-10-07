import React, { useRef } from 'react';
import { LayoutNode } from './types';
import { PaneContainer } from './PaneContainer';
import { Splitter } from './Splitter';
import { DragOverlay } from './DragOverlay';
import styles from './Layout.module.css';

interface LayoutTreeRendererProps {
  node: LayoutNode;
  focusedPaneId: string;
  maximizedPaneId?: string;
}

export const LayoutTreeRenderer: React.FC<LayoutTreeRendererProps> = ({
  node,
  focusedPaneId,
  maximizedPaneId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  if (maximizedPaneId) {
    if (node.type === 'pane' && node.id === maximizedPaneId) {
      return (
        <div className={styles.treeContainer}>
          <PaneContainer pane={node} isFocused={true} isMaximized={true} />
        </div>
      );
    }
  }

  if (node.type === 'pane') {
    return (
      <div className={styles.paneWrapper} style={{ flex: 1, position: 'relative' }}>
        <PaneContainer
          pane={node}
          isFocused={node.id === focusedPaneId}
          isMaximized={false}
        />
        <DragOverlay targetPaneId={node.id} />
      </div>
    );
  }

  const { direction, ratio, children } = node;
  const flex0 = ratio;
  const flex1 = 1 - ratio;

  return (
    <div
      ref={containerRef}
      className={`${styles.splitWrapper} ${
        direction === 'row' ? styles.splitRow : styles.splitColumn
      }`}
    >
      <div style={{ flex: flex0, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        <LayoutTreeRenderer
          node={children[0]}
          focusedPaneId={focusedPaneId}
          maximizedPaneId={maximizedPaneId}
        />
      </div>

      <Splitter splitId={node.id} direction={direction} parentRef={containerRef} />

      <div style={{ flex: flex1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        <LayoutTreeRenderer
          node={children[1]}
          focusedPaneId={focusedPaneId}
          maximizedPaneId={maximizedPaneId}
        />
      </div>
    </div>
  );
};
