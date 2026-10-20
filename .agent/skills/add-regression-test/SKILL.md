---
name: add-regression-test
description: Author targeted unit or integration regression tests in Vitest ensuring bugs do not reappear.
---

# Add Regression Test Skill

Use this skill when fixing a bug to add an enduring regression test in Vitest.

## Workflow

1. **Locate Target Test Directory**:
   - Main process tests: `src/main/__tests__/`
   - Renderer store tests: `src/renderer/store/__tests__/`
   - Feature tests: `src/renderer/features/<feature>/__tests__/`
2. **Reproduce Failure First**:
   - Write a test replicating the bug before applying the fix.
   - Run `npx vitest run <path/to/test>` and verify it fails for the expected reason.
3. **Apply Fix**:
   - Apply the minimal code fix in the source file.
4. **Verify Green**:
   - Re-run `npx vitest run <path/to/test>` and confirm test passes.
5. **Run Full Test Suite**:
   - Run `npx vitest run` to ensure zero regressions across the codebase.
