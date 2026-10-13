---
name: pty-conpty-debugger
description: Debugging node-pty, Windows ConPTY, ANSI escape sequences, ring buffer backpressure, and terminal process trees in Terminal Manager.
---

# PTY & ConPTY Debugging Guide

This skill guides you through diagnosing, tracing, and resolving pseudo-terminal (PTY) issues on Windows and cross-platform systems.

## 1. ConPTY Architecture in Terminal Manager

```text
+-----------------------------------------------------------+
| Main Process (Node / Electron)                            |
|                                                           |
|  pty.spawn(shellPath, shellArgs, { cwd, cols, rows })     |
|          │                                                |
|          ▼                                                |
|  node-pty (ConPTY API)                                    |
|          │                                                |
|          ├─► onData ──► Ring Buffer (500KB)               |
|          │              Batching (6ms / 64KB)             |
|          │              ▼                                 |
|          │       webContents.send('pty:data')             |
|          │                                                |
|          ▼                                                |
+-----------------------------------------------------------+
                             │
                             ▼ IPC
+-----------------------------------------------------------+
| Renderer Process (xterm.js + WebGL)                       |
|                                                           |
|  term.write(chunk, () => {                                |
|    window.api.pty.ack(sessionId, chunk.length);           |
|  });                                                      |
+-----------------------------------------------------------+
```

## 2. Key Debugging Rules

### Never Inject Synthetic Keystrokes into Stdin
* **Critical**: Never use `ptyProcess.write(...)` to probe environment variables or CWD (e.g. `Write-Host ('PROBE:' + $PWD)`).
* Injecting keystrokes directly into standard input while shells like PowerShell (`PSReadLine`) or Zsh are initializing will corrupt cursor calculation and trigger:
  `System.ArgumentOutOfRangeException: The value must be greater than or equal to zero and less than the console's buffer size in that dimension.`

### Proper CWD Resolution
* **Always set the working directory via spawn options**:
  ```ts
  const spawnOptions = {
    cwd: resolvedCwd,
    cols: cols || 80,
    rows: rows || 24,
    useConpty: process.platform === 'win32',
  };
  pty.spawn(shellPath, shellArgs, spawnOptions);
  ```
* Never prepend `cd <folder>` to the shell arguments.

### Flow Control & Backpressure
* **Thresholds**: High watermark is **512 KB** (`524,288 bytes`); low watermark is **128 KB** (`131,072 bytes`).
* When unacked bytes exceed 512 KB, the main process calls `ptyProcess.pause()`.
* As the renderer processes chunks and sends `pty:ack`, unacked bytes decrease; when below 128 KB, `ptyProcess.resume()` is called.
* If a terminal freezes during large output, check the ACK pipeline in `TerminalInstance.ts` and `ptyManager.ts`.

## 3. Terminating Process Trees Cleanly
On Windows, killing a parent shell process (`powershell.exe`) can leave child processes running in the background (e.g. `node.exe`, `python.exe`). Always terminate the process tree:
```powershell
taskkill /PID <pid> /T /F
```
In `TerminalManager`, `terminateProcessTree(pid)` in `src/main/sessionManager.ts` automatically executes this tree termination.
