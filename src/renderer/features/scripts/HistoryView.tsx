import React from 'react';
import {
  Trash2,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import { HistoryRecord } from '../../../shared/scriptRunnerTypes';
import { useScriptsStore } from './useScriptsStore';
import styles from './ScriptRunnerView.module.css';

export const HistoryView: React.FC = () => {
  const {
    history,
    deleteHistoryRecord,
    clearHistory,
    openLog,
    runNow,
  } = useScriptsStore();

  const formatDate = (ms: number): string => {
    return new Date(ms).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const renderStatus = (status: HistoryRecord['status'], exitCode: number | null) => {
    switch (status) {
      case 'succeeded':
        return (
          <span className={styles.statusIndicator} style={{ color: '#22c55e' }}>
            <span className={styles.dotSucceeded} />
            Succeeded (0)
          </span>
        );
      case 'failed':
        return (
          <span className={styles.statusIndicator} style={{ color: '#ef4444' }}>
            <span className={styles.dotFailed} />
            Failed {exitCode !== null ? `(${exitCode})` : ''}
          </span>
        );
      case 'timed-out':
        return (
          <span className={styles.statusIndicator} style={{ color: '#ef4444' }}>
            <span className={styles.dotFailed} />
            Timed Out
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h4 className={styles.sectionTitle}>Execution History</h4>
          <span className={styles.countText}>({history.length} runs recorded)</span>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={clearHistory}
            title="Clear all recorded history"
          >
            <Trash2 size={14} />
            Clear All
          </button>
        )}
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.plainTable}>
          <thead>
            <tr>
              <th>Script</th>
              <th style={{ width: '80px' }}>Type</th>
              <th style={{ width: '160px' }}>Started</th>
              <th style={{ width: '80px' }}>Duration</th>
              <th style={{ width: '140px' }}>Status</th>
              <th style={{ width: '120px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '36px 14px', color: 'var(--text-muted)' }}>
                  No execution history yet. Runs will appear here automatically.
                </td>
              </tr>
            ) : (
              history.map((record) => (
                <tr key={record.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{record.scriptName}</div>
                    {record.error && (
                      <div style={{ fontSize: '11px', color: '#ef4444' }}>{record.error}</div>
                    )}
                  </td>
                  <td style={{ textTransform: 'uppercase', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {record.type}
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {formatDate(record.startTime)}
                  </td>
                  <td style={{ fontFamily: 'var(--font-terminal)', fontSize: '12px' }}>
                    {(record.durationMs / 1000).toFixed(1)}s
                  </td>
                  <td>{renderStatus(record.status, record.exitCode)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        className={styles.quickBtn}
                        title="Re-run Script"
                        onClick={() => runNow(record.scriptId)}
                      >
                        <RotateCcw size={13} />
                      </button>
                      {record.logPath && (
                        <button
                          type="button"
                          className={styles.quickBtn}
                          title="Open Log File"
                          onClick={() => openLog(record.logPath)}
                        >
                          <ExternalLink size={13} />
                        </button>
                      )}
                      <button
                        type="button"
                        className={styles.quickBtn}
                        title="Delete Record"
                        onClick={() => deleteHistoryRecord(record.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
