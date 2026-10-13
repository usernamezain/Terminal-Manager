---
name: terminal-dev-workflow
description: Complete developer workflow for Terminal Manager - building, testing, running dev mode, node-pty native rebuilding, and bundle verification.
---

# Terminal Manager Developer Workflow

This skill outlines the strict workflow, commands, and validation steps required to develop, build, test, and release Terminal Manager.

## 1. Quick Command Reference

```bash
# 1. Start Development Environment (Vite + Electron with HMR)
npm run dev

# 2. Rebuild node-pty native module for Electron (Required after Node/Electron updates)
npm run rebuild

# 3. Run full test suite (Vitest)
npx vitest run

# 4. Run single test file
npx vitest run src/main/__tests__/cliHandler.test.ts

# 5. Production Build (tsc + vite main + vite preload + vite renderer)
npm run build
```

## 2. Windows Development Gotchas

### PowerShell Statement Separator
In Windows PowerShell, **do not use `&&`** as a command separator on older PowerShell versions (5.1). Always use `;` or run commands sequentially:
```powershell
npx vite build --config vite.main.config.ts; npx vite build --config vite.preload.config.ts
```

### Native Module Architecture
`node-pty` relies on prebuilt C++ binaries for Electron (`ConPTY` on Windows).
- If you see `The specified module could not be found (node-pty.node)`, run `npm run rebuild`.
- Verify the build with `npx electron -e "require('node-pty')"` to confirm module load.

### Single-Instance Lock Collision
During development, if an older Electron instance (`electron.exe`) is stuck or running in the background, secondary instances will exit immediately with:
`[WARN] [Single Instance] Secondary instance launch blocked by single-instance lock.`
To kill lingering dev processes on Windows:
```powershell
Stop-Process -Name electron -Force -ErrorAction SilentlyContinue
```

## 3. Pre-Commit Checklist
Before submitting changes or completing tasks:
1. Ensure all 59+ Vitest tests pass: `npx vitest run`.
2. Compile both main and preload bundles:
   `npx vite build --config vite.main.config.ts; npx vite build --config vite.preload.config.ts`.
3. Check renderer bundle size and build:
   `npx vite build --config vite.renderer.config.ts`.
4. Ensure no unhandled promise rejections appear in stdout.
