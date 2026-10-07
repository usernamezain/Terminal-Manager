import React, { useEffect, useState } from 'react';
import { TitleBar } from '@renderer/components/TitleBar';
import { Sidebar } from '@renderer/components/Sidebar';
import { TabStrip } from '@renderer/features/tabs/TabStrip';
import { StatusBar } from '@renderer/components/StatusBar';
import { SettingsModal } from '@renderer/components/SettingsModal';
import { LayoutTreeRenderer } from '@renderer/features/layout/LayoutTreeRenderer';
import { useWorkspaceStore } from '@renderer/features/layout/useWorkspaceStore';
import { useWorkspaceStore as useUIWorkspaceStore } from '@renderer/store/useWorkspaceStore';
import { useSettingsStore } from '@renderer/store/useSettingsStore';
import { terminalRegistry } from '@renderer/features/terminal/registry/TerminalRegistry';
import { rendererPool } from '@renderer/features/terminal/renderer-pool/RendererPool';
import { SystemToolsView } from '@renderer/features/tools/SystemToolsView';
import { SystemToolsCustomizeView } from '@renderer/features/tools/SystemToolsCustomizeView';
import styles from './App.module.css';

export const App: React.FC = () => {
  const { loadSettings } = useSettingsStore();
  const {
    tabs,
    activeTabId,
    newTab,
    closePane,
    splitPane,
    toggleGridMode,
    toggleMaximizePane,
    spatialFocus,
    setActiveTab,
  } = useWorkspaceStore();

  const activeNavTab = useUIWorkspaceStore((state) => state.activeNavTab);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    loadSettings();
    if (window.api?.isE2E) {
      (window as any).useWorkspaceStore = useWorkspaceStore;
      (window as any).terminalRegistry = terminalRegistry;
      (window as any).rendererPool = rendererPool;
      (window as any).__rendererPool = rendererPool;
      (window as any).devTools = {
        spawn: async (count: number) => {
          return await useWorkspaceStore.getState().spawnN(count);
        },
      };
    }
  }, [loadSettings]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift Shortcuts
      if (e.ctrlKey && e.shiftKey) {
        const key = e.key.toLowerCase();
        if (key === 't') {
          e.preventDefault();
          newTab();
        } else if (key === 'w') {
          e.preventDefault();
          const activeTabObj = tabs.find((t) => t.id === activeTabId);
          if (activeTabObj) closePane(activeTabObj.focusedPaneId);
        } else if (key === 'd') {
          e.preventDefault();
          splitPane('row');
        } else if (key === 'e') {
          e.preventDefault();
          splitPane('column');
        } else if (key === 'g') {
          e.preventDefault();
          toggleGridMode();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          toggleMaximizePane();
        }
      }

      // Alt + Arrow Spatial Focus
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          spatialFocus('up');
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          spatialFocus('down');
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          spatialFocus('left');
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          spatialFocus('right');
        }

        // Alt + 1..9 Tab Jump
        const num = parseInt(e.key, 10);
        if (!isNaN(num) && num >= 1 && num <= 9) {
          const targetTab = tabs[num - 1];
          if (targetTab) {
            e.preventDefault();
            setActiveTab(targetTab.id);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tabs, activeTabId, newTab, closePane, splitPane, toggleGridMode, toggleMaximizePane, spatialFocus, setActiveTab]);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div className={styles.windowShell}>
      <TitleBar />

      <div className={styles.mainLayout}>
        <Sidebar onOpenSettings={() => setIsSettingsOpen(true)} />

        <div className={styles.contentArea}>
          <TabStrip />

          <div className={styles.paneContainer}>
            {activeNavTab === 'terminals' && activeTab ? (
              <LayoutTreeRenderer
                key={activeTab.id}
                node={activeTab.root}
                focusedPaneId={activeTab.focusedPaneId}
                maximizedPaneId={activeTab.maximizedPaneId}
              />
            ) : activeNavTab === 'profiles' ? (
              <div className={styles.placeholderView}>
                <h3>Profiles (Phase 3 Seam)</h3>
                <span className={styles.placeholderBadge}>
                  Profile presets and manager will be introduced in Phase 3.
                </span>
              </div>
            ) : activeNavTab === 'tools' ? (
              <SystemToolsView />
            ) : activeNavTab === 'customize-tools' ? (
              <SystemToolsCustomizeView />
            ) : (
              <div className={styles.placeholderView}>
                <h3>View Not Found</h3>
              </div>
            )}
          </div>
        </div>
      </div>

      <StatusBar />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

export default App;
