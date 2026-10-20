---
id: keyboard-shortcuts
title: Keyboard Shortcuts
order: 13
summary: Complete keyboard shortcut reference across application navigation, terminal control, and shell editing.
tags: ["shortcuts", "keybindings", "navigation", "hotkeys"]
since: 0.1.0
updated: 2026-10-13
---
<!-- Generated, do not edit -->

# Keyboard Shortcuts

Terminal Manager provides a comprehensive set of keyboard shortcuts for fast, keyboard-first terminal workflows. Shortcuts are grouped by functional area below.

## Overview

All global shortcuts remain active across any focused pane. When an overlay view such as Settings or Documentation is active, pressing Escape immediately dismisses the overlay and returns focus to your active terminal session.

## Global & Navigation

| Shortcut | ID | Action | Description | Scope |
| :--- | :--- | :--- | :--- | :--- |
| `F1` | `nav-docs` | **Toggle Documentation** | Open or close the in-app Documentation view from anywhere in the app. | src/renderer/app/App.tsx |
| `Escape` | `nav-esc` | **Return to Terminals** | Close active overlay views (Settings, Documentation, Profiles, Script Runner, AI Agents) and refocus active terminal. | src/renderer/app/App.tsx |
| `Ctrl+,` | `nav-settings` | **Toggle Settings** | Open or close the Settings view. | src/renderer/app/App.tsx |
| `Ctrl+Shift+R` | `nav-scripts` | **Toggle Script Runner** | Open or close the Script Runner view. | src/renderer/app/App.tsx |
| `Ctrl+Shift+G` | `nav-agents` | **Toggle AI Agents** | Open or close the AI Agents catalog view. | src/renderer/app/App.tsx |
| `Ctrl+Shift+L` | `nav-logs` | **Toggle Log Detector** | Open or close the realtime Log Detector logger panel. | src/renderer/app/App.tsx |
| `Ctrl+Shift+T` | `tab-new` | **New Terminal Tab** | Open a new terminal tab using the default profile. | src/renderer/app/App.tsx |
| `Ctrl+Shift+W` | `tab-close` | **Close Pane / Tab** | Close the focused terminal pane, or close the entire tab if it is the only pane. | src/renderer/app/App.tsx |
| `Ctrl+Shift+D` | `pane-split-down` | **Split Pane Down** | Split the current pane vertically into a new column below. | src/renderer/app/App.tsx |
| `Ctrl+Shift+E` | `pane-split-right` | **Split Pane Right** | Split the current pane horizontally into a new row to the right. | src/renderer/app/App.tsx |
| `Ctrl+Shift+Enter` | `pane-maximize` | **Toggle Maximize Pane** | Zoom the active pane to occupy the entire workspace, or restore previous split layout. | src/renderer/app/App.tsx |
| `Alt+1..9` | `tab-jump` | **Switch to Tab 1–9** | Directly activate tab by 1-based index. | src/renderer/app/App.tsx |
| `Alt+ArrowUp` | `pane-focus-up` | **Focus Pane Above** | Move spatial focus to the adjacent pane above. | src/renderer/app/App.tsx |
| `Alt+ArrowDown` | `pane-focus-down` | **Focus Pane Below** | Move spatial focus to the adjacent pane below. | src/renderer/app/App.tsx |
| `Alt+ArrowLeft` | `pane-focus-left` | **Focus Pane Left** | Move spatial focus to the adjacent pane to the left. | src/renderer/app/App.tsx |
| `Alt+ArrowRight` | `pane-focus-right` | **Focus Pane Right** | Move spatial focus to the adjacent pane to the right. | src/renderer/app/App.tsx |

## Terminal Viewport & Clipboard

| Shortcut | ID | Action | Description | Scope |
| :--- | :--- | :--- | :--- | :--- |
| `Ctrl+C` | `term-smart-copy` | **Copy or Interrupt** | Copies selection to clipboard if text is selected; otherwise sends SIGINT (Ctrl+C) to interrupt the running process. | src/renderer/features/terminal/TerminalInstance.ts |
| `Ctrl+V` | `term-paste` | **Paste** | Paste clipboard content into the active terminal session. | src/renderer/features/terminal/TerminalInstance.ts |
| `Ctrl+Shift+C` | `term-copy-explicit` | **Copy Selection** | Copy selected text from the terminal buffer into system clipboard. | src/renderer/features/terminal-actions/TerminalContextMenu.tsx |
| `Ctrl+Shift+V` | `term-paste-explicit` | **Paste Clipboard** | Paste system clipboard text directly into active terminal session. | src/renderer/features/terminal-actions/TerminalContextMenu.tsx |
| `Ctrl+F` | `term-find` | **Find in Scrollback** | Open the search bar to locate text within terminal scrollback buffer. | src/renderer/features/terminal-actions/TerminalContextMenu.tsx |
| `Ctrl+L` | `term-clear` | **Clear Screen** | Send form-feed character to clear screen while retaining scrollback history. | src/renderer/features/terminal-actions/TerminalContextMenu.tsx |
| `Ctrl+D` | `term-eof` | **Send EOF** | Send End-Of-File (0x04) signal to exit interactive prompts or terminate standard input. | src/renderer/features/terminal-actions/TerminalContextMenu.tsx |
| `Ctrl+Shift+A` | `term-actions-panel` | **Open Actions Panel** | Open the Terminal Actions side panel showing snippets, scripts, details, and environment. | src/renderer/features/terminal-actions/TerminalContextMenu.tsx |
| `Shift+Right-click` | `term-menu-override` | **Force Context Menu** | Always opens the right-click context menu regardless of the configured right-click action setting. | src/renderer/features/terminal-actions/TerminalContextMenu.tsx |

## Shell Experience (PSReadLine)

| Shortcut | ID | Action | Description | Scope |
| :--- | :--- | :--- | :--- | :--- |
| `UpArrow` | `ps-history-prev` | **History Search Backward** | Search backward through command history matching current command prefix. | src/shared/shellExperienceTypes.ts |
| `DownArrow` | `ps-history-next` | **History Search Forward** | Search forward through command history matching current command prefix. | src/shared/shellExperienceTypes.ts |
| `Tab` | `ps-complete` | **Menu Complete** | Trigger tab completion menu to select parameter or path candidates. | src/shared/shellExperienceTypes.ts |
| `Ctrl+d` | `ps-delete-char` | **Delete Character** | Delete character under the cursor. | src/shared/shellExperienceTypes.ts |
| `Ctrl+w` | `ps-delete-prev-word` | **Delete Word Backward** | Delete the word immediately preceding the cursor. | src/shared/shellExperienceTypes.ts |
| `Alt+d` | `ps-delete-next-word` | **Delete Word Forward** | Delete the word immediately following the cursor. | src/shared/shellExperienceTypes.ts |
| `Ctrl+LeftArrow` | `ps-word-backward` | **Move Word Backward** | Move cursor to the beginning of the previous word. | src/shared/shellExperienceTypes.ts |
| `Ctrl+RightArrow` | `ps-word-forward` | **Move Word Forward** | Move cursor to the beginning of the next word. | src/shared/shellExperienceTypes.ts |
| `Ctrl+z` | `ps-undo` | **Undo Edit** | Undo previous typing edit in PowerShell command buffer. | src/shared/shellExperienceTypes.ts |
| `Ctrl+y` | `ps-redo` | **Redo Edit** | Redo previously undone edit in PowerShell command buffer. | src/shared/shellExperienceTypes.ts |

## Customizing Keybindings

You can customize PowerShell line editing shortcuts under **Settings > Shell Experience > Keybindings**. Global window shortcuts are registered through the main window application listener and cannot conflict with terminal character input.
