---
name: add-context-menu-item
description: Use when adding a menu item, submenu, or action to the terminal right-click context menu.
---

# Adding a Terminal Context Menu Item

Follow this procedure to add a menu item or submenu to the terminal right-click menu in Terminal Manager.

## Files to Touch
1. `src/renderer/features/terminal-actions/TerminalContextMenu.tsx`: Define menu item, submenu state, keyboard handling, and visibility filter.
2. `src/shared/types.ts`: Update `ContextMenuVisibilitySettings` if making the group togglable.
3. `src/renderer/components/settings/SettingsView.tsx`: Add setting toggle if user-customizable.

## Numbered Procedure
1. **Define Item Structure**:
   In `TerminalContextMenu.tsx`, create the `MenuItemDef`:
   ```tsx
   interface MenuItemDef {
     id: string;
     label: string;
     shortcut?: string;
     icon?: React.ComponentType<{ size?: number; className?: string }>;
     action?: () => void;
     submenu?: MenuItemDef[];
     danger?: boolean;
     disabled?: boolean;
   }
   ```
2. **Add to Relevant Menu Group**:
   Locate the groups array inside `TerminalContextMenu.tsx` (such as `selectionItems`, `clipboardGroup`, `quickGroup`, or `actionPanelGroup`):
   ```tsx
   const myActionItem: MenuItemDef = {
     id: 'action-custom',
     label: 'Custom Action...',
     shortcut: 'Ctrl+Shift+X',
     icon: Sparkles,
     action: () => {
       performCustomAction();
       onClose();
       terminal.focus();
     },
   };
   ```
3. **Respect Visibility Preferences**:
   Wrap optional groups with the `vis` settings dictionary check:
   ```tsx
   if (vis['group-my-action'] !== false) {
     groups.push([myActionItem]);
   }
   ```
4. **Use Fixed Portal for Submenus**:
   If adding a submenu, render it using React `createPortal` with the measured parent bounding rectangle to prevent menu clipping and preserve mouse hover tracking during scrolling.
5. **Refocus Terminal**:
   Always call `terminal.focus()` inside the action callback to ensure keyboard input returns immediately to the shell after menu dismissal.

## Verification Checklist
- [ ] Clicking the item executes the action and closes the menu.
- [ ] Keyboard focus immediately returns to the active terminal (`terminal.focus()`).
- [ ] If mouse hovers over a submenu, scrolling inside the submenu does not dismiss the menu.
- [ ] Menu flips upward/leftward if triggered near the monitor edges.
- [ ] `npx tsc --noEmit` passes with zero errors.

## Common Mistakes
- **Forgetting `terminal.focus()`**: Omitting this leaves focus in the document body, requiring an extra click to type in the terminal.
- **Attaching global window scroll listeners**: Never add global scroll event listeners that close the menu, as this prevents users from scrolling long submenus.
- **Direct coordinate overflows**: Always constrain menu position with `Math.min(x, window.innerWidth - menuWidth)`.
