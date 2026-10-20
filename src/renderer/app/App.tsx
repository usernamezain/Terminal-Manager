import React, { useEffect, useState, lazy, Suspense } from 'react';
import { TitleBar } from '@renderer/components/TitleBar';
import { Sidebar } from '@renderer/components/Sidebar';
import { TabStrip } from '@renderer/features/tabs/TabStrip';
import { StatusBar } from '@renderer/components/StatusBar';
import { ErrorBoundary } from '@renderer/components/ErrorBoundary';
import { LayoutTreeRenderer } from '@renderer/features/layout/LayoutTreeRenderer';
import { useWorkspaceStore } from '@renderer/features/layout/useWorkspaceStore';
import { useWorkspaceStore as useUIWorkspaceStore } from '@renderer/store/useWorkspaceStore';
import { useSettingsStore } from '@renderer/store/useSettingsStore';
import { useProfilesStore } from '@renderer/store/useProfilesStore';
import { terminalRegistry } from '@renderer/features/terminal/registry/TerminalRegistry';
import { rendererPool } from '@renderer/features/terminal/renderer-pool/RendererPool';
import { rendererPerfTracker } from '@renderer/perfTracker';
import { useLogStore } from '@renderer/store/useLogStore';
import { initRendererLogger } from '@renderer/utils/rendererLogger';
import styles from './App.module.css';

const LogDetectorPanel = lazy(() =>
  import('@renderer/features/logger/LogDetectorPanel').then((m) => ({ default: m.LogDetectorPanel }))
);

const SettingsView = lazy(() =>
  import('@renderer/components/settings/SettingsView').then((m) => ({ default: m.SettingsView }))
);

const CustomizationDocsView = lazy(() =>
  import('@renderer/features/docs/CustomizationDocsView').then((m) => ({ default: m.CustomizationDocsView }))
);

const ProfilesView = lazy(() =>
  import('@renderer/features/profiles/ProfilesView').then((m) => ({ default: m.ProfilesView }))
);

const ScriptRunnerView = lazy(() =>
  import('@renderer/features/scripts/ScriptRunnerView').then((m) => ({ default: m.ScriptRunnerView }))
);

const AgentsView = lazy(() =>
  import('@renderer/features/ai-agents/AgentsView').then((m) => ({ default: m.AgentsView }))
);

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

  const { activeNavTab, setActiveNavTab } = useUIWorkspaceStore();
  const { dockPosition } = useLogStore();
  const [settingsInitialTab, setSettingsInitialTab] = useState<string>('general');

  const { loadProfiles } = useProfilesStore();

  useEffect(() => {
    const cleanupLogger = initRendererLogger();
    rendererPerfTracker.mark('reactMounted');
    loadSettings();
    loadProfiles();
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
    (window as any).openDocs = (topicId: string, sectionId?: string) => {
      useUIWorkspaceStore.getState().openDocs(topicId, sectionId);
    };

    return () => {
      cleanupLogger();
    };
  }, [loadSettings, loadProfiles]);

  // IPC Event Listeners for Docking and Navigation
  useEffect(() => {
    const unsubDock = window.api?.session?.onDockTab?.((data) => {
      useWorkspaceStore.getState().dockTab(data);
      useUIWorkspaceStore.getState().setActiveNavTab('terminals');
    });

    const unsubPopOut = window.api?.session?.onTabPoppedOut?.((data) => {
      useWorkspaceStore.getState().handleTabPoppedOut(data.sessionId);
    });

    const unsubNavigate = window.api?.app?.onNavigate?.((dest) => {
      if (dest === 'settings') {
        setSettingsInitialTab('general');
        setActiveNavTab('settings');
      } else if (dest === 'docs' || dest.startsWith('docs:')) {
        if (dest.startsWith('docs:')) {
          const parts = dest.split(':');
          const topicId = parts[1] || 'getting-started';
          const sectionId = parts[2];
          useUIWorkspaceStore.getState().openDocs(topicId, sectionId);
        } else {
          setActiveNavTab('docs');
        }
      } else if (dest === 'profiles') {
        setActiveNavTab('profiles');
      } else if (dest === 'scripts') {
        setActiveNavTab('scripts');
      } else if (dest === 'agents') {
        setActiveNavTab('agents');
      }
    });

    const unsubToast = window.api?.app?.onToast?.((data) => {
      useWorkspaceStore.getState().setToast(data.message);
    });

    return () => {
      if (unsubDock) unsubDock();
      if (unsubPopOut) unsubPopOut();
      if (unsubNavigate) unsubNavigate();
      if (unsubToast) unsubToast();
    };
  }, [setActiveNavTab]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F1 for Documentation
      if (e.key === 'F1') {
        e.preventDefault();
        setActiveNavTab(activeNavTab === 'docs' ? 'terminals' : 'docs');
        return;
      }

      // Escape to close Settings, Docs, Profiles, Scripts, Agents, or Log Detector and return to terminals
      if (e.key === 'Escape') {
        if (useLogStore.getState().isOpen) {
          e.preventDefault();
          useLogStore.getState().setOpen(false);
          return;
        }
        if (activeNavTab === 'settings' || activeNavTab === 'docs' || activeNavTab === 'profiles' || activeNavTab === 'scripts' || activeNavTab === 'agents') {
          e.preventDefault();
          setActiveNavTab('terminals');
          return;
        }
      }

      // Ctrl+, for Settings
      if (e.ctrlKey && e.key === ',') {
        e.preventDefault();
        setSettingsInitialTab('general');
        setActiveNavTab(activeNavTab === 'settings' ? 'terminals' : 'settings');
        return;
      }

      // Ctrl+Shift Shortcuts
      if (e.ctrlKey && e.shiftKey) {
        const key = e.key.toLowerCase();
        if (key === 'l') {
          // Ctrl+Shift+L for Realtime Log Detector
          e.preventDefault();
          useLogStore.getState().toggleOpen();
        } else if (key === 'r') {
          // Ctrl+Shift+R for Script Runner
          e.preventDefault();
          setActiveNavTab(activeNavTab === 'scripts' ? 'terminals' : 'scripts');
        } else if (key === 'g') {
          // Ctrl+Shift+G for AI Agents Panel
          e.preventDefault();
          setActiveNavTab(activeNavTab === 'agents' ? 'terminals' : 'agents');
        } else if (key === 't') {
          e.preventDefault();
          newTab();
        } else if (key === 'w') {
          e.preventDefault();
          const activeTabObj = tabs.find((t) => t.id === activeTabId);
          if (activeTabObj) closePane(activeTabObj.focusedPaneId);
        } else if (key === 'd') {
          // If in documentation, toggle back or open docs
          if (activeNavTab === 'docs') {
            e.preventDefault();
            setActiveNavTab('terminals');
          } else {
            e.preventDefault();
            splitPane('row');
          }
        } else if (key === 'e') {
          e.preventDefault();
          splitPane('column');
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
  }, [tabs, activeTabId, activeNavTab, newTab, closePane, splitPane, toggleGridMode, toggleMaximizePane, spatialFocus, setActiveTab, setActiveNavTab]);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div className={styles.windowShell}>
      <TitleBar />

      <div className={styles.mainLayout}>
        <Sidebar
          onOpenSettings={(tab) => {
            setSettingsInitialTab(tab || 'general');
            setActiveNavTab('settings');
          }}
        />

        <div
          className={styles.contentArea}
          style={{
            flexDirection: dockPosition === 'bottom' ? 'column' : 'row',
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflow: 'hidden',
            }}
          >
            {activeNavTab === 'settings' ? (
              <ErrorBoundary>
                <Suspense fallback={null}>
                  <SettingsView
                    initialSection={settingsInitialTab}
                    onClose={() => setActiveNavTab('terminals')}
                  />
                </Suspense>
              </ErrorBoundary>
            ) : activeNavTab === 'docs' ? (
              <ErrorBoundary>
                <Suspense fallback={null}>
                  <CustomizationDocsView
                    onClose={() => setActiveNavTab('terminals')}
                  />
                </Suspense>
              </ErrorBoundary>
            ) : activeNavTab === 'scripts' ? (
              <ErrorBoundary>
                <Suspense fallback={null}>
                  <ScriptRunnerView />
                </Suspense>
              </ErrorBoundary>
            ) : activeNavTab === 'profiles' ? (
              <ErrorBoundary>
                <Suspense fallback={null}>
                  <ProfilesView />
                </Suspense>
              </ErrorBoundary>
            ) : activeNavTab === 'agents' ? (
              <ErrorBoundary>
                <Suspense fallback={null}>
                  <AgentsView />
                </Suspense>
              </ErrorBoundary>
            ) : (
              <>
                <TabStrip />
                <div className={styles.paneContainer}>
                  {activeTab ? (
                    <LayoutTreeRenderer
                      key={activeTab.id}
                      node={activeTab.root}
                      focusedPaneId={activeTab.focusedPaneId}
                      maximizedPaneId={activeTab.maximizedPaneId}
                    />
                  ) : (
                    <div className={styles.placeholderView}>
                      <h3>No Active Tab</h3>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <Suspense fallback={null}>
            <LogDetectorPanel />
          </Suspense>
        </div>
      </div>

      <StatusBar />
    </div>
  );
};

export default App;
