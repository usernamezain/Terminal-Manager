---
id: project-runner
title: Project Runner
order: 11
summary: Automatically detect project ecosystems, run build and test targets, manage packages, and pin custom commands.
tags:
  - project-runner
  - detection
  - nodejs
  - rust
  - python
  - go
  - dotnet
  - docker
since: 0.1.0
updated: 2026-10-13
---

## What It Is

The Project Runner automatically detects development ecosystems present in your terminal's working directory. It parses project descriptors (such as `package.json`, `Cargo.toml`, or `pyproject.toml`) and presents an interactive drop-up menu of runnable targets directly in the terminal pane header.

## Before You Start

- Project Runner detects environments automatically whenever a terminal changes directories (`cd`).
- The feature performs strictly read-only filesystem inspections and never executes foreign scripts during detection.

## Supported Ecosystems Reference

The Project Runner includes built-in detection for 10 development ecosystems:

| Ecosystem | Detected Manifest Files | Package Managers Supported | Common Discovered Targets |
| :--- | :--- | :--- | :--- |
| **Node.js / JS / TS** | `package.json`, `pnpm-workspace.yaml` | `npm`, `pnpm`, `yarn`, `bun` | `dev`, `build`, `test`, `lint`, `start` |
| **Rust** | `Cargo.toml` | `cargo` | `cargo run`, `cargo test`, `cargo build`, `cargo check` |
| **Python** | `pyproject.toml`, `requirements.txt`, `Pipfile` | `pip`, `poetry`, `uv` | `pytest`, `python main.py`, `ruff check` |
| **Go** | `go.mod` | `go` | `go run .`, `go test ./...`, `go build` |
| **.NET / C#** | `*.csproj`, `*.sln` | `dotnet` | `dotnet run`, `dotnet build`, `dotnet test` |
| **Java / Kotlin** | `pom.xml`, `build.gradle`, `build.gradle.kts` | `mvn`, `gradle` | `mvn compile`, `gradle bootRun`, `gradle test` |
| **Ruby** | `Gemfile` | `bundle` | `bundle exec rake`, `bundle exec rspec` |
| **PHP** | `composer.json` | `composer` | `composer test`, `composer run dev` |
| **Make / CMake** | `Makefile`, `CMakeLists.txt` | `make`, `cmake` | `make build`, `make test`, `ctest` |
| **Docker** | `Dockerfile`, `docker-compose.yml` | `docker`, `docker compose`| `docker compose up`, `docker compose down` |

## How Detection Works

When you open a terminal or navigate into a folder:

1. Terminal Manager inspects the directory root for manifest files.
2. For Node.js monorepos, it parses workspace definitions (such as `pnpm-workspace.yaml` or npm `workspaces`) and groups package targets by workspace member.
3. The pane header displays a **Project Play Button** (`▶`) along with the primary detected ecosystem icon (for example, the Node.js or Rust icon).
4. If multiple ecosystems exist in a single repository (for example, a Rust backend paired with a TypeScript frontend), both ecosystems appear in organized submenus.

## Using the Project Drop-up Menu

Click the **Project Play Button** in the pane header to open the menu:

- **Primary Command**: The most likely target (such as `npm run dev` or `cargo run`) appears pinned at the top with a highlighted badge.
- **Grouped Scripts**: Scripts are grouped into Build, Test, Lint, and Custom categories.
- **Execution Target Modifiers**:
  - **Normal Click**: Runs the command immediately in the current active terminal.
  - **Ctrl + Click**: Spawns a new tab and executes the command there.
  - **Shift + Click**: Splits the current pane and runs the command side by side.
  - **Alt + Click**: Copies the exact command text to your clipboard without executing.

## Adding Packages (Add Package Form)

The Project Runner includes an **Add Package** dialog for installing dependencies without manual command typing:

1. In the Project Runner drop-up menu, select **Add Package...**.
2. Select whether to install as a **Production** or **Development** dependency.
3. Type the package name in the search input.
4. Terminal Manager searches the official registry (npm, PyPI, crates.io, NuGet) and displays package versions and descriptions.
5. Click **Install**. The command is sent directly to your active terminal pane using your project's detected package manager (`pnpm add`, `cargo add`, etc.).

> **Tip (Offline Mode):** If working in air-gapped or restricted networks, enable `Settings > General > Project Runner Offline Mode` to suppress external registry lookups.

## Pinning and Custom Commands

- **Pinning**: Right-click any command row in the Project Runner menu to toggle the **Pinned** status. Pinned commands appear at the very top of the menu for rapid access.
- **Custom Project Commands**: You can save custom one-liners specific to a project folder (such as database migrations or local seeding scripts). These are stored in `%APPDATA%\Terminal Manager\project-runner-store.json` keyed by folder path.

## Safety and Shell Quoting

To protect against shell injection and accidental expansion:

- All project paths, script names, and package arguments passed to terminals are sanitized using Terminal Manager's `quoteForShell` utility.
- Arguments containing spaces or special shell characters are wrapped in standard Windows command escapes.

## Troubleshooting

### Play button is not visible in pane header

- **Symptom**: You navigate into a project folder, but no play button appears.
- **Cause**: Project Runner was disabled in settings, or manifest files were hidden.
- **Fix**: Open `Settings > General` and verify **Show Project Runner play button** is toggled `On`. Ensure the directory contains a recognized manifest file (like `package.json`).

### Package search reports network timeout

- **Symptom**: The Add Package modal shows "Network timeout".
- **Cause**: Your network blocks external registry API endpoints.
- **Fix**: Enable **Offline Mode** in `Settings > General`. When offline mode is active, the Add Package modal allows you to enter the package name directly and proceeds without querying online registries.

## Related Topics

- [Terminal Basics and Splits](05-terminal-basics.md)
- [Script Runner](10-script-runner.md)
- [AI Agents](12-ai-agents.md)
