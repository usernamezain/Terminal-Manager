import React from 'react';
import styles from './SettingsLayout.module.css';

interface SettingsSectionProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  description,
  action,
  children,
}) => {
  return (
    <section className={styles.section}>
      {title && (
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionHeading}>{title}</h2>
            {description && <p className={styles.sectionDescription}>{description}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div>{children}</div>
    </section>
  );
};
