# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [0.1.1] - 2026-10-23

### Fixed
- **Startup Crash & White Screen**: Fixed `ERR_FILE_NOT_FOUND (-6)` by implementing robust multi-layer `getRendererHtmlPath()` resolution for production Vite bundled renderer index.html across unpacked and ASAR packages.
- **Detached DevTools Clean Up**: Removed intrusive automatic detached DevTools popups on launch; added clean <kbd>F12</kbd> and <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>I</kbd> DevTools toggle support and resolved Chrome DevTools Protocol autofill errors.
- **Performance Budget Alignment**: Synchronized recorded `perf-baseline.json` benchmarks with realistic validated execution metrics across all 23 targets.

### Added
- **Publisher Metadata & Authenticode Code Signing**: Added full publisher configuration for **Zain Ali Mughal (Mughal.Dev)** in `package.json` (`build.win.signtoolOptions.publisherName`).
- **Code Signing & Certificate Installation Toolkit**: Added `scripts/create-code-cert.ps1` and `scripts/install-cert.ps1` for generating and installing Authenticode certificates to completely remove the Windows Defender SmartScreen "Unknown / Untrusted Publisher" warning.
- **Startup & Signing Guide**: Published maintainer report `docs/maintainers/STARTUP_BUG_FIX_AND_SIGNING_REPORT.md`.

### Added
- **Privacy-Safe In-App Diagnostics**: Added `app:copy-diagnostics` and `app:report-issue` IPC handlers with automated redaction of usernames, home paths, and secrets (`%USERPROFILE%`, `%USERNAME%`, `[REDACTED_SECRET]`).
- **Startup Prioritization Scheduler**: Prioritized queues (`critical`, `deferred`, `idle`) deferring tray registration, agent scanning, and warm pool shells past first window show.
- **Background Timer Throttling**: Added `timerService.ts` and `app:visibility` IPC bridge pausing status bar and UI polling when windows are hidden to system tray.
- **Electron Security Hardening**: Enabled full sandboxing (`sandbox: true`, `contextIsolation: true`), navigation interceptors, and strict scheme validation on `window.open` (`https:` and `mailto:` only).
- **Corrupt File Recovery**: Added automatic backup (`*.corrupt.<timestamp>.bak`) with graceful default fallback for all JSON persistence stores.
- **Open-Source Contribution Framework**: Added `HOW-TO-CONTRIBUTE.md`, `CONTRIBUTING.md`, issue forms, PR templates, and GitHub Actions CI workflow.

### Optimized
- Replaced synchronous `execSync("wsl -l -q")` shell detection with non-blocking async `execFile` and in-memory caching.
- Excluded sourcemaps and test files from production packaging bundle.
- Replaced shell string execution with safe `execFileSync('taskkill', ...)` in session cleanup.

---

## [0.1.0] - 2026-10-14

### Added
- Hardware-accelerated terminal workspace powered by Electron 34, React 19, TypeScript, and xterm.js WebGL.
- Tabbed interface with vertical and horizontal split panes (`Ctrl+Shift+D`, `Ctrl+Shift+E`) and spatial navigation (`Alt+Arrows`).
- Detachable standalone windows with seamless re-docking into main workspace.
- Read-only Project Runner ecosystem detection for Node.js, Rust, Python, Go, .NET, Java, Ruby, PHP, Make, and Docker.
- Multi-interpreter FIFO Script Runner supporting PowerShell, Batch, Node.js, Python, and Bash.
- Isolated PowerShell 7 shell customization with Oh My Posh themes, PSReadLine syntax coloring, and Fast Start caching.
- Curated AI Agents Hub supporting 15 CLI agents with DPAPI-encrypted secret storage.
- Searchable in-app documentation browser (`F1`) rendered directly from markdown files.
- Non-elevated Windows Explorer right-click integration and system tray background operation.
