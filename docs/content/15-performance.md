---
id: performance
title: Performance
order: 15
summary: Monitor startup timeline markers, shell memory usage, WebGL rendering efficiency, and backpressure flow control.
tags:
  - performance
  - benchmarks
  - memory
  - startup
  - fast-start
  - webgl
since: 0.1.0
updated: 2026-10-13
---

## What It Is

Terminal Manager is architected for low latency, rapid startup, and minimal memory overhead. It includes built-in diagnostic telemetry (`perfTracker`), real-time tracking of active shell process memory, hardware-accelerated WebGL terminal rendering, and backpressure flow control to handle high-throughput terminal streams without freezing the user interface.

## Before You Start

- Open `Settings > Diagnostics > Performance` to inspect live hardware timestamps and resource consumption metrics.
- Keep the Windows Task Manager open side-by-side if you wish to verify external process working set figures.

## The Performance Panel

The **Performance** view in Settings provides real-time diagnostic insight into the running application:

### 1. Startup Timeline Markers

Terminal Manager records high-resolution hardware timestamps (using `performance.now()`) during application boot:

- `mainStart`: Electron main process entry point.
- `appReady`: Electron `app.whenReady()` lifecycle event.
- `windowCreated`: Primary `BrowserWindow` instantiated with DWM materials.
- `preloadReady`: Secure IPC bridge initialized in the renderer preload script.
- `reactMounted`: React 19 component tree rendered to DOM.
- `firstPtySpawned`: ConPTY pseudoterminal process created and attached.

You can inspect the raw JSON timeline directly in the panel to diagnose any delays caused by antivirus scanning, disk I/O, or system policies.

### 2. Process & Memory Footprint

- **Active Shell Processes**: Total count of running ConPTY / `node-pty` background instances.
- **Working Set Memory**: Aggregate physical RAM utilized by all active shell processes combined.

## Startup Targets and Benchmarks

Terminal Manager targets the following performance benchmarks on modern Windows hardware:

| Milestone | Target Duration | Optimization Strategy |
| :--- | :--- | :--- |
| **Cold Window Launch** | `< 450 ms` | Vite ESM bundling, deferred view imports, Mica hardware compositing |
| **Fast Start PowerShell** | `< 850 ms` | Cached prompt bytecode, deferred plugin imports |
| **Full Profile PowerShell**| `~ 3.2 s` | Synchronous evaluation of all system profile scripts |
| **New Tab Spawn** | `< 90 ms` | Pre-warmed pty creation and reusable terminal buffers |
| **Window Drag / Resize** | `60 fps` | Hardware WebGL 2 canvas rendering with frame throttling |

## Fast Start Optimization Details

When PowerShell 7 is configured with numerous heavy modules (PSReadLine, Oh My Posh, zoxide, GitStatus), standard profile initialization can easily exceed 3 seconds.

The **Fast Start** engine in Terminal Manager optimizes startup by:

1. **Pre-Compiling Prompt Bytecode**: Oh My Posh configuration and theme structures are serialized and cached in `%APPDATA%\Terminal Manager\cache\`.
2. **Idle-Time Plugin Deferral**: Non-essential modules (such as completion predictors and directory history indexing) are scheduled to load after the first interactive prompt is displayed.
3. **CWD Invariance Guarantee**: Deferred initializers strictly run in isolated sub-scopes and never mutate your active working directory.

## Memory Footprint Management

- **Base Electron Footprint**: The primary window and UI render engine occupy approximately 90 MB to 140 MB of RAM.
- **Shell Processes**: Each active PowerShell or Bash session consumes approximately 15 MB to 35 MB of working set memory depending on loaded modules.
- **Background Mode**: When minimized to the Windows system tray with windows hidden, the renderer process enters idle suspension, drastically reducing CPU usage to 0%.

## Backpressure Flow Control

When running commands that output vast amounts of text (such as `cat large_file.log` or verbose compiler dumps), unmanaged terminal emulators can suffer memory exhaustion and UI freezes.

Terminal Manager implements strict IPC flow control between the Node.js main process and the xterm.js renderer:

- **High Watermark (512 KB)**: When buffered unread terminal output reaches 512 KB, the main process pauses ConPTY stream reads.
- **Low Watermark (128 KB)**: Once the WebGL renderer processes and draws the pending buffer down to 128 KB, an acknowledgement signal (`pty:ack`) resumes data flow.
- This ensures zero dropped bytes while maintaining a responsive, stutter-free interface.

## Performance Optimization Tips

1. **Enable Fast Start**: Set `Settings > Shell Experience > Startup Performance` to **Fast Start (Cached & Lazy)**.
2. **Cap Scrollback Lines**: Keep `Settings > General > Scrollback Buffer` set to `10000` lines (default). Setting this to `100000+` lines increases RAM consumption per split pane.
3. **Use Solid Background on Laptops**: If working on battery power, select **Solid** in `Settings > General > Window Material` to reduce GPU compositing overhead.
4. **Reduce Animation Level**: On high-refresh or multi-monitor setups with lower-end GPUs, set `Settings > General > Animation Level` to **Reduced**.

## Troubleshooting

### High CPU usage when terminal is idle

- **Symptom**: Terminal Manager consumes 10–20% CPU while no commands are running.
- **Cause**: An active command prompt engine or background script runner is polling in a tight loop.
- **Fix**: Check `Settings > Shell Experience > Prompt Gallery` and select a lightweight prompt theme. Ensure no background Script Runner queues are stuck in a retry loop.

### Terminal scrolling feels choppy or drops frames

- **Symptom**: Scrolling through long terminal history stutters.
- **Cause**: WebGL acceleration was disabled or fell back to software canvas rendering.
- **Fix**: Verify your graphics driver supports WebGL 2. Check the Status Bar indicator at the bottom of the window; it should display `WebGL` in green.

## Related Topics

- [Shell Experience](04-shell-experience.md)
- [Troubleshooting and FAQ](16-troubleshooting-and-faq.md)
- [Settings Reference](_generated/14-settings-reference.md)
