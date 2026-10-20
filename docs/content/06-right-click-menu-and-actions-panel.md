---
id: right-click-menu-and-actions-panel
title: Right-Click Menu and Actions Panel
order: 6
summary: Detailed guide to the contextual right-click menu, selection-aware actions, hover submenus, and the slide-out Actions Panel.
tags:
  - context-menu
  - actions-panel
  - selection
  - snippets
  - shortcuts
since: 0.1.0
updated: 2026-10-13
---

## What It Is

Terminal Manager provides two complementary workflow acceleration interfaces: an intelligent, selection-aware **Right-Click Context Menu** and a slide-out **Actions Panel**. Both allow executing commands, inserting parameterized snippets, launching AI agents, and inspecting paths without typing commands manually.

## Before You Start

- Right-clicking inside the terminal canvas triggers the context menu by default. If you configure `rightClickAction = "paste"`, hold `Shift` while right-clicking to open the menu.
- The Actions Panel can be accessed at any time using the keyboard shortcut `Ctrl+Shift+A`.

## The Context Menu

The terminal context menu appears at your mouse position and dynamically rearranges its options based on what is currently selected:

### 1. Selection-Aware Group

When text is highlighted in the terminal, this group appears at the top of the menu:

- **Copy Selection**: Copies the selected text to your clipboard.
- **Copy Plain Text**: Strips ANSI color and control codes before copying to the clipboard.
- **Search the Web**: Opens your default browser and queries the selected text using Google, Bing, DuckDuckGo, or GitHub (configured in `Settings > General > Default search engine`).
- **Open Path / File**: If the selection matches a valid filesystem path, opens the file directly in your default editor.
- **Show in File Explorer**: Opens Windows Explorer and highlights the selected file or directory.
- **Inspect Port**: If the selection is a numeric port (such as `3000` or `8080`), queries active processes listening on that port via PowerShell.

### 2. Clipboard Group

- **Paste**: Pastes the current system clipboard into the terminal.
- **Paste from History...**: Opens a submenu displaying the last 15 clipboard entries captured during your session. Click any entry to insert it immediately.

### 3. Project Runner Submenu

Hovering over **Project Scripts** reveals all commands discovered in the current project root (such as `npm run dev`, `cargo build`, or `pytest`). You can click to run immediately in the active terminal, `Ctrl+Click` to run in a new tab, or `Shift+Click` to run in a split pane.

### 4. AI Agents Submenu

Hovering over **AI Agents** displays installed CLI tools (such as Claude Code, Codex, Aider, OpenCode, and Goose). Selecting an agent launches it in a dedicated tab or split pane with the working directory set to your current terminal folder.

### 5. Quick Actions Group

- **Clear Terminal**: Clears visible screen buffer (`Ctrl+L`).
- **Reset Terminal**: Resets xterm state, character attributes, and parser modes.
- **Select All**: Highlights the entire terminal scrollback buffer.
- **Read-Only Mode**: Toggles input locking to prevent accidental keypresses while monitoring long-running builds.
- **Broadcast Input**: When enabled, keys typed into the active pane are simultaneously sent to all open split panes in the current tab.

### 6. Window and Split Group

- **Split Right (`Ctrl+Shift+D`)**: Creates a vertical pane column.
- **Split Down (`Ctrl+Shift+E`)**: Creates a horizontal pane row.
- **Pop Out to Standalone Window**: Detaches the current tab into its own independent desktop window.

### 7. Actions Panel and Help

- **Open Actions Panel... (`Ctrl+Shift+A`)**: Opens the slide-out utility panel.
- **Terminal Settings...**: Opens the settings dialog directly.
- **Documentation & Help... (`F1`)**: Opens the in-app documentation browser.

## Configuring Right-Click Behavior

You can customize how right-clicking inside a terminal pane behaves in `Settings > General > Right-click Action`:

- **Show Context Menu (`"menu"`)**: Default behavior. Always opens the full context menu.
- **Paste Immediately (`"paste"`)**: Pastes clipboard contents instantly on right-click. Hold `Shift+Right-click` to open the context menu.
- **Copy or Paste (`"copy-or-paste"`)**: If text is selected, right-clicking copies it; if nothing is selected, right-clicking pastes clipboard contents.

## Customizing Menu Visibility

If you prefer a minimal context menu, you can toggle individual groups on or off in `Settings > General > Context Menu Customization`:

- Show Selection Actions
- Show Project Runner Submenu
- Show AI Agents Submenu
- Show Clipboard History Submenu
- Show Quick Actions Group
- Show Window & Split Actions

## The Actions Panel

Press `Ctrl+Shift+A` or click the slider icon in any pane header to open the **Actions Panel**. The panel slides out from the right side of the active pane:

### Actions Panel Sections

1. **Quick Commands**: One-click tiles for routine developer actions:
   - Git Status (`git status -s`)
   - Docker PS (`docker ps --format "table {{.Names}}\t{{.Status}}"`)
   - NPM Test (`npm test`)
   - Directory Tree (`tree /F`)
   - Kill Port (`Stop-Process -Id (Get-NetTCPConnection -LocalPort <Port>).OwningProcess`)
2. **Saved Snippets**: Filter and run stored command snippets. If a snippet contains variables (like `{{branch}}` or `{{environment}}`), a parameter dialog prompts for values before execution.
3. **Clipboard History**: Chronological list of copied items. Includes a search filter and a **Clear History** button.
4. **Session Diagnostics**: Live telemetry showing the active shell PID, ConPTY buffer dimensions, memory usage, and working directory.

### Pinning the Actions Panel

Click the pin icon in the top header of the Actions Panel to lock it open. When pinned, terminal splits adjust their width to accommodate the panel, keeping your snippets and commands visible during development.

## Troubleshooting

### Context menu closes immediately when scrolling submenus

- **Symptom**: Hovering over a long submenu and scrolling causes the menu to disappear.
- **Cause**: A global window scroll listener closed the popup overlay.
- **Fix**: Terminal Manager uses fixed-portal rendering for submenus to prevent menu dismissal while scrolling long lists.

### Context menu opens partially off-screen

- **Symptom**: Right-clicking near the bottom or right edge of the monitor clips the menu.
- **Cause**: Menu positioning exceeded the window bounds.
- **Fix**: The menu engine measures viewport dimensions and automatically flips the popup leftward or upward when rendered near window edges.

## Related Topics

- [Terminal Basics](05-terminal-basics.md)
- [Snippets and Clipboard History](07-snippets-and-clipboard-history.md)
- [Project Runner](11-project-runner.md)
