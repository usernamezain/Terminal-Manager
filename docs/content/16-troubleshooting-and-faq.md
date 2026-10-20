---
id: troubleshooting-and-faq
title: Troubleshooting and FAQ
order: 16
summary: Solve common issues with working directories, missing PATH entries, font glyphs, execution policies, and logs.
tags:
  - troubleshooting
  - faq
  - logs
  - path
  - fonts
  - errors
since: 0.1.0
updated: 2026-10-13
---

## What It Is

This guide addresses common questions, operational anomalies, and error conditions encountered when configuring and running Terminal Manager. Follow the symptom-cause-fix instructions below to resolve issues rapidly.

## Frequently Asked Questions and Solutions

### 1. Terminal opens in the wrong folder

- **Symptom**: Right-clicking a folder or opening a new tab defaults to `C:\Users\<Username>` instead of your project directory.
- **Cause**: The folder path contained spaces or special characters and was incorrectly escaped, or the profile has a hardcoded CWD overriding your request.
- **Fix**:
  1. Open `Profiles` (`Ctrl+Shift+P`) and verify whether your active profile has a static **Starting Directory (CWD)** specified. If you want tabs to inherit the current folder, leave the profile CWD blank.
  2. If using Windows Explorer, open `Settings > General` and click **Repair Explorer Menu** to rewrite the registry verbs with escaped quotation marks.

### 2. AI Agent not found after installation (PATH issue)

- **Symptom**: You installed an AI agent (such as Claude Code or Aider), but the status shows **Not on PATH** or typing the command in the shell displays `The term is not recognized`.
- **Cause**: Windows does not broadcast updated environment variables to already-running desktop processes when CLI installers modify user `PATH`.
- **Fix**:
  1. In the AI Agents view (`Ctrl+Shift+G`), select the agent and click **Add to PATH** if visible.
  2. Click the **Rescan Agents** button in the AI Agents header. Terminal Manager re-reads `HKCU\Environment` and updates the active process environment table immediately.
  3. Open a new terminal tab to inherit the refreshed environment.

### 3. Missing Nerd Font glyphs (square boxes or question marks)

- **Symptom**: Prompt arrows, Git branch symbols, and file icons display as `?` or rectangle boxes.
- **Cause**: The active font does not contain Nerd Font vector glyph symbols.
- **Fix**:
  1. Download and install **CaskaydiaCove Nerd Font** or **JetBrainsMono Nerd Font** from [nerdfonts.com](https://www.nerdfonts.com).
  2. In Terminal Manager, open `Settings > General`.
  3. Under **Font Family**, enter `CaskaydiaCove Nerd Font`.
  4. Click **Glyph Test** in `Settings > Shell Experience > Overview` to verify that symbols display correctly.

### 4. PowerShell execution policy errors

- **Symptom**: Terminal displays `File ... cannot be loaded because running scripts is disabled on this system`.
- **Cause**: Windows client editions restrict execution of unsigned local PowerShell scripts by default.
- **Fix**:
  1. Terminal Manager automatically launches app-scoped sessions with `-ExecutionPolicy Bypass`.
  2. If running in system-wide mode, open an administrator PowerShell terminal and run:
     ```powershell
     Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
     ```

### 5. Oh My Posh prompt is slow or fails to load

- **Symptom**: Terminal startup takes 4+ seconds or prints an Oh My Posh binary execution error.
- **Cause**: An outdated Oh My Posh executable is installed, or the prompt theme queries slow network network drives.
- **Fix**:
  1. Update Oh My Posh via `winget upgrade JanDeDobbeleer.OhMyPosh`.
  2. Open `Settings > Shell Experience > Prompt Gallery` and switch to a lighter theme such as **Minimal** or **Agnoster**.
  3. Ensure **Fast Start (Cached & Lazy)** is selected in `Settings > Shell Experience > Overview`.

### 6. System tray icon is missing

- **Symptom**: You enabled **Keep Running in Background**, but cannot find the icon in the Windows taskbar.
- **Cause**: Windows placed the icon in the hidden notification overflow chevron (`^`), or `explorer.exe` was restarted.
- **Fix**:
  1. Click the `^` arrow on the right side of the Windows taskbar to see overflow icons.
  2. Drag the Terminal Manager icon onto the main taskbar tray to keep it permanently visible.
  3. If Explorer crashed, Terminal Manager automatically re-registers its tray icon upon the `TaskbarCreated` event.

### 7. Explorer context menu entries do not appear

- **Symptom**: Right-clicking folders in Windows Explorer does not show "Open in Terminal Manager".
- **Cause**: On Windows 11, classic context menu entries are placed inside the **Show more options** submenu.
- **Fix**:
  1. In Windows 11 Explorer, press `Shift+F10` on any folder or click **Show more options** at the bottom of the right-click menu.
  2. Verify that **Windows Explorer Context Menu** is toggled `On` in `Settings > General`.
  3. Click **Repair Explorer Menu** in `Settings > General` to force registry re-creation.

### 8. High memory usage across multiple tabs

- **Symptom**: Terminal Manager consumes more than 500 MB of RAM.
- **Cause**: Multiple inactive split panes each holding massive scrollback buffers (e.g., 50,000+ lines).
- **Fix**:
  1. Set `Settings > General > Scrollback Buffer` to `10000` lines.
  2. Right-click idle panes and choose **Clear Terminal** (`Ctrl+L`) to free scrollback memory.
  3. Close unused split panes (`Ctrl+Shift+W`).

## How to Collect Logs

When diagnosing complex issues or filing bug reports:

1. **Application Runtime Logs**:
   - Stored in `%APPDATA%\Terminal Manager\logs\main.log`.
   - Contains startup timestamps, window creation events, and IPC error traces.
2. **Script Runner Task Logs**:
   - Stored in `%APPDATA%\Terminal Manager\logs\scripts\<run-id>.log`.
   - Contains raw stdout and stderr for automated tasks.
3. **Shell Experience Initialization Logs**:
   - Stored in `%APPDATA%\Terminal Manager\cache\shellexp.log`.

To open the logs directory directly from PowerShell:

```powershell
explorer "$env:APPDATA\Terminal Manager\logs"
```

## How to Reset All Settings

To completely wipe all preferences, profiles, and caches and return the application to a clean state:

1. **Via User Interface**:
   - Open `Settings > General`.
   - Scroll to the bottom and click **Reset Settings to Defaults**.
   - Confirm the prompt.
2. **Via Filesystem (Clean Reset)**:
   - Close Terminal Manager completely (ensure it is quit from the system tray).
   - Delete or rename the configuration folder:
     ```powershell
     Remove-Item -Recurse -Force "$env:APPDATA\Terminal Manager"
     ```
   - Restart Terminal Manager. It will re-detect system shells and generate a fresh configuration.

## Related Topics

- [Getting Started](01-getting-started.md)
- [Performance](15-performance.md)
- [Security and Privacy](17-security-and-privacy.md)
