import React, { useState } from 'react';
import { ShellExperienceStatus, ShellExperienceSettings } from '../../../shared/shellExperienceTypes';
import { SettingsSection } from '../../components/settings/SettingsSection';
import { SegmentedRadio } from '../../components/settings/SegmentedRadio';
import layoutStyles from '../../components/settings/SettingsLayout.module.css';
import { RefreshCw, Play, Download } from 'lucide-react';

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

  const handleFastStartChange = (val: 'fast' | 'full') => {
    onUpdateSettings({
      advanced: {
        ...settings.advanced,
        fastStart: val === 'fast',
      },
    });
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
      setUpdateLog(res.commits || ['Engine synchronized successfully']);
      onRefreshStatus();
    } catch (err) {
      alert(`Update check failed: ${String(err)}`);
    } finally {
      setUpdatingRepo(false);
    }
  };

  const isFastStart = settings.advanced?.fastStart !== false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 1. Execution Mode & Isolation */}
      <SettingsSection
        title="Execution Mode & Isolation Boundary"
        description="Choose whether customization scripts apply exclusively inside Terminal Manager or system-wide."
      >
        <SegmentedRadio<'app-scoped' | 'system-wide'>
          name="execution-mode"
          value={settings.mode}
          onChange={handleModeChange}
          options={[
            {
              value: 'app-scoped',
              label: 'App-scoped (Recommended)',
              description:
                "Applies Shell Experience strictly to terminals launched inside Terminal Manager. The user's real $PROFILE remains untouched.",
            },
            {
              value: 'system-wide',
              label: 'System-wide (Opt-in)',
              description:
                'Synchronizes customizations to the system PowerShell profile directory with automatic timestamped backup.',
            },
          ]}
        />
      </SettingsSection>

      {/* 2. Startup Performance */}
      <SettingsSection
        title="Startup Performance"
        description="Configure script caching and deferred module loading for shell startup."
      >
        <SegmentedRadio<'fast' | 'full'>
          name="startup-perf"
          value={isFastStart ? 'fast' : 'full'}
          onChange={handleFastStartChange}
          options={[
            {
              value: 'fast',
              label: 'Fast Start (Cached & Lazy)',
              description:
                'Caches prompt bytecode and defers heavy plugins to idle time (~0.8s launch time).',
            },
            {
              value: 'full',
              label: 'Full Profile (Synchronous)',
              description:
                'Loads all profile scripts synchronously at startup (~3.2s cold start).',
            },
          ]}
        />
      </SettingsSection>

      {/* 3. Dependency Checklist */}
      <SettingsSection
        title="Dependency Status Checklist"
        description="Required and optional CLI tools for prompt themes, icons, and predictive completions."
        action={
          <button className={layoutStyles.btnSecondary} onClick={onRefreshStatus}>
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
        }
      >
        {progressLabel && (
          <div
            style={{
              padding: '8px 12px',
              marginBottom: 12,
              borderRadius: 6,
              background: 'rgba(250, 204, 21, 0.1)',
              border: '1px solid rgba(250, 204, 21, 0.25)',
              color: 'var(--warning)',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <RefreshCw className="spin" size={13} />
            <span>{progressLabel}</span>
          </div>
        )}

        <table className={layoutStyles.cleanTable}>
          <thead>
            <tr>
              <th style={{ width: '25%' }}>Dependency</th>
              <th style={{ width: '20%' }}>Status</th>
              <th style={{ width: '40%' }}>Details</th>
              <th style={{ width: '15%', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {status?.dependencies.map((dep) => (
              <tr key={dep.id}>
                <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{dep.name}</td>
                <td>
                  <span
                    className={`${layoutStyles.statusDot} ${
                      dep.installed
                        ? layoutStyles.statusDotInstalled
                        : layoutStyles.statusDotMissing
                    }`}
                  />
                  <span>{dep.installed ? 'Installed' : 'Missing'}</span>
                </td>
                <td>{dep.details}</td>
                <td style={{ textAlign: 'right' }}>
                  {!dep.installed && (
                    <button
                      className={layoutStyles.btnSecondary}
                      style={{ height: 28, padding: '0 10px', fontSize: 12 }}
                      disabled={installingId === dep.id}
                      onClick={() => requestInstall(dep.id, dep.commandRequired)}
                    >
                      <Download size={12} />
                      <span>Install</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SettingsSection>

      {/* 4. Terminal Manager Profile Core */}
      <SettingsSection
        title="Terminal Manager Profile Core"
        description="Version signatures, measured startup overhead, and engine synchronization."
        action={
          <button
            className={layoutStyles.btnSecondary}
            onClick={handleUpdateUpstream}
            disabled={updatingRepo}
          >
            <RefreshCw size={13} className={updatingRepo ? 'spin' : ''} />
            <span>{updatingRepo ? 'Checking...' : 'Check Updates'}</span>
          </button>
        }
      >
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            padding: '12px 0',
          }}
        >
          <div>
            Engine: <code style={{ color: 'var(--text-primary)' }}>Terminal Manager Core Engine</code>
          </div>
          <div>
            Build Signature:{' '}
            <code style={{ color: 'var(--text-primary)' }}>{status?.repoHash || 'v1.0.0'}</code> (
            {status?.repoDate || 'Production'})
          </div>
          {status?.measuredLoadTimeMs && (
            <div>
              Measured Startup Overhead:{' '}
              <code style={{ color: 'var(--text-primary)' }}>{status.measuredLoadTimeMs} ms</code>
            </div>
          )}
        </div>

        {updateLog.length > 0 && (
          <div
            style={{
              padding: 12,
              background: 'var(--bg-base)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 6,
              fontSize: 12,
              fontFamily: 'var(--font-terminal)',
              color: 'var(--text-secondary)',
              marginTop: 8,
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
              Sync Log:
            </div>
            {updateLog.map((line, idx) => (
              <div key={idx}>{line}</div>
            ))}
          </div>
        )}

        {onGlyphTest && (
          <div style={{ marginTop: 12 }}>
            <button className={layoutStyles.btnSecondary} onClick={onGlyphTest}>
              <Play size={13} />
              <span>Run Glyph & Nerd Font Test</span>
            </button>
          </div>
        )}
      </SettingsSection>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--backdrop-dialog)',
            backdropFilter: 'blur(var(--blur-dialog))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: 460,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              borderRadius: 6,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)' }}>
              Confirm Installation
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
              Terminal Manager will execute the following install command in PowerShell:
            </p>
            <div
              style={{
                padding: 12,
                background: 'var(--bg-base)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 6,
                fontFamily: 'var(--font-terminal)',
                fontSize: 12,
                color: 'var(--text-primary)',
                wordBreak: 'break-all',
              }}
            >
              {confirmModal.command}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                className={layoutStyles.btnSecondary}
                onClick={() => setConfirmModal(null)}
              >
                Cancel
              </button>
              <button className={layoutStyles.btnPrimary} onClick={confirmAndInstall}>
                Confirm & Run
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
