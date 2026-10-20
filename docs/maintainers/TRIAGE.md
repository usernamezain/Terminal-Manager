# Issue & PR Triage Guide

This guide is for maintainers triaging issues and reviewing pull requests in the Terminal Manager repository.

---

## 1. Issue Triage Workflow

Every new issue starts with the `needs-triage` label applied by the issue form template.

### Triage Steps
1. **Check for Duplicates**: Search existing issues. If duplicate, link the original issue and close with `duplicate` label.
2. **Validate Reproduction**:
   - For bug reports, ensure the steps are reproducible on Windows 10/11.
   - If reproduction steps or environment details are missing, apply `needs-repro` and ask the author to provide an in-app redacted diagnostic report (`Settings > Help & Support > Copy Diagnostics`).
3. **Classify by Area**:
   - Apply the corresponding `area/*` label (`area/terminal`, `area/ui`, `area/main`, `area/ai-agents`, `area/project-runner`, `area/script-runner`).
4. **Identify Good First Issues**:
   - If the task is well-isolated and straightforward, add `good first issue` and `help wanted`.
5. **Remove `needs-triage`**:
   - Once classified and validated, remove the `needs-triage` label.

---

## 2. Pull Request Review Checklist

When reviewing incoming pull requests:

### Architectural Gates
- [ ] **Process Ownership**: Sessions remain in `src/main/sessionManager.ts`. No ConPTY instances spawned from renderer.
- [ ] **Window Resolution**: Uses `event.sender` to lookup target windows.
- [ ] **CWD Precedence**: Explicit CWD > Profile CWD > User Home.
- [ ] **Registry Access**: Writes only to `HKCU`. No `HKLM` writes.
- [ ] **Design Tokens**: UI components use tokens from `tokens.css`.

### Zero Regression Verification
- [ ] All CI checks pass on Windows and Ubuntu (`Verify & Test`).
- [ ] No regression in performance budgets (`npm run perf:check`).
- [ ] `npm run docs:check` passes with zero errors.
- [ ] PR description follows Conventional Commits format.

### Merging
- Use **Squash and Merge** with a clean commit message following Conventional Commits format (`feat(scope): ...`, `fix(scope): ...`).
