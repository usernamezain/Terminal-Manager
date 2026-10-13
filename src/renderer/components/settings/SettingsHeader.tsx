import React from 'react';
import { X } from 'lucide-react';
import styles from './SettingsLayout.module.css';

interface SettingsHeaderProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
}

export const SettingsHeader: React.FC<SettingsHeaderProps> = ({ title, subtitle, onClose }) => {
  return (
    <header className={styles.header}>
      <div className={styles.headerTitleGroup}>
        <h1 className={styles.pageTitle}>{title}</h1>
        {subtitle && <span className={styles.pageSubtitle}>{subtitle}</span>}
      </div>
      <button className={styles.closeButton} onClick={onClose} title="Close (Esc)">
        <X size={16} />
      </button>
    </header>
  );
};
