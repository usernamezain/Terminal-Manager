---
name: explorer-and-tray-integration
description: Use when modifying Windows Explorer context menu registry entries, system tray behaviors, or taskbar Jump Lists.
---

# Windows Explorer and System Tray Integration

Follow this guide to configure Windows Explorer context menu entries and system tray integration in Terminal Manager.

## Files to Touch
1. `src/main/registryIntegration.ts`: Registry verbs in `HKCU`, shell command escaping, and validation.
2. `src/main/trayManager.ts`: Taskbar tray icon, context menu, and `TaskbarCreated` listener.
3. `src/renderer/components/settings/SettingsView.tsx`: Settings toggles and "Repair Explorer Menu" action.

## Numbered Procedure
1. **Scope to Current-User Registry (`HKCU`)**:
   Never write to `HKLM`. Register shell verbs strictly under:
   - `HKCU\Software\Classes\Directory\shell\TerminalManager`
   - `HKCU\Software\Classes\Directory\Background\shell\TerminalManager`
   - `HKCU\Software\Classes\Drive\shell\TerminalManager`
2. **Quote Shell Invocation Commands Properly**:
   Commands must include escaped quotes around both the executable and the target folder argument:
   ```text
   "C:\Path\To\terminal-manager.exe" --cwd "%V"
   ```
   For background white space: use `"%V"`. For selected directories: use `"%1"`.
3. **Rewrite on App Start / Repair**:
   In `src/main/registryIntegration.ts`, implement `repairRegistry()` to verify that the executable path points to the active `process.execPath`. Call this on app startup if Explorer integration is toggled on.
4. **Configure System Tray & Taskbar Re-registration**:
   - In `src/main/trayManager.ts`, instantiate `Tray` with application icon.
   - Listen for Windows message `TaskbarCreated` to re-create the tray icon if `explorer.exe` restarts.
   - When `keepRunningInBackground = true`, intercept `mainWindow.on('close')` and call `mainWindow.hide()` instead.
5. **Windows 11 Context Menu Note**:
   Classic registry verbs on Windows 11 appear under the **Show more options** submenu (`Shift+F10`). Document this behavior for users.

## Verification Checklist
- [ ] Right-clicking a folder shows "Open in Terminal Manager" (under Show more options on Win 11).
- [ ] Folder with spaces opens correctly in that folder.
- [ ] Turning the setting Off removes the registry keys cleanly.
- [ ] Restarting `explorer.exe` restores the tray icon automatically.

## Common Mistakes
- **Writing to `HKLM`**: Writing to machine-wide registry fails with permissions errors for standard non-admin users.
- **Missing quotes around `%V`**: Missing quotes causes launch failures on paths with spaces (e.g. `C:\Users\John Doe\Projects`).
