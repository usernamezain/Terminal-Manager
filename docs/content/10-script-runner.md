---
id: script-runner
title: Script Runner
order: 10
summary: Automate workflows with multi-interpreter script execution, FIFO queues, failure recovery policies, and background logging.
tags:
  - scripts
  - queue
  - automation
  - interpreters
  - python
  - nodejs
  - powershell
since: 0.1.0
updated: 2026-10-13
---

## What It Is

The Script Runner is an automated task execution engine built into Terminal Manager. It executes scripts written in PowerShell, Batch, Node.js, Python, or Bash through a managed FIFO (First-In, First-Out) execution queue. It provides process tree timeout enforcement, configurable failure policies (stop, continue, or retry), execution history, log archiving, and Windows desktop notifications.

## Before You Start

- Ensure the relevant interpreter binaries (such as `python.exe`, `node.exe`, or `pwsh.exe`) are installed and registered in your system `PATH`.
- Press `Ctrl+Shift+R` to navigate directly to the Script Runner view.

## Supported Script Types and Interpreters

The Script Runner automatically detects available interpreters on your machine:

| Script Type | Detected Binary | File Extension | Default Execution Invocation |
| :--- | :--- | :--- | :--- |
| **PowerShell Core** | `pwsh.exe` | `.ps1` | `pwsh.exe -NoProfile -NonInteractive -File <script>` |
| **Windows PowerShell**| `powershell.exe` | `.ps1` | `powershell.exe -NoProfile -NonInteractive -File <script>` |
| **Windows Batch** | `cmd.exe` | `.bat`, `.cmd`| `cmd.exe /c <script>` |
| **Node.js** | `node.exe` | `.js`, `.mjs` | `node.exe <script>` |
| **Python** | `python.exe`, `py.exe` | `.py` | `python.exe <script>` |
| **WSL / Bash** | `wsl.exe`, `bash.exe` | `.sh` | `wsl.exe -e bash <script>` |
| **Deno** | `deno.exe` | `.ts`, `.js` | `deno run -A <script>` |
| **Bun** | `bun.exe` | `.ts`, `.js` | `bun run <script>` |

## Creating and Editing Scripts

To create a new automated task:

1. Open **Script Runner** (`Ctrl+Shift+R`).
2. In the left library column, click **New Script** (`+`).
3. Fill out the script details:
   - **Script Name**: A unique identifier (for example, `Clean Build Artifacts`).
   - **Interpreter**: Select from detected system interpreters.
   - **Working Directory**: Folder where the process will spawn.
   - **Timeout (seconds)**: Maximum allowed runtime before termination (default: `300` seconds).
   - **Failure Policy**: Behavior if the script returns a non-zero exit code (`Stop`, `Continue`, or `Retry`).
4. In the code editor pane, write or paste your script code.
5. Click **Save Script**.

## The Execution Queue and Sequences

### Adding Tasks to the Queue

- Click **Run Now** next to any script to execute it immediately in the background.
- Click **Enqueue** to append the script to the active FIFO queue.
- The **Queue** tab displays the pending execution pipeline with live runtime timers and output streams.

### Building Script Sequences

A sequence is an ordered collection of scripts executed together:

1. In the Script Runner sidebar, switch to the **Sequences** tab.
2. Click **Create Sequence**.
3. Name your sequence (for example, `CI Pre-flight Check`).
4. Add tasks in order (for example: `Lint Code` → `Run Unit Tests` → `Build Distribution`).
5. Toggle **Run on Startup** if you want this sequence to execute automatically whenever Terminal Manager starts.

## Failure Policies and Process Timeouts

### Failure Policies

When a queued task encounters an error, the Script Runner evaluates its configured failure policy:

- **Stop (Default)**: Immediately halts the queue and preserves the failed state for inspection. Subsequent tasks remain untouched.
- **Continue**: Logs the failure as a warning and proceeds immediately to the next task in the queue.
- **Retry**: Re-runs the script up to a configurable number of attempts (1 to 5) before marking the task as failed.

### Process Tree Timeout Enforcement

To prevent hanging tasks or orphaned background processes from locking system resources:

- When a script exceeds its configured timeout duration, Terminal Manager initiates process tree termination.
- On Windows, it invokes `taskkill.exe /F /T /PID <pid>`, terminating the root runner and all spawned child processes.
- The queue item logs a `TIMEOUT_EXCEEDED` error and executes the designated failure policy.

## History, Logs, and Notifications

### Output History and Log Retention

- Every completed queue run is archived in the **History** tab.
- Full stdout and stderr streams are written to individual log files located at:
  - `%APPDATA%\Terminal Manager\logs\scripts\<run-id>.log`
- You can adjust the maximum retained log history in `Settings > General > Script log retention count` (default: 50 runs).
- Click **Open Log File** on any history entry to view raw logs in your system text editor.

### Windows Desktop Notifications

When `settings.scriptRunner.notificationsEnabled` is active, Terminal Manager dispatches native Windows toast notifications:

- **Queue Succeeded**: Notifies when all tasks complete with exit code 0.
- **Queue Failed**: Alerts with the specific script name and error code when a task fails.

## Running Sequences from the Command Line

You can trigger a named sequence headlessly or from external automation:

```powershell
terminal-manager --hidden --run-sequence "seq-pre-flight"
```

## Security and Safe Execution

> **Important:** Imported scripts (via JSON file import) are marked with `hasApprovedRun = false`. Before an imported script can execute, Terminal Manager presents a security warning requiring you to review the script source and approve execution.

## Troubleshooting

### Script fails with "Interpreter not found"

- **Symptom**: Script fails immediately with exit code 127.
- **Cause**: The configured interpreter binary was moved or removed from system `PATH`.
- **Fix**: Open Script Runner, click **Configure Interpreters** in the library header, and click **Rescan Interpreters** to refresh paths.

### Script hangs indefinitely on user prompts

- **Symptom**: Queue item stays in `running` state until timeout.
- **Cause**: The script prompted for interactive stdin input (such as `y/n` confirmation).
- **Fix**: Configure non-interactive flags (for example, `npm install --yes` or `apt-get -y`) because Script Runner runs non-interactively in the background.

## Related Topics

- [Explorer Integration and CLI Flags](09-explorer-integration-and-command-line.md)
- [Project Runner](11-project-runner.md)
- [Security and Privacy](17-security-and-privacy.md)
