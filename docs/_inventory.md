# Terminal Manager Feature Inventory

This document is the code-verified inventory of all user-facing features across the Terminal Manager codebase (`c:\Users\SHABBIR TRADERS\Desktop\CUstomized-Terminal`).
Every row maps directly to source implementations, setting keys, shortcuts, IPC channels, and CLI flags.

Status legend:
- **implemented**: Fully implemented in codebase and functional.
- **partially implemented**: Partially functional with documented boundaries.
- **missing**: Feature concept or seam referenced in roadmap/docs but not present in current runtime.

---

## 1. Profiles & Shell Execution

| Feature | Source File(s) | Setting / Store Key | Shortcut | IPC Channel | CLI Flag | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Profile Name | `src/main/profilesStore.ts`<br>`src/renderer/features/profiles/ProfilesView.tsx` | `profile.name` | — | `profiles:save`<br>`profiles:get` | `--profile <id\|name>` | implemented |
| Tab Title Override | `src/renderer/features/profiles/ProfilesView.tsx` | `profile.tabTitle` | — | `profiles:save` | — | implemented |
| Run as Administrator | `src/renderer/features/profiles/ProfilesView.tsx`<br>`src/main/sessionManager.ts` | `profile.elevate` | — | `pty:create` (`admin: true`) | — | implemented |
| Accent Color & Swatches | `src/renderer/features/profiles/ProfilesView.tsx` | `profile.color` | — | `profiles:save` | — | implemented |
| Profile Icon Selector | `src/renderer/features/profiles/ProfilesView.tsx` | `profile.icon` | — | `profiles:save` | — | implemented |
| Custom Font Family | `src/renderer/features/profiles/ProfilesView.tsx`<br>`src/renderer/features/terminal/TerminalInstance.ts` | `profile.fontFamily` | — | `profiles:save` | — | implemented |
| Custom Font Size | `src/renderer/features/profiles/ProfilesView.tsx` | `profile.fontSize` | — | `profiles:save` | — | implemented |
| Shell Executable Path | `src/renderer/features/profiles/ProfilesView.tsx`<br>`src/main/shellDetector.ts` | `profile.shellPath` | — | `profiles:save`<br>`shells:detect` | — | implemented |
| Command Arguments | `src/renderer/features/profiles/ProfilesView.tsx` | `profile.shellArgs` | — | `profiles:save` | — | implemented |
| Starting Directory (CWD) | `src/renderer/features/profiles/ProfilesView.tsx`<br>`src/main/cliHandler.ts` | `profile.cwd` | — | `profiles:save` | `--cwd <path>` | implemented |
| Custom Environment Variables | `src/renderer/features/profiles/ProfilesView.tsx` | `profile.env` | — | `profiles:save` | — | implemented |
| Launch Tab from Profile | `src/renderer/features/profiles/ProfilesView.tsx` | — | — | `pty:create` | — | implemented |
| Duplicate Profile | `src/renderer/store/useProfilesStore.ts` | — | — | `profiles:save` | — | implemented |
| Delete Profile | `src/renderer/store/useProfilesStore.ts` | — | — | `profiles:delete` | — | implemented |
| Set Default Profile | `src/renderer/store/useProfilesStore.ts` | `profile.isDefault` | — | `profiles:set-default` | — | implemented |
| Auto-detect Installed Shells | `src/main/shellDetector.ts` | — | — | `shells:detect`<br>`profiles:detect` | — | implemented |

---

## 2. Appearance & Design System Settings

| Feature | Source File(s) | Setting / Store Key | Shortcut | IPC Channel | CLI Flag | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Theme Palette (Midnight / Graphite) | `src/renderer/design/tokens.css`<br>`src/renderer/components/settings/SettingsView.tsx` | `settings.theme` | — | `settings:set`<br>`settings:get` | — | implemented |
| Custom Theme Files (.css/.json import/export) | — | — | — | — | — | **missing** |
| Accent Color Customization | `src/renderer/design/tokens.css`<br>`src/shared/types.ts` | `settings.accent` | — | `settings:set` | — | implemented |
| Window Material (Mica / Acrylic / Solid) | `src/main/index.ts`<br>`src/renderer/components/settings/SettingsView.tsx` | `settings.windowMaterial` | — | `settings:set` | — | implemented |
| UI Density (Compact / Normal / Comfortable) | `src/renderer/components/settings/SettingsView.tsx` | `settings.uiDensity` | — | `settings:set` | — | implemented |
| Animation Level (Full / Reduced / Off) | `src/renderer/components/settings/SettingsView.tsx` | `settings.animationLevel` | — | `settings:set` | — | implemented |
| Typography (Font Size 8–36px) | `src/renderer/components/settings/SettingsView.tsx` | `settings.fontSize` | — | `settings:set` | — | implemented |
| Cursor Style (Block / Underline / Bar) | `src/renderer/components/settings/SettingsView.tsx` | `settings.cursorStyle` | — | `settings:set` | — | implemented |
| Cursor Blinking Toggle | `src/renderer/components/settings/SettingsView.tsx` | `settings.cursorBlink` | — | `settings:set` | — | implemented |
| Scrollback Lines Buffer | `src/renderer/components/settings/SettingsView.tsx` | `settings.scrollback` | — | `settings:set` | — | implemented |

---

## 3. Shell Experience & PowerShell Engine

| Feature | Source File(s) | Setting / Store Key | Shortcut | IPC Channel | CLI Flag | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| App-scoped vs System-wide Mode | `src/main/shell-experience/profileManager.ts`<br>`src/main/shell-experience/systemProfileManager.ts` | `shellexp.mode` | — | `shellexp:set-mode` | — | implemented |
| Fast Start Bytecode Caching | `src/main/shell-experience/generator.ts` | `shellexp.advanced.fastStart` | — | `shellexp:set-settings` | — | implemented |
| Dependency Checklist Detection | `src/main/shell-experience/dependencyManager.ts` | — | — | `shellexp:status` | — | implemented |
| PowerShell 7 (pwsh) Dependency | `src/main/shell-experience/dependencyManager.ts` | `dependencies['pwsh']` | — | `shellexp:install` | — | implemented |
| Oh My Posh Dependency & Prompt Gallery | `src/main/shell-experience/themeManager.ts` | `shellexp.activeTheme` | — | `shellexp:list-themes`<br>`shellexp:preview-theme` | — | implemented |
| zoxide Directory Jumper Dependency | `src/main/shell-experience/dependencyManager.ts` | `dependencies['zoxide']` | — | `shellexp:install` | — | implemented |
| Terminal-Icons Integration & Custom Overrides | `src/main/shell-experience/generator.ts` | `shellexp.icons` | — | `shellexp:set-settings` | — | implemented |
| Nerd Font Glyph Dependency Detection | `src/main/shell-experience/dependencyManager.ts` | `dependencies['nerdfont']` | — | `shellexp:status` | — | partially implemented |
| 17-Slot PSReadLine Syntax Highlighting Colors | `src/shared/shellExperienceTypes.ts`<br>`src/renderer/features/shell-experience/SyntaxColorsSection.tsx` | `shellexp.colors.*` | — | `shellexp:set-settings` | — | implemented |
| Predictive IntelliSense Configuration | `src/renderer/features/shell-experience/PredictionSection.tsx` | `shellexp.prediction.*` | — | `shellexp:set-settings` | — | implemented |
| Custom Shell Keybindings | `src/renderer/features/shell-experience/KeybindingsSection.tsx` | `shellexp.keybindings` | — | `shellexp:set-settings` | — | implemented |
| Upstream Command Toggles & Custom Aliases | `src/renderer/features/shell-experience/CommandsSection.tsx` | `shellexp.disabledCommands`<br>`shellexp.customAliases` | — | `shellexp:set-settings` | — | implemented |
| Advanced Scripting & Custom User Region | `src/renderer/features/shell-experience/AdvancedSection.tsx` | `shellexp.advanced.rawUserCode` | — | `shellexp:read-user-region`<br>`shellexp:write-user-region`<br>`shellexp:probe-syntax` | — | implemented |

---

## 4. Terminal Core, Tabs, Splits & Context Actions

| Feature | Source File(s) | Setting / Store Key | Shortcut | IPC Channel | CLI Flag | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Tabs Creation & Management | `src/renderer/features/layout/useWorkspaceStore.ts`<br>`src/renderer/components/TabStrip.tsx` | — | `Ctrl+Shift+T` | `pty:create` | — | implemented |
| Tab Reordering & Color Tagging | `src/renderer/features/terminal-actions/TerminalContextMenu.tsx` | `tab.color` | — | — | — | implemented |
| Tab Title Renaming | `src/renderer/features/terminal-actions/TerminalContextMenu.tsx` | `tab.title` | — | — | — | implemented |
| Tab Direct Switching | `src/renderer/app/App.tsx` | — | `Alt+1` .. `Alt+9` | — | — | implemented |
| Split Panes (Horizontal / Vertical) | `src/renderer/features/layout/useWorkspaceStore.ts` | — | `Ctrl+Shift+D` (col)<br>`Ctrl+Shift+E` (row) | `pty:create` | — | implemented |
| Close Pane / Tab | `src/renderer/features/layout/useWorkspaceStore.ts` | — | `Ctrl+Shift+W` | `pty:kill` | — | implemented |
| Spatial Focus Traversal | `src/renderer/app/App.tsx` | — | `Alt+Up/Down/Left/Right` | — | — | implemented |
| Maximize / Unmaximize Pane | `src/renderer/features/layout/useWorkspaceStore.ts` | — | `Ctrl+Shift+Enter` | — | — | implemented |
| Hardware WebGL Terminal Acceleration | `src/renderer/features/terminal/TerminalInstance.ts` | — | — | — | — | implemented |
| Search in Scrollback | `src/renderer/features/terminal/TerminalInstance.ts`<br>`src/renderer/features/terminal/PaneHeader.tsx` | — | `Ctrl+Shift+F`<br>`Ctrl+F` | — | — | implemented |
| Smart Copy & Paste | `src/renderer/features/terminal/TerminalInstance.ts` | — | `Ctrl+C` / `Ctrl+V` | — | — | implemented |
| Right-click Action Setting | `src/renderer/components/settings/SettingsView.tsx` | `settings.rightClickAction` | — | `settings:set` | — | implemented |
| Multi-line Paste Confirmation Modal | `src/renderer/features/terminal-actions/MultiLinePasteModal.tsx` | `settings.confirmMultiLinePaste` | — | `settings:set` | — | implemented |
| Shell Integration (OSC 133 / OSC 7 Markers) | `src/renderer/features/terminal-actions/shellIntegrationStore.ts` | `settings.shellIntegration` | — | `settings:set` | — | implemented |
| Context Menu with Hover Submenus & Portals | `src/renderer/features/terminal-actions/TerminalContextMenu.tsx` | `settings.contextMenuVisibility` | Shift+Right-click | — | — | implemented |
| Selection-Aware Path Actions | `src/renderer/features/terminal-actions/TerminalContextMenu.tsx` | — | — | `system:open-path`<br>`system:show-item-in-folder`<br>`system:open-in-editor` | — | implemented |
| Selection-Aware URL / Browser Launch | `src/renderer/features/terminal-actions/TerminalContextMenu.tsx` | — | — | `system:open-external` | — | implemented |
| Selection-Aware Port Inspection | `src/renderer/features/terminal-actions/TerminalContextMenu.tsx` | — | — | `pty:write` | — | implemented |
| Web Search Selection Action | `src/renderer/features/terminal-actions/TerminalContextMenu.tsx` | `settings.showSearchTheWeb`<br>`settings.defaultSearchEngine` | — | `system:open-external` | — | implemented |
| Actions Panel (Docked / Slide-out) | `src/renderer/features/terminal-actions/ActionsPanel.tsx` | `settings.actionsPanelPinned` | `Ctrl+Shift+A` | — | — | implemented |
| Snippets Storage & Parameterized Variables | `src/main/snippetsStore.ts`<br>`src/renderer/features/terminal-actions/SnippetVariableDialog.tsx` | — | — | `snippets:get`<br>`snippets:save`<br>`snippets:delete`<br>`snippets:import` | — | implemented |
| Clipboard History Buffer | `src/renderer/features/terminal-actions/clipboardHistoryStore.ts` | `settings.clipboardHistorySize` | — | — | — | implemented |
| Read-Only Terminal Mode | `src/renderer/features/terminal-actions/TerminalContextMenu.tsx` | — | — | — | — | implemented |
| Broadcast Input Across Tabs | `src/renderer/features/terminal-actions/TerminalContextMenu.tsx` | — | — | `pty:write` | — | implemented |

---

## 5. Standalone Windows, System Integration & CLI

| Feature | Source File(s) | Setting / Store Key | Shortcut | IPC Channel | CLI Flag | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Pop Out Tab to Standalone Window | `src/main/standaloneWindowManager.ts` | — | — | `session:pop-out` | — | implemented |
| Re-dock Standalone Window to Main Window | `src/main/standaloneWindowManager.ts` | — | — | `session:dock` | — | implemented |
| Standalone Window Close Policy | `src/main/standaloneWindowManager.ts` | — | — | `session:standalone-close` | — | implemented |
| Keep Running in Background (System Tray) | `src/main/trayManager.ts` | `settings.keepRunningInBackground` | — | `settings:set` | — | implemented |
| Start Minimized to Tray | `src/main/index.ts` | `settings.startMinimizedToTray` | — | `settings:set` | `--hidden` | implemented |
| Start with Windows (Login Startup) | `src/main/index.ts` | `settings.startWithWindows` | — | `settings:set` | — | implemented |
| Windows Explorer "Open in Terminal Manager" | `src/main/registryIntegration.ts` | `settings.explorerContextMenu` | — | `system:registry-repair`<br>`system:registry-get-status` | — | implemented |
| Windows Explorer "Open in Terminal Manager (New Window)" | `src/main/registryIntegration.ts` | `settings.explorerContextMenu` | — | `system:registry-repair` | — | implemented |
| Windows Taskbar Jump List | `src/main/trayManager.ts` | — | — | — | — | implemented |
| Single-Instance Argument Forwarding | `src/main/index.ts`<br>`src/main/cliHandler.ts` | — | — | — | — | implemented |
| CLI `--cwd <path>` Flag | `src/main/cliHandler.ts` | — | — | — | `--cwd` | implemented |
| CLI `--profile <name\|id>` Flag | `src/main/cliHandler.ts` | — | — | — | `--profile` | implemented |
| CLI `--new-window` Flag | `src/main/cliHandler.ts` | — | — | — | `--new-window` | implemented |
| CLI `--dock` Flag | `src/main/cliHandler.ts` | — | — | — | `--dock` | implemented |
| CLI `--hidden` Flag | `src/main/cliHandler.ts` | — | — | — | `--hidden` | implemented |
| CLI `--run-sequence <id>` Flag | `src/main/cliHandler.ts` | — | — | — | `--run-sequence` | implemented |
| CLI `--agent <id>` Flag | `src/main/cliHandler.ts` | — | — | — | `--agent` | implemented |
| CLI `--agents-panel` Flag | `src/main/cliHandler.ts` | — | — | — | `--agents-panel` | implemented |
| CLI `--mode <tab\|window>` Flag | `src/main/cliHandler.ts` | — | — | — | `--mode` | implemented |
| CLI `--resume` Flag | `src/main/cliHandler.ts` | — | — | — | `--resume` | implemented |

---

## 6. Script Runner & Queue Automation

| Feature | Source File(s) | Setting / Store Key | Shortcut | IPC Channel | CLI Flag | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Multi-Interpreter Execution Engine | `src/main/scripts/interpreterDetector.ts` | — | — | `scripts:get-interpreters` | — | implemented |
| Script Definition Library & Editor | `src/renderer/features/scripts/ScriptRunnerView.tsx`<br>`src/main/scripts/scriptsStore.ts` | — | `Ctrl+Shift+R` | `scripts:get-all`<br>`scripts:save`<br>`scripts:delete` | — | implemented |
| FIFO Execution Queue Engine | `src/main/scripts/scriptRunner.ts` | — | — | `scripts:runner-start`<br>`scripts:runner-pause`<br>`scripts:runner-stop`<br>`scripts:runner-skip` | — | implemented |
| Configurable Failure Policies (Stop/Continue/Retry) | `src/shared/scriptRunnerTypes.ts` | `script.onFailure`<br>`settings.scriptRunner.defaultOnFailure` | — | `scripts:save` | — | implemented |
| Process Tree Timeouts & Taskkill Cleanup | `src/main/scripts/scriptRunner.ts` | `script.timeoutSeconds`<br>`settings.scriptRunner.defaultTimeoutSeconds` | — | `scripts:save` | — | implemented |
| Named Script Sequences & Auto-run on Startup | `src/main/scripts/scriptsStore.ts` | `sequence.runOnAppStart` | — | `scripts:get-sequences`<br>`scripts:save-sequence`<br>`scripts:runner-load-sequence` | `--run-sequence` | implemented |
| Script History & Log File Retention | `src/main/scripts/scriptRunner.ts` | `settings.scriptRunner.logRetentionCount` | — | `scripts:get-history`<br>`scripts:open-log`<br>`scripts:clear-history` | — | implemented |
| Windows Desktop Notifications on Completion | `src/main/scripts/scriptRunner.ts` | `settings.scriptRunner.notificationsEnabled` | — | — | — | implemented |
| Script Import / Export with First-Run Approval | `src/main/scripts/scriptsStore.ts` | `script.hasApprovedRun` | — | `scripts:import`<br>`scripts:export` | — | implemented |

---

## 7. Project Runner

| Feature | Source File(s) | Setting / Store Key | Shortcut | IPC Channel | CLI Flag | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Read-Only Ecosystem Detection (10 Ecosystems) | `src/main/project-runner/projectDetector.ts` | `settings.projectRunner.enabledEcosystems` | — | `project-runner:detect` | — | implemented |
| Pane Play Strip Button | `src/renderer/features/project-runner/ProjectRunnerBar.tsx` | `settings.projectRunner.showPlayButton` | — | — | — | implemented |
| Grouped Project Drop-up Menu | `src/renderer/features/project-runner/ProjectRunnerMenu.tsx` | — | — | — | — | implemented |
| Primary Command Detection & Quick Launch | `src/main/project-runner/nodeDetector.ts` | `project.primaryCommand` | — | `project-runner:run` | — | implemented |
| Monorepo Workspace Package Script Parsing | `src/main/project-runner/nodeDetector.ts` | `project.workspaces` | — | `project-runner:detect` | — | implemented |
| Target Execution (This terminal, New tab, Split) | `src/renderer/features/project-runner/useProjectRunnerStore.ts` | `settings.projectRunner.defaultRunTarget` | — | `project-runner:run` | — | implemented |
| Interactive Add Package Modal | `src/renderer/features/project-runner/AddPackageModal.tsx` | — | — | `project-runner:validate-package`<br>`project-runner:search-packages` | — | implemented |
| Offline Mode for Package Search | `src/main/project-runner/packageSearcher.ts` | `settings.projectRunner.offlineMode` | — | `project-runner:search-packages` | — | implemented |
| Saved, Pinned & Custom Project Commands | `src/main/project-runner/projectRunnerStore.ts` | — | — | `project-runner:store-get`<br>`project-runner:store-save` | — | implemented |

---

## 8. AI Agents Catalog & Launcher

| Feature | Source File(s) | Setting / Store Key | Shortcut | IPC Channel | CLI Flag | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Data-Driven AI Agent Catalog (15 Agents) | `resources/agents.catalog.json` | — | — | `ai-agents:get-all` | — | implemented |
| Background Binary & Version Detection | `src/main/ai-agents/agentDetector.ts` | `settings.aiAgents.extraPathDirs`<br>`settings.aiAgents.autoRescanOnStart` | — | `ai-agents:detect-all` | — | implemented |
| Prerequisite Detection & One-Click Install | `src/main/ai-agents/prerequisiteDetector.ts` | — | — | `ai-agents:get-prereqs`<br>`ai-agents:install-prereq` | — | implemented |
| Interactive Script Installer with Safety Prompts | `src/main/ai-agents/agentInstaller.ts` | — | — | `ai-agents:install` | — | implemented |
| Windows DPAPI/AES Encrypted Secret Storage | `src/main/ai-agents/agentStateStore.ts` | — | — | `ai-agents:get-state`<br>`ai-agents:save-env` | — | implemented |
| Terminal Context Menu Quick Launch | `src/renderer/features/terminal-actions/TerminalContextMenu.tsx` | — | — | `ai-agents:launch` | — | implemented |
| Windows Explorer Context Menu Quick Launch | `src/main/ai-agents/explorerMenuManager.ts` | `settings.aiAgents.showInExplorerMenu` | — | — | — | implemented |
| System Tray Agent Quick Launch | `src/main/trayManager.ts` | `settings.aiAgents.showInTrayMenu` | — | — | — | implemented |
| Custom Agent Definition & Management | `src/main/ai-agents/agentCatalog.ts` | — | — | `ai-agents:add-custom`<br>`ai-agents:delete-custom` | — | implemented |
| System PATH Refresh on Install | `src/main/ai-agents/agentDetector.ts` | — | — | `ai-agents:add-to-path` | — | implemented |
| Dedicated AI Agents Management View | `src/renderer/features/ai-agents/AgentsView.tsx` | — | `Ctrl+Shift+G` | — | `--agents-panel` | implemented |

---

## 9. Performance, Diagnostics & Architecture Seams

| Feature | Source File(s) | Setting / Store Key | Shortcut | IPC Channel | CLI Flag | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Startup Timeline Markers (`perfTracker`) | `src/main/perfTracker.ts`<br>`src/renderer/perfTracker.ts` | — | — | `perf:get-main-timestamps` | — | implemented |
| Shell Memory Footprint Tracking | `src/main/sessionManager.ts` | — | — | `app:get-shell-memory` | — | implemented |
| Status Bar Diagnostics (ConPTY, GPU, CWD, RAM) | `src/renderer/components/StatusBar.tsx` | — | — | — | — | implemented |
| Backpressure Flow Control (512KB/128KB Watermarks) | `src/main/sessionManager.ts`<br>`src/renderer/features/terminal/TerminalInstance.ts` | — | — | `pty:ack`<br>`pty:data` | — | implemented |
| UAC Elevated Helper Daemon Process | `src/helper/README.md` | — | — | — | — | **missing** |
