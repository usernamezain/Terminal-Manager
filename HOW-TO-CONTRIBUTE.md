# Contributing to Terminal Manager

Thank you for your interest in contributing to **Terminal Manager**! Terminal Manager is an open-source, hardware-accelerated Windows terminal workspace built with Electron, React 19, TypeScript, node-pty (ConPTY), and xterm.js.

Whether you are fixing a bug, improving documentation, designing theme tokens, adding a new project runner ecosystem, or optimizing performance, your contributions are welcome.

This document walks you through the entire contribution process—from cloning the repository and setting up your local environment, to creating issues, developing features, passing automated CI checks, and getting your pull requests reviewed and merged.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Prerequisites & Development Environment](#prerequisites--development-environment)
3. [Getting Started: Fork & Clone](#getting-started-fork--clone)
4. [Setting Up & Building Locally](#setting-up--building-locally)
5. [How to Create Issues](#how-to-create-issues)
   - [Reporting Bugs](#reporting-bugs)
   - [Using In-App Redacted Diagnostics](#using-in-app-redacted-diagnostics)
   - [Suggesting Features & Enhancements](#suggesting-features--enhancements)
   - [Reporting Performance Regressions](#reporting-performance-regressions)
6. [Development Workflow](#development-workflow)
   - [Branch Naming Conventions](#branch-naming-conventions)
   - [Commit Message Guidelines (Conventional Commits)](#commit-message-guidelines-conventional-commits)
   - [Architectural Rules & Invariants](#architectural-rules--invariants)
   - [Design Tokens & Styling Guidelines](#design-tokens--styling-guidelines)
7. [Automated Verification & PR Merge Checks](#automated-verification--pr-merge-checks)
   - [Zero-Regression Rule: Merges Checked on Behalf of Work](#zero-regression-rule-merges-checked-on-behalf-of-work)
   - [The 5 Automated Pre-Merge Checks](#the-5-automated-pre-merge-checks)
8. [Submitting a Pull Request](#submitting-a-pull-request)
9. [Code Review & Merge Process](#code-review--merge-process)
10. [Extending via Agent Skills](#extending-via-agent-skills)

---

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior following the guidelines in [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

---

## Prerequisites & Development Environment

To build, run, and test Terminal Manager from source, ensure your machine meets the following prerequisites:

| Requirement | Supported Version | Verification Command | Notes |
| :--- | :--- | :--- | :--- |
| **Operating System** | Windows 10 (Build 19041+) or Windows 11 | `winver` | ConPTY requires Windows 10+. Windows 11 recommended for Mica materials. |
| **Node.js** | `v20.x` or `v22.x` LTS | `node -v` | Node.js 20.x or 22.x LTS is required. |
| **npm** | `v10.x` or higher | `npm -v` | Installed with Node.js. |
| **C++ Build Tools** | Visual Studio 2022 C++ Tools | `cl` | Required to compile `node-pty` native bindings for ConPTY. |
| **PowerShell** | PowerShell 7 (`pwsh`) | `pwsh -v` | Optional for running PowerShell 7 customizations. |
| **Git** | Latest Git for Windows | `git --version` | Configured with `core.autocrlf = true` or `input`. |

> [!TIP]
> **Need Visual Studio C++ Build Tools?**
> You can install them quickly using `winget`:
> ```powershell
> winget install Microsoft.VisualStudio.2022.BuildTools --override "--passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
> ```

---

## Getting Started: Fork & Clone

Terminal Manager uses the standard GitHub fork-and-pull-request workflow.

### 1. Fork the Repository

Navigate to the upstream repository at **[https://github.com/mughaldev0/Terminal-Manager](https://github.com/mughaldev0/Terminal-Manager)** and click the **Fork** button in the upper-right corner to create your personal fork.

### 2. Clone Your Fork Locally

Clone your personal fork using `git clone`:

```bash
# Clone your fork (replace <your-username> with your GitHub username)
git clone https://github.com/<your-username>/Terminal-Manager.git

# Navigate into the project root
cd Terminal-Manager
```

### 3. Configure the Upstream Remote

Keep your local repository synchronized with upstream by adding the official remote:

```bash
# Add upstream remote
git remote add upstream https://github.com/mughaldev0/Terminal-Manager.git

# Verify remote configuration
git remote -v
```

You should see:
```text
origin    https://github.com/<your-username>/Terminal-Manager.git (fetch)
origin    https://github.com/<your-username>/Terminal-Manager.git (push)
upstream  https://github.com/mughaldev0/Terminal-Manager.git (fetch)
upstream  https://github.com/mughaldev0/Terminal-Manager.git (push)
```

---

## Setting Up & Building Locally

### 1. Install Dependencies & Rebuild Native Bindings

Run `npm install` in the project root:

```bash
npm install
```

This will automatically invoke `electron-rebuild` to build `node-pty` against Electron's embedded Node headers. If compilation is skipped or needs to be forced manually:

```bash
npm run rebuild
```

### 2. Start the Development Environment

Launch the Vite hot-module replacement (HMR) server alongside Electron:

```bash
npm run dev
```

The Vite dev server starts on `http://localhost:5173` and Electron automatically opens the main Terminal Manager window. Changes in `src/renderer` will reflect instantly via hot reload. Changes in `src/main` or `src/preload` will automatically trigger TypeScript rebuilds.

### 3. Production Build

To test a full production compile of all three targets (main process, preload bridge, and renderer UI):

```bash
npm run build
```

---

## How to Create Issues

We use GitHub Issues to track bugs, performance regressions, documentation gaps, and feature requests. Before opening a new issue, please search [existing open and closed issues](https://github.com/mughaldev0/Terminal-Manager/issues) to verify it hasn't already been reported.

### Reporting Bugs

When reporting a bug, choose the **Bug Report** template and include:
1. **Clear description**: What went wrong and what you expected to happen.
2. **Step-by-step reproduction**: Minimal sequence of actions to reliably trigger the issue.
3. **Environment details**: Windows OS build, Node version, Electron version, shell being launched (e.g. PowerShell 7, Command Prompt, Git Bash, WSL).
4. **Diagnostics log**: Use the built-in diagnostic tool (see below).

### Using In-App Redacted Diagnostics

Terminal Manager includes a built-in privacy-safe diagnostic tool that collects critical runtime details without leaking sensitive private data:

1. In Terminal Manager, open **Settings** (`Ctrl+,`) and scroll to **Help & Support** (or click the **Report an Issue** button in the top bar).
2. Click **Copy Diagnostics**.
3. The application will copy a redacted diagnostic report to your clipboard containing:
   - OS version and architecture (`Windows 11, x64`)
   - Electron, Chromium, and Node runtime versions
   - Active shell instances and detected system shells
   - Active windows and session counts
   - Modified preference keys (only keys, all values redacted)
   - Recent sanitized log tail
4. **Privacy Guarantee**: All user paths (`C:\Users\username`), usernames, and secret tokens (`ghp_*`, `sk-*`, bearer tokens) are automatically redacted with `%USERPROFILE%`, `%USERNAME%`, and `[REDACTED_SECRET]`.
5. Paste this output directly into your GitHub bug report!

### Suggesting Features & Enhancements

When proposing new features:
1. Use the **Feature Request** template.
2. Explain the **use case**: Why is this feature needed and who does it benefit?
3. Describe your **proposed solution** and any alternative approaches you considered.
4. Keep within the project's architectural invariants (e.g., Windows-first developer experience, hardware-accelerated terminal emulation, non-destructive file operations).

### Reporting Performance Regressions

If you notice a performance problem (slow startup, high idle CPU, keystroke delay, or memory leaks):
1. Use the **Performance Issue** template.
2. Provide your hardware specifications (CPU, RAM, GPU, storage type).
3. Specify whether hardware acceleration is enabled or disabled.
4. Attach measurements or output from `npm run perf:bench`.

---

## Development Workflow

### Branch Naming Conventions

Always create a dedicated feature or bugfix branch from an updated `main` branch:

```bash
# Ensure local main is up to date with upstream
git checkout main
git pull upstream main

# Create a new branch
git checkout -b <branch-type>/<short-description>
```

Use standardized prefixes:
- `feature/<name>` — New capabilities, settings, or enhancements (e.g., `feature/add-zig-ecosystem`)
- `fix/<issue-number>-<name>` — Bug fixes (e.g., `fix/142-conpty-resize-flicker`)
- `docs/<name>` — Documentation updates (e.g., `docs/update-keybindings-ref`)
- `perf/<name>` — Performance optimizations (e.g., `perf/lazy-load-agent-icons`)
- `refactor/<name>` — Code restructuring without external behavior change

### Commit Message Guidelines (Conventional Commits)

We enforce the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```text
<type>(<scope>): <short description in imperative mood>

[optional body explaining motivation and context]

[optional footer, e.g., Closes #123]
```

**Allowed Types:**
- `feat`: A new feature or capability
- `fix`: A bug fix
- `docs`: Documentation changes
- `perf`: Performance improvement
- `refactor`: Code changes that neither fix bugs nor add features
- `test`: Adding or updating test suites
- `chore`: Maintenance, dependencies, build scripts
- `ci`: Changes to CI/CD workflows

**Examples:**
```text
feat(project-runner): add Swift package manager detection
fix(sessionManager): prevent zombie process on terminal crash
docs(contributing): document git clone and merge checks
perf(startup): defer tray icon rendering until after first window show
```

### Architectural Rules & Invariants

All pull requests must respect the core architecture of Terminal Manager:

1. **Process Ownership**:
   - The **Main Process** (`src/main`) owns all shell sessions (`sessionManager.ts`), ConPTY handles, window instances, and background services.
   - Shell sessions live in the main process and **never terminate** when windows are hidden, minimized to tray, or detached.
   - The **Renderer Process** (`src/renderer`) is purely a presentation view.
2. **Sender-Based Window Resolution**:
   - IPC handlers must always resolve target windows using `BrowserWindow.fromWebContents(event.sender)`. Never rely on a single global `mainWindow` reference.
3. **CWD Resolution Order**:
   - When launching a shell or terminal pane, always respect the strict precedence:
     `Explicit Request CWD > Profile Default CWD > User Home Directory`.
4. **Registry Invariants**:
   - All Windows Registry integrations must target Current User (`HKCU`) keys only (e.g. `HKCU\Software\Classes\Directory\shell`). Never attempt to write to `HKLM` or require administrator privileges.
5. **Atomic File Persistence**:
   - Settings, profiles, and snippet stores must use write-temp-and-rename patterns to ensure atomic persistence and prevent corrupted configurations.

### Design Tokens & Styling Guidelines

- All UI components must use the design tokens defined in `src/renderer/styles/tokens.css`.
- Use the standard spacing scale (`--spacing-xs` (4px), `--spacing-sm` (8px), `--spacing-md` (12px), `--spacing-lg` (16px), `--spacing-xl` (24px), `--spacing-2xl` (32px)).
- Never introduce hardcoded color hex values; use the semantic color tokens (`--bg-primary`, `--text-primary`, `--border-color`, `--accent-primary`).
- UI controls must support both Dark, Light, and High Contrast themes seamlessly.

---

## Automated Verification & PR Merge Checks

### Zero-Regression Rule: Merges Checked on Behalf of Work

In Terminal Manager, **every pull request is strictly verified before it can be merged**. We do not merge pull requests based solely on verbal promises or casual review. All pull requests are verified by automated Continuous Integration (CI) test matrices and peer reviews to protect user experience and app stability.

Before opening a pull request or requesting review, you **must run the full verification gate locally**:

```bash
npm run verify
```

### The 5 Automated Pre-Merge Checks

| Check | Command | What It Validates | Pass Criteria |
| :--- | :--- | :--- | :--- |
| **1. TypeScript Check** | `npx tsc --noEmit` | Strict type checking across main, preload, renderer, and shared modules. | Exit code `0` with 0 type errors. |
| **2. Test Suite** | `npx vitest run` | All 149+ unit and integration tests covering sessions, layout docking, CLI args, etc. | 100% of test suites and tests pass. |
| **3. Documentation Integrity** | `npm run docs:check` | Validates markdown frontmatter, anchor links, CLI flag coverage, and settings schemas. | 19 topics verified with 0 broken links. |
| **4. Performance Budgets** | `npm run perf:check` | Verifies binary sizes, memory footprint, and latency against defined budgets. | All measurements within allowed budgets. |
| **5. Production Build** | `npm run build` | Compiles main, preload, and renderer bundles for distribution readiness. | Clean Vite & TypeScript build output. |

> [!IMPORTANT]
> If any of these checks fail locally, your pull request's CI workflow will also fail on GitHub. Always fix failing checks before requesting a review!

---

## Submitting a Pull Request

Once your code is tested and passing all verification checks:

1. **Commit and Push Your Branch**:
   ```bash
   git add .
   git commit -m "feat(scope): concise description of changes"
   git push -u origin feature/your-feature-name
   ```

2. **Open the Pull Request on GitHub**:
   - Go to your fork on GitHub.
   - Click the **Compare & pull request** button.
   - Select `base: main` on `mughaldev0/Terminal-Manager` and `compare: feature/your-feature-name` from your fork.

3. **Fill Out the Pull Request Template**:
   - Link the relevant issue (e.g., `Closes #42`).
   - Describe what changed and why.
   - List the verification steps and test commands you executed.
   - For UI changes, attach screenshots or a screen recording.

---

## Code Review & Merge Process

1. **Automated CI Runs**:
   GitHub Actions will automatically run the CI matrix (lint, typecheck, tests, docs check, build) on Windows and Ubuntu.
2. **Review Feedback**:
   Maintainers will review the code for:
   - Adherence to design tokens and accessibility.
   - Memory management (no leaked listeners, timers, or PTY handles).
   - Concurrency and error handling.
   - Security (redaction of sensitive data, context isolation, sandboxing).
3. **Revising Your PR**:
   If changes are requested, make the modifications locally, commit, and push to the same branch. The pull request will automatically update.
4. **Merge**:
   Once approved and all status checks are green, maintainers will squash and merge your contribution into `main`. Your name will appear in the contributor list and changelog!

---

## Extending via Agent Skills

If you are using AI coding assistants or working on specialized extensions, Terminal Manager includes pre-configured skills under `.agent/skills/`:

- `add-context-menu-item`: Workflow for adding actions to the right-click terminal context menu.
- `add-docs-topic`: Guide for creating or updating documentation topics under `docs/content/`.
- `add-theme-token`: Instructions for adding CSS design tokens and keeping references synced.
- `add-ipc-channel`: Pattern for adding type-safe IPC channels across main, preload, and renderer.
- `add-project-runner-ecosystem`: Recipe for adding new programming language detection to the Project Runner.

---

## Questions & Getting Help

- **Discussions**: Have an idea or question? Start a thread in [GitHub Discussions](https://github.com/mughaldev0/Terminal-Manager/discussions).
- **Security Inquiries**: For security vulnerabilities, review [SECURITY.md](SECURITY.md) and report privately.
- **Support**: For general troubleshooting, refer to [SUPPORT.md](SUPPORT.md).

Thank you for helping make Terminal Manager faster, more reliable, and better for developers everywhere!
