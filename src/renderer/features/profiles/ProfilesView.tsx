import React, { useState, useEffect, useMemo } from 'react';
import {
  Terminal,
  Plus,
  RefreshCw,
  Copy,
  Trash2,
  Play,
  Star,
  Shield,
  Code,
  Cpu,
  Box,
  Server,
  Command,
  Check,
  Search,
  Settings,
} from 'lucide-react';
import { TerminalProfile } from '../../../shared/types';
import { useProfilesStore } from '../../store/useProfilesStore';
import { useWorkspaceStore } from '../layout/useWorkspaceStore';
import { useWorkspaceStore as useUIWorkspaceStore } from '../../store/useWorkspaceStore';
import styles from './ProfilesView.module.css';

const ICON_OPTIONS = [
  { id: 'terminal', label: 'Terminal', icon: Terminal },
  { id: 'command', label: 'Command', icon: Command },
  { id: 'code', label: 'Code', icon: Code },
  { id: 'cpu', label: 'CPU', icon: Cpu },
  { id: 'box', label: 'Container', icon: Box },
  { id: 'server', label: 'Server', icon: Server },
  { id: 'shield', label: 'Shield', icon: Shield },
];

const PRESET_COLORS = [
  '#6C8CFF', // Indigo / Brand Primary
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Crimson
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#EC4899', // Pink
  '#64748B', // Slate
];

export const ProfilesView: React.FC = () => {
  const {
    profiles,
    selectedProfileId,
    isDetecting,
    loadProfiles,
    setSelectedProfileId,
    saveProfile,
    setDefaultProfile,
    deleteProfile,
    duplicateProfile,
    detectShells,
    createNewProfile,
  } = useProfilesStore();

  const { newTab } = useWorkspaceStore();
  const { setActiveNavTab } = useUIWorkspaceStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const activeProfile = useMemo(() => {
    return profiles.find((p) => p.id === selectedProfileId) || profiles[0] || null;
  }, [profiles, selectedProfileId]);

  const filteredProfiles = useMemo(() => {
    if (!searchQuery.trim()) return profiles;
    const q = searchQuery.toLowerCase();
    return profiles.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.shellPath.toLowerCase().includes(q) ||
        (p.tabTitle && p.tabTitle.toLowerCase().includes(q))
    );
  }, [profiles, searchQuery]);

  const handleFieldChange = (field: keyof TerminalProfile, value: any) => {
    if (!activeProfile) return;
    const updated: TerminalProfile = {
      ...activeProfile,
      [field]: value,
    };
    saveProfile(updated);
    showSavedIndicator();
  };

  const handleArgsChange = (raw: string) => {
    if (!activeProfile) return;
    const args = raw
      .split(' ')
      .map((s) => s.trim())
      .filter(Boolean);
    handleFieldChange('shellArgs', args);
  };

  const handleEnvChange = (key: string, value: string) => {
    if (!activeProfile) return;
    const env = { ...(activeProfile.env || {}) };
    env[key] = value;
    handleFieldChange('env', env);
  };

  const handleAddEnv = () => {
    if (!activeProfile) return;
    const env = { ...(activeProfile.env || {}) };
    const defaultKey = `VAR_${Object.keys(env).length + 1}`;
    env[defaultKey] = '';
    handleFieldChange('env', env);
  };

  const handleDeleteEnv = (key: string) => {
    if (!activeProfile) return;
    const env = { ...(activeProfile.env || {}) };
    delete env[key];
    handleFieldChange('env', env);
  };

  const showSavedIndicator = () => {
    setSaveStatus('Saved');
    setTimeout(() => {
      setSaveStatus(null);
    }, 1800);
  };

  const handleLaunch = (profileId: string) => {
    newTab(undefined, undefined, profileId);
    setActiveNavTab('terminals');
  };

  const renderIcon = (iconName?: string, size = 16, color?: string) => {
    const found = ICON_OPTIONS.find((o) => o.id === iconName);
    const IconComp = found ? found.icon : Terminal;
    return <IconComp size={size} color={color} />;
  };

  return (
    <div className={styles.container}>
      {/* 1. Left Sidebar List Column */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarTitleRow}>
            <h3 className={styles.sidebarTitle}>
              <Settings size={16} />
              Profiles
              <span className={styles.countText}>({profiles.length})</span>
            </h3>
          </div>
          <div className={styles.sidebarActions}>
            <button
              className={styles.btnIconOnly}
              onClick={() => detectShells()}
              disabled={isDetecting}
              title="Detect installed shells on system (WSL, Git Bash, PowerShell, CMD)"
            >
              <RefreshCw size={16} className={isDetecting ? 'animate-spin' : ''} />
            </button>
            <button
              className={styles.btnPrimary}
              onClick={() => createNewProfile()}
              title="Add a new terminal profile"
            >
              <Plus size={16} />
              New
            </button>
          </div>
        </div>

        <div className={styles.searchContainer}>
          <Search size={14} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Filter profiles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.profileList}>
          {filteredProfiles.map((p) => {
            const isSelected = activeProfile?.id === p.id;
            return (
              <div
                key={p.id}
                className={`${styles.profileItem} ${isSelected ? styles.profileItemActive : ''}`}
                onClick={() => setSelectedProfileId(p.id)}
              >
                <div className={styles.profileItemLeft}>
                  <div
                    className={styles.profileColorDot}
                    style={{ backgroundColor: p.color || '#6C8CFF' }}
                  />
                  {renderIcon(p.icon, 16, isSelected ? '#6C8CFF' : '#8A99AD')}
                  <div className={styles.profileItemMeta}>
                    <div className={styles.profileItemName}>{p.name}</div>
                    <span className={styles.profileItemSub}>
                      {p.shellPath.split('\\').pop() || p.shellPath}
                    </span>
                  </div>
                </div>

                {p.isDefault && <span className={styles.defaultPill}>Default</span>}

                <button
                  className={styles.itemQuickLaunch}
                  title={`Launch ${p.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLaunch(p.id);
                  }}
                >
                  <Play size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Right Detail Column */}
      {activeProfile ? (
        <div className={styles.detailArea}>
          <div className={styles.detailHeader}>
            <div className={styles.detailTitleRow}>
              <div
                className={styles.detailIconBox}
                style={{
                  backgroundColor: `${activeProfile.color || '#6C8CFF'}20`,
                  border: `1px solid ${activeProfile.color || '#6C8CFF'}40`,
                }}
              >
                {renderIcon(activeProfile.icon, 20, activeProfile.color || '#6C8CFF')}
              </div>
              <div className={styles.detailTitleTextGroup}>
                <h2 className={styles.detailTitle}>{activeProfile.name}</h2>
                <p className={styles.detailSubtitle}>
                  {activeProfile.shellPath} {activeProfile.isDefault ? '• Default Terminal Profile' : ''}
                </p>
              </div>
            </div>

            <div className={styles.detailToolbar}>
              {saveStatus && (
                <span className={styles.saveNotice}>
                  <Check size={14} /> {saveStatus}
                </span>
              )}

              <button
                className={styles.btnPrimary}
                onClick={() => handleLaunch(activeProfile.id)}
                title="Launch a new tab with this profile"
              >
                <Play size={16} />
                Launch Tab
              </button>

              {!activeProfile.isDefault && (
                <button
                  className={styles.btnSecondary}
                  onClick={() => setDefaultProfile(activeProfile.id)}
                  title="Make this profile the default terminal"
                >
                  <Star size={16} />
                  Set Default
                </button>
              )}

              <button
                className={styles.btnSecondary}
                onClick={() => duplicateProfile(activeProfile.id)}
                title="Create a copy of this profile"
              >
                <Copy size={16} />
                Duplicate
              </button>

              <button
                className={styles.btnDanger}
                disabled={activeProfile.isDefault || profiles.length <= 1}
                onClick={() => {
                  if (confirm(`Delete profile "${activeProfile.name}"?`)) {
                    deleteProfile(activeProfile.id);
                  }
                }}
                title={
                  activeProfile.isDefault
                    ? 'Cannot delete default profile'
                    : 'Delete this profile'
                }
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>

          <div className={styles.detailBody}>
            <div className={styles.formContentWrapper}>
              {/* Section 1: General Details */}
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h4 className={styles.sectionTitle}>General Details</h4>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Profile Name</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={activeProfile.name}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Tab Title Override</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="e.g. PowerShell or Workspace"
                      value={activeProfile.tabTitle || ''}
                      onChange={(e) => handleFieldChange('tabTitle', e.target.value)}
                    />
                    <span className={styles.fieldHint}>Leave blank to use profile name</span>
                  </div>
                </div>

                <div className={styles.toggleRow}>
                  <div className={styles.toggleLabel}>
                    <span className={styles.toggleTitle}>Run as Administrator</span>
                    <span className={styles.toggleSub}>
                      Attempt to elevate shell permissions when spawned on Windows
                    </span>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={!!activeProfile.elevate}
                      onChange={(e) => handleFieldChange('elevate', e.target.checked)}
                    />
                    <span className={styles.slider} />
                  </label>
                </div>
              </div>

              {/* Section 2: Appearance & Branding */}
              <div className={`${styles.section} ${styles.sectionDivider}`}>
                <div className={styles.sectionHeader}>
                  <h4 className={styles.sectionTitle}>Appearance & Branding</h4>
                </div>

                <div className={styles.formGroupFull}>
                  <label className={styles.label}>Accent Color</label>
                  <div className={styles.colorPickerRow}>
                    {PRESET_COLORS.map((c) => (
                      <div
                        key={c}
                        className={`${styles.colorSwatch} ${
                          activeProfile.color === c ? styles.colorSwatchActive : ''
                        }`}
                        style={{ backgroundColor: c }}
                        onClick={() => handleFieldChange('color', c)}
                      />
                    ))}
                    <input
                      type="text"
                      className={styles.hexInput}
                      value={activeProfile.color || '#6C8CFF'}
                      onChange={(e) => handleFieldChange('color', e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.formGroupFull}>
                  <label className={styles.label}>Profile Icon</label>
                  <div className={styles.iconSelectorRow}>
                    {ICON_OPTIONS.map((item) => {
                      const isSelected = (activeProfile.icon || 'terminal') === item.id;
                      const IconComp = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`${styles.iconChip} ${
                            isSelected ? styles.iconChipActive : ''
                          }`}
                          onClick={() => handleFieldChange('icon', item.id)}
                        >
                          <IconComp size={16} />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Custom Font Family</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="e.g. Cascadia Code, JetBrains Mono"
                      value={activeProfile.fontFamily || ''}
                      onChange={(e) => handleFieldChange('fontFamily', e.target.value)}
                    />
                    <span className={styles.fieldHint}>Optional override</span>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Custom Font Size (px)</label>
                    <input
                      type="number"
                      min={10}
                      max={32}
                      className={styles.input}
                      placeholder="14"
                      value={activeProfile.fontSize || ''}
                      onChange={(e) =>
                        handleFieldChange(
                          'fontSize',
                          e.target.value ? parseInt(e.target.value, 10) : undefined
                        )
                      }
                    />
                    <span className={styles.fieldHint}>Default: 14</span>
                  </div>
                </div>
              </div>

              {/* Section 3: Command & Execution */}
              <div className={`${styles.section} ${styles.sectionDivider}`}>
                <div className={styles.sectionHeader}>
                  <h4 className={styles.sectionTitle}>Command & Execution</h4>
                </div>

                <div className={styles.formGroupFull}>
                  <label className={styles.label}>Shell Executable Path</label>
                  <input
                    type="text"
                    className={`${styles.input} ${styles.inputMono}`}
                    placeholder="e.g. powershell.exe, cmd.exe, wsl.exe, or C:\Program Files\Git\bin\bash.exe"
                    value={activeProfile.shellPath}
                    onChange={(e) => handleFieldChange('shellPath', e.target.value)}
                  />
                </div>

                <div className={styles.formGroupFull}>
                  <label className={styles.label}>Command Arguments</label>
                  <input
                    type="text"
                    className={`${styles.input} ${styles.inputMono}`}
                    placeholder="e.g. -NoLogo -NoExit"
                    value={(activeProfile.shellArgs || []).join(' ')}
                    onChange={(e) => handleArgsChange(e.target.value)}
                  />
                  <span className={styles.fieldHint}>Space-separated</span>
                </div>

                <div className={styles.formGroupFull}>
                  <label className={styles.label}>Starting Directory (CWD)</label>
                  <input
                    type="text"
                    className={`${styles.input} ${styles.inputMono}`}
                    placeholder="e.g. C:\Projects or %USERPROFILE%"
                    value={activeProfile.cwd || ''}
                    onChange={(e) => handleFieldChange('cwd', e.target.value)}
                  />
                  <span className={styles.fieldHint}>Leave blank for user home directory</span>
                </div>
              </div>

              {/* Section 4: Environment Variables */}
              <div className={`${styles.section} ${styles.sectionDivider}`}>
                <div className={styles.envHeaderGroup}>
                  <div className={styles.envHeaderLeft}>
                    <h4 className={styles.sectionTitle}>Environment Variables</h4>
                    <p className={styles.sectionDesc}>
                      Custom environment variables injected into this shell session on launch
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={handleAddEnv}
                  >
                    <Plus size={16} />
                    Add Variable
                  </button>
                </div>

                <div className={styles.envTable}>
                  {Object.entries(activeProfile.env || {}).map(([key, val]) => (
                    <div key={key} className={styles.envRow}>
                      <input
                        type="text"
                        className={`${styles.input} ${styles.inputMono}`}
                        placeholder="KEY"
                        value={key}
                        onChange={(e) => {
                          const newKey = e.target.value;
                          if (!newKey) return;
                          const env = { ...(activeProfile.env || {}) };
                          const oldVal = env[key];
                          delete env[key];
                          env[newKey] = oldVal || '';
                          handleFieldChange('env', env);
                        }}
                      />
                      <input
                        type="text"
                        className={`${styles.input} ${styles.inputMono}`}
                        placeholder="VALUE"
                        value={val || ''}
                        onChange={(e) => handleEnvChange(key, e.target.value)}
                      />
                      <button
                        type="button"
                        className={styles.btnDeleteRow}
                        onClick={() => handleDeleteEnv(key)}
                        title="Remove variable"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}

                  {Object.keys(activeProfile.env || {}).length === 0 && (
                    <div className={styles.envEmptyState}>
                      No custom environment variables defined for this profile.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.emptyState}>
          <Terminal className={styles.emptyStateIcon} />
          <p className={styles.emptyStateText}>No profile selected. Choose one or create a new profile.</p>
          <button className={styles.btnPrimary} onClick={() => createNewProfile()}>
            <Plus size={16} /> Create Profile
          </button>
        </div>
      )}
    </div>
  );
};
