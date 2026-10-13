import React, { useEffect, useState, useMemo } from 'react';
import { ListOrdered, History, Code, Play } from 'lucide-react';
import { useScriptsStore } from './useScriptsStore';
import { ScriptLibrary } from './ScriptLibrary';
import { ScriptEditor } from './ScriptEditor';
import { QueueView } from './QueueView';
import { HistoryView } from './HistoryView';
import { InterpretersModal } from './InterpretersModal';
import styles from './ScriptRunnerView.module.css';

export const ScriptRunnerView: React.FC = () => {
  const {
    scripts,
    selectedScriptId,
    activeSubSection,
    runnerState,
    loadAll,
    setActiveSubSection,
    runNow,
  } = useScriptsStore();

  const [isInterpretersModalOpen, setIsInterpretersModalOpen] = useState(false);

  useEffect(() => {
    loadAll();

    // Subscribe to IPC live updates
    const unsubState = window.api?.scripts?.onRunnerState?.((newState) => {
      useScriptsStore.setState({ runnerState: newState });
    });

    const unsubOutput = window.api?.scripts?.onOutput?.((payload) => {
      useScriptsStore.setState((prev) => {
        // If current viewing matches active queue item or default
        if (!prev.selectedQueueId || prev.selectedQueueId === payload.queueId) {
          return { liveOutput: payload.full };
        }
        return {};
      });
    });

    return () => {
      if (unsubState) unsubState();
      if (unsubOutput) unsubOutput();
    };
  }, [loadAll]);

  const activeScript = useMemo(() => {
    return scripts.find((s) => s.id === selectedScriptId) || scripts[0] || null;
  }, [scripts, selectedScriptId]);

  const queueBadgeCount = useMemo(() => {
    return runnerState.queue.filter((q) => q.status === 'waiting' || q.status === 'running').length;
  }, [runnerState.queue]);

  return (
    <div className={styles.container}>
      {/* 1. Left Library Column (280px) */}
      <ScriptLibrary onOpenInterpreters={() => setIsInterpretersModalOpen(true)} />

      {/* 2. Right Detail Column */}
      <div className={styles.detailArea}>
        {/* Header with Segmented Control */}
        <div className={styles.detailHeader}>
          <div className={styles.headerLeft}>
            <h3 className={styles.headerTitle}>
              {activeSubSection === 'editor'
                ? activeScript?.name || 'Script Editor'
                : activeSubSection === 'queue'
                ? 'Execution Queue'
                : 'Execution History'}
            </h3>

            {/* Plain Segmented Control */}
            <div className={styles.segmentedControl}>
              <button
                type="button"
                className={`${styles.segmentBtn} ${
                  activeSubSection === 'editor' ? styles.segmentBtnActive : ''
                }`}
                onClick={() => setActiveSubSection('editor')}
              >
                <Code size={13} />
                Editor
              </button>
              <button
                type="button"
                className={`${styles.segmentBtn} ${
                  activeSubSection === 'queue' ? styles.segmentBtnActive : ''
                }`}
                onClick={() => setActiveSubSection('queue')}
              >
                <ListOrdered size={13} />
                Queue
                {queueBadgeCount > 0 && (
                  <span className={styles.segmentBadge}>{queueBadgeCount}</span>
                )}
              </button>
              <button
                type="button"
                className={`${styles.segmentBtn} ${
                  activeSubSection === 'history' ? styles.segmentBtnActive : ''
                }`}
                onClick={() => setActiveSubSection('history')}
              >
                <History size={13} />
                History
              </button>
            </div>
          </div>

          <div className={styles.headerActions}>
            {activeSubSection === 'editor' && activeScript && (
              <button
                type="button"
                className={styles.btnPrimary}
                style={{ height: '28px', fontSize: '12px' }}
                onClick={() => runNow(activeScript.id)}
              >
                <Play size={13} />
                Run
              </button>
            )}
          </div>
        </div>

        {/* Content View Switching */}
        {activeSubSection === 'editor' ? (
          activeScript ? (
            <ScriptEditor key={activeScript.id} script={activeScript} />
          ) : (
            <div className={styles.scrollContent} style={{ alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              No script selected. Choose one from the library or click "+ New".
            </div>
          )
        ) : activeSubSection === 'queue' ? (
          <QueueView />
        ) : (
          <HistoryView />
        )}
      </div>

      {/* Interpreters Modal */}
      <InterpretersModal
        isOpen={isInterpretersModalOpen}
        onClose={() => setIsInterpretersModalOpen(false)}
      />
    </div>
  );
};
