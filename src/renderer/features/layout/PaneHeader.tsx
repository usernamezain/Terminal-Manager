import React, { useState } from 'react';
import { PaneNode } from './types';
import { Columns, Rows, Maximize2, Minimize2, X, Terminal as TermIcon, Shield } from 'lucide-react';
import styles from './PaneHeader.module.css';

interface PaneHeaderProps {
  pane: PaneNode;
  isFocused: boolean;
  isMaximized: boolean;
  onSplitRight: () => void;
  onSplitDown: () => void;
  onMaximize: () => void;
  onClose: () => void;
  onDragStart?: () => void;
}

export const PaneHeader: React.FC<PaneHeaderProps> = ({
  pane,
  isFocused,
  isMaximized,
  onSplitRight,
  onSplitDown,
  onMaximize,
  onClose,
  onDragStart,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(pane.title);

  const isAdmin = pane.isAdmin || pane.id.includes('admin') || pane.sessionId?.includes('admin');

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setTitle(pane.title);
      setIsEditing(false);
    }
  };

  return (
    <div
      className={`${styles.header} ${isFocused ? styles.headerFocused : ''}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', pane.id);
        if (onDragStart) onDragStart();
      }}
    >
      <div className={styles.titleGroup} onDoubleClick={handleDoubleClick}>
        <span className={styles.processDot} />
        {isAdmin ? (
          <span title="This terminal runs with administrator rights.">
            <Shield size={12} color="#F59E0B" />
          </span>
        ) : (
          <TermIcon size={12} color="#6C8CFF" />
        )}
        {isEditing ? (
          <input
            className={styles.titleInput}
            value={title}
            autoFocus
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => setIsEditing(false)}
          />
        ) : (
          <span className={styles.titleText}>{title}</span>
        )}
      </div>

      {pane.cwd && (
        <span className={styles.cwdChip} title={pane.cwd}>
          {pane.cwd}
        </span>
      )}

      <div className={`${styles.actions} ${isFocused ? styles.actionsVisible : ''}`}>
        <button className={styles.actionBtn} onClick={onSplitRight} title="Split Right (Ctrl+Shift+D)">
          <Columns size={12} />
        </button>
        <button className={styles.actionBtn} onClick={onSplitDown} title="Split Down (Ctrl+Shift+E)">
          <Rows size={12} />
        </button>
        <button className={styles.actionBtn} onClick={onMaximize} title="Maximize/Restore (Ctrl+Shift+Enter)">
          {isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
        </button>
        <button className={`${styles.actionBtn} ${styles.closeBtn}`} onClick={onClose} title="Close Pane (Ctrl+Shift+W)">
          <X size={12} />
        </button>
      </div>
    </div>
  );
};
