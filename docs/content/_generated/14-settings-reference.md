---
id: settings-reference
title: Settings Reference
order: 14
summary: Complete reference of all configurable settings, default values, locations in the UI, and storage files.
tags: ["settings", "preferences", "configuration", "reference"]
since: 0.1.0
updated: 2026-10-13
---
<!-- Generated, do not edit -->

# Settings Reference

This reference documents every configuration key available in Terminal Manager, including its setting key, UI label, location in the interface, default value, allowed values, and storage file path.

## Storage Locations

All user settings are persisted in human-readable JSON files located in your Windows roaming app data directory:
- Primary settings: `%APPDATA%\terminal-manager\settings.json`
- Terminal profiles: `%APPDATA%\terminal-manager\profiles.json`
- Saved snippets: `%APPDATA%\terminal-manager\snippets.json`
- Script definitions: `%APPDATA%\terminal-manager\scripts\scripts.json`
- AI Agent states: `%APPDATA%\terminal-manager\agents\user-state.json`

Settings modifications written through the UI use atomic temporary file writes with replace operations to eliminate risk of file corruption.

## Configuration Keys Reference

| Setting Key | UI Label | UI Location | Default Value | Allowed Values | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `theme` | **Theme Palette** | Settings > General > Theme & Appearance | `'midnight'` | `'midnight' \| 'graphite'` | Selects the primary dark surface theme palette across the window frame, sidebar, tab bar, and terminal canvas. |
| `accent` | **Accent Color** | Settings > General > Theme & Appearance (or Profile Accent) | `'#6C8CFF'` | `Hex color string (e.g. #6C8CFF, #10B981, #F59E0B)` | Primary UI accent highlight color applied to focus rings, active tabs, buttons, and status indicators. |
| `windowMaterial` | **Window Material** | Settings > General > Theme & Appearance | `'mica'` | `'mica' \| 'acrylic' \| 'solid'` | Windows 11 desktop background material blending for the window frame. Mica tints with desktop wallpaper, Acrylic provides translucent blur, and Solid applies opaque dark surfaces. |
| `animationLevel` | **Animation Level** | Settings > General > Theme & Appearance | `'full'` | `'full' \| 'reduced' \| 'off'` | Controls UI transition effects. Full enables spring physics and smooth transitions; Reduced restricts to fades; Off uses instant state swaps. |
| `uiDensity` | **UI Density** | Settings > General > Terminal & Typography | `'normal'` | `'compact' \| 'normal' \| 'comfortable'` | Controls the vertical padding and height scale for tab headers, sidebar rails, and status bar controls. |
| `fontFamily` | **Font Family** | Settings > General > Terminal & Typography | `'CaskaydiaCove Nerd Font Mono', 'Cascadia Code', monospace` | `CSS font-family string with fallback fonts` | Monospace font stack rendered inside xterm.js terminal panes. |
| `fontSize` | **Font Size (px)** | Settings > General > Terminal & Typography | `14` | `8 to 36` | Terminal text output font size in pixels. |
| `lineHeight` | **Line Height** | Settings > General > Terminal & Typography | `1.2` | `0.8 to 3.0` | Vertical line height multiplier for monospace terminal character rows. |
| `cursorStyle` | **Cursor Style** | Settings > General > Terminal & Typography | `'block'` | `'block' \| 'underline' \| 'bar'` | Visual geometry of the terminal cursor when focused. |
| `cursorBlink` | **Enable Cursor Blinking** | Settings > General > Terminal & Typography | `true` | `true \| false` | Toggles whether the terminal cursor flashes when the pane has active focus. |
| `scrollback` | **Scrollback Lines** | Settings > General > Terminal & Typography | `10000` | `100 to 50000` | Maximum retained buffer rows stored in memory per terminal pane. |
| `defaultShell` | **Default Shell** | Settings > General > Terminal & Typography | `'' (auto-detected default)` | `Executable path string (e.g. pwsh.exe, powershell.exe, cmd.exe, wsl.exe)` | Executable path used when creating new terminal tabs without an explicit profile. |
| `rightClickAction` | **Right-click action** | Settings > General > Terminal Context Menu & Actions Panel | `'contextMenu'` | `'contextMenu' \| 'copyOrPaste' \| 'paste'` | Action triggered when clicking the right mouse button in the terminal viewport. Shift+Right-click always opens the menu. |
| `confirmMultiLinePaste` | **Confirm multi-line paste** | Settings > General > Terminal Context Menu & Actions Panel | `true` | `true \| false` | Displays a preview modal with line count and sanitize options when pasting multi-line text or text exceeding 2,000 characters. |
| `shellIntegration` | **Shell integration (OSC 133 / OSC 7)** | Settings > General > Terminal Context Menu & Actions Panel | `true` | `true \| false` | Enables ANSI escape sequence markers to track command boundaries, output ranges, and current working directory. |
| `showSearchTheWeb` | **Show 'Search the web'** | Settings > General > Terminal Context Menu & Actions Panel | `true` | `true \| false` | Displays quick web search links in the right-click menu when text is selected in the terminal. |
| `defaultSearchEngine` | **Default search engine** | Settings > General > Terminal Context Menu & Actions Panel | `'google'` | `'google' \| 'bing' \| 'duckduckgo'` | Web search provider used for selected query lookups. |
| `clipboardHistorySize` | **Clipboard history size** | Settings > General > Terminal Context Menu & Actions Panel | `10` | `1 to 50` | Maximum number of terminal-copied snippets kept in memory during the running session. Destroyed on quit. |
| `actionsPanelPinned` | **Pin Actions Panel by default** | Settings > General > Terminal Context Menu & Actions Panel | `false` | `true \| false` | Keeps the Actions Panel docked beside the active terminal instead of dismissing it after action execution. |
| `contextMenuVisibility` | **Customize context menu** | Settings > General > Terminal Context Menu & Actions Panel | `{} (all groups visible)` | `Map of group IDs (group-clipboard, group-selection, group-project, group-ai-agents, group-quick, group-saved, group-window, group-actions-panel) to boolean` | Toggles visibility for individual sections and action categories in the terminal right-click menu. |
| `projectRunner.showPlayButton` | **Show Project Runner button** | Settings > General > Project Runner | `true` | `true \| false` | Displays the Play action strip at the bottom of a terminal pane when a project is detected in the working directory. |
| `projectRunner.autoDetect` | **Auto-detect on folder change** | Settings > General > Project Runner | `true` | `true \| false` | Automatically scans project manifest files (package.json, Cargo.toml, pyproject.toml, etc.) whenever the terminal changes directory. |
| `projectRunner.showPrePostScripts` | **Show pre/post scripts** | Settings > General > Project Runner | `false` | `true \| false` | Includes pre- and post-lifecycle scripts (e.g. prebuild, posttest) in package.json run menus. |
| `projectRunner.defaultRunTarget` | **Default run target** | Settings > General > Project Runner | `'terminal'` | `'terminal' \| 'new-tab'` | Specifies where project commands execute when triggered normally. |
| `projectRunner.confirmGlobalInstalls` | **Confirm global installs** | Settings > General > Project Runner | `true` | `true \| false` | Requires explicit confirmation before running global package installation commands (such as npm -g or pip outside a virtualenv). |
| `projectRunner.suggestFromInternet` | **Package suggestions from internet** | Settings > General > Project Runner | `true` | `true \| false` | Queries online registry APIs (npm, PyPI) to autocomplete package names and version details in the Add Package dialog. |
| `projectRunner.offlineMode` | **Offline mode** | Settings > General > Project Runner | `false` | `true \| false` | Disables all outbound network calls for package search and metadata lookups, using offline curated suggestions only. |
| `projectRunner.enabledEcosystems` | **Enabled ecosystems** | Settings > General > Project Runner | `All 10 ecosystems enabled (node, python, rust, go, dotnet, java, php, ruby, docker, generic)` | `Map of ecosystem IDs to boolean` | Selects which project development environments to detect and display in the Project Runner. |
| `aiAgents.defaultLaunchMode` | **Default launch mode** | Settings > General > AI Agents | `'tab'` | `'terminal' \| 'tab' \| 'window'` | Target execution surface when launching an AI CLI agent from shortcuts, tray menu, or context menus. |
| `aiAgents.showInExplorerMenu` | **Show AI Agents in Explorer menu** | Settings > General > AI Agents | `true` | `true \| false` | Registers an AI Agents cascading submenu in Windows Explorer when right-clicking folders or drive backgrounds. |
| `aiAgents.showInTrayMenu` | **Show in tray menu** | Settings > General > AI Agents | `true` | `true \| false` | Lists installed AI agents and recent folders in the Windows system tray notification area context menu. |
| `aiAgents.autoRescanOnStart` | **Auto rescan on app start** | Settings > General > AI Agents | `true` | `true \| false` | Probes system PATH and developer directories for newly installed AI agent binaries upon application start. |
| `aiAgents.extraPathDirs` | **Extra PATH directories to scan** | Settings > General > AI Agents | `[]` | `Array of absolute directory path strings` | Custom directory paths scanned in addition to the system PATH when locating AI agent executables. |
| `explorerContextMenu` | **Add to Explorer context menu** | Settings > General > System Integration | `true` | `true \| false` | Registers 'Open in Terminal Manager' and '(New Window)' entries in the Windows Explorer right-click menu (HKCU). |
| `keepRunningInBackground` | **Keep running in background** | Settings > General > System Integration | `true` | `true \| false` | Leaves the main process and active terminal sessions running in the Windows notification tray when windows are closed. |
| `startWithWindows` | **Start with Windows** | Settings > General > System Integration | `false` | `true \| false` | Configures Windows user login settings to start Terminal Manager automatically on startup. |
| `startMinimizedToTray` | **Start minimized to tray** | Settings > General > System Integration | `false` | `true \| false` | Launches the application silently in the background tray without displaying the primary workspace window. |
| `openFolderTerminalsIn` | **Open folder terminals in** | Settings > General > System Integration | `'standalone'` | `'standalone' \| 'tab'` | Determines whether folder context menu launches open a new standalone window or a new tab in the existing main window. |
| `scriptRunner.defaultOnFailure` | **Default On-Failure Policy** | Settings > General > Script Runner | `'stop'` | `'stop' \| 'continue' \| 'retry'` | Default queue behavior when a script exits with a non-zero exit code. |
| `scriptRunner.defaultTimeoutSeconds` | **Default Timeout (Seconds)** | Settings > General > Script Runner | `0 (no timeout)` | `0 to 3600` | Maximum permitted execution duration in seconds before terminating a script process tree (0 disables timeout). |
| `scriptRunner.logRetentionCount` | **Log Retention Count** | Settings > General > Script Runner | `50` | `10 to 500` | Number of past execution log files preserved in the application data directory before pruning. |
| `scriptRunner.notificationsEnabled` | **Queue Completion Notifications** | Settings > General > Script Runner | `true` | `true \| false` | Displays a native Windows desktop notification when a script queue completes, fails, or times out. |
| `scriptRunner.preferPwsh` | **Prefer PowerShell 7 over Windows PowerShell** | Settings > General > Script Runner | `true` | `true \| false` | Prefers modern pwsh.exe when running PowerShell scripts, falling back to powershell.exe if unavailable. |

## Modifying Settings Programmatically

Settings can be inspected or updated over the validated Electron IPC channels:
- `settings:get` returns the complete `AppSettings` object.
- `settings:set` accepts a `Partial<AppSettings>` payload validated against the Zod schema in `src/shared/ipc.ts`.
