---
id: ai-agents
title: AI Agents
order: 12
summary: Discover, install, configure, and launch 15 AI coding agents with encrypted secret storage and live PATH refreshes.
tags:
  - ai-agents
  - claude
  - codex
  - agy
  - aider
  - goose
  - catalog
  - secrets
since: 0.1.0
updated: 2026-10-13
---

## What It Is

Terminal Manager includes a dedicated management catalog for terminal-based AI coding agents. It automates binary detection, system prerequisites (such as Node.js, Python, Git, and WSL), script installation with security prompts, DPAPI-encrypted secret storage, and one-click launching from the terminal context menu, Windows Explorer, and the system tray.

## Before You Start

- Press `Ctrl+Shift+G` or click **AI Agents** in the left rail to open the management catalog.
- Verify that your system has prerequisites installed (Git, Node.js, and Python). The collapsible **System Prerequisites** banner at the top of the view checks these tools automatically.

## Supported AI Agents Catalog

The table below reflects the verified catalog (`resources/agents.catalog.json`):

| Agent | Command | Recommended Install Method | Sign-In Type | Cost / Quota Note | Verified Date |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Claude Code** | `claude` | `irm https://claude.ai/install.ps1 \| iex` | Browser OAuth | Paid Claude Pro/Team or Anthropic Console API credits | 2026-10-13 |
| **Antigravity CLI** | `agy` | `irm https://antigravity.google/cli/install.ps1 \| iex` | Browser OAuth | Free tier with daily limits; GCP billing for high quotas | 2026-10-13 |
| **OpenAI Codex CLI** | `codex` | `irm https://chatgpt.com/codex/install.ps1 \| iex` | Browser OAuth | ChatGPT Plus/Team allowance or OpenAI API credits | 2026-10-13 |
| **GitHub Copilot CLI**| `copilot`| `npm install -g @github/copilot` | Account Login | Included in Copilot plans; limited monthly tier for Free | 2026-10-13 |
| **OpenCode** | `opencode` | `npm install -g opencode-ai` | Account / Free | Free bundled models; bring your own API key for unlimited | 2026-10-13 |
| **Hermes Agent** | `hermes` | `iex (irm https://hermes-agent.nousresearch.com/install.ps1)` | API Key | Bring your own provider key or Nous Portal credits | 2026-10-13 |
| **Kimi Code CLI** | `kimi` | `irm https://code.kimi.com/kimi-code/install.ps1 \| iex` | Account OAuth | Moonshot AI account credits or API billing | 2026-10-13 |
| **Qwen Code** | `qwen` | `npm install -g @qwen-code/qwen-code@latest` | API Key | Free CLI; model tokens billed by provider | 2026-10-13 |
| **Aider** | `aider` | `irm https://aider.chat/install.ps1 \| iex` | API Key | Free open source; user provides API key or Ollama | 2026-10-13 |
| **Goose** | `goose` | `curl -fsSL https://github.com/block/goose/... \| bash` | API Key | Free open source; user configures LLM provider keys | 2026-10-13 |
| **Kiro CLI** | `kiro-cli` | `irm https://cli.kiro.dev/install.ps1 \| iex` | Builder ID | Free tier with AWS Builder ID; enterprise on AWS plan | 2026-10-13 |
| **Cursor CLI** | `cursor-agent`| `irm https://cursor.com/install?win32=true \| iex` | Account Login | Requires active Cursor Pro or Business account | 2026-10-13 |
| **Cline CLI** | `cline` | `npm install -g cline` | API Key | Free open source; bring your own provider keys | 2026-10-13 |
| **OpenHands CLI** | `openhands` | `wsl -d Ubuntu -e bash -c "uv tool install openhands ..."` | API Key | Free open source; runs in WSL container environment | 2026-10-13 |
| **Gemini CLI** (Legacy)| `gemini` | Manual installation | API Key | Personal accounts retired June 2026; requires API key | 2026-10-13 |

## Installing and Signing In

### Installing an Agent

1. Open the AI Agents view (`Ctrl+Shift+G`).
2. Select an agent marked **Not installed** in the list.
3. Review the available install methods in the detail pane.
4. Click **Install Agent**.
5. Terminal Manager opens a modal showing the exact script command, destination path, and source URL. Confirm the installation.
6. The installation script runs interactively in a dedicated terminal pane.

### Automated PATH Refresh

When an installer places a new binary into user directories (such as `%USERPROFILE%\.local\bin` or `%LOCALAPPDATA%\agy\bin`), Windows does not broadcast the updated environment to running desktop applications.

Terminal Manager automatically re-reads the Windows user and machine `PATH` environment variables from the registry immediately after installation finishes. This allows you to launch the newly installed agent instantly without restarting Terminal Manager.

### Signing In

Most agents require an authentication handshake:

- Agents with **Browser OAuth** (like Claude, Antigravity, and Codex) open your browser to log in and store a token locally.
- Agents with **API Key** authentication (like Aider and Qwen) require setting environment variables (for example, `ANTHROPIC_API_KEY`). You can set these keys in the **Environment Secrets** tab in the agent detail pane.

## Encrypted Secret Storage (DPAPI)

API keys and tokens configured in Terminal Manager are safeguarded using Windows Data Protection API (DPAPI) and AES-256 encryption:

- Keys are stored in `%APPDATA%\Terminal Manager\agent-state.json`.
- The secret values are encrypted at rest using your Windows logon credentials.
- Secrets are decrypted only in memory when spawning the specific agent process.

## Launching AI Agents

You can launch installed AI agents from four separate locations:

1. **AI Agents Panel**: Click **Launch** in the detail view. Use the presentation dropdown to choose `This terminal`, `New tab`, or `Standalone window`.
2. **Terminal Context Menu**: Right-click in any terminal pane and hover over **AI Agents**. Click an agent to launch it in that exact working directory.
3. **Windows Explorer**: When `Settings > AI Agents > Show AI Agents in Explorer menu` is enabled, right-clicking any project folder displays an **AI Agents** submenu.
4. **System Tray**: Right-click the Terminal Manager notification tray icon and hover over **AI Agents** to spawn an agent in your default workspace.

## Adding a Custom Agent

If you use a private, proprietary, or emerging CLI agent:

1. In the AI Agents header, click **Add Custom Agent** (`+`).
2. Fill out the agent specification:
   - **Name**: Display label (for example, `Internal Dev Assistant`).
   - **Command**: Binary or script name (for example, `corp-ai`).
   - **Install Command**: Optional setup command (such as `npm install -g @corp/ai`).
   - **Sign-In Instructions**: Helpful hints for your team.
   - **Documentation URL**: Web link to your internal documentation.
3. Click **Save Agent**. Your custom agent is added to the catalog, scanned for presence, and made available in all launch menus.

## Security Considerations

> **Warning:** Several agent installers use remote script execution (such as `irm <url> | iex` or `curl <url> | bash`).
> - Terminal Manager requires explicit user confirmation before executing any installer script.
> - Always verify that your organization permits the target agent and inspect the URL before clicking confirm.
> - Never run installer commands with administrative elevation unless strictly necessary.

## Troubleshooting

### Agent reported as "Not on PATH" after installation

- **Symptom**: Installation succeeded, but the status badge displays **Not on PATH**.
- **Cause**: The installer placed the binary in a folder that is not listed in your Windows user `PATH` variable.
- **Fix**: Click the **Add to PATH** button next to the status badge. Terminal Manager automatically appends the binary folder to your user environment and refreshes the in-process `PATH`.

### Agent fails in native Windows (WSL required)

- **Symptom**: Status shows **WSL Only** (such as OpenHands).
- **Cause**: The agent relies on POSIX system APIs or Linux container runtimes.
- **Fix**: Ensure WSL2 and an Ubuntu distribution are installed (`wsl --install`), then install the agent via the WSL install method.

## Related Topics

- [Right-Click Menu and Actions Panel](06-right-click-menu-and-actions-panel.md)
- [Explorer Integration and CLI Flags](09-explorer-integration-and-command-line.md)
- [Security and Privacy](17-security-and-privacy.md)
