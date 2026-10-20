---
name: add-theme-token
description: Use when adding or updating CSS design tokens in tokens.css and keeping documentation synchronized.
---

# Adding or Modifying a Theme Token

Follow this procedure to introduce or update a design token in Terminal Manager.

## Files to Touch
1. `src/renderer/design/tokens.css`: Define the CSS custom property under `:root` (Midnight) and `[data-theme='graphite']`.
2. `docs/content/03-appearance-and-themes.md`: Add row to the Design Token Reference table.
3. Relevant CSS module files: Reference `var(--token-name)`.

## Numbered Procedure
1. **Define in `:root` (Midnight Palette)**:
   In `src/renderer/design/tokens.css`:
   ```css
   :root {
     /* ... */
     --bg-card: #181c24;
   }
   ```
2. **Define in `[data-theme='graphite']`**:
   In `src/renderer/design/tokens.css`:
   ```css
   [data-theme='graphite'] {
     /* ... */
     --bg-card: #202026;
   }
   ```
3. **Apply in CSS Modules**:
   Use the token in component stylesheets:
   ```css
   .card {
     background-color: var(--bg-card);
     border: 1px solid var(--border-subtle);
   }
   ```
4. **Update Documentation**:
   In `docs/content/03-appearance-and-themes.md`, add the token to the Design Token Reference table:
   ```markdown
   | `--bg-card` | Card component background | `#181c24` | `#202026` | Card widgets, modals |
   ```
5. **Run Verification**:
   ```bash
   npm run docs:check
   npx tsc --noEmit
   ```

## Verification Checklist
- [ ] Token is defined in both `:root` and `[data-theme='graphite']`.
- [ ] Switching between Midnight and Graphite updates the element appearance immediately.
- [ ] Token is documented in `docs/content/03-appearance-and-themes.md`.
- [ ] Contrast ratio against `--text-primary` meets WCAG AA (4.5:1 minimum).

## Common Mistakes
- **Defining in `:root` only**: Forgetting the `[data-theme='graphite']` block causes the token to remain stuck on Midnight colors when switching themes.
- **Using hardcoded colors in CSS modules**: Never use raw hex codes (e.g. `#111827`) in `*.module.css`. Always use `var(--token)`.
