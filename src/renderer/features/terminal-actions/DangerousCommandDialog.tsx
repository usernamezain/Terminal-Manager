import React from 'react';
import { AlertTriangle, Play } from 'lucide-react';
import styles from './Dialogs.module.css';

export interface DangerousCommandDialogProps {
  isOpen?: boolean;
  command: string;
  reason: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DangerousCommandDialog: React.FC<DangerousCommandDialogProps> = ({
  isOpen = true,
  command,
  reason,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.iconDanger}>
            <AlertTriangle size={20} />
          </div>
          <h3>Warning: Potentially Destructive Command</h3>
        </div>

        <p className={styles.modalSubtitle}>
          The command you are attempting to run matches a hazardous pattern:
          <br />
          <strong style={{ color: 'var(--color-error, #F87171)' }}>{reason}</strong>
        </p>

        <div className={styles.previewBox}>
          <div className={styles.previewLine}>
            <span className={styles.lineNumber}>!</span>
            <code style={{ color: '#F87171' }}>{command}</code>
          </div>
        </div>

        <p className={styles.modalDisclaimer}>
          Make sure you intend to run this command in this working directory.
        </p>

        <div className={styles.modalActions}>
          <button className={styles.btnSecondary} onClick={onCancel}>
            Cancel
          </button>
          <button className={styles.btnDanger} onClick={onConfirm}>
            <Play size={14} style={{ marginRight: 6 }} />
            Run Anyway
          </button>
        </div>
      </div>
    </div>
  );
};
