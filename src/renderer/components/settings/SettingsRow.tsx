import React from 'react';
import styles from './SettingsLayout.module.css';

interface SettingsRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

export const SettingsRow: React.FC<SettingsRowProps> = ({
  label,
  description,
  children,
}) => {
  return (
    <div className={styles.row}>
      <div className={styles.rowInfo}>
        <span className={styles.rowLabel}>{label}</span>
        {description && <span className={styles.rowDescription}>{description}</span>}
      </div>
      <div className={styles.rowControl}>{children}</div>
    </div>
  );
};
