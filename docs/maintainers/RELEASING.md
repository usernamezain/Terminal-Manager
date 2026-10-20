# Release Process Guide

This guide describes how to prepare, verify, and publish a new release of Terminal Manager.

---

## Pre-Release Verification Checklist

Run on a clean Windows development machine before cutting a release:

1. **Verify All Automated Checks**:
   ```powershell
   npm run verify
   ```
   - TypeScript compiles cleanly (`npx tsc --noEmit`).
   - All test suites pass 100% (`npx vitest run`).
   - Documentation links pass (`npm run docs:check`).
   - Performance checks pass (`npm run perf:check`).

2. **Generate Documentation References**:
   ```powershell
   npm run docs:generate
   ```
   Confirm that shortcuts and settings documentation are refreshed.

3. **Update Version in `package.json`**:
   Update `"version": "x.y.z"` in `package.json`.

4. **Update `CHANGELOG.md`**:
   - Move entries from `[Unreleased]` into a new section `[x.y.z] - YYYY-MM-DD`.
   - Ensure added, changed, and fixed items are listed accurately.

5. **Commit and Tag**:
   ```bash
   git add package.json package-lock.json CHANGELOG.md docs/
   git commit -m "chore(release): prepare v0.1.0"
   git tag -a v0.1.0 -m "Release v0.1.0"
   git push origin main
   git push origin v0.1.0
   ```

---

## Automated GitHub Actions Release Workflow

1. Pushing tag `v*` automatically triggers `.github/workflows/release.yml`.
2. The workflow:
   - Sets up Node 20 on `windows-latest`.
   - Runs `npm ci` and rebuilds native ConPTY bindings.
   - Executes `npm run build`.
   - Invokes `npx electron-builder --win nsis` to generate the installer.
   - Computes SHA256 checksums (`.sha256`).
   - Creates a **Draft Release** on GitHub with the installer assets and checksum files attached.

---

## Post-Release Publishing

1. Navigate to **Releases** on GitHub: `https://github.com/mughaldev0/Terminal-Manager/releases`.
2. Edit the drafted release, review the generated release notes against `CHANGELOG.md`.
3. Click **Publish release**.
