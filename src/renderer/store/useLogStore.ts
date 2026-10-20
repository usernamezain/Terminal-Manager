import { create } from 'zustand';
import { LogEntry, LogLevel, LogSource } from '../../shared/logTypes';

interface LogState {
  logs: LogEntry[];
  isOpen: boolean;
  dockPosition: 'bottom' | 'side';
  splitRatio: number;
  searchQuery: string;
  selectedLevel: LogLevel | 'all';
  selectedSource: LogSource | 'all';
  followTail: boolean;
  wrapLines: boolean;
  expandedDetailsId: string | null;
  unreadCount: number;
  unreadErrorCount: number;

  addLog: (entry: LogEntry) => void;
  addLogs: (entries: LogEntry[]) => void;
  setLogs: (logs: LogEntry[]) => void;
  clearLogs: () => void;
  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  setDockPosition: (pos: 'bottom' | 'side') => void;
  setSplitRatio: (ratio: number) => void;
  setSearchQuery: (query: string) => void;
  setSelectedLevel: (level: LogLevel | 'all') => void;
  setSelectedSource: (source: LogSource | 'all') => void;
  setFollowTail: (follow: boolean) => void;
  setWrapLines: (wrap: boolean) => void;
  toggleDetails: (id: string) => void;
  markAsRead: () => void;
}

const MAX_LOGS = 2500;

export const useLogStore = create<LogState>((set) => ({
  logs: [],
  isOpen: false,
  dockPosition: 'bottom',
  splitRatio: 0.45,
  searchQuery: '',
  selectedLevel: 'all',
  selectedSource: 'all',
  followTail: true,
  wrapLines: false,
  expandedDetailsId: null,
  unreadCount: 0,
  unreadErrorCount: 0,

  addLog: (entry) =>
    set((state) => {
      const isClosed = !state.isOpen;
      const isError = entry.level === 'error';
      const updatedLogs = state.logs.length >= MAX_LOGS
        ? [...state.logs.slice(state.logs.length - MAX_LOGS + 1), entry]
        : [...state.logs, entry];

      return {
        logs: updatedLogs,
        unreadCount: isClosed ? state.unreadCount + 1 : 0,
        unreadErrorCount: isClosed && isError ? state.unreadErrorCount + 1 : state.unreadErrorCount,
      };
    }),

  addLogs: (entries) => {
    if (!entries || entries.length === 0) return;
    set((state) => {
      const isClosed = !state.isOpen;
      const errorCount = entries.filter((e) => e.level === 'error').length;
      const combined = [...state.logs, ...entries];
      const updatedLogs = combined.length > MAX_LOGS ? combined.slice(combined.length - MAX_LOGS) : combined;

      return {
        logs: updatedLogs,
        unreadCount: isClosed ? state.unreadCount + entries.length : 0,
        unreadErrorCount: isClosed ? state.unreadErrorCount + errorCount : state.unreadErrorCount,
      };
    });
  },

  setLogs: (logs) =>
    set({
      logs: logs.slice(-MAX_LOGS),
    }),

  clearLogs: () =>
    set({
      logs: [],
      unreadCount: 0,
      unreadErrorCount: 0,
      expandedDetailsId: null,
    }),

  toggleOpen: () =>
    set((state) => ({
      isOpen: !state.isOpen,
      unreadCount: 0,
      unreadErrorCount: 0,
    })),

  setOpen: (open) =>
    set({
      isOpen: open,
      unreadCount: open ? 0 : 0,
      unreadErrorCount: open ? 0 : 0,
    }),

  setDockPosition: (dockPosition) => set({ dockPosition }),

  setSplitRatio: (splitRatio) =>
    set({
      splitRatio: Math.min(0.8, Math.max(0.2, splitRatio)),
    }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setSelectedLevel: (selectedLevel) => set({ selectedLevel }),

  setSelectedSource: (selectedSource) => set({ selectedSource }),

  setFollowTail: (followTail) => set({ followTail }),

  setWrapLines: (wrapLines) => set({ wrapLines }),

  toggleDetails: (id) =>
    set((state) => ({
      expandedDetailsId: state.expandedDetailsId === id ? null : id,
    })),

  markAsRead: () =>
    set({
      unreadCount: 0,
      unreadErrorCount: 0,
    }),
}));
