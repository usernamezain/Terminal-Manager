import React, { useState, useEffect } from 'react';
import { useWorkspaceStore } from '../layout/useWorkspaceStore';
import { ShellInfo } from '../../../shared/types';
import { Plus, X, Pin, Terminal, Grid, Split, RotateCcw } from 'lucide-react';
import styles from './TabStrip.module.css';

export const TabStrip: React.FC = () => {
  const {
    tabs,
    activeTabId,
    setActiveTab,
    newTab,
    closeTab,
    renameTab,
    togglePinTab,
    toggleGridMode,
    undoClosePane,
    toastMessage,
    setToast,
  } = useWorkspaceStore();

  const [shells, setShells] = useState<ShellInfo[]>([]);
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [contextMenuTabId, setContextMenuTabId] = useState<string | null>(null);

  useEffect(() => {
    if (window.api?.shells) {
      window.api.shells.detect().then((detected) => {
        setShells(detected);
      });
    }
  }, []);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div className={styles.tabStrip}>
      <div className={styles.tabsScrollArea}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              className={`${styles.tabItem} ${isActive ? styles.tabActive : ''}`}
              style={{ borderTopColor: tab.color || 'transparent' }}
              onClick={() => setActiveTab(tab.id)}
              onMouseDown={(e) => {
                if (e.button === 1) {
                  e.preventDefault();
                  closeTab(tab.id);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenuTabId(tab.id);
              }}
            >
              {tab.pinned ? (
                <Pin size={12} color="#FACC15" />
              ) : (
                <Terminal size={12} color={isActive ? '#6C8CFF' : '#8A99AD'} />
              )}
              <span className={styles.tabTitle}>{tab.title}</span>
              <button
                className={styles.closeBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                title="Close Tab"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>

      <div className={styles.actionsGroup}>
        {activeTab && (
          <button
            className={styles.iconBtn}
            onClick={toggleGridMode}
            title={activeTab.mode === 'split' ? 'Switch to Grid Mode (Ctrl+Shift+G)' : 'Switch to Split Mode'}
          >
            {activeTab.mode === 'split' ? <Grid size={14} /> : <Split size={14} />}
          </button>
        )}

        <div style={{ position: 'relative' }}>
          <button
            className={styles.iconBtn}
            onClick={() => setShowAddDropdown(!showAddDropdown)}
            title="New Terminal Tab (Ctrl+Shift+T)"
          >
            <Plus size={16} />
          </button>

          {showAddDropdown && (
            <div className={styles.dropdownMenu}>
              <div
                className={styles.dropdownItem}
                onClick={() => {
                  newTab();
                  setShowAddDropdown(false);
                }}
              >
                <Terminal size={14} color="#6C8CFF" /> Default Profile
              </div>
              <div className={styles.dropdownDivider} />
              {shells.map((s) => (
                <div
                  key={s.id}
                  className={styles.dropdownItem}
                  onClick={() => {
                    newTab(s.path, s.args);
                    setShowAddDropdown(false);
                  }}
                >
                  <Terminal size={14} /> {s.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {toastMessage && (
        <div className={styles.toastBanner}>
          <span>{toastMessage}</span>
          {toastMessage.includes('Undo') && (
            <button onClick={undoClosePane}>
              <RotateCcw size={12} /> Undo
            </button>
          )}
          <X size={12} style={{ cursor: 'pointer' }} onClick={() => setToast(null)} />
        </div>
      )}

      {contextMenuTabId && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 999 }}
          onClick={() => setContextMenuTabId(null)}
        >
          <div className={styles.contextMenu} style={{ top: 38, left: 100 }}>
            <div
              className={styles.dropdownItem}
              onClick={() => {
                const title = prompt('Rename Tab:', 'New Title');
                if (title) renameTab(contextMenuTabId, title);
              }}
            >
              Rename Tab
            </div>
            <div
              className={styles.dropdownItem}
              onClick={() => togglePinTab(contextMenuTabId)}
            >
              Pin / Unpin Tab
            </div>
            <div className={styles.dropdownDivider} />
            <div className={styles.dropdownItem} onClick={() => closeTab(contextMenuTabId)}>
              Close Tab
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
