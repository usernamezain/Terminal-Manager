# AGENT.md - Terminal Manager Context & Guidelines

Welcome to **Terminal Manager**! This document provides complete architectural context, technology stack details, data flows, codebase organization, and engineering rules for AI agents and human developers working on this project.

---

## 1. Project Overview

- **Name**: Terminal Manager
- **Primary OS**: Windows 10/11 (with macOS and Linux support)
- **Goal**: A high-performance, desktop terminal manager supporting multiple real terminals in a single window (tabs, splits, grid), admin terminals via UAC helper, profiles, system tools integration (WinUtil), command palette, and workspace persistence.
- **Current Phase**: **Phase 1 of 10: Foundation** (Frameless window, custom chrome, 1 working terminal pane, WebGL acceleration with Canvas fallback, backpressure flow control, atomic settings, and Zod-validated IPC).

---

## 2. Fixed Stack & Specifications

| Concern | Technology / Library |
| :--- | :--- |
| **Framework** | Electron (latest stable), Vite 6, React 19, TypeScript (Strict Mode) |
| **Main Process PTY** | `node-pty` (ConPTY backend on Windows) |
| **Renderer Terminal** | `@xterm/xterm` (v5.5+) |
| **xterm Addons** | `@xterm/addon-webgl`, `@xterm/addon-fit`, `@xterm/addon-search`, `@xterm/addon-web-links`, `@xterm/addon-unicode11`, `@xterm/addon-serialize` |
| **State Management** | **Zustand** (UI/layout state only). *Rule: Terminal output NEVER passes through React or Zustand.* |
| **IPC Validation** | **Zod** (All IPC channel payloads validated in main process) |
| **Settings Storage** | Custom atomic JSON store in `userData` (`settings.json` via temp file write and rename) |
| **Styling** | CSS Variables (`tokens.css`, `global.css`) + CSS Modules (`*.module.css`). No heavy UI frameworks. |
| **Animations** | **Framer Motion** (Used only for sidebar collapse and dialog popups; respects `prefers-reduced-motion` and `animationLevel` settings) |
| **Icons** | `lucide-react` |

---

## 3. Directory & Module Structure

The project strictly follows a **one concern per module** rule, with **no file exceeding ~300 lines**:

```text
/src
├── env.d.ts                   # CSS Module & Vite client type definitions
├── shared/                    # Shared types, Zod schemas, & constants
│   ├── types.ts               # AppSettings, ShellInfo, IPC args & event interfaces
│   ├── ipc.ts                 # Zod validation schemas & IPC channel constants
│   └── constants.ts           # Default settings & Midnight/Graphite theme palettes
├── main/                      # Main Process (Node.js / Electron)
│   ├── index.ts               # Application lifecycle, window creation, single-instance lock
│   ├── ptyManager.ts          # node-pty lifecycle, batching (6ms/64KB), ACK backpressure, tree kill
│   ├── ipcHandlers.ts         # Zod-validated IPC channel handlers
│   ├── settingsStore.ts       # Versioned settings store with atomic JSON writes
│   ├── shellDetector.ts       # Auto-detects pwsh, powershell, cmd, wsl, zsh, bash
│   └── logger.ts              # Rotating log file writer in userData (5MB max)
├── preload/                   # Preload Script
│   └── index.ts               # Exposes strictly-typed window.api via contextBridge
├── helper/                    # Helper Process Seam (Future Phase 6)
│   └── README.md              # Documentation for UAC elevated helper process
└── renderer/                  # Renderer Process (React 19 + xterm.js)
    ├── index.html             # HTML entry point with strict CSP meta tag
    ├── main.tsx               # React entry point
    ├── app/
    │   ├── App.tsx            # Main window shell layout
    │   └── App.module.css
    ├── design/
    │   ├── tokens.css         # CSS Variables (spacing, typography, colors, radii, easings)
    │   └── global.css         # Global resets, overlay 6px scrollbars, focus ring
    ├── store/
    │   ├── useWorkspaceStore.ts # Pane-tree layout store (Workspace > Tab[] > LayoutNode > Pane)
    │   └── useSettingsStore.ts  # Cached UI settings & live theme synchronizer
    ├── components/
    │   ├── TitleBar.tsx       # Custom Windows 11 style title bar (min/max/close)
    │   ├── Sidebar.tsx        # Collapsable sidebar with Framer Motion & 400ms tooltips
    │   ├── TabStrip.tsx       # 36px top tab strip
    │   ├── StatusBar.tsx      # 24px bottom status bar
    │   └── SettingsModal.tsx # Settings dialog (Theme, Animation, Font, Cursor, Scrollback)
    └── features/terminal/
        ├── TerminalInstance.ts  # xterm.js wrapper, WebGL fallback, ACK backpressure
        ├── TerminalView.tsx      # Pane container, resize observer, PTY event listeners
        ├── PaneHeader.tsx        # 28px pane header with inline title editing
        ├── ExitBanner.tsx        # Process exit status banner
        ├── SpawnErrorCard.tsx    # PTY spawn failure card with retry option
        └── Toast.tsx             # Floating notification toast (WebGL context loss)
```

---

## 4. Key Data Flows & Architecture Rules

### A. Terminal Input/Output & Backpressure Pipeline
```text
[ Keystroke / Input ]
       │
       ▼
xterm.onData ──► window.api.pty.write ──► main: ipcMain.handle('pty:write') ──► ptyProcess.write()

[ PTY Output Stream ]
       │
       ▼
ptyProcess.onData ──► ptyManager (Batch 6ms / 64KB) ──► webContents.send('pty:data')
                                                                  │
                                                                  ▼
api.pty.ack(id, len) ◄── xterm.write(data, callback) ◄────────────┘
       │
       ▼
main: unackedBytes -= len (Pause PTY if >512KB, Resume PTY if <128KB)
```
- **Strict Rule**: Terminal output **MUST NEVER** touch React or Zustand state (`setState`). Data flows directly from the IPC event into `terminal.write()`.

### B. Smart Keybindings & Clipboard
- **Smart Ctrl+C**: If `xterm.hasSelection()`, copies selected text to clipboard; otherwise sends `\x03` (SIGINT) to the PTY.
- **Ctrl+V & Right-Click**: Pastes text directly from `navigator.clipboard` into `pty.write()`.

### C. WebGL Acceleration & Fallback
- `TerminalInstance` initializes `@xterm/addon-webgl` by default.
- If WebGL is unsupported or triggers `onContextLoss`, it automatically disposes the WebGL addon, falls back to the canvas/DOM renderer, and displays a non-intrusive `Toast` notification without buffer loss.

### D. Process Tree Lifecycle & Cleanup
- When a terminal pane is closed, the window is closed, or the application quits, `ptyManager.killAll()` invokes `taskkill /F /T /PID <pid>` on Windows (or process tree SIGKILL on Unix) to guarantee zero orphan ConPTY child processes (such as `cmd.exe`, `pwsh.exe`, or `git.exe`).

### E. Settings Store (Atomic Writes)
- Settings are persisted in `<userData>/settings.json`.
- All writes are **atomic**: data is written to a temporary file (`settings.json.<timestamp>.tmp`) and then atomically renamed to `settings.json`.

---

## 5. Design System Tokens & Themes

### Spacing & Layout Grid
- Spacing: `2px`, `4px`, `6px`, `8px`, `12px`, `16px`, `20px`, `24px`, `32px`, `48px`.
- Radii: `4px` (sm), `8px` (md), `12px` (lg), `999px` (full).
- TitleBar: `32px` height (`-webkit-app-region: drag`).
- Sidebar: `56px` collapsed / `240px` expanded (`240-300ms` animated).
- TabStrip: `36px` height.
- Pane Header: `28px` height.
- StatusBar: `24px` height.

### Color Tokens (Midnight vs Graphite)
```css
/* Midnight Theme (Default) */
--bg-base: #0B0D10;
--bg-surface: rgba(20, 23, 28, 0.72);
--bg-elevated: #161A20;
--bg-terminal: #0D0F13;
--border-subtle: rgba(255, 255, 255, 0.06);
--border-strong: rgba(255, 255, 255, 0.14);
--text-primary: #E6E8EB;
--text-secondary: #A0A6AF;
--text-muted: #6B727C;
--accent: #6C8CFF;
--accent-glow: rgba(108, 140, 255, 0.35);
--admin: #FFB454;
--success: #4ADE80;
--warning: #FACC15;
--danger: #F87171;
```

---

## 6. Development Scripts

```bash
# Install dependencies & rebuild node-pty
npm install

# Run Vite dev server & start Electron app
npm run dev

# Typecheck and build main, preload, and renderer production bundles
npm run build

# Rebuild native node-pty for Electron
npm run rebuild
```

---

## 7. Roadmap & Seam Map

- **Phase 1 (Current)**: Foundation (Frameless window, 1 shell pane, backpressure, WebGL fallback, atomic settings, Zod IPC).
- **Phase 2**: Pane-Tree Layout Engine (Splits horizontal/vertical, resizing dividers, multi-tab). *Seam: `useWorkspaceStore` already models `Workspace > Tab[] > LayoutNode > Pane`.*
- **Phase 3**: Profiles Presets & Manager. *Seam: `PtyCreateArgs` accepts `profileId`; Sidebar has Profiles item.*
- **Phase 4**: Command Palette (`Ctrl+Shift+P`) & Global Hotkey Registry.
- **Phase 5**: System Tools & WinUtil Tab (Windows-only utility tab). *Seam: Sidebar has System Tools item.*
- **Phase 6**: Out-of-Process Administrative Elevation. *Seam: `/src/helper/README.md` placeholder for `terminal-helper.exe`.*
- **Phase 7-10**: Session Persistence, Custom Macros, and Installer Builds (`electron-builder`).

---

## 8. Development Rules for AI Agents

1. **Strict TypeScript**: Do not use `any` without an explicit justifying comment.
2. **Security Baseline**: Keep `contextIsolation: true`, `nodeIntegration: false`, block navigation and `window.open`, enforce strict CSP, and validate every IPC payload with Zod.
3. **No File Over ~300 Lines**: Keep modules compact and focused on a single concern.
4. **No Terminal Output in React State**: Never trigger React re-renders on PTY output chunks.
5. **No Blind Symptom Patches**: Always investigate log output and trace root causes before mutating code.
