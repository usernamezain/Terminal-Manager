---
id: shell-experience
title: Shell Experience
order: 4
summary: Configure PowerShell 7 execution modes, Fast Start caching, Oh My Posh themes, syntax highlighting, icons, and custom aliases.
tags:
  - shellexp
  - powershell
  - oh-my-posh
  - fast-start
  - zoxide
  - psreadline
  - icons
since: 0.1.0
updated: 2026-10-13
---

## What It Is

Shell Experience is Terminal Manager's built-in engine for PowerShell 7 environments. It automates prompt theming, syntax highlighting, predictive IntelliSense, file iconography, and directory jumping without requiring you to manually edit your PowerShell `$PROFILE` script.

## Before You Start

- Shell Experience requires **PowerShell 7 (`pwsh.exe`)**. While basic terminals support Windows PowerShell 5.1 and Command Prompt, advanced Shell Experience features (such as PSReadLine prediction and Oh My Posh prompts) run exclusively on PowerShell 7.
- Install a **Nerd Font** (such as *CaskaydiaCove Nerd Font* or *JetBrainsMono Nerd Font*) so prompt glyphs and folder icons render without missing character symbols.

## Execution Modes (App-Scoped vs System-Wide)

Shell Experience provides two distinct isolation boundaries configured in `Settings > Shell Experience > Overview`:

### App-Scoped Mode (Recommended)

In **App-Scoped** mode, Terminal Manager generates and loads its custom startup scripts inside an isolated application sandbox.

- Your system's real PowerShell profile (`$PROFILE`) remains completely untouched.
- Customizations run only in terminals spawned by Terminal Manager.
- When you open PowerShell in Windows Terminal or standalone consoles, your personal profile remains clean.

### System-Wide Mode (Opt-In)

In **System-Wide** mode, Terminal Manager links its generated initialization scripts directly into your machine's primary PowerShell profile location (`~\Documents\PowerShell\Microsoft.PowerShell_profile.ps1`).

- Before writing any modifications, Terminal Manager creates an automatic timestamped backup of your existing profile (for example, `Microsoft.PowerShell_profile.tm-backup-20261013-101500.ps1`).
- Customizations, aliases, and prompts will be active in all PowerShell 7 instances across your machine.
- You can revert to App-Scoped mode at any time, which restores your original backup profile.

## Fast Start vs Full Load

PowerShell profiles that load multiple heavy modules (such as PSReadLine, Oh My Posh, zoxide, and Git status) can suffer from cold-start latency of 3 to 4 seconds. Shell Experience includes two startup performance strategies:

### Fast Start (Cached & Lazy)

- **Launch Latency**: Approximately 0.8 seconds.
- Pre-compiles and caches prompt bytecode on disk.
- Defers heavy plugin initializations until the shell reaches its first idle event.
- Guarantees your starting working directory (`cwd`) is never altered during deferred initialization.
- Recommended for daily terminal work.

### Full Profile (Synchronous)

- **Launch Latency**: Approximately 3.2 seconds.
- Loads all modules, aliases, and scripts synchronously in sequence before displaying the first prompt.
- Useful when debugging complex custom scripts that must execute strictly before prompt render.

## The Dependency Checklist

The **Dependency Checklist** in `Settings > Shell Experience > Overview` verifies and tracks the five core toolchain components:

| Dependency | Purpose | Detection Method | Installation Action |
| :--- | :--- | :--- | :--- |
| **PowerShell 7 (`pwsh`)** | Modern runtime engine | Checks system `PATH` for `pwsh.exe` | Launches `winget install Microsoft.PowerShell` |
| **Oh My Posh (`oh-my-posh`)** | Prompt engine & glyph renderer | Checks `oh-my-posh.exe` binary in `PATH` | Launches `winget install JanDeDobbeleer.OhMyPosh` |
| **zoxide (`zoxide`)** | Fast directory jumping (`z <folder>`) | Checks `zoxide.exe` binary in `PATH` | Launches `winget install ajeetdsouza.zoxide` |
| **Terminal-Icons** | Color icons for `Get-ChildItem` / `ls` | Checks installed PowerShell module | Installs module via `Install-Module Terminal-Icons` |
| **Nerd Font** | Unicode glyphs for prompts & icons | Checks installed Windows font family | Prompts to install CaskaydiaCove Nerd Font |

> **Note:** Detection for Nerd Font glyphs is partially implemented; the status checklist inspects locally registered font families. Use the **Glyph Test** button in the overview panel to visually verify that symbols display correctly.

## Prompt Themes (Oh My Posh)

Shell Experience includes a built-in gallery of prompt styles:

1. Open `Settings > Shell Experience > Prompt Gallery`.
2. Browse available presets (such as *Agnoster*, *Paradox*, *Jandedobbeleer*, *M365Princess*, and *Minimal*).
3. Click **Preview** to see the rendered prompt style.
4. Click **Apply Theme** to activate it immediately across all open and future sessions.

## Syntax Highlighting (PSReadLine)

The **Syntax Colors** section (`Settings > Shell Experience > Syntax Colors`) allows customizing all 17 syntax tokens utilized by PSReadLine:

- **Command**: Executable names, functions, and cmdlets.
- **Parameter**: Command flags (such as `-Path` or `--verbose`).
- **String**: Quoted string literals.
- **Variable**: PowerShell variables (such as `$HOME` or `$env:PATH`).
- **Comment**: Inline and block comments.
- **Number**: Numeric values and sizes.
- **Operator**: Comparison and assignment operators (`-eq`, `=`, `|`).
- **Member**: Property and method accessors (`.Length`, `.ToString()`).
- **Error**: Syntax errors and missing tokens.
- **InlinePrediction**: Ghost text for autocomplete suggestions.

## Predictive IntelliSense

Under `Settings > Shell Experience > Prediction`, configure real-time autocomplete suggestions:

- **Prediction Source**: Choose `History` (recommends previously executed commands) or `Plugin` (reads external completion providers).
- **View Style**:
  - `InlineView`: Renders ghost text directly after your cursor. Press `Right Arrow` to accept.
  - `ListView`: Displays an interactive multi-line popup menu below the prompt. Press `Down Arrow` or `Tab` to navigate.

## Keybindings and Aliases

- **Keybindings** (`Settings > Shell Experience > Keybindings`): Assign custom chord shortcuts to PSReadLine functions (for example, mapping `Ctrl+Space` to menu completion).
- **Commands & Aliases** (`Settings > Shell Experience > Commands`): Toggle built-in conveniences (like `ll`, `g`, `code .`) or define your own persistent aliases.

## Advanced Scripting and User Region

If you have custom PowerShell functions, environment setup scripts, or modules that you want Shell Experience to include:

1. Open `Settings > Shell Experience > Advanced Scripting`.
2. Locate the **Custom User Region** code editor.
3. Write or paste your custom PowerShell script.
4. Click **Validate Syntax**. Terminal Manager runs a background static syntax check with `powershell -Command` to ensure there are no parser errors.
5. Click **Save User Region**. Your script is embedded between `# >>> Terminal Manager User Region >>>` markers in the generated profile.

## Troubleshooting

### Prompt displays question marks or square boxes

- **Symptom**: Oh My Posh segments display `?` or `[X]` box symbols instead of branch icons or git status.
- **Cause**: The current terminal font does not include Nerd Font glyph vectors.
- **Fix**: Open `Profiles` or `Settings > General`, and set **Font Family** to `CaskaydiaCove Nerd Font` or `FiraCode Nerd Font`.

### "Execution of scripts is disabled on this system" error

- **Symptom**: PowerShell displays an execution policy error on startup.
- **Cause**: Windows default execution policy restricts local `.ps1` execution.
- **Fix**: Terminal Manager passes `-ExecutionPolicy Bypass` when spawning app-scoped sessions. If running in system-wide mode, open an administrator PowerShell window and run:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```

## Related Topics

- [Appearance and Themes](03-appearance-and-themes.md)
- [Profiles](02-profiles.md)
- [Performance Optimization](15-performance.md)
