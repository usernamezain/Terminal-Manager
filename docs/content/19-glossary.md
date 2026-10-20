---
id: glossary
title: Glossary
order: 19
summary: Definitions of core architectural concepts, terminal terminology, and Windows platform integrations.
tags:
  - glossary
  - terminology
  - architecture
  - definitions
since: 0.1.0
updated: 2026-10-13
---

## What It Is

This glossary defines technical terms, platform concepts, and architectural definitions utilized throughout Terminal Manager and its documentation.

## Definitions

### App-Scoped Mode

A Shell Experience isolation setting that applies prompts, themes, and aliases exclusively to terminal sessions launched within Terminal Manager. In this mode, your computer's real PowerShell profile script (`$PROFILE`) remains untouched.

### ConPTY (Windows Pseudoconsole)

The native Windows pseudoconsole infrastructure introduced in Windows 10. ConPTY acts as a headless character-mode translation bridge between Windows console applications and terminal emulators, providing full ANSI/VT escape sequence support.

### Docking

The action of re-attaching a detached standalone terminal window back into the tab strip of the primary Terminal Manager window.

### DPAPI (Data Protection API)

The Windows platform cryptography service used by Terminal Manager to encrypt and decrypt sensitive API keys and tokens stored in `%APPDATA%\Terminal Manager\agent-state.json`. DPAPI binds encryption keys to the user's active Windows login credentials.

### Fast Start

A startup acceleration technique in Shell Experience that pre-compiles and caches prompt bytecode while deferring secondary plugin initializations to idle time, reducing cold PowerShell startup latency from over 3 seconds to under 0.9 seconds.

### Mica and Acrylic

Native Windows 11 Desktop Window Manager (DWM) background materials. Mica samples desktop wallpaper tinting for low-overhead translucency; Acrylic provides frosted-glass blur that samples all underlying desktop windows.

### Profile

A named configuration template that specifies an executable shell binary, command-line arguments, a starting directory, custom environment variables, an accent color, an icon, and visual typography overrides.

### Project Runner

A built-in system that performs read-only scanning of repository manifest files (such as `package.json`, `Cargo.toml`, or `pyproject.toml`) and exposes discovered run and test scripts directly in the terminal pane header.

### Script Runner

A multi-interpreter background task engine that executes scripts using a managed FIFO queue, configurable failure policies (stop, continue, retry), process tree timeouts, and desktop notifications.

### Session

An active pseudoterminal process tree managed inside the Electron main process. Each session is identified by a unique UUID and remains alive independently of individual renderer viewports.

### Shell Integration (OSC 133 / OSC 7)

Standardized operating system command escape sequences emitted by shells:
- **OSC 7**: Reports current working directory updates on every `cd` command.
- **OSC 133**: Emits markers for command input start, command execution, and exit return codes.

### Standalone Window

An independent, frameless desktop window spawned to host a single terminal session detached from the primary main window.

### System-Wide Mode

A Shell Experience setting that links Terminal Manager customizations directly into your machine's primary PowerShell profile (`Microsoft.PowerShell_profile.ps1`) with automatic timestamped backups.

## Related Topics

- [Getting Started](01-getting-started.md)
- [Terminal Basics](05-terminal-basics.md)
- [Shell Experience](04-shell-experience.md)
