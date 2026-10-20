---
name: add-project-runner-ecosystem
description: Use when adding support for a new programming language or project ecosystem to Project Runner.
---

# Adding a Project Runner Ecosystem

Follow this procedure to add automated project and manifest detection for a new development ecosystem.

## Files to Touch
1. `src/shared/projectRunnerTypes.ts`: Add ecosystem type to `EcosystemType`.
2. `src/main/project-runner/<name>Detector.ts`: Implement read-only manifest scanner and command builder.
3. `src/main/project-runner/projectDetector.ts`: Register detector in the primary detection pipeline.
4. `src/main/project-runner/__tests__/<name>Detector.test.ts`: Add unit tests for manifest parsing.
5. `docs/content/11-project-runner.md`: Add row to Supported Ecosystems Reference table.

## Numbered Procedure
1. **Extend Ecosystem Type**:
   In `src/shared/projectRunnerTypes.ts`:
   ```ts
   export type EcosystemType =
     | 'node' | 'rust' | 'python' | 'go' | 'dotnet'
     | 'java' | 'ruby' | 'php' | 'make' | 'docker'
     | 'elixir'; // new ecosystem
   ```
2. **Implement Read-Only Detector**:
   Create `src/main/project-runner/elixirDetector.ts`:
   - Inspect directory root for manifest files (e.g. `mix.exs`).
   - Parse tasks without executing code.
   - Return structured commands (such as `mix test`, `mix run`, `mix compile`).
   - Group commands into Build, Test, and Custom categories.
3. **Register in Pipeline**:
   In `src/main/project-runner/projectDetector.ts`, import and append the detector to the active scanner chain.
4. **Write Unit Tests**:
   Create unit tests verifying:
   - Returns null when manifest is absent.
   - Parses commands accurately when manifest exists.
   - Correctly identifies primary launch command.
5. **Update Documentation**:
   In `docs/content/11-project-runner.md`, add the ecosystem to the Supported Ecosystems Reference table.
6. **Run Checks**:
   ```bash
   npx vitest run
   npm run docs:check
   ```

## Verification Checklist
- [ ] Navigating into a folder containing the manifest displays the ecosystem play icon.
- [ ] Clicking discovered commands executes the command cleanly in the terminal.
- [ ] Detection is strictly read-only (does not run compiler or interpreter during scan).
- [ ] Tests and documentation checks pass with code 0.

## Common Mistakes
- **Executing shell commands during detection**: Never run child processes (such as `elixir --version` or `mix help`) during detection. Scans must be instant and strictly read-only file inspections.
- **Missing shell quoting**: Ensure command arguments use `quoteForShell` to prevent injection.
