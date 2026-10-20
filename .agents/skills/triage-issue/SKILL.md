---
name: triage-issue
description: Systematically triage, classify, reproduce, and label incoming GitHub issues for Terminal Manager.
---

# Triage Issue Skill

Use this skill when processing incoming GitHub issues in Terminal Manager.

## Workflow

1. **Verify Completeness**:
   - Check if an in-app redacted diagnostic report is attached (`Settings > Help & Support > Copy Diagnostics`).
   - If missing on complex bugs, request the diagnostics snapshot.
2. **Reproduce on Target Platform**:
   - Determine if the issue is specific to Windows 10 vs 11, or specific to ConPTY / shell type (`pwsh`, `cmd`, `wsl`).
3. **Classify Area & Labels**:
   - `area/terminal`: ConPTY, xterm.js, WebGL renderer, stream throughput.
   - `area/ui`: React 19 layout, tabstrip, panes, settings, dialogs.
   - `area/main`: Session lifecycle, window management, tray, registry.
   - `area/ai-agents`: Agent catalog, detection, DPAPI secrets.
   - `area/project-runner`: Ecosystem script detection.
   - `area/script-runner`: Multi-interpreter queue and logging.
4. **Assess Priority & Mark Good First Issues**:
   - If suitable for external contributors, attach `good first issue` and `help wanted`.
   - Remove `needs-triage`.
