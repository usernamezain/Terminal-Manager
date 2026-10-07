import React from 'react';
import { X } from 'lucide-react';
import { useWorkspaceStore } from '@renderer/store/useWorkspaceStore';
import styles from './TabStrip.module.css';

export const TabStrip: React.FC = () => {
  const { tabs, activeTabId, panes, activePaneId } = useWorkspaceStore();
  const activePane = panes[activePaneId];

  return (
    <div className={styles.tabStrip}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const displayTitle = activePane ? activePane.title : tab.title;

        return (
          <div
            key={tab.id}
            className={`${styles.tab} ${isActive ? styles.activeTab : ''}`}
          >
            <span className={styles.tabTitle}>{displayTitle}</span>
            <button className={styles.closeButton} title="Close tab (Disabled in Phase 1)">
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
