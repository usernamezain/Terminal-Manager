---
id: terminal-basics
title: Terminal Basics
order: 5
summary: Master terminal navigation, tab management, split panes, scrollback search, smart copy and paste, and multi-line safety confirmations.
tags:
  - terminal
  - tabs
  - splits
  - search
  - clipboard
  - paste
  - navigation
since: 0.1.0
updated: 2026-10-13
---

## What It Is

Terminal Manager provides an xterm.js terminal canvas powered by WebGL 2 acceleration and native Windows ConPTY pseudoterminals. It features tab management, multi-directional pane splits, scrollback search, bracketed paste safety, and shell integration markers.

## Before You Start

- Familiarize yourself with the primary navigation modifier keys: `Ctrl+Shift` for layout operations and `Alt` for pane navigation and direct tab switching.
- Ensure your active terminal pane has focus before triggering keyboard shortcuts.

## Working with Tabs

### Creating and Switching Tabs

- **Open New Tab**: Press `Ctrl+Shift+T` or click the `+` icon on the right side of the tab strip. The new tab spawns your default profile.
- **Switch to Specific Tab**: Press `Alt+1` through `Alt+9` to jump directly to any of the first nine open tabs.
- **Cycle Tabs**: Press `Ctrl+Tab` to advance to the next tab, or `Ctrl+Shift+Tab` to cycle backward.
- **Close Active Tab**: Press `Ctrl+Shift+W` to close the focused pane. When the last pane in a tab closes, the tab closes automatically.

### Tab Customization and Color Tagging

Right-click any tab in the tab strip to reveal contextual tab actions:

- **Rename Tab**: Enter a custom label to override the dynamic process title.
- **Set Tab Color**: Choose a color swatch (Blue, Green, Yellow, Orange, Red, Purple) to visually categorize tabs by project or environment.
- **Duplicate Tab**: Opens a new tab with the exact working directory and profile settings of the selected tab.
- **Close Other Tabs**: Closes all tabs except the currently selected one.

## Working with Split Panes

Split panes allow running multiple shell sessions within a single tab:

### Creating Splits

- **Split Vertical (Side-by-Side)**: Press `Ctrl+Shift+D`. Splits the current active pane into left and right columns.
- **Split Horizontal (Top-and-Bottom)**: Press `Ctrl+Shift+E`. Splits the current active pane into top and bottom rows.

### Navigating and Resizing Splits

- **Spatial Focus Traversal**: Press `Alt+Left`, `Alt+Right`, `Alt+Up`, or `Alt+Down` to move focus between adjacent panes.
- **Maximize Active Pane**: Press `Ctrl+Shift+Enter` to temporarily zoom the focused pane to fill the entire tab view. Press `Ctrl+Shift+Enter` again to restore the split layout.
- **Split Divider Dragging**: Click and drag the divider bar between panes to adjust their relative dimensions.

## Scrollback Search

Terminal Manager includes a search interface for terminal history:

1. Press `Ctrl+Shift+F` or `Ctrl+F` to open the search bar in the top-right corner of the active pane.
2. Type your search term.
3. Matching strings highlight throughout the scrollback buffer, and the search bar indicates total matches (for example, `3 of 28`).
4. Press `Enter` to jump to the next match, or `Shift+Enter` to jump to the previous match.
5. Click the **Match Case** (`Aa`) or **Use Regular Expression** (`.*`) toggle buttons to refine search matching.
6. Press `Esc` to close the search bar and return focus to the shell.

## Copy and Paste Behavior

### Copying Text

- Select text with your mouse.
- Press `Ctrl+C` or `Ctrl+Shift+C` to copy the selected text to your clipboard.
- Double-click selects an entire word; triple-click selects the full terminal row.

### Pasting Text and Bracketed Paste

- Press `Ctrl+V` or `Ctrl+Shift+V` to paste clipboard text into the terminal.
- Terminal Manager supports **Bracketed Paste Mode**, signaling to modern shells that incoming data is pasted text rather than interactive keypresses. This prevents accidental command execution while pasting code blocks.

### Multi-Line Paste Confirmation

To safeguard against accidental execution of dangerous scripts, Terminal Manager inspects clipboard content before pasting:

- When clipboard text contains multiple lines (newlines or line breaks), the **Confirm Multi-Line Paste** modal appears.
- The dialog displays the total line count and renders a scrollable code preview of the exact text to be pasted.
- Click **Paste Lines** to proceed, or press `Esc` / click **Cancel** to abort.
- You can toggle this protection on or off in `Settings > General > Confirm multi-line paste`.

## Links and Path Navigation

- **Web URLs**: URLs matching `http://` or `https://` underline automatically on hover. Hold `Ctrl` and click the link to open it in your default web browser.
- **File Paths**: File and folder paths detected in terminal output can be right-clicked to reveal contextual actions:
  - **Open File**: Opens the file in your default system editor.
  - **Show in File Explorer**: Reveals the item in Windows Explorer.
  - **Copy Path**: Copies the absolute resolved path to your clipboard.

## Shell Integration (OSC 133 / OSC 7)

When enabled in `Settings > General > Shell Integration`, Terminal Manager listens for standard ANSI escape sequences emitted by configured shells:

- **OSC 7**: Reports the current working directory to the host application upon every folder change (`cd`), ensuring new splits and tabs inherit the correct directory.
- **OSC 133**: Marks command execution boundaries (Command Start, Command Executed, Command Finished). This enables error markers and command-by-command scroll navigation.

## Options Reference

| Setting | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `settings.scrollback` | number | `10000` | Number of scrollback buffer lines retained |
| `settings.rightClickAction` | string | `"menu"` | Behavior on right-click (`"menu"`, `"paste"`, `"copy-or-paste"`) |
| `settings.confirmMultiLinePaste` | boolean | `true` | Show modal warning before pasting multi-line text |
| `settings.shellIntegration` | boolean | `true` | Enable OSC 133 command and OSC 7 directory tracking |

## Troubleshooting

### `Ctrl+C` sends SIGINT instead of copying text

- **Symptom**: Pressing `Ctrl+C` terminates a running program instead of copying highlighted text.
- **Cause**: No text was actively selected in the terminal pane.
- **Fix**: Highlight text first before pressing `Ctrl+C`. When text is selected, `Ctrl+C` copies the selection; when nothing is selected, `Ctrl+C` sends the standard terminal interrupt signal.

### Split pane opens in user home directory instead of current folder

- **Symptom**: Splitting a terminal opens in `C:\Users\<User>` rather than the active folder.
- **Cause**: Shell integration (OSC 7) is not enabled or the shell did not broadcast directory changes.
- **Fix**: Verify `Settings > General > Shell Integration` is `On`. For PowerShell 7, Shell Experience automatically emits OSC 7 directory changes.

## Related Topics

- [Right-Click Menu and Actions Panel](06-right-click-menu-and-actions-panel.md)
- [Keyboard Shortcuts](_generated/13-keyboard-shortcuts.md)
- [Settings Reference](_generated/14-settings-reference.md)
