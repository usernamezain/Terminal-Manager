# Contributing to Terminal Manager

We love contributions! Please read our full, step-by-step contribution guide in:

👉 **[HOW-TO-CONTRIBUTE.md](HOW-TO-CONTRIBUTE.md)**

---

## Quick Summary

1. **Fork & Clone**:
   ```bash
   git clone https://github.com/<your-username>/Terminal-Manager.git
   cd Terminal-Manager
   git remote add upstream https://github.com/mughaldev0/Terminal-Manager.git
   ```

2. **Install & Rebuild**:
   ```bash
   npm install
   npm run rebuild
   ```

3. **Develop**:
   ```bash
   npm run dev
   ```

4. **Verify All Checks Before PR**:
   ```bash
   npm run verify
   ```
   This runs:
   - `npx tsc --noEmit` (TypeScript typecheck)
   - `npx vitest run` (149+ test cases)
   - `npm run docs:check` (Documentation links & integrity)
   - `npm run perf:check` (Performance budgets)

5. **Submit a Pull Request**:
   Follow Conventional Commits (`feat:`, `fix:`, `docs:`, etc.) and link your issue!

For full details on issue templates, using in-app redacted diagnostics, architecture rules, and automated merge checks, please see **[HOW-TO-CONTRIBUTE.md](HOW-TO-CONTRIBUTE.md)**.
