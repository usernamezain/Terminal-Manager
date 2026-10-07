import React, { useState } from 'react';
import { DropZone } from './types';
import { useWorkspaceStore } from './useWorkspaceStore';
import styles from './Layout.module.css';

interface DragOverlayProps {
  targetPaneId: string;
}

export const DragOverlay: React.FC<DragOverlayProps> = ({ targetPaneId }) => {
  const { draggedPaneId, movePane, setDraggedPaneId } = useWorkspaceStore();
  const [activeZone, setActiveZone] = useState<DropZone | null>(null);

  if (!draggedPaneId || draggedPaneId === targetPaneId) return null;

  const handleDrop = (zone: DropZone) => {
    movePane(draggedPaneId, targetPaneId, zone);
    setDraggedPaneId(null);
    setActiveZone(null);
  };

  return (
    <div className={styles.dragOverlayMask}>
      <div
        className={`${styles.dropZone} ${styles.dropZoneLeft} ${activeZone === 'left' ? styles.dropZoneActive : ''}`}
        onPointerEnter={() => setActiveZone('left')}
        onPointerLeave={() => setActiveZone(null)}
        onPointerUp={() => handleDrop('left')}
      />
      <div
        className={`${styles.dropZone} ${styles.dropZoneRight} ${activeZone === 'right' ? styles.dropZoneActive : ''}`}
        onPointerEnter={() => setActiveZone('right')}
        onPointerLeave={() => setActiveZone(null)}
        onPointerUp={() => handleDrop('right')}
      />
      <div
        className={`${styles.dropZone} ${styles.dropZoneTop} ${activeZone === 'top' ? styles.dropZoneActive : ''}`}
        onPointerEnter={() => setActiveZone('top')}
        onPointerLeave={() => setActiveZone(null)}
        onPointerUp={() => handleDrop('top')}
      />
      <div
        className={`${styles.dropZone} ${styles.dropZoneBottom} ${activeZone === 'bottom' ? styles.dropZoneActive : ''}`}
        onPointerEnter={() => setActiveZone('bottom')}
        onPointerLeave={() => setActiveZone(null)}
        onPointerUp={() => handleDrop('bottom')}
      />
      <div
        className={`${styles.dropZone} ${styles.dropZoneCenter} ${activeZone === 'center' ? styles.dropZoneActive : ''}`}
        onPointerEnter={() => setActiveZone('center')}
        onPointerLeave={() => setActiveZone(null)}
        onPointerUp={() => handleDrop('center')}
      >
        <span>Swap</span>
      </div>
    </div>
  );
};
