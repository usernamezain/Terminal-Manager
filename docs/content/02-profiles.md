---
id: profiles
title: Profiles
order: 2
summary: Create, edit, duplicate, and customize terminal profiles with custom shell paths, environment variables, fonts, and administrative elevation.
tags:
  - profiles
  - shells
  - powershell
  - cmd
  - wsl
  - elevation
since: 0.1.0
updated: 2026-10-13
---

## What It Is

Profiles define how terminal sessions launch inside Terminal Manager. Each profile encapsulates an executable path, command-line arguments, a starting directory, custom environment variables, an accent color, an icon, and visual typography overrides. You can maintain distinct profiles for PowerShell 7, Command Prompt, WSL distributions, and administrative workflows.

## Before You Start

- Ensure the shell executable you intend to launch is installed and accessible on your filesystem.
- If you configure an elevated profile, Windows User Account Control (UAC) will prompt for confirmation upon launching the session.

## Creating a Profile

To create a new profile from scratch:

1. Click **Profiles** in the left navigation rail, or press `Ctrl+Shift+P`.
2. Click **New Profile** in the top-left action header.
3. Enter a descriptive name in the **Profile Name** field (for example, `Node 20 Dev`).
4. Enter the full path or executable name in **Shell Path** (for example, `pwsh.exe`).
5. Specify any startup parameters in **Arguments** (for example, `-NoLogo -NoExit`).
6. Set your preferred **Starting Directory (CWD)** (for example, `C:\Projects`).
7. Click **Save Changes** in the bottom-right actions bar.

## Editing Profile Properties

Every profile supports the following configuration properties in the editor form:

### General Information

- **Profile Name**: The display label shown in menus, tab headers, and the profile list.
- **Tab Title Override**: An optional static title for terminal tabs launched with this profile. If left blank, the tab displays dynamic shell process titles.
- **Run as Administrator**: When toggled on, launches the terminal process with elevated Windows administrator privileges using ConPTY elevation.
- **Default Profile**: Designates this profile as the primary shell spawned when clicking `+` or pressing `Ctrl+Shift+T`.

### Appearance and Visual Styling

- **Accent Color**: A hex color applied to the active tab indicator, pane border focus ring, and icon swatch for this profile.
- **Profile Icon**: Select from built-in iconography (Terminal, Shield, Code, Server, Cpu, Database, Globe) for instant identification in the tab strip.
- **Font Family**: A custom monospace typeface override (for example, `Cascadia Code`, `FiraCode Nerd Font`, or `JetBrains Mono`). Leave empty to inherit the global font.
- **Font Size**: Font size in points (ranging from `8` to `36`). Leave empty to inherit the global font size.

### Execution Parameters

- **Shell Executable Path**: The absolute path to the binary or a binary name present in system `PATH` (such as `pwsh.exe`, `cmd.exe`, or `wsl.exe`).
- **Arguments**: Command-line arguments passed directly to the binary at launch.
- **Starting Directory (CWD)**: Working directory path where the shell process starts. Supports drive roots (such as `C:\`) and directory paths.
- **Environment Variables**: Key-value pairs injected directly into the spawned process environment before launch.

## Managing Profiles

### Duplicating a Profile

To clone an existing profile with all its environment variables, arguments, and styles:

1. Open the **Profiles** view.
2. Select the source profile in the list.
3. Click the **Duplicate** button in the header actions bar.
4. A new profile named `<Profile Name> (Copy)` appears immediately in the list.

### Deleting a Profile

1. Select the profile you wish to remove from the list.
2. Click **Delete Profile** in the editor footer.
3. Confirm the deletion prompt.

> **Warning:** You cannot delete the profile currently designated as the default. Assign default status to another profile before attempting deletion.

## Options Reference

| Field | Type | Default | Description | Stored In |
| :--- | :--- | :--- | :--- | :--- |
| `name` | string | `PowerShell` | Display name of the profile | `userData/profiles.json` |
| `tabTitle` | string | `""` | Static tab title override | `userData/profiles.json` |
| `elevate` | boolean | `false` | Run process as administrator | `userData/profiles.json` |
| `color` | string | `#3b82f6` | Hex accent color swatch | `userData/profiles.json` |
| `icon` | string | `"Terminal"` | Lucide icon identifier | `userData/profiles.json` |
| `fontFamily` | string | `""` | Custom monospace font family | `userData/profiles.json` |
| `fontSize` | number | `14` | Terminal font size in points | `userData/profiles.json` |
| `shellPath` | string | `pwsh.exe` | Binary path or command | `userData/profiles.json` |
| `shellArgs` | string | `""` | Space-delimited command arguments | `userData/profiles.json` |
| `cwd` | string | `""` | Starting directory path | `userData/profiles.json` |
| `env` | object | `{}` | Custom key-value environment variables | `userData/profiles.json` |
| `isDefault` | boolean | `false` | Primary shell indicator | `userData/profiles.json` |

## Copyable Configuration Examples

### PowerShell 7 (Fast Clean Launch)

- **Shell Path**: `pwsh.exe`
- **Arguments**: `-NoLogo -ExecutionPolicy Bypass`
- **CWD**: `C:\Users\%USERNAME%`
- **Accent Color**: `#3b82f6`

### Command Prompt (Visual Studio 2022 Build Tools)

- **Shell Path**: `cmd.exe`
- **Arguments**: `/k "C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\Tools\VsDevCmd.bat"`
- **Accent Color**: `#f59e0b`

### WSL2 Linux (Ubuntu)

- **Shell Path**: `wsl.exe`
- **Arguments**: `-d Ubuntu ~`
- **Accent Color**: `#e11d48`
- **Icon**: `Server`

### Administrator PowerShell

- **Shell Path**: `pwsh.exe`
- **Run as Administrator**: `On`
- **Accent Color**: `#ef4444`
- **Icon**: `Shield`

## Troubleshooting

### Shell exits immediately with exit code 1

- **Symptom**: Terminal opens and immediately shows `Process exited with code 1`.
- **Cause**: The executable path in `shellPath` is invalid, or startup arguments contained invalid syntax.
- **Fix**: Verify that the path points directly to an existing `.exe` file. Test launching the same command and arguments in Windows Run (`Win+R`).

### Starting directory defaults to user home instead of profile CWD

- **Symptom**: Terminal opens in `C:\Users\<User>` instead of the configured folder.
- **Cause**: The path configured in `CWD` does not exist or has trailing quote characters.
- **Fix**: Verify the directory exists on disk and remove surrounding double quotes from the **Starting Directory (CWD)** field.

## Related Topics

- [Appearance and Themes](03-appearance-and-themes.md)
- [Shell Experience and Modules](04-shell-experience.md)
- [Explorer Integration and CLI Flags](09-explorer-integration-and-command-line.md)
