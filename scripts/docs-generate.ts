import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { KEYBINDINGS_REGISTRY } from '../src/shared/keybindingsRegistry';
import { SETTINGS_METADATA } from '../src/shared/settingsMetadata';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const generatedDir = path.join(rootDir, 'docs', 'content', '_generated');

if (!fs.existsSync(generatedDir)) {
  fs.mkdirSync(generatedDir, { recursive: true });
}

function generateShortcutsMarkdown(): string {
  const groups: Record<string, typeof KEYBINDINGS_REGISTRY> = {};
  for (const item of KEYBINDINGS_REGISTRY) {
    if (!groups[item.group]) {
      groups[item.group] = [];
    }
    groups[item.group].push(item);
  }

  let md = `---
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

`;

  for (const [groupName, items] of Object.entries(groups)) {
    md += `## ${groupName}\n\n`;
    md += `| Shortcut | ID | Action | Description | Scope |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;
    for (const item of items) {
      md += `| \`${item.keys}\` | \`${item.id}\` | **${item.label}** | ${item.description} | ${item.source} |\n`;
    }
    md += `\n`;
  }

  md += `## Customizing Keybindings

You can customize PowerShell line editing shortcuts under **Settings > Shell Experience > Keybindings**. Global window shortcuts are registered through the main window application listener and cannot conflict with terminal character input.
`;

  return md;
}

function generateSettingsMarkdown(): string {
  let md = `---
id: settings-reference
title: Settings Reference
order: 14
summary: Complete reference of all configurable settings, default values, locations in the UI, and storage files.
tags: ["settings", "preferences", "configuration", "reference"]
since: 0.1.0
updated: 2026-10-13
---
<!-- Generated, do not edit -->

# Settings Reference

This reference documents every configuration key available in Terminal Manager, including its setting key, UI label, location in the interface, default value, allowed values, and storage file path.

## Storage Locations

All user settings are persisted in human-readable JSON files located in your Windows roaming app data directory:
- Primary settings: \`%APPDATA%\\terminal-manager\\settings.json\`
- Terminal profiles: \`%APPDATA%\\terminal-manager\\profiles.json\`
- Saved snippets: \`%APPDATA%\\terminal-manager\\snippets.json\`
- Script definitions: \`%APPDATA%\\terminal-manager\\scripts\\scripts.json\`
- AI Agent states: \`%APPDATA%\\terminal-manager\\agents\\user-state.json\`

Settings modifications written through the UI use atomic temporary file writes with replace operations to eliminate risk of file corruption.

## Configuration Keys Reference

| Setting Key | UI Label | UI Location | Default Value | Allowed Values | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
`;

  for (const s of SETTINGS_METADATA) {
    const allowed = s.allowedValues ? `\`${s.allowedValues.replace(/\|/g, '\\|')}\`` : '—';
    md += `| \`${s.key}\` | **${s.label}** | ${s.location} | \`${s.defaultValue}\` | ${allowed} | ${s.description} |\n`;
  }

  md += `\n## Modifying Settings Programmatically

Settings can be inspected or updated over the validated Electron IPC channels:
- \`settings:get\` returns the complete \`AppSettings\` object.
- \`settings:set\` accepts a \`Partial<AppSettings>\` payload validated against the Zod schema in \`src/shared/ipc.ts\`.
`;

  return md;
}

const shortcutsContent = generateShortcutsMarkdown();
const settingsContent = generateSettingsMarkdown();

fs.writeFileSync(path.join(generatedDir, '13-keyboard-shortcuts.md'), shortcutsContent, 'utf-8');
fs.writeFileSync(path.join(generatedDir, '14-settings-reference.md'), settingsContent, 'utf-8');

console.log('[docs-generate] Successfully generated:');
console.log(' - docs/content/_generated/13-keyboard-shortcuts.md');
console.log(' - docs/content/_generated/14-settings-reference.md');
