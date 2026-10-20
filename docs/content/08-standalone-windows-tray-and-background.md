---
id: standalone-windows-tray-and-background
title: Standalone Windows, Tray and Background Mode
order: 8
summary: Detach terminal tabs into standalone windows, re-dock sessions, run in the background, and manage system tray behavior.
tags:
  - windows
  - standalone
  - tray
  - background
  - docking
  - persistence
since: 0.1.0
updated: 2026-10-13
---

## What It Is

In Terminal Manager, shell sessions live in the Node.js **main process**, completely decoupled from any individual renderer window. This architectural model allows you to pop out terminal tabs into independent **standalone desktop windows**, re-dock them back into the main workspace, and keep sessions running silently in the Windows system tray even when all windows are closed.

## Before You Start

- Standalone windows share your global theme and settings automatically.
- Enabling **Keep Running in Background** requires system tray support (standard on all Windows versions).

## Detaching Tabs into Standalone Windows

To detach any tab into an independent desktop window:

1. Right-click the tab in the Tab Strip, or right-click anywhere within the terminal canvas.
2. Select **Pop Out to Standalone Window**.
3. The main window removes the tab from its strip, and a new frameless desktop window appears immediately containing your active shell session.
4. The running process is never interrupted—its ConPTY stream, environment, and scrollback history remain intact.

## Re-Docking into the Main Window

To return a standalone window back to the main application:

1. In the titlebar of the standalone window, click the **Dock to Main Window** button (adjacent to the minimize button).
2. The standalone window closes, and the session re-attaches as a tab in your primary Terminal Manager window.
3. If the main window was minimized or closed to the tray, it restores automatically to receive the docked tab.

## Standalone Window Close Policy

When you click the close button (`X`) on a standalone window:

- The application displays a confirmation prompt: **"Close terminal process or dock to main window?"**
- Selecting **Terminate Session** kills the underlying shell process tree.
- Selecting **Dock to Main Window** closes the standalone window while preserving the running shell session inside the main tab strip.
- Closing a standalone window will **never** accidentally terminate your main window or other background tabs.

## System Tray and Background Mode

### Keep Running in Background

By default, closing the main window exits the application. To allow long-running processes (compilers, servers, Docker builds) to continue undisturbed:

1. Open `Settings > General`.
2. Locate **Keep Running in Background**.
3. Toggle the switch to **On**.
4. When enabled, clicking `X` on the main window hides it to the Windows notification area (system tray) instead of quitting.

### Start with Windows and Start Minimized

- **Start with Windows**: Toggling `Settings > General > Start with Windows` registers Terminal Manager in the current user's registry startup list (`HKCU\Software\Microsoft\Windows\CurrentVersion\Run`).
- **Start Minimized to Tray**: Toggling `Settings > General > Start Minimized to Tray` ensures the application launches silently into the notification area on computer startup without displaying an intrusive window.

## The System Tray Menu

Right-clicking the Terminal Manager tray icon in the Windows taskbar reveals quick access actions:

- **Show Terminal Manager**: Restores the primary workspace window.
- **New Tab with Default Profile**: Spawns a new tab immediately in the background.
- **Profiles Submenu**: Launch any configured profile directly into a new window or tab.
- **AI Agents Submenu**: Launch installed AI agents (like Claude or Aider) with one click.
- **Recent Commands**: Quick replay of your recent project runner tasks.
- **Quit Terminal Manager**: Fully terminates the application and closes all running shell sessions.

## Quit Confirmation Safeguards

To prevent accidental data loss when exiting:

- If you select **Quit** from the tray menu while long-running commands, active builds, or script queues are executing, Terminal Manager displays a prompt listing all active background processes.
- You can review the running sessions and confirm whether to abort them or cancel the exit operation.

## Options Reference

| Setting | Type | Default | Description | Stored In |
| :--- | :--- | :--- | :--- | :--- |
| `settings.keepRunningInBackground` | boolean | `false` | Hide window to tray on close instead of exiting | `userData/settings.json` |
| `settings.startMinimizedToTray` | boolean | `false` | Launch directly to system tray on startup | `userData/settings.json` |
| `settings.startWithWindows` | boolean | `false` | Launch automatically when logging into Windows | `HKCU Run Registry` |

## Troubleshooting

### Tray icon disappears after Windows Explorer restart

- **Symptom**: You restarted `explorer.exe` and the Terminal Manager tray icon is missing.
- **Cause**: Windows Explorer destroyed the taskbar notification area window handle.
- **Fix**: Terminal Manager listens for the Windows `TaskbarCreated` message and automatically re-registers its tray icon when Explorer restarts.

### Closing a standalone window closed the entire application

- **Symptom**: In an older version, closing a popped-out tab exited the program.
- **Cause**: Default Electron behavior exits when all browser windows emit `closed`.
- **Fix**: Terminal Manager handles window management in the main process, ensuring the application remains alive as long as either the main window or the background tray is active.

## Related Topics

- [Terminal Basics](05-terminal-basics.md)
- [Explorer Integration and CLI Flags](09-explorer-integration-and-command-line.md)
- [Security and Privacy](17-security-and-privacy.md)
