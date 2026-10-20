---
id: explorer-integration-and-command-line
title: Explorer Integration and Command Line
order: 9
summary: Register Windows Explorer context menus, understand directory resolution precedence, and use all command-line flags.
tags:
  - explorer
  - cli
  - flags
  - registry
  - cwd
  - arguments
since: 0.1.0
updated: 2026-10-13
---

## What It Is

Terminal Manager integrates with the Windows shell through Windows Explorer context menu entries and a set of command-line arguments. You can open any directory or drive root directly into a terminal from Explorer, or control window creation, profiles, script sequences, and AI agents from external scripts.

## Before You Start

- Windows Explorer integration uses current-user registry keys (`HKCU`) only. It does not require administrative elevation or UAC prompts.
- Ensure the folder path exists before passing it to `--cwd`.

## Windows Explorer Context Menu

### Context Menu Entries

When Explorer integration is enabled, right-clicking any folder, directory background, or drive root reveals:

1. **Open in Terminal Manager**: Launches the folder as a new tab inside the running Terminal Manager window. If the app is closed, it launches and opens the directory.
2. **Open in Terminal Manager (New Window)**: Launches the folder directly into a separate, standalone terminal window.

> **Note on Windows 11:** By default, Windows 11 groups classic context menu extensions under the **Show more options** submenu (or accessible by pressing `Shift+F10` on any selected folder).

### Enabling and Removing Explorer Integration

1. Open `Settings > General`.
2. Locate the **Windows Explorer Context Menu** toggle.
3. Toggle the switch to **On** to register the shell verbs, or **Off** to remove them completely.
4. If registry entries ever become out of sync (for example after moving the app executable), click the **Repair Explorer Menu** button in `Settings > General` to re-register the paths.

### Registry Storage Specification

All context menu registrations are written strictly to current-user hives:

- `HKCU\Software\Classes\Directory\shell\TerminalManager`
- `HKCU\Software\Classes\Directory\Background\shell\TerminalManager`
- `HKCU\Software\Classes\Drive\shell\TerminalManager`

Executable paths and directory arguments are properly wrapped in escaped quotes (`"%1"` and `"%V"`) to prevent parsing failures on folder names containing spaces.

## Working Directory (CWD) Resolution Rules

When launching a new terminal tab or window, Terminal Manager determines the working directory using the following precedence:

1. **Explicit Request / CLI Parameter**: If `--cwd <path>` or an Explorer launch path is provided, that directory is used first.
2. **Profile Working Directory**: If no CLI directory was passed, the starting directory configured on the active **Profile** is used.
3. **User Home Directory**: If neither the request nor the profile defines a valid directory (or if the configured folder does not exist on disk), the shell falls back to the user's home folder (`%USERPROFILE%` or `~`).

> **Tip:** When specifying drive roots (such as `C:\` or `D:\`), Terminal Manager preserves the trailing backslash to prevent Windows path parsing from treating drive roots as drive-relative paths.

## Command-Line Arguments Reference

Terminal Manager supports single-instance argument forwarding. If the application is already running, invoking the command line forwards arguments to the active instance.

| Flag | Argument | Description | Example |
| :--- | :--- | :--- | :--- |
| `--cwd` | `<path>` | Sets starting working directory | `terminal-manager --cwd "C:\Projects\app"` |
| `--profile` | `<name\|id>` | Selects profile to launch | `terminal-manager --profile "WSL Ubuntu"` |
| `--new-window` | — | Force launches in a new window | `terminal-manager --new-window` |
| `--dock` | — | Docks popped-out session back to main | `terminal-manager --dock` |
| `--hidden` | — | Starts app minimized to system tray | `terminal-manager --hidden` |
| `--run-sequence`| `<id>` | Runs named script queue sequence | `terminal-manager --run-sequence seq-build-all` |
| `--agent` | `<id>` | Launches specific AI agent immediately | `terminal-manager --agent claude-code` |
| `--agents-panel`| — | Opens directly into the AI Agents view | `terminal-manager --agents-panel` |
| `--mode` | `<tab\|window>`| Presentation mode for `--agent` or profile| `terminal-manager --agent aider --mode window` |
| `--resume` | — | Restores previous session tabs | `terminal-manager --resume` |

## Copyable CLI Examples

### Open Specific Folder in Default Shell

```powershell
terminal-manager --cwd "C:\Workspace\Backend"
```

### Open Folder in a New Standalone Window

```powershell
terminal-manager --cwd "D:\Repo" --new-window
```

### Launch PowerShell 7 Administrator Profile

```powershell
terminal-manager --profile "Admin PowerShell"
```

### Launch Claude Code in a Standalone Window

```powershell
terminal-manager --agent claude-code --mode window --cwd "C:\Workspace\Frontend"
```

### Execute Build Sequence Headlessly into Tray

```powershell
terminal-manager --hidden --run-sequence seq-nightly-build
```

## Troubleshooting

### Explorer menu opens the app but starts in home directory

- **Symptom**: Right-clicking a folder opens Terminal Manager in `C:\Users\<Username>` rather than the clicked directory.
- **Cause**: Folder name contained ampersands (`&`) or spaces and quotes were missing in the registry verb.
- **Fix**: Open `Settings > General` and click **Repair Explorer Menu**. The system rewrites the registry commands with fully escaped `%V` markers.

### "Terminal Manager is already running" does not forward arguments

- **Symptom**: Running a CLI flag with the app open does not create a new tab.
- **Cause**: Single-instance lock pipe was blocked by another process.
- **Fix**: Restart Terminal Manager. The main process automatically cleans stale single-instance lock files on boot.

## Related Topics

- [Standalone Windows and Tray](08-standalone-windows-tray-and-background.md)
- [Script Runner](10-script-runner.md)
- [AI Agents](12-ai-agents.md)
