---
name: launch-request-and-cwd
description: Use when debugging or modifying terminal launch requests, working directory resolution, or CLI argument handling.
---

# Launch Requests and Working Directory (CWD) Resolution

Follow this guide to debug and implement terminal launch requests and directory resolution in Terminal Manager.

## Files to Touch
1. `src/main/cliHandler.ts`: Command-line argument parsing and `resolveLaunchCwd` logic.
2. `src/main/sessionManager.ts`: PTY spawn options and environment setup.
3. `src/main/registryIntegration.ts`: Windows Explorer context menu invocation commands.

## Numbered Procedure
1. **Understand CWD Precedence in `resolveLaunchCwd`**:
   The working directory for any new terminal session is resolved in strict order:
   ```ts
   export function resolveLaunchCwd(requestCwd?: string, profileCwd?: string): string {
     // 1. Explicit request path (CLI --cwd or Explorer %V)
     if (requestCwd && fs.existsSync(requestCwd)) {
       return normalizePath(requestCwd);
     }
     // 2. Profile default directory
     if (profileCwd && fs.existsSync(profileCwd)) {
       return normalizePath(profileCwd);
     }
     // 3. Fallback to user home
     return process.env.USERPROFILE || os.homedir();
   }
   ```
2. **Handle Windows Drive Roots Carefully**:
   - `C:\` must NOT be normalized to `C:`.
   - In Windows path resolution, `C:` denotes the current relative directory on drive C, whereas `C:\` denotes the true filesystem root.
   - Always preserve the trailing slash if `path.endsWith(':\\')`.
3. **Spawn via ConPTY with Clean Spawn Options**:
   In `src/main/sessionManager.ts`:
   ```ts
   const ptyProcess = pty.spawn(shellPath, shellArgs, {
     name: 'xterm-256color',
     cols: cols || 80,
     rows: rows || 24,
     cwd: resolvedCwd,
     env: { ...process.env, ...customEnv },
     useConpty: true,
   });
   ```
4. **Debugging Wrong Working Directory**:
   - Inspect main process logs at `%APPDATA%\Terminal Manager\logs\main.log`.
   - Check if `requestCwd` contained invalid quotes or unescaped ampersands (`&`).
   - Run `Test-Path <path>` in PowerShell to verify folder existence.

## Verification Checklist
- [ ] Launching `terminal-manager --cwd "C:\Workspace"` opens in `C:\Workspace`.
- [ ] Right-clicking `C:\` drive root in Explorer opens in `C:\`.
- [ ] Passing a nonexistent path falls back gracefully to `%USERPROFILE%`.
- [ ] Folder paths containing spaces (e.g. `C:\My Projects\App`) resolve correctly.

## Common Mistakes
- **Stripping trailing backslash on drive roots**: Turning `C:\` into `C:` causes shells to start in the previous terminal directory.
- **Injecting `cd` into terminal input**: Never write `cd <path>` to `ptyProcess.write()` on startup. This causes race conditions and `PSReadLine` out-of-range errors. Set `cwd` strictly in spawn options.
