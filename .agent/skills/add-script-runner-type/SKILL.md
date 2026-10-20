---
name: add-script-runner-type
description: Use when adding a new script type or interpreter (such as Ruby, Perl, or Lua) to Script Runner.
---

# Adding a Script Runner Interpreter Type

Follow this procedure to add support for a new script interpreter and execution engine in Script Runner.

## Files to Touch
1. `src/shared/scriptRunnerTypes.ts`: Add interpreter identifier to `ScriptInterpreterId`.
2. `src/main/scripts/interpreterDetector.ts`: Add binary detection logic, default arguments, and file extensions.
3. `src/main/scripts/scriptRunner.ts`: Configure process spawn options and execution flags.
4. `docs/content/10-script-runner.md`: Add row to Supported Script Types and Interpreters table.

## Numbered Procedure
1. **Extend Interpreter Schema**:
   In `src/shared/scriptRunnerTypes.ts`:
   ```ts
   export type ScriptInterpreterId =
     | 'pwsh' | 'powershell' | 'cmd' | 'node' | 'python' | 'bash' | 'deno' | 'bun'
     | 'ruby'; // new interpreter
   ```
2. **Configure Detection**:
   In `src/main/scripts/interpreterDetector.ts`:
   - Add known executable binary names (e.g. `['ruby.exe', 'ruby']`).
   - Define file extensions (e.g. `['.rb']`).
   - Define non-interactive execution arguments (e.g. `['-W0']`).
   - Implement `which` / `where.exe` check to locate installed binaries.
3. **Configure Spawn Options**:
   In `src/main/scripts/scriptRunner.ts`:
   - Map interpreter ID to command execution string.
   - Ensure stdout and stderr streams are piped to log files.
   - Attach process tree timeout kill handler (`taskkill /F /T /PID`).
4. **Update Documentation**:
   In `docs/content/10-script-runner.md`, add the interpreter row to the Supported Script Types and Interpreters table.
5. **Run Checks**:
   ```bash
   npx vitest run
   npm run docs:check
   ```

## Verification Checklist
- [ ] Interpreter appears in Script Runner's Configure Interpreters dialog.
- [ ] Creating and executing a script of this type runs through the queue and outputs logs.
- [ ] Timeout terminates the process tree cleanly without orphaned processes.
- [ ] Documentation checks pass.

## Common Mistakes
- **Running in interactive mode**: Forgetting non-interactive flags causes scripts to hang indefinitely on prompts.
- **Hardcoding binary paths**: Always query system `PATH` and registry rather than assuming fixed drive locations.
