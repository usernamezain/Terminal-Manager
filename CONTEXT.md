# CONTEXT.md — Terminal Manager Architecture & Technical Reference

This document serves as the canonical technical reference for developers, contributors, and AI agents working on **Terminal Manager**.

---

## 1. System Philosophy & Non-Negotiable Rules

1. **Terminal Data NEVER Passes Through React or Zustand**:
   - PTY output streams (`pty:data`) flow directly from the Electron main process via strictly-typed IPC into the `@xterm/xterm` buffer via `term.write()`.
   - React components only manage container DOM mounts, tab strips, headers, and modal views. Passing raw terminal streams through React state triggers catastrophic garbage collection and UI latency.

2. **Strict Backpressure Flow Control**:
   - High-throughput processes (`cat large.log`, `npm install`, compile dumps) must not overwhelm renderer memory.
   - High watermark: **512 KB** (`524,288 bytes`) $\rightarrow$ main process calls `ptyProcess.pause()`.
   - Low watermark: **128 KB** (`131,072 bytes`) $\rightarrow$ main process calls `ptyProcess.resume()`.
   - The renderer acknowledges processed chunks via `window.api.pty.ack(sessionId, byteLength)`.

3. **Pristine System Isolation**:
   - Never overwrite or corrupt the user's host PowerShell profile (`$PROFILE`).
   - PowerShell sessions spawn in app-scoped mode (`-NoProfile -Command ". '<userData>\shell\Microsoft.PowerShell_profile.ps1'"`).
   - If the user explicitly syncs their system profile, the `systemProfileManager` creates unique, append-only timestamped backups before applying changes.

4. **Zero Keystroke Injection into Standard Input**:
   - Never inject arbitrary text or synthetic commands into `ptyProcess.write()` on startup (e.g. attempting to probe CWD or environment).
   - Injecting keystrokes during shell initialization causes `PSReadLine` cursor position out-of-range crashes (`System.ArgumentOutOfRangeException`).
   - CWD and environment variables are configured strictly through `node-pty` spawn options.

5. **Single-Instance Enforcement & Instant Hand-Off**:
   - The application acquires a single-instance lock (`app.requestSingleInstanceLock()`).
   - Secondary processes forward their command-line arguments to the primary instance via the `second-instance` event and exit immediately (`process.exit(0)`).

---

## 2. Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Runtime** | Electron (Latest Stable) | Desktop wrapper, multi-window management, native integration |
| **Build Tooling** | Vite 6 + TypeScript (Strict) | Sub-second HMR for renderer; targeted bundling for main/preload |
| **UI Framework** | React 19 | Declarative UI for tabs, sidebar, script runner, and settings |
| **Terminal Core** | `@xterm/xterm` (v5.5+) | High-performance virtual terminal emulator |
| **Acceleration** | `@xterm/addon-webgl` | Hardware-accelerated GPU character rendering |
| **PTY Backend** | `node-pty` (ConPTY on Windows) | Real Windows Pseudo Console process host |
| **State Management**| **Zustand** | UI layout tree, active tabs, settings cache, profiles cache |
| **Code Editor** | **CodeMirror 6** | Built-in code editor for Script Runner with syntax highlighting |
| **IPC Validation** | **Zod** | Runtime contract verification on all IPC channels |
| **Icons & Style** | `lucide-react` + CSS Modules | Pure CSS variables (`tokens.css`), 60fps animations via Framer Motion |

---

## 3. Architecture & Process Boundaries

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        ELECTRON MAIN PROCESS                           │
│                                                                        │
│  ┌───────────────────────┐  ┌─────────────────┐  ┌──────────────────┐  │
│  │ Single-Instance Lock  │  │ CLI Parser      │  │ Registry Manager │  │
│  │ & Second-Instance IPC │  │ (cliHandler.ts) │  │ (Windows HKCU)   │  │
│  └───────────┬───────────┘  └────────┬────────┘  └────────┬─────────┘  │
│              │                       │                    │            │
│              ▼                       ▼                    ▼            │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ SessionManager (PTY Lifecycle, Backpressure Ring Buffer, ConPTY) │  │
│  └───────────┬──────────────────────────────────────────┬───────────┘  │
│              │                                          │              │
│              ▼                                          ▼              │
│  ┌───────────────────────┐                  ┌───────────────────────┐  │
│  │ Main Window (#1)      │                  │ Standalone Window (#N)│  │
│  │ (Tabs, Layout, Rails) │                  │ (Frameless, Dockable) │  │
│  └───────────────────────┘                  └───────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
                                     │ ContextBridge (Preload)
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       ELECTRON RENDERER PROCESS                        │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Window API (window.api.pty, window.api.session, window.api.app)  │  │
│  └───────────────────────────────────┬──────────────────────────────┘  │
│                                      │                                 │
│         ┌────────────────────────────┼────────────────────────────┐    │
│         ▼                            ▼                            ▼    │
│  ┌──────────────┐             ┌──────────────┐             ┌────────┐  │
│  │ Layout Engine│             │ xterm.js WebGL│            │ Views  │  │
│  │ (Tabs/Panes) │             │ (Direct PTY) │             │ Docs,  │  │
│  │ Zustand Store│             │ Backpressure │             │ Runner │  │
│  └──────────────┘             └──────────────┘             └────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Key Subsystems & Lifecycle Flows

### A. Windows Explorer Launch ("Open in Terminal Manager")
1. **Trigger**: User right-clicks a folder, file, drive root, or directory background in Windows Explorer.
2. **Registry Command**:
   `"path\to\electron.exe" "path\to\app" --cwd="%V"`
3. **Primary / Secondary Instance Routing**:
   - If app is not running: Starts cold-start, parses `--cwd`, creates a session, and launches either a standalone window or main window tab based on preferences.
   - If app is running: Secondary process captures `argv`, detects lock denial, calls `process.exit(0)`. Primary process receives `second-instance`, normalizes path, and presents the terminal.
4. **Path Sanitization**:
   - Escaped quotes from Windows shell (`C:\"` $\rightarrow$ `C:"`) are stripped.
   - Drive roots (`C:`) are automatically restored with trailing backslashes (`C:\`).

### B. Standalone Terminal Window & Re-Docking
1. A folder terminal can launch in an independent, frameless 860x540 window managed by `standaloneWindowManager.ts`.
2. When the user clicks **"Dock to main window"**:
   - `sessionManager.attach(sessionId, mainWindow)` switches the event listener.
   - The standalone window smoothly closes.
   - The main window receives `session:dock-tab` and creates a new tab seamlessly.
   - **Process Continuity**: PTY PID, running processes, and scrollback history remain intact.

### C. Script Runner & Sequential Execution
1. Scripts are stored atomically in `scripts.json` inside `userData`.
2. Execution is managed via `scriptRunner.ts`:
   - Enqueued items wait in FIFO order.
   - The active script spawns under its designated interpreter with arguments and custom CWD.
   - Stderr and stdout are multiplexed with ANSI escape codes and pushed to `scripts:output`.
   - Configurable timeout terminates the process tree using `terminateProcessTree(pid)`.
   - On completion, `onFailure` policy (`stop` vs. `continue`) decides whether to halt or advance.

### D. Shell Experience Generator
1. Generates `CTTcustom.ps1` dynamically inside `<userData>\shell\`.
2. Uses atomic write: writes to temporary file then renames to prevent partial reads.
3. Implements the `Set-PredictionSource_Override` execution hook, ensuring PSReadLine color themes (17 syntax slots), Oh My Posh themes, and Terminal-Icons load cleanly.

---

## 5. Directory Layout

```text
/
├── .agent/                    # Agent skills directory
│   └── skills/                # Project-specific advanced skills
├── .agents/                   # Standard customization root
│   └── skills/                # Project-specific advanced skills
├── src/
│   ├── main/                  # Node.js / Electron main process
│   │   ├── index.ts           # App lifecycle, single-instance lock, window initialization
│   │   ├── cliHandler.ts      # Command-line argument parsing & normalization
│   │   ├── launchManager.ts   # Central launch coordinator (CWD precedence & window mode)
│   │   ├── sessionManager.ts  # node-pty lifecycle, backpressure, process tree termination
│   │   ├── standaloneWindowManager.ts # Frameless standalone windows & docking logic
│   │   ├── registryIntegration.ts     # Windows Explorer context menu registration
│   │   ├── profilesStore.ts   # System shell auto-detection & custom profiles
│   │   ├── settingsStore.ts   # Atomic settings persistence
│   │   ├── scripts/           # Script runner queue & state machine
│   │   └── shell-experience/  # PowerShell customization generator & backup manager
│   ├── preload/               # Context isolation bridge (exposes window.api)
│   ├── shared/                # Shared contracts, IPC schemas, and constants
│   └── renderer/              # React 19 + xterm.js renderer
│       ├── app/               # Layout shell (TitleBar, Sidebar, TabStrip, StatusBar)
│       ├── features/
│       │   ├── terminal/      # Terminal view, xterm WebGL instance, backpressure ACK
│       │   ├── profiles/      # Profiles editor & shell configurator
│       │   ├── scripts/       # Script runner library, CodeMirror editor, and queue
│       │   ├── docs/          # In-app interactive documentation hub
│       │   ├── standalone/    # Standalone terminal view with dock button
│       │   └── shell-experience/ # Oh My Posh gallery, syntax colors, keybindings
│       └── store/             # Zustand stores (useWorkspaceStore, useSettingsStore, etc.)
```

---

## 6. Build, Test, and Packaging Commands

```bash
# Start development environment
npm run dev

# Rebuild native modules (node-pty) for Electron
npm run rebuild

# Run Vitest acceptance and unit tests (59 tests)
npx vitest run

# Run targeted test file
npx vitest run src/main/__tests__/cliHandler.test.ts

# Production build (Typecheck + Vite Main + Vite Preload + Vite Renderer)
npm run build
```
