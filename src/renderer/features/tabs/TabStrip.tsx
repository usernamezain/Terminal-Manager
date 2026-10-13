import React, { useState, useEffect } from 'react';
import { useWorkspaceStore } from '../layout/useWorkspaceStore';
import { useWorkspaceStore as useUIWorkspaceStore } from '../../store/useWorkspaceStore';
import { useProfilesStore } from '../../store/useProfilesStore';
import { getAllPanes } from '../layout/treeUtils';
import { Plus, X, Pin, Terminal, Grid, Split, RotateCcw, Settings, ExternalLink } from 'lucide-react';
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
    isBroadcastInput,
  } = useWorkspaceStore();

  const { profiles, loadProfiles } = useProfilesStore();
  const { setActiveNavTab } = useUIWorkspaceStore();

  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [contextMenuTabId, setContextMenuTabId] = useState<string | null>(null);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  const handlePopOut = (tabId: string) => {
    const target = tabs.find((t) => t.id === tabId);
    if (!target) return;
    const panes = getAllPanes(target.root);
    const targetPane = panes.find((p) => p.id === target.focusedPaneId) || panes[0];
    if (targetPane?.sessionId && window.api?.session) {
      window.api.session.popOut(targetPane.sessionId);
    }
  };

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
                className={styles.popOutBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePopOut(tab.id);
                }}
                title="Pop out to standalone window"
              >
                <ExternalLink size={11} />
              </button>
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
        {isBroadcastInput && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              marginRight: '6px',
              borderRadius: '4px',
              backgroundColor: 'rgba(234, 179, 8, 0.15)',
              color: '#FACC15',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.04em',
              border: '1px solid rgba(234, 179, 8, 0.4)',
              cursor: 'default',
            }}
            title="Broadcast mode is ACTIVE: all input is sent to all tabs"
          >
            <span>BROADCASTING</span>
          </div>
        )}
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
              {profiles.length > 0 ? (
                profiles.map((p) => (
                  <div
                    key={p.id}
                    className={styles.dropdownItem}
                    onClick={() => {
                      newTab(undefined, undefined, p.id);
                      setShowAddDropdown(false);
                    }}
                  >
                    <Terminal size={14} color={p.color || '#6C8CFF'} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                    </span>
                    {p.isDefault && (
                      <span style={{ fontSize: 10, color: '#6C8CFF', marginLeft: 6, opacity: 0.8 }}>Default</span>
                    )}
                  </div>
                ))
              ) : (
                <div
                  className={styles.dropdownItem}
                  onClick={() => {
                    newTab();
                    setShowAddDropdown(false);
                  }}
                >
                  <Terminal size={14} color="#6C8CFF" />
                  <span>Default Terminal</span>
                </div>
              )}
              <div className={styles.dropdownDivider} />
              <div
                className={styles.dropdownItem}
                onClick={() => {
                  setShowAddDropdown(false);
                  setActiveNavTab('profiles');
                }}
              >
                <Settings size={14} />
                <span>Manage Profiles...</span>
              </div>
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
            <div
              className={styles.dropdownItem}
              onClick={() => {
                handlePopOut(contextMenuTabId);
                setContextMenuTabId(null);
              }}
            >
              Pop out to Window
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
