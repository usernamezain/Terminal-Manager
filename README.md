# Terminal Manager

<div align="center">

[![CI Build](https://github.com/mughaldev0/Terminal-Manager/actions/workflows/ci.yml/badge.svg)](https://github.com/mughaldev0/Terminal-Manager/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/mughaldev0/Terminal-Manager/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%20%7C%2011-0078d4.svg?logo=windows)](https://microsoft.com/windows)
[![Electron](https://img.shields.io/badge/Electron-34.2.0-47848F.svg?logo=electron)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-61DAFB.svg?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)

**A high-performance, hardware-accelerated Windows terminal workspace and automation environment.**

[Features](#key-features) • [Quickstart](#quickstart) • [How to Contribute](HOW-TO-CONTRIBUTE.md) • [Architecture](#architecture-summary) • [Documentation](#documentation) • [Reporting Issues](#reporting-issues)

</div>

---

## Overview

**Terminal Manager** combines hardware-accelerated terminal emulation (xterm.js + WebGL) with native ConPTY process management, multi-pane tabbed workspaces, standalone detached windows, read-only project runner target detection across 10 ecosystems, an automated multi-interpreter script runner, an isolated PowerShell 7 customization engine, and a curated catalog of 15 CLI AI coding agents.

Designed specifically for Windows developers who demand speed, reliability, and modern aesthetics without sacrificing low-level terminal control.

---

## Key Features

- 🖥️ **Hardware-Accelerated Terminal**: xterm.js powered by `@xterm/addon-webgl` for 60fps rendering, sub-10ms latency, and high-throughput streams (50MB+ without UI freeze).
- 🗂️ **Multi-Pane & Standalone Windows**: Tabbed interface with vertical and horizontal split panes (`Ctrl+Shift+D`, `Ctrl+Shift+E`), spatial focus navigation (`Alt+Arrows`), and ability to pop out tabs into standalone desktop windows and re-dock them seamlessly.
- ⚙️ **Project Runner (10 Ecosystems)**: Automatic read-only script target detection for Node.js, Rust, Python, Go, .NET, Java, Ruby, PHP, Make, and Docker with one-click pane execution.
- 📜 **Script Runner & Automation**: Automated FIFO queue engine supporting PowerShell, Batch, Node.js, Python, and Bash with configurable timeout limits, retry policies, and log retention.
- 🎨 **PowerShell 7 Shell Experience**: App-scoped and system-wide customization with Oh My Posh prompt themes, 17-slot PSReadLine syntax coloring, Terminal-Icons, and sub-second Fast Start caching.
- 🤖 **AI Agents Hub**: Management view and catalog for 15 CLI AI coding agents (Claude Code, Antigravity, Codex, Copilot CLI, Aider, OpenCode, Hermes, and more) with DPAPI-encrypted secret storage and in-process `PATH` refresh.
- 🔔 **Windows System Integration**: Non-elevated right-click Windows Explorer integration ("Open in Terminal Manager"), system tray background operation, login startup via HKCU registry, and single-instance CLI command forwarding.
- 🛡️ **Hardened Security & Sandboxing**: Context-isolated preload bridge, Electron process sandboxing, atomic file writes (`*.bak` recovery), and privacy-redacted diagnostic export.
- 📖 **In-App Searchable Docs**: Offline full-text searchable documentation viewer (`F1`) rendered directly from repository markdown sources.

---

## Requirements

- **Operating System**: Windows 10 (version 19041 or higher) or Windows 11. (Windows 11 recommended for Mica materials).
- **Node.js**: `v20.x` or `v22.x` LTS.
- **Package Manager**: npm `v10.x` or higher.
- **Native Build Tools**: Visual Studio 2022 C++ Build Tools with Windows 10/11 SDK (required for compiling native `node-pty` bindings).

---

## Quickstart

### 1. Clone the Repository

```bash
git clone https://github.com/mughaldev0/Terminal-Manager.git
cd Terminal-Manager
```

### 2. Install Dependencies & Build Native Bindings

```bash
npm install
npm run rebuild
```

### 3. Launch Development Server

```bash
npm run dev
```

Vite launches on `localhost:5173` with Hot Module Replacement (HMR) and Electron starts automatically.

### 4. Open from PowerShell or Explorer

Open any folder directly in a new terminal tab or window:

```powershell
npm start -- --cwd "C:\Projects\my-project"
```

---

## Contributing

We welcome contributions from the community! Please read our full step-by-step guide:

👉 **[HOW-TO-CONTRIBUTE.md](HOW-TO-CONTRIBUTE.md)** (or [CONTRIBUTING.md](CONTRIBUTING.md))

### Contribution Workflow Summary
1. **Fork & Clone**: Fork on GitHub and run `git clone https://github.com/<your-username>/Terminal-Manager.git`.
2. **Branch**: Create a branch following conventions (`feature/name`, `fix/issue-description`, `docs/name`).
3. **Develop**: Follow the design tokens (`tokens.css`) and process ownership rules (sessions in main, windows are views).
4. **Automated Verification**: **Merges will be checked on behalf of the work**. Every PR must pass all 5 verification gates before merge:
   ```bash
   npm run verify
   ```
   - `npx tsc --noEmit` — 0 TypeScript errors
   - `npx vitest run` — 149/149 test suites pass (100%)
   - `npm run docs:check` — Documentation integrity & zero broken links
   - `npm run perf:check` — Binary size, memory, and latency budgets
   - `npm run build` — Clean production bundle compile
5. **Open a PR**: Submit your pull request using our [Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md).

---

## Reporting Issues & In-App Diagnostics

Found a bug or need help?
- **Create an Issue**: Select a template from [GitHub Issues](https://github.com/mughaldev0/Terminal-Manager/issues/new/choose) (Bug Report, Feature Request, Documentation, Performance).
- **In-App Redacted Diagnostics**: In Terminal Manager, open **Settings (`Ctrl+,`) > Help & Support** and click **Copy Diagnostics** (or click **Report an Issue**). This copies a sanitized system snapshot with your username, user paths, and API keys automatically stripped (`%USERPROFILE%`, `%USERNAME%`, `[REDACTED_SECRET]`). Paste it directly into your GitHub issue!

---

## Command-Line Arguments

Terminal Manager supports single-instance command forwarding. Running CLI commands while the app is running forwards flags to the active instance:

| Flag | Parameter | Description |
| :--- | :--- | :--- |
| `--cwd` | `<path>` | Sets starting working directory (strict precedence: explicit > profile > home) |
| `--profile` | `<name\|id>` | Selects the shell profile to launch |
| `--new-window` | — | Forces creation of a new standalone window |
| `--dock` | — | Docks detached sessions back into the main workspace |
| `--hidden` | — | Launches application minimized to the system tray |
| `--run-sequence`| `<id>` | Executes a named automated script sequence |
| `--agent` | `<id>` | Launches a specific CLI AI agent immediately |
| `--agents-panel`| — | Opens directly to the AI Agents management view |
| `--mode` | `<tab\|window>` | Chooses presentation mode for agent or profile |
| `--resume` | — | Restores previously open terminal tabs and layout |

---

## Architecture Summary

```text
├── src/
│   ├── main/              # Electron Main Process (PTY sessions, ConPTY, windows, tray, IPC)
│   │   ├── sessionManager.ts     # ConPTY shell process ownership (lives across window reloads)
│   │   ├── startupScheduler.ts   # Prioritized startup queue (critical > deferred > idle)
│   │   ├── timerService.ts       # Background timer throttling when windows hidden
│   │   ├── diagnosticsManager.ts # Privacy-redacted diagnostics generator
│   │   ├── windowConfig.ts       # Hardened Electron sandbox & permission safety nets
│   │   └── registryIntegration.ts# HKCU Explorer context menu integration
│   ├── preload/           # Context-isolated secure bridge (`window.api`)
│   ├── renderer/          # React 19 UI (views, components, Zustand stores, tokens)
│   └── shared/            # Shared TypeScript interfaces, IPC channels, and schemas
├── docs/                  # Documentation single source of truth (19 topic guides)
└── .agent/skills/         # Pre-configured developer skills for agentic pair-programming
```

- **Process Ownership**: Sessions live in `sessionManager.ts` in the main process. Renderer windows are purely views. Detaching or closing a window never destroys running background shell processes.
- **Window Resolution**: All IPC handlers resolve target windows dynamically from `event.sender` rather than storing a single global window reference.
- **Registry Rules**: Context menus and login startup strictly write to Current User (`HKCU`) keys only. No administrator elevation is required.

---

## Documentation

All documentation is maintained under `docs/content/` as markdown files, which are rendered by both GitHub and the in-app Documentation Browser (`F1`):

- Run `npm run docs:generate` to refresh dynamic reference tables (keyboard shortcuts, settings).
- Run `npm run docs:check` to validate markdown frontmatter, anchor links, and schemas.

---

## Community & Governance

- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Contributing Guide](HOW-TO-CONTRIBUTE.md)
- [Security Policy](SECURITY.md)
- [Support & Discussions](SUPPORT.md)
- [Changelog](CHANGELOG.md)

---

## License

This project is licensed under the [MIT License](LICENSE).
Copyright (c) 2026 MughalDev and Terminal Manager Contributors.
