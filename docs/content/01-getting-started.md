---
id: getting-started
title: Getting Started
order: 1
summary: Learn the interface layout, launch your first shell session, and configure your default terminal profile.
tags:
  - install
  - tour
  - navigation
  - quickstart
since: 0.1.0
updated: 2026-10-13
---

## What It Is

Terminal Manager is a hardware-accelerated Windows terminal workspace built with Electron, React, and xterm.js. It organizes multiple shell sessions into customizable tabs, split panes, and detachable standalone windows. It also provides built-in tools for script execution, project detection, and local AI agent management.

## Before You Start

Before launching Terminal Manager, confirm that your system meets the following baseline requirements:

- Windows 10 (version 19041 or higher) or Windows 11.
- PowerShell 7 (`pwsh.exe`), Windows PowerShell (`powershell.exe`), or Command Prompt (`cmd.exe`).
- A modern graphics driver capable of WebGL 2 rendering for accelerated terminal output.

## The Interface Tour

The main application window is divided into five primary functional regions:

1. **Left Navigation Rail**: A fixed vertical toolbar providing one-click access to the core workspace views:
   - **Terminals**: The primary tabbed workspace for active terminal sessions.
   - **Profiles**: The profile manager for creating and editing shell definitions.
   - **Script Runner**: The script library, FIFO execution queue, and history manager.
   - **AI Agents**: The local AI CLI agent catalog and environment configuration view.
   - **Settings**: System, theme, font, and shell experience preferences.
   - **Documentation**: The complete in-app searchable manual.
2. **Tab Strip**: Located at the top of the terminal view. Displays active terminal tabs with status indicators, split buttons, and a new tab button (`+`).
3. **Terminal Workspace**: The central region containing active xterm.js instances. Supports horizontal and vertical splits, selection highlighting, and scrollback search.
4. **Status Bar**: Located at the bottom edge. Displays real-time diagnostics including the active shell process ID, ConPTY backend status, WebGL acceleration state, active working directory (CWD), and shell memory usage.
5. **System Tray Icon**: Located in the Windows taskbar notification area. Allows minimizing the application to the background, launching pinned profiles, and executing recent commands without showing the main window.

## Launching Your First Terminal

When you open Terminal Manager for the first time, it automatically detects available shells on your system and launches your default profile in a new tab.

To open an additional terminal session:

1. Click the `+` button in the Tab Strip, or press `Ctrl+Shift+T`.
2. A new tab opens immediately using your default profile.
3. To split the current terminal into two side-by-side panes, press `Ctrl+Shift+D` (vertical column split).
4. To split the current terminal into top and bottom panes, press `Ctrl+Shift+E` (horizontal row split).
5. To close the active terminal pane, press `Ctrl+Shift+W` or type `exit`.

## Choosing Your Default Profile

Terminal Manager ships with built-in detection for PowerShell 7, Windows PowerShell, Command Prompt, Git Bash, and WSL distributions.

To set your preferred default shell:

1. Click **Profiles** in the left navigation rail, or press `Ctrl+Shift+P`.
2. In the left profile list, select the profile you want to make the default (for example, **PowerShell 7**).
3. In the profile editor pane, locate the **Default Profile** switch.
4. Toggle the switch to **On**. The profile badge updates to display a checkmark.
5. Future tabs opened with `Ctrl+Shift+T` will use this profile.

## Interface Controls Reference

| Control | Location | Shortcut | Description |
| :--- | :--- | :--- | :--- |
| Terminals View | Left Rail | `Alt+T` | Displays active terminal panes and tabs |
| Profiles View | Left Rail | `Ctrl+Shift+P` | Opens profile creation and configuration |
| Script Runner View | Left Rail | `Ctrl+Shift+R` | Opens automated script queues and history |
| AI Agents View | Left Rail | `Ctrl+Shift+G` | Opens AI agent catalog and installers |
| Settings Modal | Left Rail | `Ctrl+,` | Opens appearance, performance, and shell settings |
| Documentation | Left Rail / Menu | `F1` | Opens the in-app documentation browser |
| New Tab | Tab Strip | `Ctrl+Shift+T` | Opens a new terminal tab with the default profile |
| Split Vertical | Tab Strip / Pane | `Ctrl+Shift+D` | Splits active pane side by side |
| Split Horizontal | Tab Strip / Pane | `Ctrl+Shift+E` | Splits active pane top and bottom |
| Close Pane | Tab Strip / Pane | `Ctrl+Shift+W` | Terminates active terminal pane |

## Troubleshooting

### Terminal window shows a blank screen on startup

- **Cause**: WebGL renderer failed to initialize on your GPU driver.
- **Fix**: Open `Settings > General > Hardware Acceleration` or restart the app. The terminal automatically falls back to canvas rendering if WebGL is unsupported.

### Default shell is Command Prompt instead of PowerShell 7

- **Cause**: PowerShell 7 (`pwsh.exe`) was not detected in system `PATH` during initial setup.
- **Fix**: Install PowerShell 7 from Microsoft Store or `winget install Microsoft.PowerShell`, then open `Profiles` and click **Detect Shells** to refresh available paths.

## Related Topics

- [Profiles and Shell Setup](02-profiles.md)
- [Appearance and Themes](03-appearance-and-themes.md)
- [Terminal Basics and Splits](05-terminal-basics.md)
