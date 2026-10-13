import React, { useState, useEffect } from 'react';
import { Sliders, Activity } from 'lucide-react';
import { useSettingsStore } from '@renderer/store/useSettingsStore';
import { SettingsHeader } from './SettingsHeader';
import { SettingsSection } from './SettingsSection';
import { SettingsRow } from './SettingsRow';
import { ShellExperienceSettingsView, ShellExperienceSubTab } from '../../features/shell-experience/ShellExperienceSettingsView';
import { ThemeName, WindowMaterial, AnimationLevel, UiDensity, CursorStyle, RightClickAction } from '@shared/types';
import styles from './SettingsLayout.module.css';

export type SettingsSectionId =
  | 'general'
  | 'shellexp-overview'
  | 'shellexp-prompt'
  | 'shellexp-colors'
  | 'shellexp-icons'
  | 'shellexp-prediction'
  | 'shellexp-keybindings'
  | 'shellexp-commands'
  | 'shellexp-advanced'
  | 'perf';

interface SettingsViewProps {
  initialSection?: string;
  onClose: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  initialSection = 'general',
  onClose,
}) => {
  const { settings, updateSettings } = useSettingsStore();
  const [currentSection, setCurrentSection] = useState<SettingsSectionId>(() => {
    if (initialSection === 'shellexp') return 'shellexp-overview';
    if (initialSection === 'perf') return 'perf';
    if (initialSection.startsWith('shellexp-')) return initialSection as SettingsSectionId;
    return 'general';
  });

  const [perfData, setPerfData] = useState<any>(null);
  const [registryStatus, setRegistryStatus] = useState<boolean | null>(null);
  const [isRepairing, setIsRepairing] = useState<boolean>(false);

  // Fetch registry status on mount
  useEffect(() => {
    if (window.api?.system?.getRegistryStatus) {
      window.api.system.getRegistryStatus().then((status) => {
        setRegistryStatus(Boolean(status));
      });
    }
  }, []);

  const handleRepairRegistry = async () => {
    if (!window.api?.system?.repairRegistry) return;
    setIsRepairing(true);
    try {
      await window.api.system.repairRegistry();
      const status = await window.api.system.getRegistryStatus();
      setRegistryStatus(Boolean(status));
    } finally {
      setIsRepairing(false);
    }
  };

  // Esc key closes settings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Fetch performance data when on performance section
  useEffect(() => {
    if (currentSection === 'perf' && window.api?.perf) {
      Promise.all([
        window.api.perf.getMainTimestamps(),
        window.api.app?.getShellMemory ? window.api.app.getShellMemory() : Promise.resolve(null),
      ]).then(([st, mem]) => {
        setPerfData({ stages: st, shellMemory: mem });
      });
    }
  }, [currentSection]);

  const getSectionTitle = (): string => {
    switch (currentSection) {
      case 'general':
        return 'General Preferences';
      case 'shellexp-overview':
        return 'Shell Experience > Overview';
      case 'shellexp-prompt':
        return 'Shell Experience > Prompt Gallery';
      case 'shellexp-colors':
        return 'Shell Experience > Syntax Colors';
      case 'shellexp-icons':
        return 'Shell Experience > File Icons';
      case 'shellexp-prediction':
        return 'Shell Experience > Predictions';
      case 'shellexp-keybindings':
        return 'Shell Experience > Keybindings';
      case 'shellexp-commands':
        return 'Shell Experience > Commands & Aliases';
      case 'shellexp-advanced':
        return 'Shell Experience > Advanced Scripting';
      case 'perf':
        return 'Diagnostics > Performance';
      default:
        return 'Settings';
    }
  };

  return (
    <div className={styles.panelView}>
      <SettingsHeader
        title="Settings"
        subtitle={getSectionTitle()}
        onClose={onClose}
      />

      <div className={styles.layoutBody}>
        {/* Left Vertical Navigation */}
        <nav className={styles.navColumn} aria-label="Settings navigation">
          <div className={styles.navGroupTitle}>Preferences</div>
          <button
            type="button"
            className={`${styles.navItem} ${currentSection === 'general' ? styles.navItemActive : ''}`}
            onClick={() => setCurrentSection('general')}
          >
            <div className={styles.navItemContent}>
              <Sliders size={14} />
              <span>General</span>
            </div>
          </button>

          <div className={styles.navGroupTitle} style={{ marginTop: 12 }}>
            Shell Experience
          </div>
          <button
            type="button"
            className={`${styles.navItem} ${
              currentSection === 'shellexp-overview' ? styles.navItemActive : ''
            }`}
            onClick={() => setCurrentSection('shellexp-overview')}
          >
            <div className={styles.navItemContent}>
              <span>Overview</span>
            </div>
          </button>
          <button
            type="button"
            className={`${styles.navItem} ${
              currentSection === 'shellexp-prompt' ? styles.navItemActive : ''
            }`}
            onClick={() => setCurrentSection('shellexp-prompt')}
          >
            <div className={styles.navItemContent}>
              <span>Prompt Gallery</span>
            </div>
          </button>
          <button
            type="button"
            className={`${styles.navItem} ${
              currentSection === 'shellexp-colors' ? styles.navItemActive : ''
            }`}
            onClick={() => setCurrentSection('shellexp-colors')}
          >
            <div className={styles.navItemContent}>
              <span>Syntax Colors</span>
            </div>
          </button>
          <button
            type="button"
            className={`${styles.navItem} ${
              currentSection === 'shellexp-icons' ? styles.navItemActive : ''
            }`}
            onClick={() => setCurrentSection('shellexp-icons')}
          >
            <div className={styles.navItemContent}>
              <span>File Icons</span>
            </div>
          </button>
          <button
            type="button"
            className={`${styles.navItem} ${
              currentSection === 'shellexp-prediction' ? styles.navItemActive : ''
            }`}
            onClick={() => setCurrentSection('shellexp-prediction')}
          >
            <div className={styles.navItemContent}>
              <span>Predictions</span>
            </div>
          </button>
          <button
            type="button"
            className={`${styles.navItem} ${
              currentSection === 'shellexp-keybindings' ? styles.navItemActive : ''
            }`}
            onClick={() => setCurrentSection('shellexp-keybindings')}
          >
            <div className={styles.navItemContent}>
              <span>Keybindings</span>
            </div>
          </button>
          <button
            type="button"
            className={`${styles.navItem} ${
              currentSection === 'shellexp-commands' ? styles.navItemActive : ''
            }`}
            onClick={() => setCurrentSection('shellexp-commands')}
          >
            <div className={styles.navItemContent}>
              <span>Commands & Aliases</span>
            </div>
          </button>
          <button
            type="button"
            className={`${styles.navItem} ${
              currentSection === 'shellexp-advanced' ? styles.navItemActive : ''
            }`}
            onClick={() => setCurrentSection('shellexp-advanced')}
          >
            <div className={styles.navItemContent}>
              <span>Advanced Scripting</span>
            </div>
          </button>

          <div className={styles.navGroupTitle} style={{ marginTop: 12 }}>
            Diagnostics
          </div>
          <button
            type="button"
            className={`${styles.navItem} ${currentSection === 'perf' ? styles.navItemActive : ''}`}
            onClick={() => setCurrentSection('perf')}
          >
            <div className={styles.navItemContent}>
              <Activity size={14} />
              <span>Performance</span>
            </div>
          </button>
        </nav>

        {/* Right Content Area: Single Scroll Container */}
        <main className={styles.contentColumn}>
          <div className={styles.contentContainer}>
            {currentSection === 'general' && (
              <>
                <SettingsSection
                  title="Theme & Appearance"
                  description="Customize the color palette, background materials, and animation smoothness."
                >
                  <SettingsRow
                    label="Theme Palette"
                    description="Color schemes tailored with high-contrast surface tokens."
                  >
                    <select
                      className={styles.controlSelect}
                      value={settings.theme}
                      onChange={(e) => updateSettings({ theme: e.target.value as ThemeName })}
                    >
                      <option value="midnight">Midnight (Default Dark)</option>
                      <option value="graphite">Graphite (Professional Dark)</option>
                    </select>
                  </SettingsRow>

                  <SettingsRow
                    label="Window Material"
                    description="Backdrop material rendering for Windows 11 desktop blending."
                  >
                    <select
                      className={styles.controlSelect}
                      value={settings.windowMaterial}
                      onChange={(e) =>
                        updateSettings({ windowMaterial: e.target.value as WindowMaterial })
                      }
                    >
                      <option value="mica">Mica (Windows 11)</option>
                      <option value="acrylic">Acrylic</option>
                      <option value="solid">Solid (Dark Surface)</option>
                    </select>
                  </SettingsRow>

                  <SettingsRow
                    label="Animation Level"
                    description="Spring transitions, fades, or instant switching."
                  >
                    <select
                      className={styles.controlSelect}
                      value={settings.animationLevel}
                      onChange={(e) =>
                        updateSettings({ animationLevel: e.target.value as AnimationLevel })
                      }
                    >
                      <option value="full">Full (Springs & Motion)</option>
                      <option value="reduced">Reduced (Fades only)</option>
                      <option value="off">Off (Instant UI)</option>
                    </select>
                  </SettingsRow>
                </SettingsSection>

                <SettingsSection
                  title="Terminal & Typography"
                  description="Monospace text sizing, cursor rendering, and scrollback retention."
                >
                  <SettingsRow
                    label="UI Density"
                    description="Vertical spacing for tab headers and status controls."
                  >
                    <select
                      className={styles.controlSelect}
                      value={settings.uiDensity}
                      onChange={(e) => updateSettings({ uiDensity: e.target.value as UiDensity })}
                    >
                      <option value="compact">Compact</option>
                      <option value="normal">Normal</option>
                      <option value="comfortable">Comfortable</option>
                    </select>
                  </SettingsRow>

                  <SettingsRow
                    label="Font Size (px)"
                    description="Terminal output font size in pixels (8px to 36px)."
                  >
                    <input
                      type="number"
                      className={`${styles.controlInput} ${styles.controlNumber}`}
                      value={settings.fontSize}
                      min={8}
                      max={36}
                      onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
                    />
                  </SettingsRow>

                  <SettingsRow
                    label="Cursor Style"
                    description="Visual representation of the active terminal cursor."
                  >
                    <select
                      className={styles.controlSelect}
                      value={settings.cursorStyle}
                      onChange={(e) =>
                        updateSettings({ cursorStyle: e.target.value as CursorStyle })
                      }
                    >
                      <option value="block">Block</option>
                      <option value="underline">Underline</option>
                      <option value="bar">Bar</option>
                    </select>
                  </SettingsRow>

                  <SettingsRow
                    label="Scrollback Lines"
                    description="Maximum buffer rows stored per terminal pane."
                  >
                    <input
                      type="number"
                      className={`${styles.controlInput} ${styles.controlNumber}`}
                      value={settings.scrollback}
                      min={100}
                      max={50000}
                      onChange={(e) => updateSettings({ scrollback: Number(e.target.value) })}
                    />
                  </SettingsRow>

                  <SettingsRow
                    label="Enable Cursor Blinking"
                    description="Animate cursor flashing while terminal is focused."
                  >
                    <button
                      type="button"
                      className={`${styles.controlToggle} ${
                        settings.cursorBlink ? styles.controlToggleActive : ''
                      }`}
                      onClick={() => updateSettings({ cursorBlink: !settings.cursorBlink })}
                    >
                      <span className={styles.controlToggleThumb} />
                    </button>
                  </SettingsRow>
                </SettingsSection>

                <SettingsSection
                  title="Terminal Context Menu & Actions Panel"
                  description="Configure mouse right-click behavior, safety confirmations, shell integration markers, and menu customization."
                >
                  <SettingsRow
                    label="Right-click action"
                    description="Action performed when right-clicking inside the terminal viewport (Shift+Right-click always opens the menu)."
                  >
                    <select
                      className={styles.controlSelect}
                      value={settings.rightClickAction || 'contextMenu'}
                      onChange={(e) =>
                        updateSettings({ rightClickAction: e.target.value as RightClickAction })
                      }
                    >
                      <option value="contextMenu">Show context menu (Default)</option>
                      <option value="copyOrPaste">Copy if selection, otherwise paste (Windows Terminal style)</option>
                      <option value="paste">Always paste</option>
                    </select>
                  </SettingsRow>

                  <SettingsRow
                    label="Confirm multi-line paste"
                    description="Show a preview and confirmation prompt when pasting text with multiple lines or exceeding 2,000 characters."
                  >
                    <button
                      type="button"
                      className={`${styles.controlToggle} ${
                        settings.confirmMultiLinePaste ?? true ? styles.controlToggleActive : ''
                      }`}
                      onClick={() =>
                        updateSettings({ confirmMultiLinePaste: !(settings.confirmMultiLinePaste ?? true) })
                      }
                    >
                      <span className={styles.controlToggleThumb} />
                    </button>
                  </SettingsRow>

                  <SettingsRow
                    label="Shell integration (OSC 133 / OSC 7)"
                    description="Enable prompt and execution markers to track command boundaries, output ranges, and command history."
                  >
                    <button
                      type="button"
                      className={`${styles.controlToggle} ${
                        settings.shellIntegration ?? true ? styles.controlToggleActive : ''
                      }`}
                      onClick={() =>
                        updateSettings({ shellIntegration: !(settings.shellIntegration ?? true) })
                      }
                    >
                      <span className={styles.controlToggleThumb} />
                    </button>
                  </SettingsRow>

                  <SettingsRow
                    label="Show 'Search the web'"
                    description="Include quick web search in the context menu whenever text is selected."
                  >
                    <button
                      type="button"
                      className={`${styles.controlToggle} ${
                        settings.showSearchTheWeb ? styles.controlToggleActive : ''
                      }`}
                      onClick={() =>
                        updateSettings({ showSearchTheWeb: !settings.showSearchTheWeb })
                      }
                    >
                      <span className={styles.controlToggleThumb} />
                    </button>
                  </SettingsRow>

                  {settings.showSearchTheWeb && (
                    <SettingsRow
                      label="Default search engine"
                      description="Search provider used for query lookups."
                    >
                      <select
                        className={styles.controlSelect}
                        value={settings.defaultSearchEngine || 'google'}
                        onChange={(e) =>
                          updateSettings({
                            defaultSearchEngine: e.target.value as 'google' | 'bing' | 'duckduckgo',
                          })
                        }
                      >
                        <option value="google">Google</option>
                        <option value="bing">Bing</option>
                        <option value="duckduckgo">DuckDuckGo</option>
                      </select>
                    </SettingsRow>
                  )}

                  <SettingsRow
                    label="Clipboard history size"
                    description="Maximum number of terminal-copied snippets kept in memory (cleared on quit)."
                  >
                    <input
                      type="number"
                      className={`${styles.controlInput} ${styles.controlNumber}`}
                      value={settings.clipboardHistorySize || 10}
                      min={1}
                      max={50}
                      onChange={(e) =>
                        updateSettings({ clipboardHistorySize: Math.max(1, Number(e.target.value)) })
                      }
                    />
                  </SettingsRow>

                  <SettingsRow
                    label="Pin Actions Panel by default"
                    description="Keep the Actions Panel docked beside the terminal instead of closing automatically after actions."
                  >
                    <button
                      type="button"
                      className={`${styles.controlToggle} ${
                        settings.actionsPanelPinned ? styles.controlToggleActive : ''
                      }`}
                      onClick={() =>
                        updateSettings({ actionsPanelPinned: !settings.actionsPanelPinned })
                      }
                    >
                      <span className={styles.controlToggleThumb} />
                    </button>
                  </SettingsRow>

                  <SettingsRow
                    label="Customize context menu"
                    description="Select which menu groups and action categories appear in the right-click menu."
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                      {[
                        { id: 'group-clipboard', label: 'Clipboard (Copy, Paste, History)' },
                        { id: 'group-selection', label: 'Selection Actions (Paths, URLs, Ports)' },
                        { id: 'group-quick', label: 'Quick Commands (Clear, Reset, Interrupt)' },
                        { id: 'group-saved', label: 'Snippets & Script Runner' },
                        { id: 'group-window', label: 'Window & Session (Splits, Tabs, Export)' },
                        { id: 'group-actions-panel', label: 'Actions Panel Launcher' },
                      ].map((item) => {
                        const isVisible = settings.contextMenuVisibility?.[item.id] !== false;
                        return (
                          <label
                            key={item.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontSize: '13px',
                              cursor: 'pointer',
                              color: 'var(--text-primary)',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isVisible}
                              onChange={(e) => {
                                const updated = {
                                  ...(settings.contextMenuVisibility || {}),
                                  [item.id]: e.target.checked,
                                };
                                updateSettings({ contextMenuVisibility: updated });
                              }}
                              style={{ cursor: 'pointer', accentColor: 'var(--accent-primary, #89b4fa)' }}
                            />
                            <span>{item.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </SettingsRow>
                </SettingsSection>

                <SettingsSection
                  title="System Integration"
                  description="Windows Explorer context menu, system tray background execution, and startup options."
                >
                  <SettingsRow
                    label="Add to Explorer context menu"
                    description="Show 'Open in Terminal Manager' when right-clicking folders and drives in Windows Explorer."
                  >
                    <button
                      type="button"
                      className={`${styles.controlToggle} ${
                        settings.explorerContextMenu ? styles.controlToggleActive : ''
                      }`}
                      onClick={() => updateSettings({ explorerContextMenu: !settings.explorerContextMenu })}
                    >
                      <span className={styles.controlToggleThumb} />
                    </button>
                  </SettingsRow>

                  <SettingsRow
                    label="Integration Status"
                    description="Current Windows Registry shell command state."
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        className={`${styles.statusPill} ${
                          registryStatus ? styles.statusPillActive : ''
                        }`}
                      >
                        {registryStatus ? 'Registered' : 'Not registered'}
                      </span>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={handleRepairRegistry}
                        disabled={isRepairing}
                      >
                        {isRepairing ? 'Repairing...' : 'Repair integration'}
                      </button>
                    </div>
                  </SettingsRow>

                  <SettingsRow
                    label="Keep running in background"
                    description="Keep sessions running in the Windows system tray when the main window is closed."
                  >
                    <button
                      type="button"
                      className={`${styles.controlToggle} ${
                        settings.keepRunningInBackground ? styles.controlToggleActive : ''
                      }`}
                      onClick={() => updateSettings({ keepRunningInBackground: !settings.keepRunningInBackground })}
                    >
                      <span className={styles.controlToggleThumb} />
                    </button>
                  </SettingsRow>

                  <SettingsRow
                    label="Start with Windows"
                    description="Launch Terminal Manager automatically in the background tray when you log in."
                  >
                    <button
                      type="button"
                      className={`${styles.controlToggle} ${
                        settings.startWithWindows ? styles.controlToggleActive : ''
                      }`}
                      onClick={() => updateSettings({ startWithWindows: !settings.startWithWindows })}
                    >
                      <span className={styles.controlToggleThumb} />
                    </button>
                  </SettingsRow>

                  <SettingsRow
                    label="Start minimized to tray"
                    description="Do not display the main application window upon initial desktop launch."
                  >
                    <button
                      type="button"
                      className={`${styles.controlToggle} ${
                        settings.startMinimizedToTray ? styles.controlToggleActive : ''
                      }`}
                      onClick={() => updateSettings({ startMinimizedToTray: !settings.startMinimizedToTray })}
                    >
                      <span className={styles.controlToggleThumb} />
                    </button>
                  </SettingsRow>

                  <SettingsRow
                    label="Open folder terminals in"
                    description="Choose whether context menu launches open a standalone window or a tab in the main window."
                  >
                    <select
                      className={styles.controlSelect}
                      value={settings.openFolderTerminalsIn || 'standalone'}
                      onChange={(e) =>
                        updateSettings({
                          openFolderTerminalsIn: e.target.value as 'standalone' | 'tab',
                        })
                      }
                    >
                      <option value="standalone">New standalone window (Default)</option>
                      <option value="tab">Tab in main window</option>
                    </select>
                  </SettingsRow>
                </SettingsSection>

                <SettingsSection
                  title="Script Runner"
                  description="Configure default execution behaviors, timeouts, log retention, and system notifications for script queues."
                >
                  <SettingsRow
                    label="Default On-Failure Policy"
                    description="Queue action when an individual script exits with a non-zero code."
                  >
                    <select
                      className={styles.controlSelect}
                      value={settings.scriptRunner?.defaultOnFailure || 'stop'}
                      onChange={(e) =>
                        updateSettings({
                          scriptRunner: {
                            ...settings.scriptRunner!,
                            defaultOnFailure: e.target.value as 'stop' | 'continue' | 'retry',
                          },
                        })
                      }
                    >
                      <option value="stop">Stop Queue (Halt remaining scripts)</option>
                      <option value="continue">Continue (Execute next script)</option>
                      <option value="retry">Retry (Retry with delay)</option>
                    </select>
                  </SettingsRow>

                  <SettingsRow
                    label="Default Timeout (Seconds)"
                    description="Maximum execution duration per script before terminating the process tree (0 = none)."
                  >
                    <input
                      type="number"
                      min={0}
                      max={3600}
                      className={`${styles.controlInput} ${styles.controlNumber}`}
                      value={settings.scriptRunner?.defaultTimeoutSeconds ?? 0}
                      onChange={(e) =>
                        updateSettings({
                          scriptRunner: {
                            ...settings.scriptRunner!,
                            defaultTimeoutSeconds: Math.max(0, parseInt(e.target.value, 10) || 0),
                          },
                        })
                      }
                    />
                  </SettingsRow>

                  <SettingsRow
                    label="Log Retention Count"
                    description="Number of past run log files retained in user data directory."
                  >
                    <input
                      type="number"
                      min={10}
                      max={500}
                      className={`${styles.controlInput} ${styles.controlNumber}`}
                      value={settings.scriptRunner?.logRetentionCount ?? 50}
                      onChange={(e) =>
                        updateSettings({
                          scriptRunner: {
                            ...settings.scriptRunner!,
                            logRetentionCount: Math.max(10, parseInt(e.target.value, 10) || 50),
                          },
                        })
                      }
                    />
                  </SettingsRow>

                  <SettingsRow
                    label="Queue Completion Notifications"
                    description="Show native Windows notification when a script queue finishes, fails, or times out."
                  >
                    <button
                      type="button"
                      className={`${styles.controlToggle} ${
                        settings.scriptRunner?.notificationsEnabled ? styles.controlToggleActive : ''
                      }`}
                      onClick={() =>
                        updateSettings({
                          scriptRunner: {
                            ...settings.scriptRunner!,
                            notificationsEnabled: !settings.scriptRunner?.notificationsEnabled,
                          },
                        })
                      }
                    >
                      <span className={styles.controlToggleThumb} />
                    </button>
                  </SettingsRow>

                  <SettingsRow
                    label="Prefer PowerShell 7 over Windows PowerShell"
                    description="Automatically invoke pwsh when available, falling back to powershell.exe."
                  >
                    <button
                      type="button"
                      className={`${styles.controlToggle} ${
                        settings.scriptRunner?.preferPwsh ? styles.controlToggleActive : ''
                      }`}
                      onClick={() =>
                        updateSettings({
                          scriptRunner: {
                            ...settings.scriptRunner!,
                            preferPwsh: !settings.scriptRunner?.preferPwsh,
                          },
                        })
                      }
                    >
                      <span className={styles.controlToggleThumb} />
                    </button>
                  </SettingsRow>
                </SettingsSection>
              </>
            )}

            {currentSection.startsWith('shellexp-') && (
              <ShellExperienceSettingsView
                subSection={currentSection.replace('shellexp-', '') as ShellExperienceSubTab}
              />
            )}

            {currentSection === 'perf' && (
              <>
                <SettingsSection
                  title="Startup Timeline Markers"
                  description="Hardware timestamps captured from main and preload initialization."
                >
                  <pre
                    style={{
                      margin: 0,
                      padding: 16,
                      background: 'var(--bg-base)',
                      borderRadius: 6,
                      border: '1px solid var(--border-subtle)',
                      fontFamily: 'var(--font-terminal)',
                      fontSize: 12,
                      color: 'var(--success)',
                      overflowX: 'auto',
                    }}
                  >
                    {perfData?.stages
                      ? JSON.stringify(perfData.stages, null, 2)
                      : 'Loading startup timeline...'}
                  </pre>
                </SettingsSection>

                <SettingsSection
                  title="Process & Memory Footprint"
                  description="Live resource metrics for active shell processes."
                >
                  <SettingsRow
                    label="Active Shell Processes"
                    description="Number of running pty/conpty background instances."
                  >
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {perfData?.shellMemory?.count || 0}
                    </span>
                  </SettingsRow>

                  <SettingsRow
                    label="Working Set Memory"
                    description="Total aggregate memory allocated to shell processes."
                  >
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {perfData?.shellMemory?.formatted || '0 MB'}
                    </span>
                  </SettingsRow>
                </SettingsSection>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
