---
name: shell-integration-and-quoting
description: Use when working with shell integration sequences (OSC 133/7), command quoting rules, or shell profile initialization scripts.
---

# Shell Integration and Quoting Rules

Follow this guide to implement and debug shell integration markers and cross-shell command quoting in Terminal Manager.

## Files to Touch
1. `src/renderer/features/terminal-actions/shellIntegrationStore.ts`: OSC 133 and OSC 7 parser and state.
2. `src/main/shell-experience/generator.ts`: Profile script generation and escape sequences.
3. `src/shared/`: Sanitization helpers (`quoteForShell`).

## Numbered Procedure
1. **OSC 7 Working Directory Reporting**:
   - Shells emit OSC 7 escape sequences to notify the terminal of current working directory updates on every `cd`.
   - Sequence format: `\x1b]7;file://<hostname>/<path>\x1b\\`
   - In PowerShell, emit inside prompt function:
     ```powershell
     $esc = [char]27
     Write-Host -NoNewline "$esc]7;file://$($env:COMPUTERNAME)/$($pwd.Path)$esc\"
     ```
2. **OSC 133 Command Execution Markers**:
   - `\x1b]133;A\x1b\\`: Command start (prompt displayed).
   - `\x1b]133;B\x1b\\`: Command input executed.
   - `\x1b]133;C\x1b\\`: Command output executing.
   - `\x1b]133;D;<exitcode>\x1b\\`: Command finished with exit code.
3. **Pristine Shell Initialization Rules**:
   - **Never alter CWD in profile scripts**: Custom profiles must NEVER call `Set-Location` on startup. The starting folder must strictly be set via `node-pty` spawn options (`cwd`).
   - Changing directory during profile execution causes race conditions where user requests are ignored.
4. **Shell Quoting with `quoteForShell`**:
   When constructing command strings passed to shells:
   ```ts
   export function quoteForShell(arg: string): string {
     if (!arg) return '""';
     if (!/[\s"&|<>$`^!]/.test(arg)) return arg;
     // Escape existing quotes and wrap
     return `"${arg.replace(/"/g, '\\"')}"`;
   }
   ```
   For Windows command prompts (`cmd.exe`), replace double quotes with `""` and wrap paths containing spaces.

## Verification Checklist
- [ ] Changing directories in PowerShell emits OSC 7 and updates the Status Bar CWD.
- [ ] Command status markers track exit codes accurately.
- [ ] Spawning a new tab inherits the active directory without profile script interference.
- [ ] Paths with spaces and ampersands execute safely.

## Common Mistakes
- **Writing `cd` commands into profile files**: Putting directory navigation in startup scripts overrides CLI `--cwd` flags and breaks Explorer integration.
- **Malformed OSC terminators**: Failing to emit the string terminator (`ST` = `\x1b\` or `\x07`) causes raw sequence characters to leak onto the terminal canvas.
