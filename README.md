# Terminal Manager - Phase 1 Foundation

Terminal Manager is a high-performance desktop terminal workspace built with Electron, Vite, React, TypeScript, node-pty (ConPTY on Windows), and xterm.js with WebGL acceleration.

## How to Run

### Requirements
- Node.js 20+
- npm 10+
- C++ build tools (Visual Studio Build Tools / Windows SDK on Windows for `node-pty`)

### Installation & Development
```bash
# Install dependencies & rebuild node-pty for Electron
npm install

# Start Vite dev server & launch Electron
npm run dev
```

### Production Build
```bash
# Typecheck and build main, preload, and renderer bundles
npm run build
```

---

## Project Structure & Architecture Map

```text
c:/Users/SHABBIR TRADERS/Desktop/CUstomized-Terminal
├── package.json
├── tsconfig.json
├── vite.main.config.ts
├── vite.preload.config.ts
├── vite.renderer.config.ts
├── README.md
├── src/
│   ├── main/                  # Main Process (Node / Electron)
│   │   ├── index.ts           # Window lifecycle, single-instance lock, material setup
│   │   ├── ptyManager.ts      # node-pty management, flow control/backpressure, process tree kill
│   │   ├── ipcHandlers.ts     # Zod validated IPC channels
│   │   ├── settingsStore.ts   # Versioned settings store with atomic JSON writes (temp+rename)
│   │   ├── shellDetector.ts   # Auto-detects pwsh, powershell, cmd, wsl, zsh, bash
│   │   └── logger.ts          # Rotating log file in userData
│   ├── preload/               # Preload ContextBridge
│   │   └── index.ts           # Exposes strictly-typed window.api
│   ├── shared/                # Shared Contracts & Definitions
│   │   ├── types.ts           # API, settings, PTY event types
│   │   ├── ipc.ts             # Zod IPC validation schemas
│   │   └── constants.ts       # Default settings & Midnight/Graphite theme palettes
│   ├── helper/                # Helper Process Seam (Windows UAC elevation)
│   │   └── README.md          # Description of administrative elevation seam
│   └── renderer/              # Renderer Process (React 19 + xterm.js)
│       ├── index.html
│       ├── main.tsx
│       ├── app/
│       │   ├── App.tsx        # Layout shell (TitleBar, Sidebar, TabStrip, StatusBar)
│       │   └── App.module.css
│       ├── design/
│       │   ├── tokens.css     # CSS variables (spacing, colors, typography, easings)
│       │   └── global.css     # Resets, 6px scrollbars, focus ring, reduced motion
│       ├── store/
│       │   ├── useWorkspaceStore.ts # Zustand layout tree store (Tabs > LayoutNode > Pane)
│       │   └── useSettingsStore.ts  # Cached settings store with theme sync
│       ├── components/
│       │   ├── TitleBar.tsx   # Custom Windows 11 style title bar
│       │   ├── Sidebar.tsx    # Collapsable navigation sidebar with Framer Motion
│       │   ├── TabStrip.tsx   # Top tab bar (36px)
│       │   ├── StatusBar.tsx  # Bottom status bar (24px)
│       │   └── SettingsModal.tsx # Live settings & theme customizer dialog
│       └── features/
│           └── terminal/
│               ├── TerminalInstance.ts  # xterm.js setup, WebGL fallback, ACK backpressure
│               ├── TerminalView.tsx      # Terminal container & resize observer
│               ├── PaneHeader.tsx        # 28px pane header with title editing
│               ├── ExitBanner.tsx        # Thin process exit banner
│               ├── SpawnErrorCard.tsx    # PTY spawn failure error card
│               └── Toast.tsx             # Floating info toast (WebGL fallback)
```

---

## Seams Left for Phase 2 & Later

1. **Pane-Tree Layout Engine (Phase 2)**:
   - `useWorkspaceStore` is already modeled as `Workspace > Tab[] > LayoutNode` (supporting split nodes). Phase 2 will implement split horizontal/vertical actions, resizing dividers, and multi-pane grid rendering.
2. **Multi-Tab & Tab Management (Phase 2)**:
   - `TabStrip` and `useWorkspaceStore` are ready for multiple active tabs, tab reordering, and closing.
3. **Profiles Presets & Editor (Phase 3)**:
   - `Sidebar` contains a `Profiles` placeholder item. `PtyCreateArgs` accepts `profileId` seam.
4. **Command Palette & Global Hotkeys (Phase 4)**:
   - Shared IPC channels and store architecture allow easy hookup of a `Ctrl+Shift+P` command palette overlay.
5. **System Tools & WinUtil Integration (Phase 5)**:
   - `Sidebar` includes a `System Tools` Windows-only placeholder seam.
6. **Out-of-Process Administrative Elevation (Phase 6)**:
   - `/src/helper/` placeholder ready for `terminal-helper.exe` UAC elevation process.

---

## Shell Experience Architecture (ChrisTitusTech PowerShell Profile Integration)

### 1. Delivery Model & Pristine Isolation
- **Official Source**: Cloned to `<userData>/tools/powershell-profile` (`git clone --depth 1 https://github.com/ChrisTitusTech/powershell-profile`). The repository files and `LICENSE` remain unmodified.
- **Runtime Directory**: `<userData>/shell/` contains:
  - `Microsoft.PowerShell_profile.ps1`: Exact byte-for-byte runtime copy (SHA-256 verified against repository clone on every launch).
  - `CTTcustom.ps1`: Dynamically generated customized overrides script.
  - `themes/`: Directory containing selected Oh My Posh themes (e.g. `cobalt2.omp.json`).
  - `LastExecutionTime.txt`: Update interval tracking file.
- **App-Scoped Mode**: Real `$PROFILE` is untouched. PowerShell PTY sessions spawn with:
  `pwsh.exe -NoLogo -NoProfile -NoExit -Command ". '<userData>\shell\Microsoft.PowerShell_profile.ps1'"`
  Setting `POSH_THEME` environment variable to `<userData>\shell\themes\<activeTheme>.omp.json` and prepending `<userData>\tools\bin` to PATH.

### 2. Generator & Hook Selection (`Set-PredictionSource_Override`)
- **Generator**: `src/main/shell-experience/generator.ts` produces `CTTcustom.ps1` atomically (write to `.tmp` file then rename).
- **Structure**: Managed block between `# >>> TERMINAL-MANAGER MANAGED BLOCK >>>` and `# <<< END MANAGED BLOCK <<<`, containing a JSON comment header `# settings: {...}` for lossless round-trip parsing.
- **Hook Choice**: The generator uses `Set-PredictionSource_Override` as its execution hook. Upstream calls `Set-PredictionSource` as the final step of `Initialize-PSReadLine`. Overriding `Set-PredictionSource_Override` allows applying PSReadLine options, 17-slot syntax highlighting colors, custom keybindings, disabled command removals, custom functions, and sensitive history filters safely after all profile functions/aliases exist.
- **Neutralized Upstream Self-Update**: `Update-Profile_Override` is always generated to prevent upstream from downloading and overwriting `$PROFILE`. Updates are managed inside Terminal Manager via git reset/pull.

### 3. How to Add a New Setting
1. Add the new setting property to `ShellExperienceSettingsSchema` in `src/shared/shellExperienceTypes.ts`.
2. Update `src/main/shell-experience/generator.ts` to output the corresponding PowerShell code inside `buildManagedBlock()`.
3. Add the control element in the appropriate section component inside `src/renderer/features/shell-experience/`.

### 4. Attribution & Licensing
- Upstream Profile: **Pretty PowerShell by Chris Titus Tech** (MIT License).
- GitHub Repository: `https://github.com/ChrisTitusTech/powershell-profile`
- Oh My Posh Themes: `https://github.com/JanDeDobbeleer/oh-my-posh`
- Terminal-Icons Module: `https://github.com/devblackops/Terminal-Icons`
- CaskaydiaCove Nerd Font: `https://github.com/ryanoasis/nerd-fonts`

