# CONTEXT.md — Terminal Manager Architectural Map & Developer Guide

This document is the canonical system map and developer guide for **Terminal Manager**. It maps the entire codebase, process boundaries, data flows, persistence models, design conventions, security hardening, diagnostics system, and open-source contribution workflows.
For high-level project behavioral rules and agent prompts, refer to [AGENT.md](AGENT.md).
For community contribution workflows, refer to [HOW-TO-CONTRIBUTE.md](HOW-TO-CONTRIBUTE.md).

---

## 1. Product Summary & Tech Stack

Terminal Manager is a hardware-accelerated Windows desktop terminal and developer automation workspace.

| Component | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Desktop Shell** | Electron | 34.2.0 | Window management, system tray, DWM backdrop composition |
| **UI Framework** | React | 19.0.0 | Declarative UI, tabs, settings, documentation, and split layouts |
| **Bundler & Tooling** | Vite | 6.1.0 | Fast HMR dev server and multi-target compilation |
| **Language** | TypeScript | 5.7.3 | Strict static type safety across main, preload, and renderer |
| **Terminal Canvas** | `@xterm/xterm` | 5.5.0 | Virtual terminal emulator |
| **Acceleration** | `@xterm/addon-webgl` | 0.18.0 | Hardware-accelerated GPU character rendering |
| **PTY Host** | `node-pty` | 1.0.0 | ConPTY (Windows Pseudoconsole) process host |
| **State Management**| Zustand | 5.0.3 | Reactive UI store for tabs, panes, active view, and settings |
| **Search Engine** | MiniSearch | 7.2.0 | In-app documentation full-text search indexing |
| **Markdown Parser** | Marked | 18.1.1 | Frontmatter and markdown rendering for docs view |
| **Code Editor** | CodeMirror | 6.0.2 | In-app code editor for Script Runner |
| **IPC Validation** | Zod | 3.24.2 | Runtime schema validation on all incoming IPC payloads |
| **Test Runner** | Vitest | 4.1.11 | Fast unit and integration test runner (149+ tests) |

---

## 2. Directory & Module Map

```text
c:\Users\SHABBIR TRADERS\Desktop\CUstomized-Terminal
├── .github/                         # GitHub community health, workflows & templates
│   ├── ISSUE_TEMPLATE/              # Structured YAML issue forms (bug, feature, docs, perf)
│   ├── PULL_REQUEST_TEMPLATE.md     # PR checklist and verification requirements
│   ├── DISCUSSION_TEMPLATE/         # GitHub Discussions templates (ideas, Q&A)
│   └── workflows/                   # Automated GitHub Actions CI, release, and triage
├── build/                           # Application build resources, installers and icons
├── docs/                            # Documentation single source of truth
│   ├── _inventory.md                # Code-verified user feature inventory
│   ├── content/                     # 19 numbered markdown topic guides
│   │   └── _generated/              # Build-time generated reference guides
│   │       ├── 13-keyboard-shortcuts.md
│   │       └── 14-settings-reference.md
│   ├── maintainers/                 # Maintainer triage, release, and settings guides
│   └── perf/                        # Repeatable benchmark baseline and results
├── resources/
│   └── agents.catalog.json          # Catalog definition for 15 AI CLI agents
├── scripts/
│   ├── dev.mjs                      # Development server bootstrap
│   ├── docs-generate.ts             # Pre-build docs generator (shortcuts & settings)
│   ├── docs-check.ts                # Documentation integrity validator
│   ├── perf-bench.ts                # Automated 12-scenario benchmark suite
│   ├── perf-check.ts                # Performance budget enforcement check
│   └── generateIcons.mjs            # Application icon generator
├── src/
│   ├── helper/                      # Architectural seam for future UAC helper
│   ├── main/                        # Electron Main Process (Node.js)
│   │   ├── index.ts                 # App lifecycle, single instance lock, window creation
│   │   ├── cliHandler.ts            # CLI argv parsing, flags, and second-instance routing
│   │   ├── startupScheduler.ts      # Prioritized startup queue (critical > deferred > idle)
│   │   ├── timerService.ts          # Background interval throttling when windows hidden
│   │   ├── diagnosticsManager.ts    # Redacted system diagnostics and log exporter
│   │   ├── windowConfig.ts          # Window safety nets, sandbox flags, URL scheme validator
│   │   ├── sessionManager.ts        # ConPTY lifecycle, backpressure (512K/128K), process kill
│   │   ├── standaloneWindowManager.ts# Pop-out standalone window creation and docking
│   │   ├── trayManager.ts           # Windows notification area tray and Jump List
│   │   ├── registryIntegration.ts   # Explorer context menu in HKCU with escaped quotes
│   │   ├── settingsStore.ts         # Atomic JSON persistence for user preferences
│   │   ├── profilesStore.ts         # Shell profiles store and default resolution
│   │   ├── snippetsStore.ts         # Snippet library persistence
│   │   ├── shellDetector.ts         # Non-blocking auto-detection for pwsh, cmd, wsl
│   │   ├── perfTracker.ts           # Hardware timestamp telemetry recorder
│   │   ├── ai-agents/               # AI agent detectors, installers, DPAPI encrypted secrets
│   │   ├── project-runner/          # Read-only ecosystem detectors for 10 project types
│   │   ├── script-runner/           # Multi-interpreter FIFO execution queue and logs
│   │   └── shell-experience/        # Oh My Posh themes, PSReadLine colors, Fast Start cache
│   ├── preload/                     # Electron Preload Bridge
│   │   └── index.ts                 # Context-isolated window.api with sender-based window resolution
│   ├── renderer/                    # React 19 Renderer Process
│   │   ├── index.html               # Entry HTML with Content Security Policy (CSP)
│   │   ├── main.tsx                 # React DOM mount point
│   │   ├── app/                     # Shell container layout (TitleBar, Sidebar, App.tsx)
│   │   ├── components/              # Shared UI components (StatusBar, TitleBar, SettingsModal)
│   │   │   └── settings/            # SettingsView, SettingsRow, SettingsSection, SettingsHeader
│   │   ├── design/                  # Design tokens (tokens.css) and global variables
│   │   ├── store/                   # Global Zustand stores (useWorkspaceStore, useSettingsStore)
│   │   └── features/                # Domain-specific feature modules
│   │       ├── ai-agents/           # AgentsView, installation modals, secret manager
│   │       ├── docs/                # CustomizationDocsView, markdownParser, docsSearch, docsLoader
│   │       ├── layout/              # PaneContainer, split layout trees, drag dividers
│   │       ├── profiles/            # ProfilesView and profile editor
│   │       ├── project-runner/      # ProjectRunnerBar, ProjectRunnerMenu, AddPackageModal
│   │       ├── scripts/             # ScriptRunnerView, QueueView, HistoryView, ScriptEditor
│   │       ├── shell-experience/    # ShellExperienceSettingsView, SyntaxColors, PromptGallery
│   │       ├── standalone/          # StandaloneWindowView for popped-out sessions
│   │       ├── tabs/                # TabStrip, TabItem, tab color tagging
│   │       ├── terminal/            # TerminalInstance, WebGL renderer pool, TerminalRegistry
│   │       └── terminal-actions/    # TerminalContextMenu, ActionsPanel, MultiLinePasteModal
│   └── shared/                      # Shared TypeScript Interfaces & Contracts
│       ├── types.ts                 # Core settings, profiles, window API contracts
│       ├── ipc.ts                   # Zod schemas and IPC channel constants
│       ├── keybindingsRegistry.ts   # Centralized shortcut registry with metadata
│       ├── settingsMetadata.ts      # Centralized settings schema with UI locations
│       ├── agentTypes.ts            # AI agent catalog schemas
│       ├── projectRunnerTypes.ts    # Project runner commands and ecosystem models
│       ├── scriptRunnerTypes.ts     # Script runner models, queues, and policies
│       └── shellExperienceTypes.ts  # Shell experience, syntax color, and prompt types
```

---

## 3. Process Architecture & Invariants

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        ELECTRON MAIN PROCESS                           │
│                                                                        │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │   SessionManager        │  │       StartupScheduler              │  │
│  │  - ConPTY Process Host  │  │  - Critical: Window show            │  │
│  │  - Shell Buffer Streams │  │  - Deferred: Tray, HKCU Registry    │  │
│  │  - Backpressure Control │  │  - Idle: Agent scans, Warm Shells   │  │
│  └────────────▲────────────┘  └─────────────────────────────────────┘  │
│               │ IPC                                                    │
│  ┌────────────▼────────────┐  ┌─────────────────────────────────────┐  │
│  │   WindowManager         │  │       DiagnosticsManager            │  │
│  │  - Main Window          │  │  - Privacy Redaction (%USERPROFILE%)│  │
│  │  - Standalone Windows   │  │  - Safe JSON settings snapshot      │  │
│  │  - Sender Resolution    │  │  - Redacted Log Tail (last 100)     │  │
│  └────────────▲────────────┘  └─────────────────────────────────────┘  │
└───────────────┼────────────────────────────────────────────────────────┘
                │ IPC via Context-Isolated Preload Bridge (window.api)
┌───────────────┼────────────────────────────────────────────────────────┐
│               ▼                                                        │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │   Main Workspace View   │  │    Standalone Detached Views        │  │
│  │  - React 19 UI Strip    │  │  - Dedicated xterm.js instance      │  │
│  │  - TabStrip & Split Panes│ │  - Direct ConPTY stream binding     │  │
│  │  - Lazy-loaded Panels   │  │  - Re-docking back into workspace   │  │
│  └─────────────────────────┘  └─────────────────────────────────────┘  │
│                      REACT 19 RENDERER PROCESS                         │
└────────────────────────────────────────────────────────────────────────┘
```

### Invariants:
1. **Sessions Belong to Main**: PTY processes live in the main process (`sessionManager.ts`). A window closing or popping out never kills background shell executions.
2. **Dynamic Window Resolution**: Handlers resolve target windows from `BrowserWindow.fromWebContents(event.sender)`. Storing a single global `mainWindow` is strictly forbidden.
3. **CWD Resolution Precedence**:
   `Explicit CLI / Context Menu CWD > Profile Default CWD > User Home Directory`.
4. **Current User Registry Only**:
   Explorer verbs and auto-start registries only touch `HKCU`. Writing to `HKLM` or requiring administrator elevation is forbidden.
5. **Atomic Storage**:
   Settings and profiles are written via write-temp-and-rename with automatic `.corrupt.<timestamp>.bak` recovery.

---

## 4. Diagnostics & Privacy Guarantees

The `DiagnosticsManager` (`src/main/diagnosticsManager.ts`) provides safe system troubleshooting:
- Strips all absolute home directory paths (`C:\Users\username\...`) with `%USERPROFILE%`.
- Replaces raw usernames with `%USERNAME%`.
- Replaces API keys, tokens, and authorization headers (`ghp_*`, `sk-*`, `bearer`, `auth=`) with `[REDACTED_SECRET]`.
- Exports modified settings keys only (values are omitted to protect secrets).
- Captures recent sanitized log entries for one-click bug filing.

---

## 5. Automated CI Verification & Pre-Merge Gates

**Zero-Regression Principle: Merges will be checked on behalf of the work.**
No pull request will be merged into `main` without passing the complete verification gate:

```bash
npm run verify
```

This runs:
1. `npm run docs:check`: Validates markdown frontmatter, anchor links, and settings schema synchronization.
2. `npx tsc --noEmit`: Full strict TypeScript compile across all 3 build targets.
3. `npx vitest run`: 149 unit and integration tests passing at 100%.
4. `npm run perf:check`: Verifies bundle size, memory footprint, and latency limits against `perf-budgets.json`.

---

## 6. Open-Source Community & Contribution Resources

- **Contribution Guide**: [HOW-TO-CONTRIBUTE.md](HOW-TO-CONTRIBUTE.md)
- **Contributing Overview**: [CONTRIBUTING.md](CONTRIBUTING.md)
- **Code of Conduct**: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- **Security Policy**: [SECURITY.md](SECURITY.md)
- **Support Guidelines**: [SUPPORT.md](SUPPORT.md)
- **Issue Templates**: `.github/ISSUE_TEMPLATE/`
- **Pull Request Template**: `.github/PULL_REQUEST_TEMPLATE.md`
- **Maintainer Triage Guide**: `docs/maintainers/TRIAGE.md`
- **Release Procedures**: `docs/maintainers/RELEASING.md`
- **Repository Settings**: `docs/maintainers/REPO_SETTINGS.md`
