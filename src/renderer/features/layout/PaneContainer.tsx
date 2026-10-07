import React, { useRef, useEffect } from 'react';
import { PaneNode } from './types';
import { useWorkspaceStore } from './useWorkspaceStore';
import { terminalRegistry } from '../terminal/registry/TerminalRegistry';
import { useSettingsStore } from '@renderer/store/useSettingsStore';
import { PaneHeader } from './PaneHeader';
import styles from './Layout.module.css';

interface PaneContainerProps {
  pane: PaneNode;
  isFocused: boolean;
  isMaximized: boolean;
}

export const PaneContainer: React.FC<PaneContainerProps> = ({ pane, isFocused, isMaximized }) => {
  const slotRef = useRef<HTMLDivElement>(null);
  const { settings } = useSettingsStore();
  const { setFocusedPane, closePane, splitPane, toggleMaximizePane, setDraggedPaneId } =
    useWorkspaceStore();

  useEffect(() => {
    if (!slotRef.current) return;
    let isCancelled = false;

    const setupPane = async () => {
      let ptyId = pane.sessionId;

      if (!ptyId || ptyId.startsWith('pty-1') || ptyId === 'pty-fresh') {
        const width = slotRef.current?.clientWidth || 800;
        const height = slotRef.current?.clientHeight || 450;
        const cols = Math.max(20, Math.floor(width / 9));
        const rows = Math.max(5, Math.floor(height / 18));
        ptyId = await useWorkspaceStore.getState().ensurePtyForPane(pane.id, cols, rows);
        if (isCancelled) return;
      }

      let entry = terminalRegistry.get(pane.id);
      if (!entry) {
        entry = terminalRegistry.register(pane.id, ptyId, settings);
      } else if (entry.ptyId !== ptyId) {
        terminalRegistry.updatePtyId(pane.id, ptyId);
      }

      if (slotRef.current) {
        terminalRegistry.attach(pane.id, slotRef.current);
      }
    };

    setupPane();

    return () => {
      isCancelled = true;
      terminalRegistry.detach(pane.id);
    };
  }, [pane.id, pane.sessionId, settings]);

  const handlePointerDown = () => {
    if (!isFocused) {
      setFocusedPane(pane.id);
    }
  };

  const isAdmin = pane.isAdmin || pane.id.includes('admin') || pane.sessionId?.includes('admin');

  return (
    <div
      className={`${styles.paneSlot} ${isFocused ? styles.paneFocused : ''} ${
        isMaximized ? styles.paneMaximized : ''
      }`}
      style={isAdmin ? { borderTop: '2px solid #F59E0B' } : undefined}
      onPointerDown={handlePointerDown}
    >
      <PaneHeader
        pane={pane}
        isFocused={isFocused}
        isMaximized={isMaximized}
        onSplitRight={() => splitPane('row')}
        onSplitDown={() => splitPane('column')}
        onMaximize={() => toggleMaximizePane(pane.id)}
        onClose={() => closePane(pane.id)}
        onDragStart={() => setDraggedPaneId(pane.id)}
      />

      <div ref={slotRef} className={styles.terminalSlot} />

      {pane.exited && (
        <div className={styles.exitBanner}>
          <span>Process exited with code {pane.exited.code}</span>
          <button onClick={() => splitPane('row')}>Restart</button>
          <button onClick={() => closePane(pane.id)}>Close</button>
        </div>
      )}
    </div>
  );
};
