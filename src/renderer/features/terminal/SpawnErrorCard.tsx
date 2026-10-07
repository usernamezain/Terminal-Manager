import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { ShellInfo } from '@shared/types';
import styles from './SpawnErrorCard.module.css';

interface SpawnErrorCardProps {
  errorMessage?: string;
  onRetry: () => void;
  onSelectShell: (shell: ShellInfo) => void;
}

export const SpawnErrorCard: React.FC<SpawnErrorCardProps> = ({
  errorMessage = 'Failed to spawn shell process.',
  onRetry,
  onSelectShell,
}) => {
  const [detectedShells, setDetectedShells] = useState<ShellInfo[]>([]);
  const [selectedShellId, setSelectedShellId] = useState<string>('');

  useEffect(() => {
    if (window.api?.shells) {
      window.api.shells.detect().then((shells) => {
        setDetectedShells(shells);
        if (shells.length > 0 && shells[0]) {
          setSelectedShellId(shells[0].id);
        }
      });
    }
  }, []);

  const handleSpawnSelected = () => {
    const target = detectedShells.find((s) => s.id === selectedShellId);
    if (target) {
      onSelectShell(target);
    } else {
      onRetry();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <AlertTriangle className={styles.icon} />
          <h3 className={styles.title}>Terminal Spawn Error</h3>
        </div>

        <div className={styles.message}>{errorMessage}</div>

        {detectedShells.length > 0 && (
          <div className={styles.shellSection}>
            <label className={styles.label}>Open another shell</label>
            <select
              className={styles.select}
              value={selectedShellId}
              onChange={(e) => setSelectedShellId(e.target.value)}
            >
              {detectedShells.map((shell) => (
                <option key={shell.id} value={shell.id}>
                  {shell.name} ({shell.path})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className={styles.actions}>
          <button className={styles.retryButton} onClick={onRetry}>
            Retry Default
          </button>
          {detectedShells.length > 0 && (
            <button className={styles.spawnButton} onClick={handleSpawnSelected}>
              Open Selected Shell
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
