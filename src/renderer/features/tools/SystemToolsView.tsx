import React, { useEffect, useState } from 'react';
import {
  Wrench,
  Shield,
  Play,
  Sliders,
  RefreshCw,
  GitBranch,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Terminal,
} from 'lucide-react';
import {
  SystemToolsStatus,
  BuildProgressEvent,
  LaunchToolsArgs,
} from '../../../shared/toolsTypes';
import { AdminHelperStatus } from '../../../shared/adminTypes';
import { ConfirmLaunchModal } from './ConfirmLaunchModal';
import { ThirdPartyLicensesModal } from './ThirdPartyLicensesModal';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import styles from './SystemTools.module.css';

export const SystemToolsView: React.FC = () => {
  const { setActiveNavTab } = useWorkspaceStore();
  const [status, setStatus] = useState<SystemToolsStatus | null>(null);
  const [adminStatus, setAdminStatus] = useState<AdminHelperStatus | null>(null);
  const [progressEvent, setProgressEvent] = useState<BuildProgressEvent | null>(null);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isLicensesOpen, setIsLicensesOpen] = useState(false);
  const [launchError, setLaunchError] = useState<{ message: string; fixSuggestion?: string } | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);

  const loadStatus = async () => {
    try {
      if (window.api?.tools) {
        const s = await window.api.tools.getStatus();
        setStatus(s);
      }
      if (window.api?.admin) {
        const a = await window.api.admin.getStatus();
        setAdminStatus(a);
      }
    } catch (e) {
      console.error('Failed to load tools status:', e);
    }
  };

  useEffect(() => {
    loadStatus();

    let cleanupProgress: (() => void) | undefined;
    if (window.api?.tools?.onBuildProgress) {
      cleanupProgress = window.api.tools.onBuildProgress((evt) => {
        setProgressEvent(evt);
        if (evt.state === 'running') setIsBuilding(true);
        if (evt.state === 'done' || evt.state === 'error') {
          setIsBuilding(false);
          loadStatus();
        }
      });
    }

    return () => {
      if (cleanupProgress) cleanupProgress();
    };
  }, []);

  const handleLaunchClick = () => {
    setLaunchError(null);
    setIsConfirmOpen(true);
  };

  const handleConfirmLaunch = async (args: LaunchToolsArgs) => {
    setIsConfirmOpen(false);
    try {
      if (window.api?.tools) {
        const res = await window.api.tools.launch(args);
        if (!res.success) {
          setLaunchError({
            message: res.error || 'Failed to launch System Tools',
            fixSuggestion: res.fixSuggestion,
          });
        }
      }
    } catch (err: any) {
      setLaunchError({ message: err.message || 'Launch error' });
    }
  };

  const handleUpdateUpstream = async () => {
    try {
      if (window.api?.tools) {
        await window.api.tools.update();
        await loadStatus();
      }
    } catch (e) {
      console.error('Update failed:', e);
    }
  };

  const handleReconnectAdmin = async () => {
    try {
      if (window.api?.admin) {
        await window.api.admin.connect();
        const a = await window.api.admin.getStatus();
        setAdminStatus(a);
      }
    } catch (e) {
      console.error('Admin reconnect failed:', e);
    }
  };

  const handlePinToggle = async () => {
    if (!status) return;
    try {
      if (window.api?.tools) {
        const nextRef = status.isPinned ? null : status.upstreamCommitHash || 'main';
        const nextStatus = await window.api.tools.pin(nextRef);
        setStatus(nextStatus);
      }
    } catch (e) {
      console.error('Pin toggle error:', e);
    }
  };

  const isWindows = window.api?.platform === 'win32' || window.api?.isE2E;

  if (!isWindows) {
    return (
      <div className={styles.container}>
        <div className={styles.warningBanner}>
          <AlertTriangle size={20} />
          <span>System Tools is a Windows-only feature.</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerCard}>
        <div className={styles.headerTitle}>
          <Wrench size={28} color="#6C8CFF" />
          <div>
            <h2>System Tools</h2>
            <p>Windows Maintenance & Optimization Utility (MIT License)</p>
            {status?.toolsDir && (
              <p style={{ fontSize: 11, color: '#6C8CFF', marginTop: 2, fontFamily: 'monospace' }}>
                UserData Path: {status.toolsDir}
              </p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className={styles.actionButton}
            onClick={() => setActiveNavTab('customize-tools')}
          >
            <Sliders size={16} />
            <span>Customize</span>
          </button>

          <button
            className={styles.launchButton}
            onClick={handleLaunchClick}
            disabled={isBuilding}
          >
            <Play size={18} />
            <span>Launch Tools</span>
          </button>
        </div>
      </div>

      {/* Progress banner */}
      {progressEvent && progressEvent.state === 'running' && (
        <div className={styles.progressBox}>
          <RefreshCw size={16} className="spin" />
          <span>
            [{progressEvent.step.toUpperCase()}] {progressEvent.label}{' '}
            {progressEvent.detail ? `(${progressEvent.detail})` : ''}
          </span>
        </div>
      )}

      {/* Launch Failure Error Card */}
      {launchError && (
        <div className={styles.card} style={{ borderColor: '#EF4444' }}>
          <div className={styles.cardHeader} style={{ color: '#F87171' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={18} />
              <span>Launch Failed</span>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: '#FCA5A5' }}>{launchError.message}</p>
          {launchError.fixSuggestion && (
            <p style={{ margin: 0, fontSize: 12, color: '#FBBF24' }}>
              <strong>Fix suggestion:</strong> {launchError.fixSuggestion}
            </p>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button className={styles.actionButton} onClick={handleLaunchClick}>
              <RefreshCw size={14} />
              <span>Retry</span>
            </button>            <button
              className={styles.actionButton}
              onClick={() => setActiveNavTab('terminals')}
            >
              <Terminal size={14} />
              <span>Open Normal Terminal Instead</span>
            </button>
          </div>
        </div>
      )}

      {/* Status Grid */}
      <div className={styles.statusGrid}>
        {/* Upstream Repo Status */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span>Upstream Repository</span>
            <GitBranch size={16} color="#6C8CFF" />
          </div>

          <div className={styles.cardRow}>
            <span className={styles.label}>Commit Hash</span>
            <span className={styles.value}>{status?.upstreamCommitHash || 'main-latest'}</span>
          </div>

          <div className={styles.cardRow}>
            <span className={styles.label}>Commit Date</span>
            <span className={styles.value}>{status?.upstreamCommitDate || 'Latest'}</span>
          </div>

          <div className={styles.cardRow}>
            <span className={styles.label}>Pin Status</span>
            {status?.isPinned ? (
              <span className={`${styles.badge} ${styles.badgeGreen}`}>Pinned ({status.pinnedRef})</span>
            ) : (
              <span className={`${styles.badge} ${styles.badgeAmber}`}>
                <AlertTriangle size={11} style={{ display: 'inline', marginRight: 4 }} />
                Floating main (Unpinned)
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button className={styles.actionButton} onClick={handleUpdateUpstream}>
              <RefreshCw size={12} />
              <span>Check Updates (git pull)</span>
            </button>
            <button className={styles.actionButton} onClick={handlePinToggle}>
              <span>{status?.isPinned ? 'Unpin' : 'Pin Commit'}</span>
            </button>
          </div>
        </div>

        {/* Compiled Build Status */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span>Compiled Script (winutil.ps1)</span>
            <CheckCircle2 size={16} color="#4ADE80" />
          </div>

          <div className={styles.cardRow}>
            <span className={styles.label}>Script SHA-256</span>
            <span className={styles.value} style={{ fontSize: 11, fontFamily: 'monospace' }}>
              {status?.buildScriptHash ? `${status.buildScriptHash.substring(0, 16)}...` : 'Not built yet'}
            </span>
          </div>

          <div className={styles.cardRow}>
            <span className={styles.label}>Patches Applied</span>
            <span className={styles.value}>{status?.patches?.length || 0} patch(es)</span>
          </div>

          <div className={styles.cardRow}>
            <span className={styles.label}>Forbidden Link Scan</span>
            <span className={`${styles.badge} ${status?.forbiddenScanClean ? styles.badgeGreen : styles.badgeRed}`}>
              {status?.forbiddenScanClean ? 'Clean (0 matches)' : 'Match detected'}
            </span>
          </div>
        </div>

        {/* Admin Helper Process */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span>Admin Helper Process</span>
            <Shield size={16} color="#F59E0B" />
          </div>

          <div className={styles.cardRow}>
            <span className={styles.label}>Connection State</span>
            <span
              className={`${styles.badge} ${
                adminStatus?.state === 'connected'
                  ? styles.badgeGreen
                  : adminStatus?.state === 'starting'
                  ? styles.badgeAmber
                  : styles.badgeRed
              }`}
            >
              {adminStatus?.state || 'disconnected'}
            </span>
          </div>

          <div className={styles.cardRow}>
            <span className={styles.label}>Security ACL</span>
            <span className={styles.value}>User SID + Token Handshake</span>
          </div>

          {adminStatus?.state === 'disconnected' && (
            <button className={styles.actionButton} onClick={handleReconnectAdmin} style={{ marginTop: 8 }}>
              <RefreshCw size={12} />
              <span>Admin Session Ended - Reconnect</span>
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <span>WinUtil by Chris Titus Tech (MIT License, Copyright 2022 CT Tech Group LLC)</span>
        <span className={styles.link} onClick={() => setIsLicensesOpen(true)}>
          <FileText size={12} style={{ display: 'inline', marginRight: 4 }} />
          Third-party licenses
        </span>
      </div>

      {/* Modals */}
      <ConfirmLaunchModal
        isOpen={isConfirmOpen}
        status={status}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmLaunch}
      />

      <ThirdPartyLicensesModal
        isOpen={isLicensesOpen}
        onClose={() => setIsLicensesOpen(false)}
      />
    </div>
  );
};
