import React, { useState, useEffect, useRef } from 'react';
import { Shield, AlertTriangle, X } from 'lucide-react';
import { SystemToolsStatus, LaunchToolsArgs } from '../../../shared/toolsTypes';
import styles from './SystemTools.module.css';

interface ConfirmLaunchModalProps {
  isOpen: boolean;
  status: SystemToolsStatus | null;
  onCancel: () => void;
  onConfirm: (args: LaunchToolsArgs) => void;
}

export const ConfirmLaunchModal: React.FC<ConfirmLaunchModalProps> = ({
  isOpen,
  status,
  onCancel,
  onConfirm,
}) => {
  const [restorePoint, setRestorePoint] = useState(true);
  const [showTerminal, setShowTerminal] = useState(true);
  const [closeOnExit, setCloseOnExit] = useState(false);

  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRun = () => {
    onConfirm({
      confirmed: true,
      restorePoint,
      showTerminal,
      closeOnExit,
    });
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.confirmModalCard}>
        <div className={styles.modalHeader}>
          <div className={styles.headerTitle}>
            <Shield size={22} color="#F59E0B" />
            <span>Confirm Administrator Execution</span>
          </div>
          <button className={styles.closeBtn} onClick={onCancel} title="Cancel launch">
            <X size={18} />
          </button>
        </div>

        <div className={styles.warningBanner}>
          <AlertTriangle size={18} color="#F59E0B" style={{ flexShrink: 0 }} />
          <span>
            This tool executes system configuration scripts with <strong>Administrator Rights</strong>. Windows UAC will prompt for authorization.
          </span>
        </div>

        <div className={styles.detailsGrid}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Upstream Source</span>
            <span className={styles.detailValue}>
              https://github.com/ChrisTitusTech/winutil
            </span>
          </div>

          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Commit Hash / Date</span>
            <span className={styles.detailValue}>
              {status?.upstreamCommitHash || 'main-latest'} ({status?.upstreamCommitDate || 'Latest'})
            </span>
          </div>

          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Applied Patches</span>
            <span className={styles.detailValue}>
              {status?.patches?.length ? `${status.patches.length} patch(es) applied` : 'None'}
            </span>
          </div>

          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Compiled Script Hash (SHA-256)</span>
            <span className={styles.detailHash}>
              {status?.buildScriptHash || 'Building on demand...'}
            </span>
          </div>
        </div>

        <div className={styles.optionsList}>
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={restorePoint}
              onChange={(e) => setRestorePoint(e.target.checked)}
            />
            <span>Create a System Restore point first (Checkpoint-Computer)</span>
          </label>

          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={showTerminal}
              onChange={(e) => setShowTerminal(e.target.checked)}
            />
            <span>Show elevated terminal pane while tool runs</span>
          </label>

          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={closeOnExit}
              onChange={(e) => setCloseOnExit(e.target.checked)}
            />
            <span>Close terminal pane automatically when tool exits</span>
          </label>
        </div>

        <div className={styles.modalFooter}>
          <button
            ref={cancelButtonRef}
            className={styles.cancelButton}
            onClick={onCancel}
          >
            Cancel
          </button>

          <button className={styles.confirmButton} onClick={handleRun}>
            <Shield size={16} />
            <span>Run as Administrator</span>
          </button>
        </div>
      </div>
    </div>
  );
};
