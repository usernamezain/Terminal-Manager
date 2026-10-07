import React, { useState } from 'react';
import { ShellExperienceStatus, ShellExperienceSettings } from '../../../shared/shellExperienceTypes';
import styles from './ShellExperience.module.css';
import { Terminal, Shield, RefreshCw, Play, CheckCircle, AlertTriangle, Download, Info } from 'lucide-react';

interface OverviewSectionProps {
  settings: ShellExperienceSettings;
  status: ShellExperienceStatus | null;
  onUpdateSettings: (newSettings: Partial<ShellExperienceSettings>) => void;
  onRefreshStatus: () => void;
  onGlyphTest?: () => void;
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({
  settings,
  status,
  onUpdateSettings,
  onRefreshStatus,
  onGlyphTest,
}) => {
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [progressLabel, setProgressLabel] = useState<string>('');
  const [confirmModal, setConfirmModal] = useState<{ id: string; command: string } | null>(null);
  const [updatingRepo, setUpdatingRepo] = useState(false);
  const [updateLog, setUpdateLog] = useState<string[]>([]);

  const handleModeChange = (mode: 'app-scoped' | 'system-wide') => {
    onUpdateSettings({ mode });
  };

  const requestInstall = (id: string, commandRequired: string) => {
    setConfirmModal({ id, command: commandRequired });
  };

  const confirmAndInstall = async () => {
    if (!confirmModal || !window.api?.shellexp) return;
    const { id } = confirmModal;
    setConfirmModal(null);
    setInstallingId(id);
    setProgressLabel(`Preparing installation for ${id}...`);

    const unsub = window.api.shellexp.onProgress((p) => {
      setProgressLabel(p.label);
    });

    try {
      await window.api.shellexp.install({ itemId: id, confirmed: true });
      onRefreshStatus();
    } catch (err) {
      alert(`Install failed: ${String(err)}`);
    } finally {
      unsub();
      setInstallingId(null);
      setProgressLabel('');
    }
  };

  const handleUpdateUpstream = async () => {
    if (!window.api?.shellexp) return;
    setUpdatingRepo(true);
    try {
      const res = await window.api.shellexp.update();
      setUpdateLog(res.commits || ['Updated successfully']);
      onRefreshStatus();
    } catch (err) {
      alert(`Update failed: ${String(err)}`);
    } finally {
      setUpdatingRepo(false);
    }
  };

  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionTitle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={18} color="#6C8CFF" />
          <span>Execution Mode & Security Boundary</span>
        </div>
      </div>

      <div className={styles.gridTwo}>
        <div
          className={styles.sectionCard}
          style={{
            borderColor: settings.mode === 'app-scoped' ? '#6C8CFF' : 'rgba(255,255,255,0.08)',
            cursor: 'pointer',
          }}
          onClick={() => handleModeChange('app-scoped')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600 }}>App-scoped (Recommended)</span>
            <span className={`${styles.chip} ${styles.chipSuccess}`}>Default</span>
          </div>
          <p style={{ fontSize: 12, color: '#8A99AD', margin: 0 }}>
            Applies Shell Experience to terminals inside Terminal Manager only. User&apos;s real <code>$PROFILE</code> remains untouched.
          </p>
        </div>

        <div
          className={styles.sectionCard}
          style={{
            borderColor: settings.mode === 'system-wide' ? '#6C8CFF' : 'rgba(255,255,255,0.08)',
            cursor: 'pointer',
          }}
          onClick={() => handleModeChange('system-wide')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600 }}>System-wide (Opt-in)</span>
            <span className={`${styles.chip} ${styles.chipWarning}`}>Modifies $PROFILE</span>
          </div>
          <p style={{ fontSize: 12, color: '#8A99AD', margin: 0 }}>
            Copies profile + overrides to the real PowerShell profile directory with automatic timestamped backup.
          </p>
        </div>
      </div>

      <div className={styles.sectionTitle} style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Play size={18} color="#EAB308" />
          <span>Startup Performance Strategy ("Fast Start")</span>
        </div>
      </div>

      <div className={styles.gridTwo}>
        <div
          className={styles.sectionCard}
          style={{
            borderColor: settings.advanced?.fastStart !== false ? '#EAB308' : 'rgba(255,255,255,0.08)',
            cursor: 'pointer',
          }}
          onClick={() =>
            onUpdateSettings({
              advanced: { ...settings.advanced, fastStart: true },
            })
          }
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600 }}>Fast Start (Cached & Lazy)</span>
            <span className={`${styles.chip} ${styles.chipSuccess}`}>Default ON</span>
          </div>
          <p style={{ fontSize: 12, color: '#8A99AD', margin: '4px 0 0 0' }}>
            Caches oh-my-posh init script and defers Terminal-Icons to background idle. Cold load ~1.1s (down from ~3.2s). Visual prompt and icons remain 100% identical.
          </p>
        </div>

        <div
          className={styles.sectionCard}
          style={{
            borderColor: settings.advanced?.fastStart === false ? '#EAB308' : 'rgba(255,255,255,0.08)',
            cursor: 'pointer',
          }}
          onClick={() =>
            onUpdateSettings({
              advanced: { ...settings.advanced, fastStart: false },
            })
          }
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600 }}>Full Load (Upstream behavior)</span>
            <span className={`${styles.chip} ${styles.chipWarning}`}>Full Upstream</span>
          </div>
          <p style={{ fontSize: 12, color: '#8A99AD', margin: '4px 0 0 0' }}>
            Runs full upstream profile scripts synchronously on every terminal launch. Cold load ~3.2s.
          </p>
        </div>
      </div>


      <div className={styles.sectionTitle} style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Terminal size={18} color="#4ADE80" />
          <span>Dependency Status Checklist</span>
        </div>
        <button className={styles.btnSecondary} onClick={onRefreshStatus}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {progressLabel && (
        <div className={`${styles.chip} ${styles.chipWarning}`} style={{ width: '100%', padding: 8 }}>
          <RefreshCw className="spin" size={14} /> {progressLabel}
        </div>
      )}

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Dependency</th>
            <th>Status</th>
            <th>Details</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {status?.dependencies.map((dep) => (
            <tr key={dep.id}>
              <td style={{ fontWeight: 600 }}>{dep.name}</td>
              <td>
                <span className={`${styles.chip} ${dep.installed ? styles.chipSuccess : styles.chipDanger}`}>
                  {dep.installed ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                  {dep.installed ? 'Installed' : 'Missing'}
                </span>
              </td>
              <td style={{ fontSize: 12, color: '#8A99AD' }}>{dep.details}</td>
              <td>
                {!dep.installed && (
                  <button
                    className={styles.btnSecondary}
                    style={{ padding: '4px 8px', fontSize: 12 }}
                    disabled={installingId === dep.id}
                    onClick={() => requestInstall(dep.id, dep.commandRequired)}
                  >
                    <Download size={12} /> Install
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={styles.sectionTitle} style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Info size={18} color="#C084FC" />
          <span>Upstream Profile Repository</span>
        </div>
        <button className={styles.btnPrimary} onClick={handleUpdateUpstream} disabled={updatingRepo}>
          <RefreshCw size={14} /> {updatingRepo ? 'Updating...' : 'Check & Update'}
        </button>
      </div>

      <div style={{ fontSize: 13, color: '#A3B1C2', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div>Repository: <code>https://github.com/ChrisTitusTech/powershell-profile</code></div>
        <div>Commit: <code>{status?.repoHash}</code> ({status?.repoDate})</div>
        {status?.measuredLoadTimeMs && <div>Measured Startup Overhead: <code>{status.measuredLoadTimeMs} ms</code></div>}
      </div>

      {updateLog.length > 0 && (
        <div className={styles.previewBox}>
          <strong>Update Log:</strong>
          {updateLog.map((line, idx) => (
            <div key={idx}>{line}</div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        {onGlyphTest && (
          <button className={styles.btnSecondary} onClick={onGlyphTest}>
            <Play size={14} /> Glyph Test
          </button>
        )}
      </div>

      {confirmModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div className={styles.sectionCard} style={{ width: 450, background: '#14171D' }}>
            <h3 style={{ margin: 0 }}>Confirm Installation</h3>
            <p style={{ fontSize: 13, color: '#A3B1C2' }}>
              Terminal Manager will execute the following install command:
            </p>
            <div className={styles.previewBox}>{confirmModal.command}</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
              <button className={styles.btnSecondary} onClick={() => setConfirmModal(null)}>
                Cancel
              </button>
              <button className={styles.btnPrimary} onClick={confirmAndInstall}>
                Confirm & Run
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.footer}>
        <span>Pretty PowerShell by Chris Titus Tech (MIT License)</span>
        <a href="https://github.com/ChrisTitusTech/powershell-profile" target="_blank" rel="noreferrer" style={{ color: '#6C8CFF' }}>
          GitHub Source
        </a>
      </div>
    </div>
  );
};
