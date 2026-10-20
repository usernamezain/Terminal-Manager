---
name: verify-and-release
description: Use when validating the full application build, executing tests, running manual QA matrices, and preparing releases.
---

# Verification and Release Workflow

Follow this procedure to verify and prepare production releases of Terminal Manager.

## Files to Touch
1. `package.json`: Version bump.
2. `docs/content/18-whats-new.md`: Update release notes and changelog entries.
3. `CONTEXT.md`: Update version and new capabilities if architecture changed.

## Numbered Procedure
1. **Regenerate Reference Documentation**:
   Ensure all settings and keyboard shortcuts tables are fresh:
   ```bash
   npm run docs:generate
   ```
2. **Execute Full Automated Test Suites**:
   Run all Vitest unit and integration test suites:
   ```bash
   npx vitest run
   ```
3. **Run Documentation Integrity Checks**:
   Verify frontmatter, internal links, CLI flags, and settings keys:
   ```bash
   npm run docs:check
   ```
4. **Compile TypeScript and Bundles**:
   ```bash
   npx tsc --noEmit
   npm run build
   ```
5. **Manual QA Test Matrix**:
   Perform manual verification across these critical axes:
   - **Display Scaling**: Test at 100%, 125%, 150%, and 200% Windows display scaling. Check for subpixel font blur.
   - **Window Resizing**: Test at minimum window bounds (800x500) and maximized. Verify no horizontal scrollbars appear.
   - **Background Tray Mode**: Close main window with `keepRunningInBackground = true`. Confirm session survives and tray menu restores window.
   - **Standalone Detached Windows**: Pop out a tab, verify terminal remains interactive, and dock back to main window.
   - **Explorer Launch**: Right-click a folder containing spaces and open into Terminal Manager.
6. **Update Release Notes**:
   In `docs/content/18-whats-new.md`, add a new release block under `## Version X.Y.Z` with `Added`, `Changed`, and `Fixed` sections.
7. **Commit Changes**:
   Follow conventional commits format: `chore: prepare release vX.Y.Z`.

## Verification Checklist
- [ ] All 126+ Vitest test suites pass.
- [ ] `npm run docs:generate` and `npm run docs:check` pass cleanly.
- [ ] Production build (`dist/main`, `dist/preload`, `dist/renderer`) completes with zero errors.
- [ ] No regression in cold startup time (`npm run perf`).

## Common Mistakes
- **Forgetting `docs:generate` before build**: Shipping stale shortcut or settings reference tables.
- **Skipping display scaling test**: Not testing on high-DPI (150%/200%) displays leads to font blur or clipped status bar icons.
