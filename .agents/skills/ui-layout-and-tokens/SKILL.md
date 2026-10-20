---
name: ui-layout-and-tokens
description: Use when building or refactoring UI panels, views, modals, and components in the React 19 renderer.
---

# UI Layout and Design Tokens Rules

Follow this guide to build responsive, tokenized, and accessible UI panels in Terminal Manager.

## Files to Touch
1. `src/renderer/design/tokens.css`: Core design system variables.
2. `src/renderer/components/settings/SettingsLayout.module.css`: Shared settings and panel styles.
3. Component `*.module.css` stylesheets.

## Numbered Procedure
1. **Apply the Unified Spacing Scale**:
   Only use strict multiples of 4:
   - `--space-4` (4px): Micro padding, badges, tag margins.
   - `--space-8` (8px): Icon-text gaps, button padding.
   - `--space-12` (12px): Standard form gap.
   - `--space-16` (16px): Card and container interior padding.
   - `--space-24` (24px): Section spacing and page padding.
   - `--space-32` (32px): Macro modal padding.
2. **Apply Typography and Control Sizing**:
   - Title: `--font-size-title` (18px, weight 600).
   - Section header: `--font-size-section` (14px, weight 600).
   - Body text: `--font-size-body` (13px, weight 400).
   - Secondary / hints: `--font-size-secondary` (12px minimum).
   - Control height: `--control-height` (32px).
   - Header height: `--header-height` (52px).
   - Border radius: `--radius-control` (6px).
3. **Structure Panels as Single Scroll Containers**:
   - Root panel: `height: 100%; display: flex; flex-direction: column; overflow: hidden;`.
   - Header: `flex-shrink: 0; height: 52px; border-bottom: 1px solid var(--border-subtle);`.
   - Body container: `flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden;`.
   - Never allow horizontal page scrolling or nested vertical scrollbars.
4. **Use Shared Layout Components**:
   - `SettingsHeader`: Title, subtitle, close button, and optional "Learn more" link.
   - `SettingsSection`: Titled section with optional description and action button.
   - `SettingsRow`: 2-column layout (label + description on left, control on right).
5. **Handle Minimum Window Dimensions**:
   - Ensure layouts work down to minimum window bounds (`width: 800px`, `height: 500px`).
   - Use responsive media queries to hide optional sidebars or outlines (e.g. `@media (max-width: 1200px)`).

## Verification Checklist
- [ ] No hardcoded hex color values outside `tokens.css`.
- [ ] No horizontal scrollbars appear on the page.
- [ ] Content is not clipped when window is resized to minimum size.
- [ ] Control heights match 32px consistently.
- [ ] Component respects `prefers-reduced-motion` and `animationLevel` setting.

## Common Mistakes
- **Nested vertical scroll containers**: Having both a parent container and an inner container with `overflow-y: auto` causes double scrollbars.
- **Font sizes under 12px**: Using 10px or 11px font sizes violates the design system minimum readability threshold.
- **Hardcoding component margins**: Using ad-hoc values like `margin: 15px` instead of `var(--space-16)`.
