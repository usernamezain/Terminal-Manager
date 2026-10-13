import React, { useState } from 'react';
import { ProjectCommand } from '../../../shared/projectRunnerTypes';
import styles from './OrderRunModal.module.css';

interface OrderRunModalProps {
  commands: ProjectCommand[];
  cwd?: string;
  onClose: () => void;
  onToast?: (message: string) => void;
}

export const OrderRunModal: React.FC<OrderRunModalProps> = ({
  commands,
  cwd,
  onClose,
  onToast,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleRun = async () => {
    if (selectedIds.length === 0 || !window.api?.scripts) return;

    const chosenCommands = selectedIds
      .map((id) => commands.find((c) => c.id === id))
      .filter((c): c is ProjectCommand => Boolean(c));

    const items = chosenCommands.map((cmd, idx) => ({
      scriptId: `queue-${Date.now()}-${idx}`,
      scriptName: cmd.label,
      content: cmd.commandText,
      type: 'powershell' as const,
      source: 'inline' as const,
      cwd: cmd.cwd || cwd,
      onFailure: 'stop' as const,
    }));

    await window.api.scripts.enqueue(items, true);
    onClose();

    if (onToast) {
      onToast(`Queued ${items.length} commands to run strictly in order`);
    }
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.title}>Run in Order (Script Runner Queue)</div>
        <div className={styles.description}>
          Select commands to execute sequentially. Execution will strictly stop on the first failure.
        </div>

        <div className={styles.list}>
          {commands.map((cmd) => {
            const isChecked = selectedIds.includes(cmd.id);
            const orderIdx = selectedIds.indexOf(cmd.id);
            return (
              <div
                key={cmd.id}
                className={styles.item}
                onClick={() => toggleSelect(cmd.id)}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleSelect(cmd.id)}
                />
                <div className={styles.itemLabel}>
                  {cmd.label}{' '}
                  {isChecked && (
                    <span style={{ fontSize: '11px', color: '#6C8CFF' }}>
                      (Step {orderIdx + 1})
                    </span>
                  )}
                </div>
                <div className={styles.itemCmd}>{cmd.commandText}</div>
              </div>
            );
          })}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.runBtn}
            onClick={handleRun}
            disabled={selectedIds.length === 0}
          >
            Run Queue ({selectedIds.length})
          </button>
        </div>
      </div>
    </div>
  );
};
