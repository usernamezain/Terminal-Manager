---
name: shell-experience-customizer
description: Architecture, generator patterns, PSReadLine syntax coloring, Oh-My-Posh prompts, and CTTcustom.ps1 managed blocks in Terminal Manager.
---

# Shell Experience & PowerShell Customizer Skill

This skill documents how to extend and maintain the PowerShell customization engine in Terminal Manager.

## 1. Directory Structure & File Roles

```text
<userData>/shell/
├── Microsoft.PowerShell_profile.ps1 # Upstream core script (byte-for-byte SHA256 verified)
├── CTTcustom.ps1                   # Dynamically generated custom overrides script
└── themes/                         # Oh My Posh JSON theme files (e.g. cobalt2.omp.json)
```

## 2. Generator Mechanics (`generator.ts`)

The generator writes `CTTcustom.ps1` atomically:
1. Generates the script string inside a managed block:
   ```powershell
   # >>> TERMINAL-MANAGER MANAGED BLOCK >>>
   # settings: { "theme": "...", "psReadLine": { ... } }
   ...
   # <<< END MANAGED BLOCK <<<
   ```
2. Writes to a temporary file (`CTTcustom.ps1.tmp.<pid>`).
3. Atomically renames the file to `CTTcustom.ps1`.
4. Overrides the hook function `Set-PredictionSource_Override` and `Update-Profile_Override`.

## 3. Adding a New Setting
To add a new customizable property to the Shell Experience:
1. **Schema**: Add the property to `ShellExperienceSettingsSchema` in `src/shared/shellExperienceTypes.ts`.
2. **Generator**: Add PowerShell emission logic to `src/main/shell-experience/generator.ts`.
3. **Renderer Component**: Add UI controls inside `src/renderer/features/shell-experience/<Section>.tsx`.
4. **Testing**: Run `npx vitest run src/main/shell-experience/__tests__/profileProbe.test.ts` to verify PowerShell executes the generated script without syntax errors.

## 4. Pristine Isolation & Safety Rules
* **Never overwrite user's global `$PROFILE`**: The terminal starts with `-NoProfile -Command ". '<userData>\shell\Microsoft.PowerShell_profile.ps1'"`.
* **Append-Only Backups**: If the user synchronizes system settings, the system profile manager creates unique timestamped backup files (`oldprofile-<timestamp>-<hash>.ps1`) in the user's directory. Never unlink or truncate user files.
