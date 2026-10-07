import React, { useEffect, useState } from 'react';
import { useWorkspaceStore } from '@renderer/store/useWorkspaceStore';
import styles from './StatusBar.module.css';

interface ShellMemoryInfo {
  count: number;
  totalMemoryMb: number;
  formatted: string;
}

export const StatusBar: React.FC = () => {
  const { panes, activePaneId } = useWorkspaceStore();
  const activePane = panes[activePaneId];
  const terminalCount = Object.keys(panes).length;

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

    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const statusText =
    activePane?.status === 'running'
      ? 'Connected'
      : activePane?.status === 'spawning'
      ? 'Spawning...'
      : activePane?.status === 'error'
      ? 'Error'
      : 'Disconnected';

  const isConnected = activePane?.status === 'running';
  const showWarning = terminalCount >= 30;

  return (
    <footer className={styles.statusbar}>
      <div className={styles.leftSection}>
        <div className={styles.item}>
          <div
            className={`${styles.dot} ${
              isConnected ? styles.activeDot : styles.inactiveDot
            }`}
          />
          <span>{statusText}</span>
        </div>
        {activePane?.ptyId && (
          <div className={styles.item}>
            <span>ID:</span>
            <span className="tabular-nums">{activePane.ptyId}</span>
          </div>
        )}
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
            <span className={styles.warningTag}>⚠️ High Shell Load</span>
          </div>
        )}
        <div className={styles.item}>
          <span>Encoding:</span>
          <span>UTF-8</span>
        </div>
        <div className={styles.item}>
          <span>Platform:</span>
          <span>{window.api?.platform || 'win32'}</span>
        </div>
      </div>
    </footer>
  );
};

