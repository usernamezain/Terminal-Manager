---
name: add-setting
description: Use when adding a new user configuration setting to Terminal Manager, including schema, persistence, UI controls, metadata, and docs.
---

# Adding a New Setting

Follow this procedure to add a persistent user configuration setting to Terminal Manager.

## Files to Touch
1. `src/shared/types.ts`: Add setting property to `AppSettings` interface.
2. `src/shared/constants.ts`: Add default value to `DEFAULT_SETTINGS`.
3. `src/shared/settingsMetadata.ts`: Register key, default, location, allowed values, and description in `SETTINGS_METADATA`.
4. `src/main/settingsStore.ts`: Verify atomic serialization and migration if adding nested fields.
5. `src/renderer/store/useSettingsStore.ts`: Verify reactive state updates.
6. `src/renderer/components/settings/SettingsView.tsx`: Add UI row control (`SettingsRow`).
7. `docs/content/_generated/14-settings-reference.md`: Automatically updated by `npm run docs:generate`.

## Numbered Procedure
1. **Extend Contract**: In `src/shared/types.ts`, add the property to `AppSettings` with strict TypeScript types:
   ```ts
   export interface AppSettings {
     // ...
     newFeatureEnabled: boolean;
   }
   ```
2. **Assign Default**: In `src/shared/constants.ts`, add the default in `DEFAULT_SETTINGS`:
   ```ts
   newFeatureEnabled: true,
   ```
3. **Register Metadata**: In `src/shared/settingsMetadata.ts`, add the entry to `SETTINGS_METADATA`:
   ```ts
   {
     key: 'newFeatureEnabled',
     label: 'Enable New Feature',
     default: 'true',
     description: 'Controls whether the new feature is enabled.',
     location: 'Settings > General',
     allowedValues: 'true | false',
   }
   ```
4. **Add UI Control**: In `src/renderer/components/settings/SettingsView.tsx`, inside the appropriate section:
   ```tsx
   <SettingsRow
     label="Enable New Feature"
     description="Controls whether the new feature is active."
   >
     <button
       type="button"
       className={`${styles.controlToggle} ${settings.newFeatureEnabled ? styles.controlToggleActive : ''}`}
       onClick={() => updateSettings({ newFeatureEnabled: !settings.newFeatureEnabled })}
     >
       <span className={styles.controlToggleThumb} />
     </button>
   </SettingsRow>
   ```
5. **Regenerate Reference Docs**: Run `npm run docs:generate` to refresh `14-settings-reference.md`.
6. **Verify Docs**: Run `npm run docs:check`.

## Verification Checklist
- [ ] Setting value persists after closing and reopening the app.
- [ ] Setting value writes cleanly to `%APPDATA%\Terminal Manager\settings.json`.
- [ ] Reset to Defaults restores the initial value from `DEFAULT_SETTINGS`.
- [ ] `npm run docs:generate` adds the new setting row to `14-settings-reference.md`.
- [ ] `npm run docs:check` and `npx tsc --noEmit` pass with code 0.

## Common Mistakes
- **Missing metadata entry**: Forgetting to update `src/shared/settingsMetadata.ts` causes `npm run docs:check` to fail.
- **Direct disk writes in renderer**: Never write to `settings.json` from React. Always dispatch via `updateSettings()` through IPC (`settings:set`).
- **Hardcoding default in UI**: Always read `settings[key]` from `useSettingsStore()`.
