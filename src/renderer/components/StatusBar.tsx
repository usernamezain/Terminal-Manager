import React, { useEffect, useState } from 'react';
import { useWorkspaceStore } from '@renderer/features/layout/useWorkspaceStore';
import { getAllPanes } from '@renderer/features/layout/treeUtils';
import { useLogStore } from '@renderer/store/useLogStore';
import { AlertTriangle } from 'lucide-react';
import styles from './StatusBar.module.css';

interface ShellMemoryInfo {
  count: number;
  totalMemoryMb: number;
  formatted: string;
}

export const StatusBar: React.FC = () => {
  const { tabs, activeTabId } = useWorkspaceStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const activePanes = activeTab ? getAllPanes(activeTab.root) : [];
  const activePane = activePanes.find((p) => p.id === activeTab?.focusedPaneId) || activePanes[0];
  const terminalCount = tabs.reduce((acc, t) => acc + getAllPanes(t.root).length, 0);

  const { isOpen: isLogOpen, toggleOpen: toggleLogOpen, logs } = useLogStore();
  const errorCount = logs.filter((l) => l.level === 'error').length;
  const warnCount = logs.filter((l) => l.level === 'warn').length;

  const [shellMemory, setShellMemory] = useState<ShellMemoryInfo | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    const fetchMemory = async () => {
      if (document.hidden) return;
      try {
        if (window.api?.app?.getShellMemory) {
          const info = await window.api.app.getShellMemory();
          setShellMemory(info);
        }
      } catch (err) {
        console.error('Failed to fetch shell memory:', err);
      }
    };

    fetchMemory();

    const startPolling = () => {
      if (!timer) {
        timer = setInterval(fetchMemory, 5000);
      }
    };

    const stopPolling = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        fetchMemory();
        startPolling();
      }
    };

    const unsubVisibility = window.api?.app?.onVisibility?.((visible) => {
      if (!visible) {
        stopPolling();
      } else {
        fetchMemory();
        startPolling();
      }
    });

    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      unsubVisibility?.();
    };
  }, []);

  const isConnected = Boolean(activePane?.sessionId && !activePane?.exited);
  const isExited = Boolean(activePane?.exited);
  const statusText = isExited
    ? `Exited (${activePane?.exited?.code})`
    : isConnected
    ? 'Connected'
    : 'Ready';

  const showWarning = terminalCount >= 30;

  return (
    <footer className={styles.statusbar}>
      <div className={styles.leftSection}>
        <div className={styles.item} title={`Active Terminal: ${activePane?.title || 'Shell'} (${statusText})`}>
          <div
            className={`${styles.dot} ${
              isConnected
                ? styles.activeDot
                : isExited
                ? styles.inactiveDot
                : styles.readyDot
            }`}
          />
          <span>{statusText}</span>
        </div>

        {activePane?.sessionId && (
          <div className={styles.item} title="Active Session ID">
            <span>Session:</span>
            <span className="tabular-nums font-mono">{activePane.sessionId}</span>
          </div>
        )}

        {/* Realtime Log Detector Trigger Button */}
        <button
          type="button"
          className={`${styles.logTrigger} ${isLogOpen ? styles.logTriggerActive : ''}`}
          onClick={toggleLogOpen}
          title="Toggle Realtime Log Detector (Click or press Ctrl+Shift+L)"
        >
          <span
            className={`${styles.livePulse} ${
              errorCount > 0 ? styles.pulseError : warnCount > 0 ? styles.pulseWarn : ''
            }`}
          />
          <span className={styles.logLabel}>Logs</span>
          <span className={styles.logCountBadge}>{logs.length}</span>
          {errorCount > 0 && (
            <span className={styles.logErrorBadge} title={`${errorCount} error(s) logged`}>
              {errorCount}
            </span>
          )}
        </button>
      </div>

      <div className={styles.rightSection}>
        <div className={styles.item}>
          <span>Terminals:</span>
          <span className="tabular-nums">{terminalCount}</span>
        </div>
        {shellMemory && (
          <div className={styles.item}>
            <span>Shell Memory:</span>
            <span className="tabular-nums">{shellMemory.formatted}</span>
          </div>
        )}
        {showWarning && (
          <div
            className={`${styles.item} ${styles.warningItem}`}
            title="30+ terminals open. Consider using Fast Start or PowerShell 7 to reduce memory footprint."
          >
            <span className={styles.warningTag}>
              <AlertTriangle size={12} className="inline mr-1" /> High Shell Load
            </span>
          </div>
        )}
        <div className={`${styles.item} ${styles.mediumPriority}`}>
          <span>Encoding:</span>
          <span>UTF-8</span>
        </div>
        <div className={`${styles.item} ${styles.lowPriority}`}>
          <span>Platform:</span>
          <span>{window.api?.platform || 'win32'}</span>
        </div>
      </div>
    </footer>
  );
};
