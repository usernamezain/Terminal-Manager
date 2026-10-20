import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Sliders, Activity, HelpCircle } from 'lucide-react';
import { useSettingsStore } from '@renderer/store/useSettingsStore';
import { SettingsHeader } from './SettingsHeader';
import { SettingsSection } from './SettingsSection';
import { SettingsRow } from './SettingsRow';
import type { ShellExperienceSubTab } from '../../features/shell-experience/ShellExperienceSettingsView';

const ShellExperienceSettingsView = lazy(() =>
  import('../../features/shell-experience/ShellExperienceSettingsView').then((m) => ({
    default: m.ShellExperienceSettingsView,
  }))
);
import { ThemeName, WindowMaterial, AnimationLevel, UiDensity, CursorStyle, RightClickAction } from '@shared/types';
import { useProjectRunnerStore } from '@renderer/features/project-runner/useProjectRunnerStore';
import { EcosystemType } from '@shared/projectRunnerTypes';
import { useWorkspaceStore } from '@renderer/store/useWorkspaceStore';
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
  | 'perf'
  | 'help';

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
    if (initialSection === 'help') return 'help';
    if (initialSection.startsWith('shellexp-')) return initialSection as SettingsSectionId;
    return 'general';
  });

  const [perfData, setPerfData] = useState<any>(null);
  const [registryStatus, setRegistryStatus] = useState<boolean | null>(null);
  const [isRepairing, setIsRepairing] = useState<boolean>(false);
  const [helpNotice, setHelpNotice] = useState<string | null>(null);

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
        onLearnMore={() => {
          onClose();
          const target = currentSection.startsWith('shellexp-')
            ? 'shell-experience'
            : currentSection === 'perf'
            ? 'performance'
            : 'appearance-and-themes';
          useWorkspaceStore.getState().openDocs(target);
        }}
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
            Help & Diagnostics
          </div>
          <button
            type="button"
            className={`${styles.navItem} ${currentSection === 'help' ? styles.navItemActive : ''}`}
            onClick={() => setCurrentSection('help')}
          >
            <div className={styles.navItemContent}>
              <HelpCircle size={14} />
              <span>Help & Support</span>
            </div>
          </button>
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
                  action={
                    <button
                      type="button"
                      className={styles.learnMoreLink}
                      onClick={() => {
                        onClose();
                        useWorkspaceStore.getState().openDocs('appearance-and-themes');
                      }}
                    >
                      Learn more
                    </button>
                  }
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
                        { id: 'group-project', label: 'Project Runner (Detected project scripts & actions)' },
                        { id: 'group-ai-agents', label: 'AI Agents (Quick launch installed CLI agents)' },
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

                {(() => {
                  const prSettings = {
                    showPlayButton: true,
                    autoDetect: true,
                    showPrePostScripts: false,
                    defaultRunTarget: 'terminal' as const,
                    confirmGlobalInstalls: true,
                    suggestFromInternet: true,
                    offlineMode: false,
                    enabledEcosystems: {
                      node: true,
                      python: true,
                      rust: true,
                      go: true,
                      dotnet: true,
                      java: true,
                      php: true,
                      ruby: true,
                      docker: true,
                      generic: true,
                    },
                    ...(settings.projectRunner || {}),
                  };

                  return (
                    <SettingsSection
                      title="Project Runner"
                      description="Auto-detect project tools (Node, Python, Rust, Go, etc.) and launch scripts, dependencies, and environment tasks."
                    >
                      <SettingsRow
                        label="Show Project Runner button"
                        description="Display the Play button strip at the bottom of terminal panes when a project is detected."
                      >
                        <button
                          type="button"
                          className={`${styles.controlToggle} ${
                            prSettings.showPlayButton ? styles.controlToggleActive : ''
                          }`}
                          onClick={() =>
                            updateSettings({
                              projectRunner: {
                                ...prSettings,
                                showPlayButton: !prSettings.showPlayButton,
                              },
                            })
                          }
                        >
                          <span className={styles.controlToggleThumb} />
                        </button>
                      </SettingsRow>

                      <SettingsRow
                        label="Auto-detect on folder change"
                        description="Automatically re-scan manifest files whenever the terminal changes directory."
                      >
                        <button
                          type="button"
                          className={`${styles.controlToggle} ${
                            prSettings.autoDetect ? styles.controlToggleActive : ''
                          }`}
                          onClick={() =>
                            updateSettings({
                              projectRunner: {
                                ...prSettings,
                                autoDetect: !prSettings.autoDetect,
                              },
                            })
                          }
                        >
                          <span className={styles.controlToggleThumb} />
                        </button>
                      </SettingsRow>

                      <SettingsRow
                        label="Show pre/post scripts"
                        description="Include pre- and post-lifecycle scripts (e.g., prebuild, posttest) in package.json script menus."
                      >
                        <button
                          type="button"
                          className={`${styles.controlToggle} ${
                            prSettings.showPrePostScripts ? styles.controlToggleActive : ''
                          }`}
                          onClick={() =>
                            updateSettings({
                              projectRunner: {
                                ...prSettings,
                                showPrePostScripts: !prSettings.showPrePostScripts,
                              },
                            })
                          }
                        >
                          <span className={styles.controlToggleThumb} />
                        </button>
                      </SettingsRow>

                      <SettingsRow
                        label="Default run target"
                        description="Where project commands execute when clicked normally."
                      >
                        <select
                          className={styles.controlSelect}
                          value={prSettings.defaultRunTarget || 'terminal'}
                          onChange={(e) =>
                            updateSettings({
                              projectRunner: {
                                ...prSettings,
                                defaultRunTarget: e.target.value as 'terminal' | 'new-tab',
                              },
                            })
                          }
                        >
                          <option value="terminal">This terminal</option>
                          <option value="new-tab">New tab</option>
                        </select>
                      </SettingsRow>

                      <SettingsRow
                        label="Confirm global installs"
                        description="Display a warning before executing global package installations (e.g., npm -g or pip outside a virtual environment)."
                      >
                        <button
                          type="button"
                          className={`${styles.controlToggle} ${
                            prSettings.confirmGlobalInstalls ? styles.controlToggleActive : ''
                          }`}
                          onClick={() =>
                            updateSettings({
                              projectRunner: {
                                ...prSettings,
                                confirmGlobalInstalls: !prSettings.confirmGlobalInstalls,
                              },
                            })
                          }
                        >
                          <span className={styles.controlToggleThumb} />
                        </button>
                      </SettingsRow>

                      <SettingsRow
                        label="Package suggestions from internet"
                        description="Fetch suggestions and version metadata from npm and PyPI registries (offline fallback is always enabled)."
                      >
                        <button
                          type="button"
                          className={`${styles.controlToggle} ${
                            prSettings.suggestFromInternet ? styles.controlToggleActive : ''
                          }`}
                          onClick={() =>
                            updateSettings({
                              projectRunner: {
                                ...prSettings,
                                suggestFromInternet: !prSettings.suggestFromInternet,
                              },
                            })
                          }
                        >
                          <span className={styles.controlToggleThumb} />
                        </button>
                      </SettingsRow>

                      <SettingsRow
                        label="Offline mode"
                        description="Disable all outbound network calls for package search and metadata lookups."
                      >
                        <button
                          type="button"
                          className={`${styles.controlToggle} ${
                            prSettings.offlineMode ? styles.controlToggleActive : ''
                          }`}
                          onClick={() =>
                            updateSettings({
                              projectRunner: {
                                ...prSettings,
                                offlineMode: !prSettings.offlineMode,
                              },
                            })
                          }
                        >
                          <span className={styles.controlToggleThumb} />
                        </button>
                      </SettingsRow>

                      <SettingsRow
                        label="Clear saved project data"
                        description="Remove all remembered primary, recent, and pinned commands across projects."
                      >
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={async () => {
                            await useProjectRunnerStore.getState().clearSavedData();
                            alert('Saved project data cleared.');
                          }}
                        >
                          Clear Data
                        </button>
                      </SettingsRow>

                      <SettingsRow
                        label="Enabled ecosystems"
                        description="Select which project types to detect and show in the Project Runner."
                      >
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', width: '100%' }}>
                          {[
                            { id: 'node', label: 'Node.js / Deno / Bun' },
                            { id: 'python', label: 'Python (pip / uv / poetry)' },
                            { id: 'rust', label: 'Rust (Cargo)' },
                            { id: 'go', label: 'Go' },
                            { id: 'dotnet', label: '.NET (C# / F#)' },
                            { id: 'java', label: 'Java / Kotlin (Maven / Gradle)' },
                            { id: 'php', label: 'PHP (Composer)' },
                            { id: 'ruby', label: 'Ruby (Bundler / Rails)' },
                            { id: 'docker', label: 'Docker / Compose' },
                            { id: 'generic', label: 'Make / Just / Taskfile' },
                          ].map((eco) => {
                            const isEnabled = prSettings.enabledEcosystems?.[eco.id as EcosystemType] !== false;
                            return (
                              <label
                                key={eco.id}
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
                                  checked={isEnabled}
                                  onChange={(e) => {
                                    const updatedEco = {
                                      ...(prSettings.enabledEcosystems || {}),
                                      [eco.id]: e.target.checked,
                                    };
                                    updateSettings({
                                      projectRunner: {
                                        ...prSettings,
                                        enabledEcosystems: updatedEco as any,
                                      },
                                    });
                                  }}
                                  style={{ cursor: 'pointer', accentColor: 'var(--accent-primary, #89b4fa)' }}
                                />
                                <span>{eco.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </SettingsRow>
                    </SettingsSection>
                  );
                })()}

                {(() => {
                  const agentSettings = {
                    defaultLaunchMode: 'tab' as const,
                    showInExplorerMenu: true,
                    showInTrayMenu: true,
                    confirmScriptInstallers: true,
                    extraScanDirs: [],
                    autoRescanOnStart: true,
                    ...(settings.aiAgents || {}),
                  };

                  return (
                    <SettingsSection
                      title="AI Agents"
                      description="Configure detection, Windows integrations, and quick-launch preferences for AI CLI agents."
                    >
                      <SettingsRow
                        label="Default launch mode"
                        description="Preferred presentation target when launching an AI agent from shortcuts or context menus."
                      >
                        <select
                          className={styles.controlSelect}
                          value={agentSettings.defaultLaunchMode}
                          onChange={(e) =>
                            updateSettings({
                              aiAgents: {
                                ...agentSettings,
                                defaultLaunchMode: e.target.value as any,
                              },
                            })
                          }
                        >
                          <option value="terminal">This terminal</option>
                          <option value="tab">New tab</option>
                          <option value="window">Standalone window</option>
                        </select>
                      </SettingsRow>

                      <SettingsRow
                        label="Show AI Agents in Explorer menu"
                        description="Add an 'AI Agents (Terminal Manager)' cascading submenu when right-clicking folders or drive backgrounds in Windows Explorer."
                      >
                        <button
                          type="button"
                          className={`${styles.controlToggle} ${
                            agentSettings.showInExplorerMenu ? styles.controlToggleActive : ''
                          }`}
                          onClick={() =>
                            updateSettings({
                              aiAgents: {
                                ...agentSettings,
                                showInExplorerMenu: !agentSettings.showInExplorerMenu,
                              },
                            })
                          }
                        >
                          <span className={styles.controlToggleThumb} />
                        </button>
                      </SettingsRow>

                      <SettingsRow
                        label="Show in tray menu"
                        description="List installed AI agents and recent folders in the Windows notification area tray context menu."
                      >
                        <button
                          type="button"
                          className={`${styles.controlToggle} ${
                            agentSettings.showInTrayMenu ? styles.controlToggleActive : ''
                          }`}
                          onClick={() =>
                            updateSettings({
                              aiAgents: {
                                ...agentSettings,
                                showInTrayMenu: !agentSettings.showInTrayMenu,
                              },
                            })
                          }
                        >
                          <span className={styles.controlToggleThumb} />
                        </button>
                      </SettingsRow>

                      <SettingsRow
                        label="Confirm script installers"
                        description="Always require explicit confirmation before running irm|iex or curl|sh installer scripts."
                      >
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                          Always enabled (enforced)
                        </span>
                      </SettingsRow>

                      <SettingsRow
                        label="Auto rescan on app start"
                        description="Probe system PATH and known developer locations for newly installed agents when Terminal Manager starts."
                      >
                        <button
                          type="button"
                          className={`${styles.controlToggle} ${
                            agentSettings.autoRescanOnStart ? styles.controlToggleActive : ''
                          }`}
                          onClick={() =>
                            updateSettings({
                              aiAgents: {
                                ...agentSettings,
                                autoRescanOnStart: !agentSettings.autoRescanOnStart,
                              },
                            })
                          }
                        >
                          <span className={styles.controlToggleThumb} />
                        </button>
                      </SettingsRow>

                      <SettingsRow
                        label="Extra PATH directories to scan"
                        description="Custom folders searched during agent binary detection (one path per line)."
                      >
                        <textarea
                          style={{
                            width: '100%',
                            minHeight: '60px',
                            backgroundColor: 'var(--bg-base)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '4px',
                            padding: '6px 8px',
                            fontSize: '12px',
                            fontFamily: 'monospace',
                            outline: 'none',
                          }}
                          placeholder="C:\tools\bin&#10;D:\agents"
                          value={(agentSettings.extraPathDirs || []).join('\n')}
                          onChange={(e) => {
                            const dirs = e.target.value
                              .split('\n')
                              .map((s) => s.trim())
                              .filter(Boolean);
                            updateSettings({
                              aiAgents: {
                                ...agentSettings,
                                extraPathDirs: dirs,
                              },
                            });
                          }}
                        />
                      </SettingsRow>

                      <SettingsRow
                        label="Clear agent data"
                        description="Clear recent folders and encrypted environment variables stored for all agents."
                      >
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={async () => {
                            if (confirm('Clear all AI Agent recent folders and saved secrets?')) {
                              await window.api?.aiAgents?.clearData?.();
                              alert('AI Agent user state cleared.');
                            }
                          }}
                        >
                          Clear Data
                        </button>
                      </SettingsRow>
                    </SettingsSection>
                  );
                })()}

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
              <Suspense fallback={<div style={{ padding: 24, color: 'var(--text-muted)' }}>Loading Shell Experience...</div>}>
                <ShellExperienceSettingsView
                  subSection={currentSection.replace('shellexp-', '') as ShellExperienceSubTab}
                />
              </Suspense>
            )}

            {currentSection === 'perf' && (
              <>
                <SettingsSection
                  title="Startup Timeline Markers"
                  description="Hardware timestamps captured from main and preload initialization."
                  action={
                    <button
                      type="button"
                      className={styles.learnMoreLink}
                      onClick={() => {
                        onClose();
                        useWorkspaceStore.getState().openDocs('performance');
                      }}
                    >
                      Learn more
                    </button>
                  }
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

            {currentSection === 'help' && (
              <>
                <SettingsSection
                  title="Help & Support"
                  description="Troubleshoot issues, inspect diagnostic metadata, or report bugs to maintainers."
                >
                  <SettingsRow
                    label="Documentation Guides"
                    description="Browse all 19 offline documentation topics and customization guides."
                  >
                    <button
                      type="button"
                      className={styles.controlSecondaryButton}
                      onClick={() => {
                        onClose();
                        useWorkspaceStore.getState().openDocs('01-getting-started');
                      }}
                    >
                      Open Documentation (F1)
                    </button>
                  </SettingsRow>

                  <SettingsRow
                    label="Copy System Diagnostics"
                    description="Generates a redacted diagnostics report (no secrets or typed commands) and copies it to clipboard."
                  >
                    <button
                      type="button"
                      className={styles.controlSecondaryButton}
                      onClick={async () => {
                        try {
                          const diag = await window.api?.app?.copyDiagnostics?.();
                          if (diag) {
                            await navigator.clipboard.writeText(diag);
                            setHelpNotice('Redacted diagnostics copied to clipboard!');
                            setTimeout(() => setHelpNotice(null), 3500);
                          }
                        } catch {}
                      }}
                    >
                      Copy Diagnostics
                    </button>
                  </SettingsRow>

                  <SettingsRow
                    label="Report an Issue"
                    description="Copies diagnostics and opens GitHub with prefilled environment info."
                  >
                    <button
                      type="button"
                      className={styles.controlPrimaryButton}
                      onClick={async () => {
                        try {
                          const diag = await window.api?.app?.copyDiagnostics?.();
                          if (diag) {
                            await navigator.clipboard.writeText(diag);
                          }
                          await window.api?.app?.reportIssue?.('bug');
                          setHelpNotice('Diagnostics copied! Paste into the GitHub issue description.');
                          setTimeout(() => setHelpNotice(null), 5000);
                        } catch {}
                      }}
                    >
                      Report an Issue
                    </button>
                  </SettingsRow>

                  <SettingsRow
                    label="Request a Feature"
                    description="Suggest a capability or enhancement on GitHub."
                  >
                    <button
                      type="button"
                      className={styles.controlSecondaryButton}
                      onClick={async () => {
                        await window.api?.app?.reportIssue?.('feature');
                      }}
                    >
                      Request a Feature
                    </button>
                  </SettingsRow>

                  <SettingsRow
                    label="Open Application Logs"
                    description="Open the local folder where application logs and traces are stored."
                  >
                    <button
                      type="button"
                      className={styles.controlSecondaryButton}
                      onClick={() => window.api?.app?.openLogFolder?.()}
                    >
                      Open Logs Folder
                    </button>
                  </SettingsRow>
                </SettingsSection>

                {helpNotice && (
                  <div style={{ padding: 12, borderRadius: 6, background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', color: 'var(--accent)', fontSize: 13, marginBottom: 16 }}>
                    {helpNotice}
                  </div>
                )}

                <SettingsSection
                  title="About Terminal Manager"
                  description="System versions, runtime engines, and license information."
                >
                  <SettingsRow label="App Version" description="Current installed application release">
                    <span style={{ fontWeight: 600 }}>0.1.0</span>
                  </SettingsRow>
                  <SettingsRow label="Desktop Shell" description="Electron & Chromium runtime">
                    <span>Electron 34.2.0 (Chromium 134)</span>
                  </SettingsRow>
                  <SettingsRow label="Node Runtime" description="Internal Node.js process runtime">
                    <span>Node.js v20.18.3</span>
                  </SettingsRow>
                  <SettingsRow label="License" description="Open-source software license">
                    <span>MIT License</span>
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
