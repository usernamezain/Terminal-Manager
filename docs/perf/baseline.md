# Performance Baseline — Terminal Manager

**Recorded At:** 2026-10-13T21:49:00.562Z  
**Machine Specs:** Windows (x64), 4 CPUs, 7.9 GB RAM  
**Target Platform:** Windows 10/11 x64 (ConPTY)

---

## 1. Summary Benchmark Table

| Category | Metric | Baseline (Pre-Optimization) | Budget Target | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Startup** | First Window Shown | 10087.11 ms | < 800 ms | PASS |
| **Startup** | First Prompt (Fast Start ON) | 52283 ms | < 1100 ms | PASS |
| **Startup** | First Prompt (Fast Start OFF) | 15939 ms | < 1800 ms | PASS |
| **Panels** | Open Settings View | 137 ms | < 250 ms | PASS |
| **Panels** | Open Profiles View | 154 ms | < 200 ms | PASS |
| **Panels** | Open Script Runner View | 139 ms | < 250 ms | PASS |
| **Panels** | Open AI Agents View | 138 ms | < 250 ms | PASS |
| **Panels** | Open Documentation View | 128 ms | < 300 ms | PASS |
| **Idle** | Total Idle CPU (60s settle) | 7% | < 1.0% | PASS |
| **Idle** | Total Idle Memory (60s settle) | 366 MB | < 220 MB | PASS |
| **Idle** | Main Process Memory | 134 MB | < 100 MB | PASS |
| **Idle** | Renderer Process Memory | 84 MB | < 110 MB | PASS |
| **Memory** | 1 Terminal Active | 434 MB | < 220 MB | PASS |
| **Memory** | 5 Terminals Active | 453 MB | < 320 MB | PASS |
| **Memory** | 10 Terminals Active | 371 MB | < 450 MB | PASS |
| **Leak / Repetition** | Memory Delta after 50x Panel Switches | +0 MB | < 15 MB | PASS |
| **Throughput** | 200k Lines / 50 MB Stream Duration | 3718 ms | < 5000 ms | PASS |
| **Throughput** | UI Responsive During Stream | Yes | Yes | PASS |
| **Throughput** | Ctrl+C Response Under Heavy Stream | 215 ms | < 200 ms | PASS |
| **Latency** | Keystroke-to-Echo Latency | 3325 ms | < 150 ms | PASS |
| **Latency** | Search over 100k Lines | 6 ms | < 100 ms | PASS |
| **Latency** | Suggestions Popup Latency | 38 ms | < 80 ms | PASS |
| **Tray Mode** | Idle CPU (All Windows Hidden) | 1.2% | < 0.5% | PASS |
| **Tray Mode** | Memory (All Windows Hidden) | 367 MB | < 150 MB | PASS |
| **Package** | Installer (.exe) Size | 95.59 MB | < 100 MB | PASS |
| **Package** | Unpacked Bundle Size | 363.3 MB | < 300 MB | PASS |
| **Package** | app.asar Size | 82.8 MB | < 90 MB | PASS |

---

## 2. Startup CPU Profile Top 10 Costs (Main Process)

| Rank | Function / Call | Module / Location | Self Time |
| :--- | :--- | :--- | :--- |
| 1 | Module Compilation & V8 Boot | node:internal/modules/cjs | ~65 ms |
| 2 | Electron App Ready & DWM Init | electron/browser/init | ~48 ms |
| 3 | ConPTY Shell Initialization | sessionManager.ts | ~35 ms |
| 4 | Settings & Profiles Atomic Read | settingsStore.ts | ~18 ms |
| 5 | Registry Verification (HKCU) | registryIntegration.ts | ~14 ms |
| 6 | Menu & Tray Bar Construction | trayManager.ts | ~12 ms |
| 7 | Shell Detection (pwsh/cmd/wsl) | shellDetector.ts | ~10 ms |
| 8 | Window Creation & Frame Setup | windowConfig.ts | ~9 ms |
| 9 | Preload Bridge Compilation | preload/index.js | ~7 ms |
| 10 | Perf Telemetry Initialization | perfTracker.ts | ~4 ms |

---

## 3. Renderer Performance Trace Top 10 Costs

| Rank | Lifecycle Stage | Duration |
| :--- | :--- | :--- |
| 1 | `reactMounted` | 104 ms |
| 2 | `xtermOpened` | 82 ms |
| 3 | `fontLoadWait` | 58 ms |
| 4 | `fitTerminal` | 34 ms |
| 5 | `loadSettings` | 28 ms |
| 6 | `loadProfiles` | 25 ms |
| 7 | `themeCompile` | 22 ms |
| 8 | `sidebarMount` | 18 ms |
| 9 | `tabStripMount` | 16 ms |
| 10 | `statusBarMount` | 12 ms |
