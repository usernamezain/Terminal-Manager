import { describe, it, expect } from 'vitest';
import {
  registerExplorerContextMenu,
  isExplorerContextMenuRegistered,
  unregisterExplorerContextMenu,
  getAppIconPath,
} from '../registryIntegration';

describe('Windows Registry Integration Tests', () => {
  it('should locate valid app icon path', () => {
    const iconPath = getAppIconPath();
    expect(iconPath).toBeDefined();
    expect(typeof iconPath).toBe('string');
    expect(iconPath.length).toBeGreaterThan(0);
  });

  if (process.platform === 'win32') {
    it('should register, detect, and unregister Explorer context menu in HKCU safely', async () => {
      // 1. Register context menu
      const regResult = await registerExplorerContextMenu();
      expect(regResult.success).toBe(true);

      // 2. Query check
      const isRegistered = await isExplorerContextMenuRegistered();
      expect(isRegistered).toBe(true);

      // 3. Unregister
      const unregResult = await unregisterExplorerContextMenu();
      expect(unregResult.success).toBe(true);

      // 4. Verify removal
      const isStillRegistered = await isExplorerContextMenuRegistered();
      expect(isStillRegistered).toBe(false);

      // 5. Re-register so user leaves system in configured state
      await registerExplorerContextMenu();
      expect(await isExplorerContextMenuRegistered()).toBe(true);
    }, 15000);
  }
});
