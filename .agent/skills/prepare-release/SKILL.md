---
name: prepare-release
description: Step-by-step procedures to verify, version bump, changelog update, and tag a new Terminal Manager release.
---

# Prepare Release Skill

Use this skill when cutting a new version release of Terminal Manager.

## Workflow

1. **Run Full Verification Gate**:
   ```bash
   npm run verify
   ```
   Must pass 100%: TypeScript (`npx tsc --noEmit`), Vitest (149 tests), docs check (`npm run docs:check`), and perf check.

2. **Generate Documentation References**:
   ```bash
   npm run docs:generate
   ```

3. **Update Version**:
   - Update `version` in `package.json`.
   - Update `package-lock.json` (`npm i --package-lock-only`).

4. **Update `CHANGELOG.md`**:
   - Move `[Unreleased]` changes to `[x.y.z] - YYYY-MM-DD`.

5. **Commit & Tag**:
   ```bash
   git add package.json package-lock.json CHANGELOG.md docs/
   git commit -m "chore(release): prepare vx.y.z"
   git tag -a vx.y.z -m "Release vx.y.z"
   git push origin main
   git push origin vx.y.z
   ```
