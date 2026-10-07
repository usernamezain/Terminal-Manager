import React, { useEffect, useState } from 'react';
import { Terminal, Minus, Square, Copy, X } from 'lucide-react';
import styles from './TitleBar.module.css';

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!window.api?.window) return;
    window.api.window.isMaximized().then(setIsMaximized);
  }, []);

  const handleMinimize = () => {
    window.api?.window?.minimize();
  };

  const handleMaximize = async () => {
    if (!window.api?.window) return;
    await window.api.window.maximize();
    const max = await window.api.window.isMaximized();
    setIsMaximized(max);
  };

  const handleClose = () => {
    window.api?.window?.close();
  };

  return (
    <div className={styles.titlebar}>
      <div className={styles.brand}>
        <Terminal className={styles.icon} />
        <span>Terminal Manager</span>
      </div>

      <div className={styles.windowControls}>
        <button
          className={styles.controlButton}
          onClick={handleMinimize}
          title="Minimize"
        >
          <Minus size={14} />
        </button>
        <button
          className={styles.controlButton}
          onClick={handleMaximize}
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? <Copy size={12} /> : <Square size={12} />}
        </button>
        <button
          className={`${styles.controlButton} ${styles.closeButton}`}
          onClick={handleClose}
          title="Close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
