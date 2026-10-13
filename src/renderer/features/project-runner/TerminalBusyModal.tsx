import React from 'react';
import { useProjectRunnerStore } from './useProjectRunnerStore';
import styles from './TerminalBusyModal.module.css';

interface TerminalBusyModalProps {
  onRunInNewTab?: (cwd: string, commandText: string) => void;
  onRunInSplit?: (commandText: string) => void;
}

export const TerminalBusyModal: React.FC<TerminalBusyModalProps> = ({
  onRunInNewTab,
  onRunInSplit,
}) => {
  const { busyDialog, closeBusyDialog, runCommand, stopCommand } = useProjectRunnerStore();

  if (!busyDialog) return null;

  const { sessionId, command, sessionCwd } = busyDialog;

  const handleStopAndRun = async () => {
    closeBusyDialog();
    await stopCommand(sessionId);
    await new Promise((res) => setTimeout(res, 250));
    await runCommand(sessionId, command, 'terminal', sessionCwd);
  };

  const handleNewTab = () => {
    closeBusyDialog();
    if (onRunInNewTab) {
      onRunInNewTab(command.cwd || sessionCwd || '', command.commandText);
    }
  };

  const handleSplit = () => {
    closeBusyDialog();
    if (onRunInSplit) {
      onRunInSplit(command.commandText);
    }
  };

  return (
    <div className={styles.backdrop} onClick={closeBusyDialog}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.title}>
          <span>⚠️ Terminal is Busy</span>
        </div>

        <div className={styles.message}>
          A foreground process is currently running in this terminal pane. How would you like to run this command?
        </div>

        <div className={styles.commandBox}>
          {command.commandText}
        </div>

        <div className={styles.actionList}>
          {onRunInNewTab && (
            <button className={styles.actionButton} onClick={handleNewTab}>
              <span>Run in a new tab</span>
              <span style={{ fontSize: '11px', opacity: 0.6 }}>Same directory</span>
            </button>
          )}

          {onRunInSplit && (
            <button className={styles.actionButton} onClick={handleSplit}>
              <span>Run in a split pane</span>
              <span style={{ fontSize: '11px', opacity: 0.6 }}>Side-by-side</span>
            </button>
          )}

          <button
            className={`${styles.actionButton} ${styles.dangerAction}`}
            onClick={handleStopAndRun}
          >
            <span>Stop current (Ctrl+C) and run</span>
            <span style={{ fontSize: '11px', opacity: 0.6 }}>Interrupts task</span>
          </button>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={closeBusyDialog}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
