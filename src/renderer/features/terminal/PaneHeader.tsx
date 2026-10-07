import React, { useState } from 'react';
import { Terminal as TerminalIcon, RefreshCw, X } from 'lucide-react';
import { PaneStatus } from '@renderer/store/useWorkspaceStore';
import styles from './PaneHeader.module.css';

interface PaneHeaderProps {
  title: string;
  cwd: string;
  status: PaneStatus;
  onTitleChange: (newTitle: string) => void;
  onRestart: () => void;
  onClose: () => void;
}

export const PaneHeader: React.FC<PaneHeaderProps> = ({
  title,
  cwd,
  status,
  onTitleChange,
  onRestart,
  onClose,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue.trim() && editValue !== title) {
      onTitleChange(editValue.trim());
    } else {
      setEditValue(title);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(title);
    }
  };

  const statusClass =
    status === 'running'
      ? styles.running
      : status === 'spawning'
      ? styles.spawning
      : status === 'error'
      ? styles.error
      : styles.exited;

  return (
    <div className={styles.header}>
      <div className={styles.leftSection}>
        <div className={`${styles.statusDot} ${statusClass}`} title={`Status: ${status}`} />
        <TerminalIcon className={styles.icon} />
        <div className={styles.titleContainer}>
          {isEditing ? (
            <input
              type="text"
              className={styles.titleInput}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          ) : (
            <span
              className={styles.title}
              onDoubleClick={() => setIsEditing(true)}
              title="Double click to edit title"
            >
              {title}
            </span>
          )}
        </div>
        <span className={styles.cwdChip} title={cwd}>
          {cwd}
        </span>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.actionButton}
          onClick={onRestart}
          title="Restart process"
        >
          <RefreshCw size={12} />
        </button>
        <button
          className={styles.actionButton}
          onClick={onClose}
          title="Close terminal pane"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
};
