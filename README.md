# Terminal Manager ⚡

<p align="center">
  <img src="build/icons/icon.png" alt="Terminal Manager Logo" width="96" height="96" />
</p>

<p align="center">
  <strong>The Next-Generation, GPU-Accelerated Custom Terminal & Automation Workspace for Developers</strong>
</p>

<p align="center">
  <a href="#features"><img src="https://img.shields.io/badge/Platform-Windows%2011%20%7C%2010-0078D4?logo=windows&logoColor=white" alt="Platform" /></a>
  <a href="#architecture"><img src="https://img.shields.io/badge/PTY-ConPTY%20Native-00599C?logo=powershell&logoColor=white" alt="ConPTY" /></a>
  <a href="#performance"><img src="https://img.shields.io/badge/Renderer-xterm.js%20WebGL%20120FPS-FF6F00?logo=webgl&logoColor=white" alt="WebGL" /></a>
  <a href="#script-runner"><img src="https://img.shields.io/badge/Automation-Script%20Queue%20Runner-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="#tests"><img src="https://img.shields.io/badge/Tests-59%2F59%20Passing-brightgreen?logo=vitest&logoColor=white" alt="Vitest" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License" /></a>
</p>

---

## 🔍 Overview

**Terminal Manager** is a high-performance **custom terminal**, shell environment, and developer automation workspace built with **Electron**, **React 19**, **TypeScript**, **node-pty (ConPTY on Windows)**, and **xterm.js with WebGL hardware acceleration**.

Designed as a modern alternative to standard Windows terminals, Terminal Manager brings together:
* **Deep Windows Explorer Integration**: Right-click any folder, background, or drive root to immediately open a terminal positioned precisely in that directory.
* **Standalone Windows with Zero-Interruption Re-Docking**: Pop terminals out into lightweight, frameless floating windows, and dock them back into the main workspace tab bar without interrupting running servers or builds.
* **Automated Script Runner & Sequential Execution Queue**: Line up complex deployment, build, or database scripts with custom timeouts, failure policies (`Stop` or `Continue`), and live ANSI streaming.
* **Shell Experience & PowerShell Customizer**: Enjoy an app-scoped **Oh My Posh** prompt gallery, 17-slot **PSReadLine** syntax highlighting, and **Terminal-Icons** without touching your global `$PROFILE`.
* **In-App Interactive Documentation Hub**: Instant access to searchable guides, shell syntax references, and keyboard shortcuts right inside the app (`F1`).

---

## 🖥️ User Interface Layout

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [>_] Terminal Manager       [+][Tabs: pwsh | cmd | bash]          [ _ ][ 口 ][ X ]     │
├─────┬──────────────────────────────────────────────────────────────────────────────────┤
│ [>] │  PowerShell 7.4 (C:\Users\Developer\Projects\api)           [Dock][Zoom][Split]  │
│ [≡] │  ──────────────────────────────────────────────────────────────────────────────  │
│ [▶] │  PS C:\Projects\api> git status                                                  │
│ [?] │  On branch main                                                                  │
│ [⚙] │  Your branch is up to date with 'origin/main'.                                   │
│     │                                                                                  │
│     │  PS C:\Projects\api> █                                                           │
│     │                                                                                  │
│     ├──────────────────────────────────────────────────────────────────────────────────┤
│     │  Script Runner Queue: [Running: 2/4] [Build Server] (00:01:24) [■ Abort]         │
│     │  ✓ 1. git pull origin main (1.2s)                                                │
│     │  ▶ 2. npm run build (in progress...)                                             │
│     │  ⏳ 3. docker compose up -d                                                      │
├─────┴──────────────────────────────────────────────────────────────────────────────────┤
│ ⚡ ConPTY: Active  │  GPU: WebGL 120FPS  │  UTF-8  │  CWD: C:\Projects\api  │  Memory: 38MB │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features & Capabilities

### 1. 🗂️ Windows Explorer Integration ("Open in Terminal Manager")
* **Full Context Awareness**: Right-click any folder, directory white space, drive root (`C:\`), or file in Windows Explorer to open a terminal directly in that path.
* **Smart Path Sanitization**: Handles long paths, spaces, unicode characters, and escaped quotes automatically.
* **Single-Instance Speed**: If Terminal Manager is already running, secondary launches route the request into the existing instance instantly without spinning up duplicate Electron processes.
* **One-Click Registry Repair**: Built-in self-healing utility in **Settings > General** re-registers and validates context menu keys with zero command-line hassles.

### 2. 🪟 Standalone Windows & Re-Docking System
* **Independent Floating Windows**: Open dedicated, lightweight terminal windows for focused tasks or multi-monitor setups.
* **Zero-Interruption Docking**: Click **"Dock to main window"** to transfer the live PTY session into the main tab strip without resetting the shell, killing child processes, or losing buffer history.
* **Pop-Out Tabs**: Detach any active tab from the main workspace into its own window at any time.

### 3. 🚀 Sequential Script Runner & Automation Queue
* **Visual Script Library**: Organize, tag, search, and store shell scripts, batch files, PowerShell scripts, and Python routines.
* **CodeMirror Code Editor**: Syntax-highlighted code editor with line numbers and arguments input.
* **FIFO Queue Engine**: Queue multiple jobs to execute one after another in strict order.
* **Configurable Failure Policies**:
  * *Stop on failure (Safe Mode)*: Immediately cancels downstream scripts if an error occurs.
  * *Continue on failure*: Logs the non-zero exit code and continues with remaining jobs.
* **Process-Tree Timeouts**: Automatic `taskkill /T /F` execution prevents orphaned background processes if a script hangs.

### 4. 🎨 Shell Experience & PowerShell Customizer
* **Pristine Isolation**: Loads from `<userData>/shell/CTTcustom.ps1` in an isolated scope. Your machine's global `$PROFILE` remains untouched.
* **Oh My Posh Prompt Gallery**: Choose from popular themes with live visual cards and real-time previews.
* **17-Slot PSReadLine Syntax Highlighting**: Custom color pickers for Commands, Parameters, Strings, Numbers, Variables, Operators, Types, and Comments.
* **Terminal-Icons Integration**: Beautiful file and folder glyphs for `Get-ChildItem` / `ls`.
* **IntelliSense & Prediction**: Switch between History and Plugin prediction modes with Inline or ListView rendering.

### 5. 👥 Profiles & Auto-Detected Shells
* Automatically detects installed shells: **Windows PowerShell**, **PowerShell 7 Core**, **Command Prompt**, **Git Bash**, and **WSL** (Ubuntu, Debian, etc.).
* Per-profile font families, font sizes, custom window titles, environment variables, startup commands, and working directories.

### 6. 📖 In-App Documentation Hub (`F1`)
* Accessible via the sidebar book icon, header button, or global `F1` shortcut.
* Comprehensive guides for shell customization, script queues, keyboard shortcuts, and technical architecture.
* Real-time keyword search and one-click code snippet copying.

### 7. ⚡ Performance & Flow Control
* **Hardware Accelerated**: WebGL terminal canvas renders hundreds of characters per frame with minimal CPU overhead.
* **Ring Buffer & ACK Backpressure**: 512KB high-watermark flow control pauses PTY emission during large outputs, preventing UI lockups.
* **Telemetry Diagnostics**: Real-time startup waterfall metrics, shell memory usage, and warm shell pool monitoring.

---

## ⌨️ Keyboard Shortcuts Reference

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + Shift + T` | New Terminal Tab |
| `Ctrl + Shift + W` | Close Active Tab / Pane |
| `Ctrl + Shift + E` | Split Pane Vertically |
| `Ctrl + Shift + D` | Split Pane Horizontally |
| `Ctrl + Shift + M` | Maximize / Restore Active Pane |
| `Ctrl + Tab` / `Ctrl + Shift + Tab` | Next / Previous Tab |
| `Ctrl + 1` ... `Ctrl + 9` | Switch to Tab $N$ |
| `Ctrl + Shift + R` | Open Script Runner |
| `F1` | Open Documentation Hub |
| `Ctrl + ,` | Open Settings |
| `Ctrl + B` | Toggle Navigation Sidebar |
| `Escape` | Close Overlay Views & Return to Terminal |
| `Ctrl + Shift + K` | Clear Terminal Screen Buffer |

---

## 🛠️ Architecture & Data Pipeline

```text
[ Windows Explorer / CLI / Tray ]
               │
               ▼
   [ Electron Single-Instance Lock ] ──► (Secondary process exits immediately)
               │
               ▼ (args routed via second-instance)
   [ LaunchManager: CWD Precedence & Window Mode ]
               │
        ┌──────┴──────────────────────────┐
        ▼                                 ▼
[ Standalone Window ]             [ Main Window (Tabs) ]
        │                                 │
        └──────────► [ Docking ] ─────────┘
                          │
                          ▼
             [ SessionManager (ConPTY) ]
                          │
      ┌───────────────────┴───────────────────┐
      ▼                                       ▼
 [ PTY Stream ]                         [ Backpressure Flow Control ]
  ptyProcess.onData                      Unacked > 512KB -> pause()
  Batching 6ms / 64KB                    Unacked < 128KB -> resume()
      │                                       │
      ▼                                       ▲
  webContents.send('pty:data')                │
      │                                       │
      ▼                                       │
  term.write(chunk) ────────► window.api.pty.ack(len)
```

---

## 🚀 Getting Started

### Prerequisites
* **Node.js**: `v20.x` or higher
* **npm**: `v10.x` or higher
* **Windows Build Tools**: Visual Studio C++ Build Tools / Windows SDK (for compiling `node-pty`)

### Installation & Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-username/customized-terminal.git
cd customized-terminal

# 2. Install dependencies & compile node-pty
npm install

# 3. Start development server (Vite + Electron HMR)
npm run dev
```

### Building for Production

```bash
# Typecheck and compile main, preload, and renderer bundles
npm run build
```

---

## 🧪 Testing & Verification

The test suite covers CLI parsing, session lifecycle, queue execution, shell profile isolation, and layout tree calculations:

```bash
# Run all Vitest suites (59+ tests)
npx vitest run
```

---

## 🤖 AI Agent & Customization Skills

This repository includes specialized agent skills under `.agents/skills/` and `.agent/skills/` to assist automated coding assistants:
* **`terminal-dev-workflow`**: Standard commands, Vitest execution, and build validation.
* **`pty-conpty-debugger`**: Debugging node-pty, ConPTY, ANSI buffers, and backpressure watermarks.
* **`shell-experience-customizer`**: Extending Oh My Posh themes and PSReadLine generator rules.
* **`script-runner-engine`**: Maintaining the sequential script execution engine and queue state machine.
* **`windows-shell-integration`**: Windows Explorer registry commands, CWD sanitation, and docking logic.

For complete architectural specifications, consult **[CONTEXT.md](CONTEXT.md)** and **[AGENT.md](AGENT.md)**.

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).
Upstream PowerShell profile components are licensed under the MIT License by Chris Titus Tech and Jan De Dobbeleer (Oh My Posh).
