---
id: snippets-and-clipboard-history
title: Snippets and Clipboard History
order: 7
summary: Save reusable commands with dynamic variable templates, organize snippet folders, and access in-memory clipboard history.
tags:
  - snippets
  - templates
  - variables
  - clipboard
  - privacy
since: 0.1.0
updated: 2026-10-13
---

## What It Is

Terminal Manager provides two time-saving productivity features: a **Snippet Library** for storing parameterized command templates, and an in-memory **Clipboard History** buffer that allows pasting recent items without switching between windows.

## Before You Start

- Open the **Actions Panel** (`Ctrl+Shift+A`) to access the Snippets and Clipboard tabs.
- Review your snippets before running them to ensure all dynamic variables are correctly bounded with double curly braces (`{{variable}}`).

## Creating and Managing Snippets

### Creating a New Snippet

1. Open the Actions Panel by pressing `Ctrl+Shift+A`.
2. Click the **Snippets** tab, then click **New Snippet** (`+`).
3. Fill out the snippet form:
   - **Name**: A clear title (for example, `Docker Run Postgres`).
   - **Command**: The template string (for example, `docker run --name {{container_name}} -e POSTGRES_PASSWORD={{password}} -p {{port:5432}}:5432 -d postgres`).
   - **Folder**: Optional category (such as `Docker`, `Git`, `Kubernetes`, or `Deploy`).
   - **Tags**: Comma-separated search keywords.
4. Click **Save Snippet**.

### Using Parameterized Variables

Snippets support dynamic placeholders using mustache syntax:

- **Basic Variable**: `{{branch_name}}` prompts for a value each time the snippet runs.
- **Variable with Default Value**: `{{port:8080}}` pre-fills the input dialog with `8080`.
- **Reusable Variables**: If the same variable name appears multiple times in a snippet (such as `git checkout -b {{feature}} && git push -u origin {{feature}}`), you only need to enter the value once.

When you click to execute a parameterized snippet, the **Snippet Parameters** dialog appears, prompts for all required values, displays a live preview of the resolved command, and sends it directly to the active terminal pane upon confirmation.

### Organizing with Folders and Tags

- You can assign snippets to custom folders to keep related commands organized.
- Use the search bar in the Snippets panel to filter by name, folder, command text, or tags.
- Right-click any snippet to **Edit**, **Duplicate**, or **Delete** it.

### Importing and Exporting Snippets

To share or back up your snippet library:

1. In the Actions Panel, click the **Options** menu (`...`) in the Snippets header.
2. Select **Export Snippets** to save your collection to a `snippets.json` file.
3. On another machine, select **Import Snippets** and choose your saved JSON file.

## In-Memory Clipboard History

Terminal Manager maintains an automatic buffer of text copied to your clipboard during the active session:

### Accessing Clipboard History

- **Via Context Menu**: Right-click in any terminal and hover over **Paste from History...**. Click any snippet to paste it directly.
- **Via Actions Panel**: Press `Ctrl+Shift+A` and select the **Clipboard** tab. Click any entry to copy or paste it.

### Configuring Retention Size

You can adjust how many recent clipboard items are retained:

1. Open `Settings > General`.
2. Locate **Clipboard History Retention**.
3. Set the retention buffer size (default is `15` items; allows `5` to `50`).

### Privacy and Security Notes

> **Important:** Clipboard history is stored exclusively in volatile application memory (RAM).
> - Clipboard items are **never** written to disk or sent over any network connection.
> - When Terminal Manager exits or is closed, all clipboard history is permanently erased.
> - To manually purge all captured clipboard items immediately, click the **Clear Clipboard History** trash icon in the Actions Panel.

## Copyable Snippet Examples

### Git Safe Force Push

- **Command**: `git push --force-with-lease origin {{branch:main}}`
- **Folder**: `Git`

### Docker Container Log Tail

- **Command**: `docker logs -f --tail {{lines:100}} {{container}}`
- **Folder**: `Docker`

### Kubernetes Pod Port Forward

- **Command**: `kubectl port-forward pod/{{pod_name}} {{local_port}}:{{remote_port}} -n {{namespace:default}}`
- **Folder**: `Kubernetes`

### PowerShell Kill Process by Port

- **Command**: `Get-Process -Id (Get-NetTCPConnection -LocalPort {{port}}).OwningProcess | Stop-Process -Force`
- **Folder**: `PowerShell`

## Troubleshooting

### Snippet parameters dialog does not appear

- **Symptom**: Clicking a snippet runs text with literal `{{variable}}` brackets.
- **Cause**: Spaces inside variable names (such as `{{ my variable }}`) invalidate template matching.
- **Fix**: Use alphanumeric characters and underscores only (for example, `{{my_variable}}` or `{{container_name}}`).

### Pasting from clipboard history inserts outdated text

- **Symptom**: Selecting a history row pastes the wrong entry.
- **Cause**: Another background application overwrote the system clipboard during the paste event.
- **Fix**: Terminal Manager directly injects the selected history string into the xterm pty buffer to ensure exact match delivery.

## Related Topics

- [Right-Click Menu and Actions Panel](06-right-click-menu-and-actions-panel.md)
- [Security and Privacy](17-security-and-privacy.md)
