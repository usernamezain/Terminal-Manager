import React, { useState, useEffect, useMemo } from 'react';
import {
  Bot,
  RefreshCw,
  Plus,
  Play,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  Folder,
  Download,
  Key,
  Trash2,
  Search,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { useAgentsStore } from './useAgentsStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { AgentWithState, AgentLaunchMode, CustomAgentInput, parseArgsString } from '../../../shared/agentTypes';
import styles from './AgentsView.module.css';

export const AgentsView: React.FC = () => {
  const {
    agents,
    prerequisites,
    selectedAgentId,
    filter,
    searchQuery,
    selectedNotInstalledIds,
    isScanning,
    isPrereqsCollapsed,
    isCustomAgentModalOpen,
    dangerousConfirm,
    agentEnvMasked,
    isEncryptionAvailable,

    loadAgents,
    loadPrerequisites,
    setSelectedAgentId,
    setFilter,
    setSearchQuery,
    toggleSelectNotInstalled,
    selectAllNotInstalled,
    clearSelectedNotInstalled,
    togglePrereqsCollapsed,
    setCustomAgentModalOpen,
    setDangerousConfirm,

    launchAgent,
    installAgent,
    updateAgent,
    uninstallAgent,
    installPrerequisite,
    addToPath,
    saveCustomAgent,
    deleteCustomAgent,
    saveAgentEnv,
    installSelectedAgents,
  } = useAgentsStore();

  const { activePaneId, panes } = useWorkspaceStore();

  // Active terminal's CWD as default
  const activeTerminalCwd = useMemo(() => {
    if (activePaneId && panes[activePaneId]) {
      return panes[activePaneId]?.cwd || '~';
    }
    return '~';
  }, [activePaneId, panes]);

  // Form states for Launch
  const [targetFolder, setTargetFolder] = useState<string>('');
  const [launchMode, setLaunchMode] = useState<AgentLaunchMode>('tab');
  const [extraArgsInput, setExtraArgsInput] = useState<string>('');
  const [resumeSession, setResumeSession] = useState<boolean>(false);
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Environment variables local form
  const [envKey, setEnvKey] = useState<string>('');
  const [envValue, setEnvValue] = useState<string>('');
  const [envStatusNotice, setEnvStatusNotice] = useState<string | null>(null);

  // Custom agent local modal state
  const [customName, setCustomName] = useState<string>('');
  const [customCommand, setCustomCommand] = useState<string>('');
  const [customInstallCmd, setCustomInstallCmd] = useState<string>('');
  const [customShell, setCustomShell] = useState<'powershell' | 'cmd'>('powershell');
  const [customSignIn, setCustomSignIn] = useState<string>('');
  const [customDocs, setCustomDocs] = useState<string>('');
  const [customLaunchArgs, setCustomLaunchArgs] = useState<string>('');

  const resetCustomModalForm = () => {
    setCustomName('');
    setCustomCommand('');
    setCustomInstallCmd('');
    setCustomShell('powershell');
    setCustomSignIn('');
    setCustomDocs('');
    setCustomLaunchArgs('');
  };

  useEffect(() => {
    loadAgents();
    loadPrerequisites();
  }, [loadAgents, loadPrerequisites]);

  const activeAgent = useMemo(() => {
    return agents.find((a) => a.entry.id === selectedAgentId) || agents[0] || null;
  }, [agents, selectedAgentId]);

  // Initialize selected method when activeAgent changes
  useEffect(() => {
    if (activeAgent) {
      const rec =
        activeAgent.entry.installMethods.find((m) => m.recommended) ||
        activeAgent.entry.installMethods[0];
      setSelectedMethodId(rec?.id || '');
    }
  }, [activeAgent]);

  // Filtered agent list
  const filteredAgents = useMemo(() => {
    return agents.filter((item) => {
      // Legacy filter check
      if (item.entry.status === 'legacy' && item.state.status === 'not_installed') {
        return false;
      }

      // Segment filter
      if (filter === 'installed' && item.state.status !== 'installed') {
        return false;
      }
      if (filter === 'not_installed' && item.state.status === 'installed') {
        return false;
      }

      // Query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.entry.name.toLowerCase().includes(q) ||
        item.entry.command.toLowerCase().includes(q) ||
        item.entry.vendor.toLowerCase().includes(q) ||
        item.entry.description.toLowerCase().includes(q)
      );
    });
  }, [agents, filter, searchQuery]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleBrowseFolder = async () => {
    try {
      const selected = await window.api?.system?.openFolderPicker?.();
      if (selected) {
        setTargetFolder(selected);
      }
    } catch {}
  };

  const handleLaunch = async (confirmedDangerous = false) => {
    if (!activeAgent) return;
    const finalCwd = targetFolder.trim() || activeTerminalCwd;
    const extraArgs = parseArgsString(extraArgsInput);

    await launchAgent({
      agentId: activeAgent.entry.id,
      cwd: finalCwd,
      mode: launchMode,
      extraArgs,
      resume: resumeSession,
      sessionId: activePaneId,
      confirmedDangerous,
    });
  };

  const handleSaveEnvVar = async () => {
    if (!activeAgent || !envKey.trim() || !envValue.trim()) return;
    const updated = {
      ...agentEnvMasked,
      [envKey.trim()]: envValue.trim(),
    };
    const res = await saveAgentEnv(activeAgent.entry.id, updated);
    if (res.success) {
      setEnvKey('');
      setEnvValue('');
      setEnvStatusNotice('Secret securely encrypted and saved.');
      setTimeout(() => setEnvStatusNotice(null), 3000);
    }
  };

  const handleDeleteEnvVar = async (keyToDelete: string) => {
    if (!activeAgent) return;
    const updated = { ...agentEnvMasked };
    delete updated[keyToDelete];
    await saveAgentEnv(activeAgent.entry.id, updated);
  };

  const handleCreateCustom = async () => {
    if (!customName.trim() || !customCommand.trim()) return;
    const input: CustomAgentInput = {
      name: customName.trim(),
      command: customCommand.trim(),
      installCommand: customInstallCmd.trim() || undefined,
      installShell: customShell,
      signInNote: customSignIn.trim() || undefined,
      docsUrl: customDocs.trim() || undefined,
      defaultArgs: customLaunchArgs.trim() || undefined,
    };
    const res = await saveCustomAgent(input);
    if (res?.success) {
      resetCustomModalForm();
    }
  };

  const renderStatusDot = (status: string) => {
    switch (status) {
      case 'installed':
        return <span className={`${styles.statusDot} ${styles.statusDotInstalled}`} />;
      case 'not_on_path':
        return <span className={`${styles.statusDot} ${styles.statusDotOffPath}`} />;
      case 'broken':
        return <span className={`${styles.statusDot} ${styles.statusDotBroken}`} />;
      case 'wsl_only':
        return <span className={`${styles.statusDot} ${styles.statusDotWsl}`} />;
      default:
        return <span className={`${styles.statusDot} ${styles.statusDotNotInstalled}`} />;
    }
  };

  const getStatusLabel = (item: AgentWithState) => {
    switch (item.state.status) {
      case 'installed':
        return item.state.version && item.state.version !== 'unknown'
          ? item.state.version
          : 'Installed';
      case 'not_on_path':
        return 'Not on PATH';
      case 'broken':
        return 'Broken';
      case 'wsl_only':
        return 'WSL Only';
      default:
        return 'Not installed';
    }
  };

  return (
    <div className={styles.container}>
      {/* 1. Left Column (280px) */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarTitleRow}>
            <h3 className={styles.sidebarTitle}>
              <Bot size={16} />
              AI Agents
              <span className={styles.countText}>({agents.length})</span>
            </h3>
          </div>
          <div className={styles.sidebarActions} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={() => useWorkspaceStore.getState().openDocs('ai-agents')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent)',
                fontSize: 12,
                cursor: 'pointer',
                padding: '2px 6px',
                textDecoration: 'underline',
              }}
              title="Read AI Agents documentation"
            >
              Learn more
            </button>
            <button
              className={styles.btnIconOnly}
              onClick={() => loadAgents(true)}
              disabled={isScanning}
              title="Rescan installed AI agents"
            >
              <RefreshCw size={14} className={isScanning ? 'animate-spin' : ''} />
            </button>
            <button
              className={styles.btnIconOnly}
              onClick={() => setCustomAgentModalOpen(true)}
              title="Add Custom Agent"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Collapsible Prerequisites Table */}
        <div className={styles.prereqsBanner}>
          <div className={styles.prereqsHeader} onClick={togglePrereqsCollapsed}>
            <span>System Prerequisites</span>
            {isPrereqsCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          </div>
          {!isPrereqsCollapsed && (
            <div className={styles.prereqsList}>
              {prerequisites.map((p) => (
                <div key={p.id} className={styles.prereqRow}>
                  <div className={styles.prereqMeta}>
                    <span className={p.installed ? styles.statusDotInstalled : styles.statusDotNotInstalled} style={{ width: 6, height: 6, borderRadius: '50%' }} />
                    <span className={styles.prereqName}>{p.name}</span>
                    {p.version && <span className={styles.prereqVersion}>{p.version}</span>}
                  </div>
                  <div>
                    {!p.installed && p.wingetId ? (
                      <button
                        className={styles.prereqAction}
                        onClick={() => installPrerequisite(p.id)}
                        title={`Install ${p.name} via WinGet`}
                      >
                        Install
                      </button>
                    ) : !p.installed && p.installUrl ? (
                      <button
                        className={styles.prereqAction}
                        onClick={() => window.open(p.installUrl, '_blank')}
                        title={`Open official install page for ${p.name}`}
                      >
                        Get
                      </button>
                    ) : (
                      <Check size={12} style={{ color: '#10b981' }} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Segmented Filter Control */}
        <div className={styles.segmentRow}>
          <button
            className={`${styles.segmentBtn} ${filter === 'all' ? styles.segmentBtnActive : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`${styles.segmentBtn} ${filter === 'installed' ? styles.segmentBtnActive : ''}`}
            onClick={() => setFilter('installed')}
          >
            Installed
          </button>
          <button
            className={`${styles.segmentBtn} ${filter === 'not_installed' ? styles.segmentBtnActive : ''}`}
            onClick={() => setFilter('not_installed')}
          >
            Not installed
          </button>
        </div>

        {/* Search */}
        <div className={styles.searchContainer}>
          <Search size={14} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Filter agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Multi-Select Install Bar (Visible in Not installed tab) */}
        {filter === 'not_installed' && (
          <div className={styles.multiSelectBar}>
            <div>
              <button
                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 11 }}
                onClick={selectAllNotInstalled}
              >
                Select all
              </button>
              {' • '}
              <button
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11 }}
                onClick={clearSelectedNotInstalled}
              >
                None
              </button>
            </div>
            <button
              className={styles.batchInstallBtn}
              disabled={selectedNotInstalledIds.length === 0}
              onClick={installSelectedAgents}
            >
              Install selected ({selectedNotInstalledIds.length})
            </button>
          </div>
        )}

        {/* Agent List */}
        <div className={styles.agentList}>
          {filteredAgents.map((item) => {
            const isSelected = activeAgent?.entry.id === item.entry.id;
            const isInstalled = item.state.status === 'installed';
            const isChecked = selectedNotInstalledIds.includes(item.entry.id);

            return (
              <div
                key={item.entry.id}
                className={`${styles.agentItem} ${isSelected ? styles.agentItemActive : ''}`}
                onClick={() => setSelectedAgentId(item.entry.id)}
              >
                {filter === 'not_installed' && (
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleSelectNotInstalled(item.entry.id)}
                    style={{ marginRight: 4 }}
                  />
                )}

                <div className={styles.agentItemLeft}>
                  <div className={styles.agentIconSlot}>
                    <Bot size={14} />
                  </div>
                  <div className={styles.agentMeta}>
                    <div className={styles.agentNameRow}>
                      <span className={styles.agentName}>{item.entry.name}</span>
                      {item.entry.isCustom && <span className={styles.customBadge}>Custom</span>}
                    </div>
                    <div className={styles.agentStatusText}>
                      {renderStatusDot(item.state.status)}
                      <span>{getStatusLabel(item)}</span>
                    </div>
                  </div>
                </div>

                {isInstalled && (
                  <button
                    className={styles.itemQuickLaunch}
                    title={`Launch ${item.entry.name} in current terminal`}
                    onClick={(e) => {
                      e.stopPropagation();
                      launchAgent({
                        agentId: item.entry.id,
                        cwd: activeTerminalCwd,
                        mode: 'tab',
                      });
                    }}
                  >
                    <Play size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Right Detail Column */}
      {activeAgent ? (
        <div className={styles.detailArea}>
          {/* Header */}
          <div className={styles.detailHeader}>
            <div className={styles.detailTitleRow}>
              <div className={styles.detailIconBox}>
                <Bot size={22} />
              </div>
              <div className={styles.detailTitleTextGroup}>
                <h2 className={styles.detailTitle}>{activeAgent.entry.name}</h2>
                <div className={styles.detailSubtitle}>
                  <span>{activeAgent.entry.vendor}</span>
                  <span>•</span>
                  <span>Command: <code>{activeAgent.entry.command}</code></span>
                  {activeAgent.state.version && activeAgent.state.version !== 'unknown' && (
                    <>
                      <span>•</span>
                      <span>v{activeAgent.state.version}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.detailToolbar}>
              {activeAgent.state.status === 'installed' ? (
                <>
                  <button
                    className={styles.btnPrimary}
                    onClick={() => handleLaunch()}
                    title="Launch agent in chosen folder"
                  >
                    <Play size={14} /> Launch
                  </button>
                  {activeAgent.entry.updateCommand && (
                    <button
                      className={styles.btnSecondary}
                      onClick={() => updateAgent(activeAgent.entry.id)}
                      title="Run agent update"
                    >
                      <RefreshCw size={14} /> Update
                    </button>
                  )}
                </>
              ) : activeAgent.state.status === 'not_on_path' ? (
                <button
                  className={styles.btnPrimary}
                  onClick={() => addToPath(activeAgent.entry.id)}
                  title="Add directory to Windows HKCU PATH"
                >
                  <Plus size={14} /> Add to PATH
                </button>
              ) : activeAgent.state.status === 'wsl_only' ? (
                <button
                  className={styles.btnSecondary}
                  onClick={() => window.open(activeAgent.entry.docsUrl, '_blank')}
                  title="Open WSL installation instructions"
                >
                  <ExternalLink size={14} /> WSL Guide
                </button>
              ) : activeAgent.entry.status !== 'legacy' ? (
                <button
                  className={styles.btnPrimary}
                  onClick={() => installAgent(activeAgent.entry.id, selectedMethodId)}
                  title="Install agent now"
                >
                  <Download size={14} /> Install
                </button>
              ) : null}

              {activeAgent.entry.isCustom && (
                <button
                  className={styles.btnDanger}
                  onClick={() => {
                    if (confirm(`Remove custom agent "${activeAgent.entry.name}"?`)) {
                      deleteCustomAgent(activeAgent.entry.id);
                    }
                  }}
                  title="Delete custom agent"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Form Body */}
          <div className={styles.detailBody}>
            {/* Edge Case Banners */}
            {activeAgent.state.desktopConflict && (
              <div className={`${styles.alertBox} ${styles.alertWarning}`}>
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                <div>
                  <strong>Conflict Detected: </strong>
                  {activeAgent.state.desktopConflictFix ||
                    "The 'agy' command resolves to the Antigravity desktop app launcher instead of the CLI tool."}
                </div>
              </div>
            )}

            {activeAgent.state.status === 'not_on_path' && (
              <div className={`${styles.alertBox} ${styles.alertWarning}`}>
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <strong>Installed, but not found on PATH: </strong>
                  Executable located at <code>{activeAgent.state.resolvedPath}</code>.
                  <div style={{ marginTop: 8 }}>
                    <button
                      className={styles.btnPrimary}
                      onClick={() => addToPath(activeAgent.entry.id)}
                    >
                      Add to User PATH (HKCU)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeAgent.entry.status === 'legacy' && (
              <div className={`${styles.alertBox} ${styles.alertInfo}`}>
                <Info size={18} style={{ flexShrink: 0 }} />
                <div>
                  <strong>Legacy Tool: </strong>
                  Google stopped serving personal accounts on June 18, 2026. It still works with an API key or an enterprise account.
                  <div style={{ marginTop: 6 }}>
                    <a
                      href="https://antigravity.google/docs/migrate"
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--accent)', textDecoration: 'underline' }}
                    >
                      Migrate to Antigravity CLI (run: agy import gemini)
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Section 1: Overview */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h4 className={styles.sectionTitle}>
                  <Info size={16} /> Overview
                </h4>
                <a
                  href={activeAgent.entry.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent)', fontSize: 12, textDecoration: 'none' }}
                >
                  Official Docs <ExternalLink size={12} />
                </a>
              </div>

              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                {activeAgent.entry.description}
              </p>

              <div className={styles.overviewGrid}>
                <div className={styles.infoCard}>
                  <span className={styles.infoLabel}>Status</span>
                  <span className={styles.infoValue} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {renderStatusDot(activeAgent.state.status)}
                    {getStatusLabel(activeAgent)}
                  </span>
                </div>

                <div className={styles.infoCard}>
                  <span className={styles.infoLabel}>Cost & Verification</span>
                  <span className={styles.infoValue}>
                    {activeAgent.entry.cost.note}{' '}
                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                      (verified {activeAgent.entry.cost.verifiedOn})
                    </span>
                  </span>
                </div>

                {activeAgent.state.resolvedPath && (
                  <div className={styles.infoCard} style={{ gridColumn: '1 / -1' }}>
                    <span className={styles.infoLabel}>Resolved Location</span>
                    <span className={styles.infoValue} style={{ fontFamily: 'monospace', fontSize: 11 }}>
                      {activeAgent.state.resolvedPath}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: Launch */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h4 className={styles.sectionTitle}>
                  <Play size={16} /> Launch Configuration
                </h4>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Working Directory</label>
                  <div className={styles.inputGroup}>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder={activeTerminalCwd}
                      value={targetFolder}
                      onChange={(e) => setTargetFolder(e.target.value)}
                    />
                    <button className={styles.btnSecondary} onClick={handleBrowseFolder}>
                      <Folder size={14} /> Browse
                    </button>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Launch Mode</label>
                  <div className={styles.radioGroup}>
                    <label className={styles.radioOption}>
                      <input
                        type="radio"
                        name="launchMode"
                        value="tab"
                        checked={launchMode === 'tab'}
                        onChange={() => setLaunchMode('tab')}
                      />
                      New Tab
                    </label>
                    <label className={styles.radioOption}>
                      <input
                        type="radio"
                        name="launchMode"
                        value="terminal"
                        checked={launchMode === 'terminal'}
                        onChange={() => setLaunchMode('terminal')}
                      />
                      This Terminal
                    </label>
                    <label className={styles.radioOption}>
                      <input
                        type="radio"
                        name="launchMode"
                        value="window"
                        checked={launchMode === 'window'}
                        onChange={() => setLaunchMode('window')}
                      />
                      Standalone Window
                    </label>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Launch Arguments / Options (Optional)</label>
                  <input
                    type="text"
                    className={`${styles.input} ${styles.argsInput}`}
                    placeholder="e.g. --dangerously-skip-permissions --model claude-3-5-sonnet"
                    value={extraArgsInput}
                    onChange={(e) => setExtraArgsInput(e.target.value)}
                    spellCheck={false}
                    autoComplete="off"
                  />
                </div>

                {activeAgent.entry.resumeArgs && (
                  <div className={styles.formGroup}>
                    <label className={styles.radioOption}>
                      <input
                        type="checkbox"
                        checked={resumeSession}
                        onChange={(e) => setResumeSession(e.target.checked)}
                      />
                      Resume last session (passes {activeAgent.entry.resumeArgs.join(' ')})
                    </label>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 8 }}>
                  <button className={styles.btnPrimary} onClick={() => handleLaunch()}>
                    <Play size={14} /> Launch Agent
                  </button>
                </div>
              </div>
            </div>

            {/* Section 3: Install */}
            {activeAgent.entry.installMethods && activeAgent.entry.installMethods.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h4 className={styles.sectionTitle}>
                    <Download size={16} /> Installation Methods
                  </h4>
                </div>

                <div className={styles.methodList}>
                  {activeAgent.entry.installMethods.map((method) => {
                    const isSelected = selectedMethodId === method.id;
                    return (
                      <div
                        key={method.id}
                        className={`${styles.methodCard} ${isSelected ? styles.methodCardSelected : ''}`}
                        onClick={() => setSelectedMethodId(method.id)}
                      >
                        <div className={styles.methodCardHeader}>
                          <div className={styles.methodLabelGroup}>
                            <input
                              type="radio"
                              name="installMethod"
                              checked={isSelected}
                              onChange={() => setSelectedMethodId(method.id)}
                            />
                            <strong>{method.label}</strong>
                            {method.recommended && <span className={styles.recBadge}>Recommended</span>}
                          </div>
                          <span className={styles.domainBadge}>Source: {method.source}</span>
                        </div>

                        {method.isScriptPipe && (
                          <div className={`${styles.alertBox} ${styles.alertWarning}`} style={{ padding: 8 }}>
                            <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                            <span>This downloads and runs a script from {method.source}.</span>
                          </div>
                        )}

                        <div className={styles.codeBlock}>
                          <code>{method.command}</code>
                          <button
                            className={styles.btnIconOnly}
                            style={{ width: 26, height: 26 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(method.command, `method-${method.id}`);
                            }}
                            title="Copy command"
                          >
                            {copiedKey === `method-${method.id}` ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    className={styles.btnPrimary}
                    onClick={() => installAgent(activeAgent.entry.id, selectedMethodId)}
                  >
                    <Download size={14} /> Install in Terminal Tab
                  </button>
                  <a
                    href={activeAgent.entry.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.btnSecondary}
                    style={{ textDecoration: 'none' }}
                  >
                    <ExternalLink size={14} /> Open Docs
                  </a>
                </div>
              </div>
            )}

            {/* Section 4: Sign in & Setup */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h4 className={styles.sectionTitle}>
                  <Key size={16} /> Authentication & Setup
                </h4>
              </div>

              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                {activeAgent.entry.signIn.instructions}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {activeAgent.entry.signIn.command ? (
                  <button
                    className={styles.btnSecondary}
                    onClick={() => {
                      const finalCwd = targetFolder.trim() || activeTerminalCwd;
                      const parts = activeAgent.entry.signIn.command!.split(' ');
                      launchAgent({
                        agentId: activeAgent.entry.id,
                        cwd: finalCwd,
                        mode: 'tab',
                        extraArgs: parts.slice(1),
                      });
                    }}
                  >
                    Run <code>{activeAgent.entry.signIn.command}</code>
                  </button>
                ) : (
                  <button
                    className={styles.btnSecondary}
                    onClick={() => handleLaunch()}
                  >
                    Launch Agent for Initial Setup
                  </button>
                )}
              </div>

              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Terminal Manager never sees or stores credentials; the agent handles its own login directly in the shell.
              </div>
            </div>

            {/* Section 5: Maintenance */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h4 className={styles.sectionTitle}>
                  <RefreshCw size={16} /> Maintenance & Diagnostics
                </h4>
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {activeAgent.entry.updateCommand && (
                  <button
                    className={styles.btnSecondary}
                    onClick={() => updateAgent(activeAgent.entry.id)}
                  >
                    <RefreshCw size={14} /> Update Agent
                  </button>
                )}

                {activeAgent.entry.id === 'hermes' && (
                  <button
                    className={styles.btnSecondary}
                    onClick={() => {
                      launchAgent({
                        agentId: activeAgent.entry.id,
                        cwd: activeTerminalCwd,
                        mode: 'tab',
                        extraArgs: ['doctor'],
                      });
                    }}
                  >
                    Run <code>hermes doctor</code>
                  </button>
                )}

                <button
                  className={styles.btnDanger}
                  onClick={() => {
                    if (confirm(`Uninstall ${activeAgent.entry.name}?`)) {
                      uninstallAgent(activeAgent.entry.id);
                    }
                  }}
                >
                  <Trash2 size={14} /> Uninstall Agent
                </button>
              </div>

              {activeAgent.entry.uninstallHint && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {activeAgent.entry.uninstallHint}
                </div>
              )}
            </div>

            {/* Section 6: Environment Variables (safeStorage) */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h4 className={styles.sectionTitle}>
                  <Key size={16} /> Secure Environment Variables
                </h4>
              </div>

              {!isEncryptionAvailable ? (
                <div className={`${styles.alertBox} ${styles.alertWarning}`}>
                  <AlertTriangle size={16} />
                  <span>OS Secure Storage (safeStorage) is unavailable on this machine. Custom secrets are disabled.</span>
                </div>
              ) : (
                <>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
                    Variables configured here are encrypted on disk via Electron safeStorage and passed directly into the session environment. They are never written to command lines or logs.
                  </p>

                  <div className={styles.envList}>
                    {Object.entries(agentEnvMasked).map(([k, v]) => (
                      <div key={k} className={styles.envRow}>
                        <code style={{ minWidth: 140, color: 'var(--accent)' }}>{k}</code>
                        <span style={{ flex: 1, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{v}</span>
                        <button
                          className={styles.btnIconOnly}
                          style={{ width: 28, height: 28 }}
                          onClick={() => handleDeleteEnvVar(k)}
                          title="Delete secret"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className={styles.envRow} style={{ marginTop: 8 }}>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="KEY (e.g. ANTHROPIC_API_KEY)"
                      style={{ maxWidth: 220 }}
                      value={envKey}
                      onChange={(e) => setEnvKey(e.target.value)}
                    />
                    <input
                      type="password"
                      className={styles.input}
                      placeholder="Value"
                      value={envValue}
                      onChange={(e) => setEnvValue(e.target.value)}
                    />
                    <button className={styles.btnSecondary} onClick={handleSaveEnvVar}>
                      Save Secret
                    </button>
                  </div>

                  {envStatusNotice && (
                    <div style={{ fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Check size={12} /> {envStatusNotice}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.detailArea} style={{ alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>Select an AI Agent to view details and launch.</p>
        </div>
      )}

      {/* Dangerous Argument Confirmation Modal */}
      {dangerousConfirm.isOpen && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle} style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldAlert size={20} /> Dangerous Argument Warning
              </h3>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-primary)' }}>
              The command arguments include <code>{dangerousConfirm.flag}</code>. This flag automatically bypasses safety and permission checks, allowing the AI agent to execute arbitrary filesystem changes or commands without human review.
            </p>
            <div className={styles.modalFooter}>
              <button
                className={styles.btnSecondary}
                onClick={() => setDangerousConfirm({ isOpen: false })}
              >
                Cancel
              </button>
              <button
                className={styles.btnDanger}
                onClick={() => {
                  setDangerousConfirm({ isOpen: false });
                  handleLaunch(true);
                }}
              >
                Proceed Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Agent Modal */}
      {isCustomAgentModalOpen && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Add Custom AI Agent</h3>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Name *</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. My Custom Agent"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Command / Executable Name *</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. my-agent"
                  value={customCommand}
                  onChange={(e) => setCustomCommand(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Install Command (Optional)</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. npm install -g my-agent"
                  value={customInstallCmd}
                  onChange={(e) => setCustomInstallCmd(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Launch Arguments / Options (Optional)</label>
                <input
                  type="text"
                  className={`${styles.input} ${styles.argsInput}`}
                  placeholder="e.g. --dangerously-skip-permissions --model claude-3-5-sonnet"
                  value={customLaunchArgs}
                  onChange={(e) => setCustomLaunchArgs(e.target.value)}
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Shell</label>
                <div className={styles.radioGroup}>
                  <label className={styles.radioOption}>
                    <input
                      type="radio"
                      name="customShell"
                      value="powershell"
                      checked={customShell === 'powershell'}
                      onChange={() => setCustomShell('powershell')}
                    />
                    PowerShell
                  </label>
                  <label className={styles.radioOption}>
                    <input
                      type="radio"
                      name="customShell"
                      value="cmd"
                      checked={customShell === 'cmd'}
                      onChange={() => setCustomShell('cmd')}
                    />
                    Command Prompt
                  </label>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Sign-in Instructions (Optional)</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. Run 'my-agent login' in browser"
                  value={customSignIn}
                  onChange={(e) => setCustomSignIn(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Documentation URL (Optional)</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="https://..."
                  value={customDocs}
                  onChange={(e) => setCustomDocs(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.btnSecondary}
                onClick={() => {
                  setCustomAgentModalOpen(false);
                  resetCustomModalForm();
                }}
              >
                Cancel
              </button>
              <button
                className={styles.btnPrimary}
                disabled={!customName.trim() || !customCommand.trim()}
                onClick={handleCreateCustom}
              >
                Save Custom Agent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
