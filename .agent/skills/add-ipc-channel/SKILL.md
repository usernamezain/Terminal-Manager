---
name: add-ipc-channel
description: Use when introducing a new IPC channel between Electron main, preload, and React renderer processes with Zod validation.
---

# Adding a Validated IPC Channel

Follow this procedure to introduce a secure, validated IPC channel with sender-based window resolution in Terminal Manager.

## Files to Touch
1. `src/shared/ipc.ts`: Define channel constant and Zod payload schema.
2. `src/shared/types.ts`: Define TypeScript API method in `WindowControlApi` or domain API.
3. `src/main/ipcHandlers.ts`: Register `ipcMain.handle` with Zod validation and window resolution.
4. `src/preload/index.ts`: Expose typed method via `contextBridge`.
5. `src/renderer/`: Invoke from component or Zustand store via `window.api.<domain>.<method>()`.

## Numbered Procedure
1. **Define Channel Constant and Zod Schema**:
   In `src/shared/ipc.ts`:
   ```ts
   export const IPC_CHANNELS = {
     // ...
     FEATURE_ACTION: 'feature:action',
   } as const;

   export const FeatureActionSchema = z.object({
     targetId: z.string().min(1),
     force: z.boolean().optional(),
   });
   export type FeatureActionPayload = z.infer<typeof FeatureActionSchema>;
   ```
2. **Expose in Shared Types**:
   In `src/shared/types.ts`:
   ```ts
   export interface FeatureApi {
     performAction: (payload: { targetId: string; force?: boolean }) => Promise<{ success: boolean }>;
   }
   ```
3. **Register Main Process Handler with Sender Resolution**:
   In `src/main/ipcHandlers.ts`:
   ```ts
   ipcMain.handle(IPC_CHANNELS.FEATURE_ACTION, async (event, rawPayload) => {
     const parsed = FeatureActionSchema.safeParse(rawPayload);
     if (!parsed.success) {
       logger.warn('Invalid IPC payload for FEATURE_ACTION', parsed.error);
       return { success: false, error: 'Invalid payload' };
     }

     // Resolve calling window from event.sender (never use a global mainWindow reference!)
     const callingWindow = BrowserWindow.fromWebContents(event.sender);
     if (!callingWindow) {
       return { success: false, error: 'Calling window not found' };
     }

     return await featureService.execute(parsed.data, callingWindow);
   });
   ```
4. **Bridge via Preload**:
   In `src/preload/index.ts`:
   ```ts
   feature: {
     performAction: (payload) => ipcRenderer.invoke(IPC_CHANNELS.FEATURE_ACTION, payload),
   },
   ```
5. **Call from Renderer**:
   In your React component or Zustand action:
   ```ts
   const result = await window.api.feature.performAction({ targetId: 'item-1' });
   ```

## Verification Checklist
- [ ] Zod schema validates both valid payloads and malformed payloads.
- [ ] Calling window is resolved from `event.sender`, supporting both main and standalone windows.
- [ ] Handler returns serializable data (no raw Node.js streams or circular objects).
- [ ] `npx tsc --noEmit` and `npx vitest run` pass without errors.

## Common Mistakes
- **Global `mainWindow` reliance**: Assuming `mainWindow` is the target window. If a user clicks in a popped-out standalone window, actions will target the wrong window or throw null reference errors.
- **Missing Zod validation**: Bypassing runtime validation leaves the main process vulnerable to malformed arguments.
- **Exposing `ipcRenderer` directly**: Never expose raw `ipcRenderer` on `window.api`. Always expose strictly-typed wrapper functions.
