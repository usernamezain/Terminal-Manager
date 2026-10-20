---
name: add-docs-topic
description: Use when authoring or updating in-app documentation topics under docs/content/.
---

# Adding or Updating a Documentation Topic

Follow this procedure to add or modify documentation topics in Terminal Manager.

## Files to Touch
1. `docs/content/XX-topic-slug.md`: Markdown topic guide with YAML frontmatter.
2. `src/renderer/features/docs/docsLoader.ts`: Automatically loads files matching `../../../../docs/content/**/*.md`.
3. `scripts/docs-check.ts`: Runs validation via `npm run docs:check`.

## Numbered Procedure
1. **Create File**: Add a numbered markdown file under `docs/content/` (for example, `docs/content/20-cloud-sync.md`).
2. **Add Strict Frontmatter**:
   ```yaml
   ---
   id: cloud-sync
   title: Cloud Sync
   order: 20
   summary: Configure automated profile and snippet synchronization across developer machines.
   tags:
     - sync
     - cloud
     - backup
   since: 0.1.0
   updated: 2026-10-13
   ---
   ```
3. **Follow Standard Structural Skeleton**:
   - `## What It Is` (2 to 3 sentences explaining the feature).
   - `## Before You Start` (Prerequisites or required settings).
   - `## Step-by-Step Guide` (Numbered lists `1. `, `2. ` with exact UI labels).
   - `## Options Reference` (Table with name, type, default, and description).
   - `## Copyable Examples` (Code fences with explicit language identifiers).
   - `## Troubleshooting` (Symptom, cause, fix).
   - `## Related Topics` (Links to other topics in `docs/content/`).
4. **Adhere to Writing Rules**:
   - Second person ("you"), present tense, plain and factual.
   - Zero emojis and zero marketing language.
   - Callouts use `> **Note:**`, `> **Warning:**`, or `> **Tip:**`.
   - Never reference nonexistent features or create broken links.
5. **Run Quality Validation**:
   ```bash
   npm run docs:check
   ```

## Verification Checklist
- [ ] Topic has valid YAML frontmatter with `id`, `title`, `order`, `summary`, `tags`, `since`, and `updated`.
- [ ] Topic appears in the left tree of the in-app Documentation view (`F1`).
- [ ] MiniSearch indexes headings and body paragraphs cleanly.
- [ ] Headings render in the right-hand "On this page" outline.
- [ ] `npm run docs:check` passes without errors or warnings.

## Common Mistakes
- **Missing language tag on code fences**: Using raw ```` without `powershell` or `bash` causes `docs:check` to fail.
- **Inventing unbuilt features**: Document only features that exist in the codebase.
- **Broken internal links**: Linking to `.md` files that do not exist or mismatch IDs.
