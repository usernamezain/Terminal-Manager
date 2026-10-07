import React, { useEffect } from 'react';
import { Info, X } from 'lucide-react';
import styles from './Toast.module.css';

interface ToastProps {
  message: string;
  onDismiss: () => void;
  durationMs?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  onDismiss,
  durationMs = 5000,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [onDismiss, durationMs]);

  return (
    <div className={styles.toast}>
      <Info className={styles.icon} />
      <span>{message}</span>
      <button className={styles.close} onClick={onDismiss} title="Dismiss">
        <X size={12} />
      </button>
    </div>
  );
};
