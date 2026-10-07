import React from 'react';
import styles from './ExitBanner.module.css';

interface ExitBannerProps {
  exitCode: number;
  onRestart: () => void;
  onClose: () => void;
}

export const ExitBanner: React.FC<ExitBannerProps> = ({
  exitCode,
  onRestart,
  onClose,
}) => {
  return (
    <div className={styles.banner}>
      <div className={styles.text}>
        <span>Process exited with code</span>
        <span className={styles.codeBadge}>{exitCode}</span>
      </div>

      <div className={styles.buttonGroup}>
        <button className={styles.restartButton} onClick={onRestart}>
          Restart
        </button>
        <button className={styles.closeButton} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};
