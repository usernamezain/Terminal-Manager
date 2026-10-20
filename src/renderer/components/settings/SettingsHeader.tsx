import React from 'react';
import { X } from 'lucide-react';
import styles from './SettingsLayout.module.css';

interface SettingsHeaderProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  onLearnMore?: () => void;
}

export const SettingsHeader: React.FC<SettingsHeaderProps> = ({ title, subtitle, onClose, onLearnMore }) => {
  return (
    <header className={styles.header}>
      <div className={styles.headerTitleGroup}>
        <h1 className={styles.pageTitle}>{title}</h1>
        {subtitle && <span className={styles.pageSubtitle}>{subtitle}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {onLearnMore && (
          <button
            type="button"
            className={styles.learnMoreLink}
            onClick={onLearnMore}
            title="Read documentation for this section"
          >
            Learn more
          </button>
        )}
        <button className={styles.closeButton} onClick={onClose} title="Close (Esc)">
          <X size={16} />
        </button>
      </div>
    </header>
  );
};
