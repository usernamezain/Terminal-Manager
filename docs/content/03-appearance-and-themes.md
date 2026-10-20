---
id: appearance-and-themes
title: Appearance and Themes
order: 3
summary: Complete guide to color palettes, accent colors, Windows 11 window materials, typography, design tokens, and custom styling.
tags:
  - appearance
  - themes
  - midnight
  - graphite
  - mica
  - acrylic
  - tokens
  - styling
since: 0.1.0
updated: 2026-10-13
---

## What It Is

Terminal Manager features a tokenized design system built around high-contrast surfaces, fluent materials, and responsive dark themes. You can configure the global color palette (`midnight` or `graphite`), choose custom accent colors, enable native Windows 11 background translucency (Mica or Acrylic), adjust density and typography, and assign distinct accent colors to individual profiles.

> **Note:** Custom theme file import and export (.css or .json theme bundles) is not currently supported. All appearance customization is managed through built-in settings and design tokens documented below.

## Before You Start

- Windows 11 (build 22000 or later) is required to render **Mica** and **Acrylic** window background materials. On Windows 10, the application defaults to **Solid** background rendering.
- Ensure hardware acceleration is enabled to prevent frame drops when running translucent materials with active WebGL terminal output.

## Switching Theme Palettes

Terminal Manager includes two curated dark palettes:

- **Midnight**: The default deep-space palette featuring obsidian surfaces (`#0B0D10`), subtle blue-tinted borders, and vibrant electric blue accents (`#6C8CFF`).
- **Graphite**: A neutral monochromatic slate palette featuring dark charcoal surfaces (`#121214`), cool gray text (`#EDEDF0`), and industrial steel accents (`#8A99AD`).

To switch between palettes:

1. Open **Settings** by clicking the gear icon in the left rail or pressing `Ctrl+,`.
2. In the navigation sidebar, select **General**.
3. Under the **Theme & Appearance** section, locate the **Theme Palette** dropdown.
4. Select either `Midnight` or `Graphite`.
5. The application updates the root `data-theme` attribute immediately without requiring a restart.

## Configuring Accent Colors

The accent color governs active tab borders, input focus outlines, primary buttons, and link highlights.

To set a custom accent color:

1. Open `Settings > General`.
2. Locate the **Accent Color** row.
3. Click one of the predefined color swatches (Electric Blue, Cyan, Emerald, Amber, Crimson, Purple), or enter a custom hex value (for example, `#10b981`).
4. The system injects the new color into the `--accent` and `--accent-glow` CSS variables across all active views.

## Window Material (Mica, Acrylic, Solid)

Terminal Manager interfaces directly with Windows Desktop Window Manager (DWM) composition APIs to provide native backdrop materials:

1. Open `Settings > General`.
2. Under **Window Material**, choose one of the three options:
   - **Mica**: Samples desktop wallpaper tinting and blurs it subtly behind the window. Designed for low CPU and GPU overhead on Windows 11.
   - **Acrylic**: Provides deep frosted-glass translucency that samples all underlying windows and desktop contents.
   - **Solid**: Disables backdrop composition and renders opaque dark surfaces. Recommended for battery saving and Windows 10 installations.

> **Note:** Windows automatically falls back to Solid rendering when power saver mode is active or when transparency effects are disabled in Windows Settings (`Accessibility > Visual effects > Transparency effects`).

## Typography and Cursor Customization

Terminal text rendering is powered by xterm.js with WebGL hardware acceleration.

To adjust typography:

1. Open `Settings > General`.
2. Locate the **Font Size** slider and adjust between `8px` and `36px` (default is `14px`).
3. Under **Cursor Style**, select `Block`, `Underline`, or `Bar`.
4. Toggle **Cursor Blink** to enable or disable cursor pulsation.

## UI Density

You can tune the vertical spacing and padding of navigation bars, lists, and form controls:

1. Open `Settings > General`.
2. Under **UI Density**, choose your preferred layout mode:
   - **Compact**: Tighter row height (28px controls) for maximum information density on smaller displays.
   - **Normal**: Standard balanced layout (32px controls, 12px margins).
   - **Comfortable**: Generous touch-friendly spacing (36px controls, 16px margins).

## Per-Profile Accent Colors

In addition to the global theme accent, each terminal profile can define its own unique accent color:

1. Open `Profiles` (`Ctrl+Shift+P`).
2. Select the target profile (for example, `WSL Ubuntu`).
3. Click the **Accent Color** swatch in the profile editor.
4. Choose an accent color (for example, `#e11d48` for Ubuntu, or `#f59e0b` for Command Prompt).
5. When launched, the tab strip and pane focus ring use this profile-specific color to visually distinguish production, staging, and administrative environments.

## Design Token Reference

All styles throughout the application strictly use the tokens defined in `src/renderer/design/tokens.css`.

| Token | Purpose | Default (Midnight) | Graphite Value | Used In |
| :--- | :--- | :--- | :--- | :--- |
| `--bg-base` | Primary window background | `#0B0D10` | `#121214` | Titlebar, app frame, tab strip |
| `--bg-surface` | Secondary translucent panels | `rgba(20, 23, 28, 0.72)` | `rgba(30, 30, 35, 0.75)` | Cards, dialogs, dropdowns |
| `--bg-elevated` | Floating and hover surfaces | `#161A20` | `#222226` | Modals, context menus, tooltips |
| `--bg-terminal` | Terminal canvas background | `#0D0F13` | `#141416` | xterm.js viewport backing |
| `--border-subtle` | Low-contrast dividing lines | `rgba(255, 255, 255, 0.06)` | `rgba(255, 255, 255, 0.08)` | Table rows, panel borders |
| `--border-strong` | High-contrast structural boundaries | `rgba(255, 255, 255, 0.14)` | `rgba(255, 255, 255, 0.18)` | Focus rings, active tabs |
| `--text-primary` | High-contrast headings and body | `#E6E8EB` | `#EDEDF0` | Headings, active menu labels |
| `--text-secondary` | Medium-contrast supporting text | `#A0A6AF` | `#9E9EA8` | Subtitles, field descriptions |
| `--text-muted` | Low-contrast metadata and hints | `#6B727C` | `#63636E` | Keyboard shortcuts, timestamps |
| `--accent` | Brand primary color | `#6C8CFF` | `#8A99AD` | Primary buttons, active tabs |
| `--accent-glow` | Focus ring glow shadow | `rgba(108, 140, 255, 0.35)` | `rgba(138, 153, 173, 0.35)` | Input focus rings |
| `--admin` | Elevated administrative indicator | `#FFB454` | `#F5A623` | Admin badges, elevated tabs |
| `--success` | Affirmative state indicator | `#4ADE80` | `#34D399` | Green status dots, checks |
| `--warning` | Cautionary state indicator | `#FACC15` | `#FBBF24` | Amber alerts, warnings |
| `--danger` | Error and termination indicator | `#F87171` | `#F87171` | Delete buttons, broken dependencies |
| `--space-4` | 4px micro spacing | `4px` | `4px` | Icon paddings, tag margins |
| `--space-8` | 8px component spacing | `8px` | `8px` | Button gaps, small paddings |
| `--space-12` | 12px container spacing | `12px` | `12px` | Form group spacing |
| `--space-16` | 16px standard padding | `16px` | `16px` | Panel interiors, table padding |
| `--space-24` | 24px section margins | `24px` | `24px` | Section dividers, headers |
| `--space-32` | 32px macro spacing | `32px` | `32px` | Page margins, modal padding |
| `--radius-control`| Standard control border radius | `6px` | `6px` | Inputs, buttons, segmented controls |
| `--header-height` | Unified top header height | `52px` | `52px` | Modal and page headers |
| `--control-height`| Standard interactive element height | `32px` | `32px` | Input fields, standard buttons |

## Worked Examples

### Worked Example 1: Create a High-Contrast Dark Workspace

If you work in high ambient light and require enhanced boundary visibility:

1. Open `Settings > General`.
2. Set **Theme Palette** to `Midnight`.
3. Set **Window Material** to `Solid` to remove background wallpaper bleed.
4. Set **Accent Color** to `#FACC15` (high-visibility amber).
5. Set **Cursor Style** to `Block` and turn **Cursor Blink** to `On`.
6. Set **Font Size** to `16px`.
7. Navigate to `Settings > Shell Experience > Syntax Colors` and ensure command tokens use vivid contrasting values.

### Worked Example 2: Match Your Accent to a Corporate Brand Color

If you need your terminal environment to match a brand palette (for example, emerald `#10b981`):

1. Open `Settings > General`.
2. Under **Accent Color**, enter `#10b981`.
3. Open `Profiles` (`Ctrl+Shift+P`).
4. Select your production deployment profile.
5. Set the profile's **Accent Color** to `#10b981`.
6. Save changes. When this profile is active, the tab header, focus borders, and shell integration marks illuminate in brand emerald.

## Resetting to Defaults

To revert all visual and theme customizations back to factory defaults:

1. Open `Settings > General`.
2. Scroll to the bottom of the General tab.
3. Click **Reset Settings to Defaults**.
4. Confirm the prompt. The application restores `theme = "midnight"`, `accent = "#6C8CFF"`, `windowMaterial = "mica"`, `fontSize = 14`, and `uiDensity = "normal"`.

## Backing Up Your Theme Settings

All user preferences and appearance settings are stored in a single JSON file on your local machine:

- **Path**: `%APPDATA%\Terminal Manager\settings.json` (typically `C:\Users\<Username>\AppData\Roaming\Terminal Manager\settings.json`).

To back up your visual setup:

1. Close Terminal Manager.
2. Copy `settings.json` to your backup directory or version-controlled dotfiles folder.
3. To restore on a new machine, launch Terminal Manager once to initialize the directory, close it, and place your backup `settings.json` in that folder.

## Accessibility Tips

- **Contrast Ratios**: The Midnight theme paired with the default `#6C8CFF` or `#FACC15` accent exceeds WCAG AA contrast standards (minimum 4.5:1 against `#0B0D10`).
- **Reduced Motion**: If you experience discomfort with window transitions or animated badges, set `Settings > General > Animation Level` to `Reduced` or `Off`.
- **Monospace Font Scaling**: Increasing the terminal font size with `Ctrl+=` or `Settings > General > Font Size` automatically recalculates terminal rows and columns with smooth layout reflow.

## Troubleshooting

### Changes to Accent Color or Material do not apply

- **Symptom**: You selected a new color or material, but the window does not change.
- **Cause**: Settings were blocked by a file lock or hardware policy.
- **Fix**: Check if Windows power saving is enabled. In Windows Settings, verify that `Transparency effects` is turned on under `Personalization > Colors`.

### Blurry fonts on high-DPI displays

- **Symptom**: Terminal characters appear fuzzy on 150% or 200% display scaling.
- **Cause**: WebGL subpixel rendering requires integer device pixel ratios.
- **Fix**: Open `Settings > General > Typography` and ensure your selected font (such as `Cascadia Code` or `CaskaydiaCove Nerd Font`) is installed directly in Windows Fonts rather than loaded over the web.

## Related Topics

- [Profiles](02-profiles.md)
- [Shell Experience Customization](04-shell-experience.md)
- [Settings Reference](_generated/14-settings-reference.md)
