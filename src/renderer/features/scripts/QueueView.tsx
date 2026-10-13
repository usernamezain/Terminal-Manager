import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Square,
  SkipForward,
  RotateCcw,
  Trash2,
  BookmarkPlus,
  ArrowUp,
  ArrowDown,
  Copy,
  Terminal,
  Check,
} from 'lucide-react';
import { QueueItem, QueueItemStatus } from '../../../shared/scriptRunnerTypes';
import { useScriptsStore } from './useScriptsStore';
import styles from './ScriptRunnerView.module.css';

export const QueueView: React.FC = () => {
  const {
    runnerState,
    liveOutput,
    selectedQueueId,
    isPauseScroll,
    startQueue,
    pauseQueue,
    resumeQueue,
    stopQueue,
    skipCurrent,
    retryFailed,
    resumeFromHere,
    removeItem,
    clearQueue,
    reorderQueue,
    setSelectedQueueId,
    setIsPauseScroll,
    clearLiveOutput,
    saveSequence,
  } = useScriptsStore();

  const [copied, setCopied] = useState(false);
  const [showSaveSequenceModal, setShowSaveSequenceModal] = useState(false);
  const [sequenceName, setSequenceName] = useState('');
  const [nowSec, setNowSec] = useState(Date.now());

  const outputRef = useRef<HTMLPreElement | null>(null);

  // Live elapsed time tick: runs once per second only while view is mounted
  useEffect(() => {
    const timer = setInterval(() => {
      setNowSec(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll output panel to bottom unless paused
  useEffect(() => {
    if (!isPauseScroll && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [liveOutput, isPauseScroll]);

  const queue = runnerState.queue;
  const isRunning = runnerState.status === 'running';
  const isPaused = runnerState.status === 'paused';

  const completedCount = queue.filter(
    (q) => q.status === 'succeeded' || q.status === 'failed' || q.status === 'timed-out' || q.status === 'cancelled' || q.status === 'skipped'
  ).length;
  const failedCount = queue.filter((q) => q.status === 'failed' || q.status === 'timed-out').length;
  const totalCount = queue.length;

  const hasFailedOrSkipped = queue.some(
    (q) => q.status === 'failed' || q.status === 'timed-out' || q.status === 'skipped'
  );

  const handleCopyOutput = () => {
    if (!liveOutput) return;
    navigator.clipboard.writeText(liveOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    if (isRunning && index === 0) return; // Cannot move running item
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= queue.length) return;

    const newQueue = [...queue];
    const itemA = newQueue[index];
    const itemB = newQueue[targetIndex];
    if (!itemA || !itemB) return;
    newQueue[index] = itemB;
    newQueue[targetIndex] = itemA;

    reorderQueue(newQueue.map((item) => item.queueId));
  };

  const handleSaveSequence = async () => {
    if (!sequenceName.trim()) return;
    const seq = {
      id: `seq-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: sequenceName.trim(),
      scriptIds: queue.map((q) => q.scriptId),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveSequence(seq);
    setShowSaveSequenceModal(false);
    setSequenceName('');
  };

  const formatDuration = (item: QueueItem): string => {
    if (item.status === 'running' && item.startTime) {
      const elapsedSec = Math.max(0, Math.floor((nowSec - item.startTime) / 1000));
      return `${elapsedSec}s`;
    }
    if (item.durationMs !== undefined) {
      const sec = (item.durationMs / 1000).toFixed(1);
      return `${sec}s`;
    }
    return '-';
  };

  const renderStatus = (status: QueueItemStatus, exitCode?: number | null) => {
    switch (status) {
      case 'waiting':
        return (
          <span className={styles.statusIndicator}>
            <span className={styles.dotWaiting} />
            Waiting
          </span>
        );
      case 'running':
        return (
          <span className={styles.statusIndicator} style={{ color: 'var(--accent)' }}>
            <span className={styles.dotRunning} />
            Running
          </span>
        );
      case 'succeeded':
        return (
          <span className={styles.statusIndicator} style={{ color: '#22c55e' }}>
            <span className={styles.dotSucceeded} />
            Succeeded
          </span>
        );
      case 'failed':
        return (
          <span className={styles.statusIndicator} style={{ color: '#ef4444' }}>
            <span className={styles.dotFailed} />
            Failed {exitCode !== undefined && exitCode !== null ? `(${exitCode})` : ''}
          </span>
        );
      case 'timed-out':
        return (
          <span className={styles.statusIndicator} style={{ color: '#ef4444' }}>
            <span className={styles.dotFailed} />
            Timed Out
          </span>
        );
      case 'skipped':
        return (
          <span className={styles.statusIndicator} style={{ color: '#eab308' }}>
            <span className={styles.dotSkipped} />
            Skipped
          </span>
        );
      case 'cancelled':
        return (
          <span className={styles.statusIndicator} style={{ color: 'var(--text-muted)' }}>
            <span className={styles.dotCancelled} />
            Cancelled
          </span>
        );
    }
  };

  return (
    <div className={styles.scrollContent}>
      {/* 1. Header Summary & Runner Controls */}
      <div className={styles.queueControlsBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span className={styles.queueSummaryText}>
            {totalCount === 0
              ? 'Queue is empty'
              : `${completedCount} of ${totalCount} done${failedCount > 0 ? `, ${failedCount} failed` : ''}`}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!isRunning && !isPaused && (
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={startQueue}
              disabled={queue.length === 0}
            >
              <Play size={14} />
              Start Queue
            </button>
          )}

          {isRunning && (
            <button type="button" className={styles.btnSecondary} onClick={pauseQueue}>
              <Pause size={14} />
              Pause
            </button>
          )}

          {isPaused && (
            <button type="button" className={styles.btnPrimary} onClick={resumeQueue}>
              <Play size={14} />
              Resume
            </button>
          )}

          {(isRunning || isPaused) && (
            <>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={skipCurrent}
                title="Skip currently executing script"
              >
                <SkipForward size={14} />
                Skip Current
              </button>
              <button
                type="button"
                className={styles.btnDanger}
                onClick={stopQueue}
                title="Cancel running queue"
              >
                <Square size={14} />
                Stop
              </button>
            </>
          )}

          {hasFailedOrSkipped && !isRunning && (
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={retryFailed}
              title="Reset and retry failed items"
            >
              <RotateCcw size={14} />
              Retry Failed
            </button>
          )}

          {queue.length > 0 && !isRunning && (
            <>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setShowSaveSequenceModal(true)}
                title="Save queue as reusable sequence"
              >
                <BookmarkPlus size={14} />
                Save Sequence
              </button>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={clearQueue}
                title="Clear queue items"
              >
                <Trash2 size={14} />
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      {/* Save Sequence Modal Dialog */}
      {showSaveSequenceModal && (
        <div className={styles.warningBanner} style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <span style={{ fontSize: '13px', fontWeight: 500 }}>Sequence Name:</span>
            <input
              type="text"
              className={styles.input}
              style={{ width: '240px' }}
              value={sequenceName}
              placeholder="e.g. Setup project"
              onChange={(e) => setSequenceName(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className={styles.btnPrimary} onClick={handleSaveSequence}>
              Save
            </button>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => setShowSaveSequenceModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 2. Queue Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.plainTable}>
          <thead>
            <tr>
              <th style={{ width: '40px' }}>#</th>
              <th>Script</th>
              <th style={{ width: '90px' }}>Type</th>
              <th style={{ width: '130px' }}>Status</th>
              <th style={{ width: '80px' }}>Duration</th>
              <th style={{ width: '130px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {queue.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '32px 14px', color: 'var(--text-muted)' }}>
                  Queue is empty. Select scripts from the library and click "Add to Queue".
                </td>
              </tr>
            ) : (
              queue.map((item, idx) => {
                const isItemRunning = item.status === 'running';
                const isSelectedForOutput = selectedQueueId === item.queueId;

                return (
                  <tr
                    key={item.queueId}
                    className={`${isItemRunning ? styles.queueRowRunning : ''} ${
                      isSelectedForOutput ? styles.queueRowActiveSelected : ''
                    }`}
                    onClick={() => setSelectedQueueId(item.queueId)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{item.scriptName}</div>
                      {item.error && (
                        <div style={{ fontSize: '11px', color: '#ef4444' }}>{item.error}</div>
                      )}
                    </td>
                    <td style={{ textTransform: 'uppercase', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {item.type}
                    </td>
                    <td>{renderStatus(item.status, item.exitCode)}</td>
                    <td style={{ fontFamily: 'var(--font-terminal)', fontSize: '12px' }}>
                      {formatDuration(item)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {item.status === 'waiting' && !isRunning && (
                          <>
                            <button
                              type="button"
                              className={styles.quickBtn}
                              title="Move Up"
                              disabled={idx === 0}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveItem(idx, 'up');
                              }}
                            >
                              <ArrowUp size={12} />
                            </button>
                            <button
                              type="button"
                              className={styles.quickBtn}
                              title="Move Down"
                              disabled={idx === queue.length - 1}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveItem(idx, 'down');
                              }}
                            >
                              <ArrowDown size={12} />
                            </button>
                          </>
                        )}

                        {item.status === 'failed' && (
                          <button
                            type="button"
                            className={styles.quickBtn}
                            title="Resume from here"
                            onClick={(e) => {
                              e.stopPropagation();
                              resumeFromHere(item.queueId);
                            }}
                          >
                            <Play size={12} />
                          </button>
                        )}

                        {!isItemRunning && (
                          <button
                            type="button"
                            className={styles.quickBtn}
                            title="Remove from queue"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeItem(item.queueId);
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 3. Live Output Panel */}
      <div className={styles.liveOutputPanel}>
        <div className={styles.outputHeader}>
          <div className={styles.outputTitle}>
            <Terminal size={14} style={{ color: 'var(--accent)' }} />
            <span>
              {selectedQueueId
                ? `Output: ${queue.find((q) => q.queueId === selectedQueueId)?.scriptName || 'Item'}`
                : 'Live Execution Output'}
            </span>
          </div>

          <div className={styles.outputControls}>
            <button
              type="button"
              className={styles.btnSecondary}
              style={{ height: '24px', fontSize: '11px', padding: '0 8px' }}
              onClick={() => setIsPauseScroll(!isPauseScroll)}
            >
              {isPauseScroll ? 'Resume Scroll' : 'Pause Scroll'}
            </button>
            <button
              type="button"
              className={styles.btnSecondary}
              style={{ height: '24px', fontSize: '11px', padding: '0 8px' }}
              onClick={handleCopyOutput}
              disabled={!liveOutput}
            >
              {copied ? <Check size={12} style={{ color: '#22c55e' }} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              className={styles.btnSecondary}
              style={{ height: '24px', fontSize: '11px', padding: '0 8px' }}
              onClick={clearLiveOutput}
              disabled={!liveOutput}
            >
              Clear
            </button>
          </div>
        </div>

        {liveOutput ? (
          <pre ref={outputRef} className={styles.outputPre}>
            {liveOutput}
          </pre>
        ) : (
          <div className={styles.outputEmpty}>
            No output generated yet. Click Start Queue or select a finished script above to view its log.
          </div>
        )}
      </div>
    </div>
  );
};
