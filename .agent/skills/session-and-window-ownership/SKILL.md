---
name: session-and-window-ownership
description: Use when modifying terminal session lifecycles, standalone pop-out windows, docking mechanisms, or window closing policies.
---

# Session and Window Ownership Rules

Follow this guide to maintain correct process boundaries and session ownership across windows in Terminal Manager.

## Files to Touch
1. `src/main/sessionManager.ts`: ConPTY session process owner, buffer streams, and backpressure.
2. `src/main/standaloneWindowManager.ts`: Standalone `BrowserWindow` creation, docking, and close interceptors.
3. `src/main/index.ts`: Application lifecycle and `window-all-closed` event routing.
4. `src/renderer/store/useWorkspaceStore.ts`: Tab layout tree and `dockTab` action.

## Numbered Procedure
1. **Understand Process Ownership**:
   - `SessionManager` in the main process owns all active `node-pty` instances.
   - PTY processes are keyed by a unique `sessionId` (UUID).
   - Renderer windows (main window, standalone windows) are viewports that subscribe to `pty:data` for specific session IDs.
2. **Popping Out a Session**:
   - Renderer calls `window.api.session.popOutTab({ sessionId, bounds })`.
   - Main process removes the session from the primary window registry.
   - `standaloneWindowManager.createStandaloneWindow(sessionId, bounds)` instantiates a new frameless `BrowserWindow`.
   - The standalone window loads `index.html?mode=standalone&sessionId=<id>`.
3. **Re-Docking into Main Window**:
   - Standalone window calls `window.api.session.dock({ sessionId })`.
   - Main process sends `session:dock-tab` event to the primary window webContents.
   - Primary window `App.tsx` receives the event and calls `useWorkspaceStore.getState().dockTab()`.
   - Main process closes the standalone window.
4. **Handling Window Close Events**:
   - When a standalone window receives a `close` event:
     - Check if the session is alive.
     - Prompt user: Terminate session or Dock to main window?
     - If terminating, call `sessionManager.kill(sessionId)`.
     - Never let closing a standalone window trigger `app.quit()`.
5. **Background Tray Preservation**:
   - In `src/main/index.ts`, inside `app.on('window-all-closed')`:
     ```ts
     if (settingsStore.get().keepRunningInBackground) {
       // Do NOT call app.quit(); keep running in system tray
       return;
     }
     ```

## Verification Checklist
- [ ] Popping out a terminal does not interrupt running processes or drop scrollback buffer.
- [ ] Clicking "Dock" returns the session to the main window tabs seamlessly.
- [ ] Closing a standalone window prompts to terminate or dock, and does NOT close the main window.
- [ ] Closing the main window with `keepRunningInBackground = true` minimizes to tray.

## Common Mistakes
- **Killing PTY on renderer unload**: Never kill the PTY process simply because a window refreshed or closed unless explicit termination was requested.
- **Assuming only one window exists**: Never use a global `mainWindow` variable in IPC handlers. Always resolve from `event.sender`.
