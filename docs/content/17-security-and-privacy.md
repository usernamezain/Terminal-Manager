---
id: security-and-privacy
title: Security and Privacy
order: 17
summary: Complete overview of local data storage, DPAPI encryption, process elevation policies, and network isolation.
tags:
  - security
  - privacy
  - dpapi
  - elevation
  - storage
  - network
since: 0.1.0
updated: 2026-10-13
---

## What It Is

Terminal Manager is engineered with an offline-first, local-only architecture. It collects zero telemetry, conducts no background data collection, stores all configuration files locally on your machine, and uses Windows platform cryptography to protect developer credentials.

## What Is Stored Locally and Where

All user data, configuration files, and caches reside strictly within your Windows current-user roaming application data directory:

- **Root Location**: `%APPDATA%\Terminal Manager\` (typically `C:\Users\<Username>\AppData\Roaming\Terminal Manager\`).

| File / Folder | Purpose | Format | Sensitivity |
| :--- | :--- | :--- | :--- |
| `settings.json` | Visual themes, materials, and behavior flags | JSON (Plaintext) | Low (Preferences) |
| `profiles.json` | Shell definitions, arguments, and font configs | JSON (Plaintext) | Low |
| `snippets.json` | Saved command templates and custom parameters | JSON (Plaintext) | Medium (Developer commands) |
| `project-runner-store.json` | Pinned commands and scripts keyed by repo path | JSON (Plaintext) | Low |
| `agent-state.json` | AI agent metadata and DPAPI-encrypted secrets | JSON + DPAPI | High (Encrypted) |
| `cache/` | Pre-compiled prompt bytecode and icons cache | Binary / Text | Low (Temporary cache) |
| `logs/` | Local process logs and script execution history | Plaintext | Low (Local diagnostics) |

## What Is Never Stored

To protect confidential developer workflows and intellectual property:

1. **Clipboard History Is Never Written to Disk**: The clipboard buffer used for recent paste suggestions is maintained exclusively in volatile RAM. When Terminal Manager closes or exits, the entire buffer is discarded immediately.
2. **Plaintext API Keys and Secrets**: Tokens and environment variables configured for AI agents are encrypted using the Windows Data Protection API (DPAPI) and AES-256 before being committed to disk. They can only be decrypted on the same physical machine by your specific Windows user account.
3. **Shell Output Streams Are Never Uploaded**: Terminal session data remains strictly between the local ConPTY process and your local GPU/WebGL canvas.
4. **No Telemetry or User Analytics**: Terminal Manager does not bundle Google Analytics, Mixpanel, Sentry, or any telemetry tracking SDKs. It transmits zero phone-home packets.

## Process Elevation and Administrator Rights

### Non-Elevated Default Operation

Terminal Manager runs strictly as a standard, non-elevated desktop process. It does not require administrative privileges to install, launch, or manage terminal sessions.

### Current-User Registry Only (`HKCU`)

All system integrations—including the Windows Explorer context menu ("Open in Terminal Manager"), auto-start on login, and user environment variables—are registered exclusively in the current-user registry hive (`HKEY_CURRENT_USER`). Terminal Manager never attempts to write to machine-wide hives (`HKEY_LOCAL_MACHINE`).

### Administrator Profile Elevation

If you create or launch a profile configured with **Run as Administrator** (`elevate: true`):

- Terminal Manager requests elevation for that specific ConPTY pseudoterminal process via standard Windows UAC mechanisms.
- The Windows User Account Control prompt appears, requiring your explicit consent.
- The main Terminal Manager window remains running under standard user rights; only the specific worker process executes with elevated permissions.

## Network Activity and Outbound Calls

Terminal Manager functions completely offline without an internet connection. The only outbound network requests that occur are explicitly initiated by the user:

1. **AI Agent Installation**: When you explicitly click **Install Agent** in the AI Agents view, the installer downloads binaries from official vendor endpoints (such as `claude.ai`, `github.com`, or `npmjs.com`).
2. **Package Search**: When you open the **Add Package** modal in Project Runner, the dialog queries public package registries (such as npm, PyPI, or crates.io) to fetch package versions. You can disable this completely by enabling **Offline Mode** in `Settings > General`.
3. **Web Search**: When you right-click highlighted text and select **Search the Web**, Terminal Manager delegates the URL to your default system browser; no HTTP requests are performed inside Terminal Manager itself.

## Safe Handling of Untrusted Scripts

- **Imported Scripts**: When importing script runner files from external sources, tasks are marked with `hasApprovedRun = false`. You must review and approve the script body before Terminal Manager allows execution.
- **Installer Confirmation**: Any AI agent installer script that pipes remote web content into an interpreter (such as `irm <url> | iex`) presents a modal dialog displaying the full command and script URL before execution can proceed.

## Related Topics

- [Snippets and Clipboard History](07-snippets-and-clipboard-history.md)
- [AI Agents](12-ai-agents.md)
- [Troubleshooting and FAQ](16-troubleshooting-and-faq.md)
