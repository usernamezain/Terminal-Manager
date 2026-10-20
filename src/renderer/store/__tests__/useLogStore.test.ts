import { describe, it, expect, beforeEach } from 'vitest';
import { useLogStore } from '../useLogStore';

describe('useLogStore Unit Tests', () => {
  beforeEach(() => {
    useLogStore.getState().clearLogs();
    useLogStore.getState().setOpen(false);
  });

  it('should initialize with empty logs and closed state', () => {
    const state = useLogStore.getState();
    expect(state.logs).toEqual([]);
    expect(state.isOpen).toBe(false);
    expect(state.unreadCount).toBe(0);
    expect(state.unreadErrorCount).toBe(0);
  });

  it('should add logs and track unread count when closed', () => {
    useLogStore.getState().addLog({
      id: 'log-1',
      timestamp: Date.now(),
      level: 'info',
      source: 'renderer',
      message: 'Hello test log',
    });

    useLogStore.getState().addLog({
      id: 'log-2',
      timestamp: Date.now(),
      level: 'error',
      source: 'main',
      message: 'Fatal error test',
    });

    const state = useLogStore.getState();
    expect(state.logs.length).toBe(2);
    expect(state.unreadCount).toBe(2);
    expect(state.unreadErrorCount).toBe(1);
  });

  it('should toggle panel open and reset unread counts', () => {
    useLogStore.getState().addLog({
      id: 'log-1',
      timestamp: Date.now(),
      level: 'error',
      source: 'main',
      message: 'Error message',
    });

    expect(useLogStore.getState().isOpen).toBe(false);
    expect(useLogStore.getState().unreadCount).toBe(1);

    useLogStore.getState().toggleOpen();
    expect(useLogStore.getState().isOpen).toBe(true);
    expect(useLogStore.getState().unreadCount).toBe(0);
    expect(useLogStore.getState().unreadErrorCount).toBe(0);

    useLogStore.getState().toggleOpen();
    expect(useLogStore.getState().isOpen).toBe(false);
  });

  it('should update filter parameters', () => {
    useLogStore.getState().setSelectedLevel('error');
    useLogStore.getState().setSelectedSource('main');
    useLogStore.getState().setSearchQuery('query-test');

    const state = useLogStore.getState();
    expect(state.selectedLevel).toBe('error');
    expect(state.selectedSource).toBe('main');
    expect(state.searchQuery).toBe('query-test');
  });

  it('should toggle dock position and clamp split ratio', () => {
    useLogStore.getState().setDockPosition('side');
    expect(useLogStore.getState().dockPosition).toBe('side');

    useLogStore.getState().setSplitRatio(0.95);
    expect(useLogStore.getState().splitRatio).toBe(0.8); // clamped max 0.8

    useLogStore.getState().setSplitRatio(0.1);
    expect(useLogStore.getState().splitRatio).toBe(0.2); // clamped min 0.2
  });

  it('should clear logs completely', () => {
    useLogStore.getState().addLog({
      id: 'log-1',
      timestamp: Date.now(),
      level: 'info',
      source: 'pty',
      message: 'pty log',
    });

    expect(useLogStore.getState().logs.length).toBe(1);
    useLogStore.getState().clearLogs();
    expect(useLogStore.getState().logs.length).toBe(0);
  });

  it('should support batch adding logs', () => {
    useLogStore.getState().addLogs([
      { id: 'batch-1', timestamp: Date.now(), level: 'info', source: 'main', message: 'msg 1' },
      { id: 'batch-2', timestamp: Date.now(), level: 'error', source: 'renderer', message: 'msg 2' },
    ]);

    expect(useLogStore.getState().logs.length).toBe(2);
    expect(useLogStore.getState().logs[1]?.level).toBe('error');
  });
});
