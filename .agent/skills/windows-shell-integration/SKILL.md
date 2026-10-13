---
name: windows-shell-integration
description: Windows Explorer right-click integration, Registry management, CLI argument parser, and standalone window docking in Terminal Manager.
---

# Windows Shell Integration & Window Docking Skill

This skill explains how Terminal Manager integrates with Windows Explorer, handles command-line arguments, and docks standalone terminal windows.

## 1. Explorer Context Menu Registration (`registryIntegration.ts`)

Terminal Manager registers shell commands under:
* `HKCU\Software\Classes\Directory\shell\TerminalManager` (Folder right-click)
* `HKCU\Software\Classes\Directory\Background\shell\TerminalManager` (Folder background right-click)
* `HKCU\Software\Classes\Drive\shell\TerminalManager` (Drive root right-click)
* `HKCU\Software\Classes\*\shell\TerminalManager` (File right-click)

### Crucial Registry Rule: Command String Token Format
Always format the command with `--cwd="%V"` using an equals sign `=`, **never a space**:
```text
"C:\path\to\electron.exe" "C:\path\to\app" --cwd="%V"
```
**Why**: When using `--cwd "%V"` (separate tokens), Chromium's internal argument parser injects internal flags (`--allow-file-access-from-files`) in between `--cwd` and `"%V"`, causing the parser to treat the flag as the directory. Using `--cwd="%V"` keeps the parameter atomic.

## 2. CLI Argument Parsing (`cliHandler.ts`)

The CLI handler supports:
* `--cwd="<path>"`: Working directory to launch the terminal in.
* `--profile="<id>"`: Shell profile to use.
* `--new-window`: Forces launching in a standalone frameless window.
* `--dock`: Forces opening as a tab in the main window.
* `--hidden`: Starts minimized to the Windows system tray.

### Trailing Backslash & Quote Escaping Gotcha
In Windows command lines, passing `C:\"` causes the trailing backslash to escape the quote. The parser must clean escaped trailing quotes:
```ts
if (cleaned.endsWith('"')) {
  cleaned = cleaned.slice(0, -1);
}
// If it's a drive root like 'C:', restore trailing backslash
if (/^[a-zA-Z]:$/.test(cleaned)) {
  cleaned += '\\';
}
```

## 3. Standalone Window & Docking Lifecycle

1. **Launch**: `launchManager.ts` evaluates user preference (`openFolderTerminalsIn: 'standalone' | 'tab'`).
2. **Standalone Window**: `standaloneWindowManager.ts` creates a frameless 860x540 window and attaches the PTY session.
3. **Docking**: When the user clicks "Dock to main window" in the standalone window:
   - `sessionManager.attach(sessionId, mainWindow)` transfers session ownership.
   - The standalone window is closed smoothly.
   - The main window receives `session:dock-tab` and creates a new tab with the existing running PTY session without interrupting any processes.
