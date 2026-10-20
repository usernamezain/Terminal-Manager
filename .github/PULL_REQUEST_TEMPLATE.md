## Description

Provide a clear and concise description of the changes introduced in this pull request. Explain the problem being solved or the feature being added.

Closes #<!-- Issue Number -->

---

## Type of Change

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] 💡 New feature (non-breaking change which adds functionality)
- [ ] ⚡ Performance optimization (latency, CPU, memory, or bundle size improvement)
- [ ] 📚 Documentation update (correcting or adding documentation)
- [ ] 🔧 Refactoring / Maintenance (code structure cleanup with zero behavior change)

---

## Architectural & Safety Invariants Checklist

Please confirm that this pull request adheres to Terminal Manager's architectural invariants:

- [ ] **Process Model**: ConPTY sessions remain strictly owned by the main process (`sessionManager.ts`). No session lifecycle logic placed in renderer.
- [ ] **Window Resolution**: All IPC handlers dynamically resolve windows via `BrowserWindow.fromWebContents(event.sender)` rather than static references.
- [ ] **CWD Precedence**: Folder launches strictly follow: `Explicit CWD > Profile Default CWD > Home directory`.
- [ ] **Registry Integrity**: Windows registry modifications target **HKCU only** (no administrator elevation or HKLM writes).
- [ ] **Design Tokens**: All UI elements strictly utilize tokens from `tokens.css` with 4/8/12/16/24/32px spacing and semantic color variables.
- [ ] **Privacy**: No unredacted user paths or secrets are exported or logged.

---

## Automated Verification & Merge Checks ("Merges Checked on Behalf of Work")

Every pull request is automatically checked before merge. Please verify that all of the following commands pass cleanly on your local machine:

```bash
npm run verify
```

- [ ] `npx tsc --noEmit` — 0 TypeScript errors across all targets
- [ ] `npx vitest run` — 149/149 test suites passing (100% pass rate)
- [ ] `npm run docs:check` — Markdown links and settings references validated
- [ ] `npm run perf:check` — Memory and bundle sizes within budget
- [ ] `npm run build` — Clean production bundle build

---

## Screenshots / Screen Recordings (if applicable)

*If this PR modifies user interfaces, themes, or layouts, attach before/after screenshots or screen captures here.*

---

## Contributor Agreement

- [ ] I have read and agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
- [ ] I have read the [Contributing Guidelines](HOW-TO-CONTRIBUTE.md).
