import { describe, it, expect, vi } from 'vitest';
import { WindowManager } from '../windowManager';

describe('WindowManager Unit Tests', () => {
  it('should register and track window types and session associations', () => {
    const wm = new WindowManager();

    const mockMainWin = {
      id: 1,
      isDestroyed: () => false,
      on: vi.fn(),
    } as any;

    const mockTermWin = {
      id: 2,
      isDestroyed: () => false,
      on: vi.fn(),
    } as any;

    wm.register(mockMainWin, 'main');
    wm.register(mockTermWin, 'terminal', 'session-123');

    expect(wm.getMainWindow()?.id).toBe(1);
    expect(wm.getTerminalWindows().length).toBe(1);
    expect(wm.getTerminalWindows()[0]?.id).toBe(2);

    expect(wm.get(2)?.sessionIds).toContain('session-123');
    expect(wm.findWindowBySession('session-123')?.id).toBe(2);

    wm.attachSession(1, 'session-456');
    expect(wm.get(1)?.sessionIds).toContain('session-456');

    wm.detachSession(1, 'session-456');
    expect(wm.get(1)?.sessionIds).not.toContain('session-456');

    wm.unregister(2);
    expect(wm.get(2)).toBeUndefined();
    expect(wm.getTerminalWindows().length).toBe(0);
    expect(wm.getMainWindow()?.id).toBe(1);
  });
});
