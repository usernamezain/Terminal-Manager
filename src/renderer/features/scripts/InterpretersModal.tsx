import React from 'react';
import { RefreshCw, CheckCircle, XCircle, X } from 'lucide-react';
import { useScriptsStore } from './useScriptsStore';
import styles from './ScriptRunnerView.module.css';

interface InterpretersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InterpretersModal: React.FC<InterpretersModalProps> = ({ isOpen, onClose }) => {
  const { interpreters, isInterpretersLoading, refreshInterpreters } = useScriptsStore();

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '640px',
          maxHeight: '80vh',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-control)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>System Script Interpreters</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className={styles.btnSecondary}
              style={{ height: '26px', fontSize: '12px' }}
              onClick={() => refreshInterpreters()}
              disabled={isInterpretersLoading}
            >
              <RefreshCw size={12} className={isInterpretersLoading ? 'spin' : ''} />
              {isInterpretersLoading ? 'Probing...' : 'Refresh'}
            </button>
            <button type="button" className={styles.btnIconOnly} style={{ width: '26px', height: '26px' }} onClick={onClose}>
              <X size={14} />
            </button>
          </div>
        </div>

        <div style={{ padding: '16px 20px', overflowY: 'auto' }}>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Status of detected script runtimes and CLI engines on this Windows machine:
          </p>

          <div className={styles.tableWrapper}>
            <table className={styles.plainTable}>
              <thead>
                <tr>
                  <th>Interpreter</th>
                  <th style={{ width: '100px' }}>Status</th>
                  <th>Details / Version / Path</th>
                </tr>
              </thead>
              <tbody>
                {interpreters.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 500 }}>{item.name}</td>
                    <td>
                      {item.found ? (
                        <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}>
                          <CheckCircle size={13} />
                          Found
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}>
                          <XCircle size={13} />
                          Missing
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '12px' }}>
                      {item.found ? (
                        <div>
                          <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.version || 'Available'}</div>
                          <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-terminal)', fontSize: '11px' }}>
                            {item.path}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>{item.hint || 'Not detected on PATH'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
