import { create } from 'zustand';
import { useProjectRunnerStore } from '../project-runner/useProjectRunnerStore';


export interface CommandHistoryEntry {
  id: string;
  sessionId: string;
  command: string;
  cwd: string;
  timestamp: number;
  exitCode?: number;
  durationMs?: number;
}

export interface SessionMarkerData {
  hasMarkers: boolean;
  currentCwd: string;
  recentFolders: string[];
  commandStartLine?: number;
  commandEndLine?: number;
  lastCommandOutputStartLine?: number;
  lastCommandOutputEndLine?: number;
  commandHistory: CommandHistoryEntry[];
}

interface ShellIntegrationState {
  sessions: Record<string, SessionMarkerData>;
  getOrCreate: (sessionId: string) => SessionMarkerData;
  getSessionData: (sessionId: string) => SessionMarkerData;
  getAllHistory: () => CommandHistoryEntry[];
  hasMarkers: (sessionId: string) => boolean;
  handleOsc133: (sessionId: string, marker: string, currentBufferY?: number) => void;
  handleOsc7: (sessionId: string, url: string) => void;
  recordCommand: (sessionId: string, command: string, cwd?: string) => void;
  clearSessionHistory: (sessionId: string) => void;
}

// Mask passwords, tokens, API keys
function maskSecret(cmd: string): string {
  return cmd.replace(
    /(?:(?:password|passwd|token|api[_-]?key|secret|bearer)\s*[=:]\s*)([^\s;]+)/gi,
    (match, p1) => match.replace(p1, '*****')
  );
}

export const useShellIntegrationStore = create<ShellIntegrationState>((set, get) => ({
  sessions: {},

  getOrCreate: (sessionId: string) => {
    const existing = get().sessions[sessionId];
    if (existing) return existing;
    const defaultData: SessionMarkerData = {
      hasMarkers: false,
      currentCwd: '',
      recentFolders: [],
      commandHistory: [],
    };
    set((state) => ({
      sessions: { ...state.sessions, [sessionId]: defaultData },
    }));
    return defaultData;
  },

  getSessionData: (sessionId: string) => {
    return (
      get().sessions[sessionId] || {
        hasMarkers: false,
        currentCwd: '',
        recentFolders: [],
        commandHistory: [],
      }
    );
  },

  getAllHistory: () => {
    const all: CommandHistoryEntry[] = [];
    Object.values(get().sessions).forEach((data) => {
      all.push(...data.commandHistory);
    });
    return all.sort((a, b) => b.timestamp - a.timestamp);
  },

  hasMarkers: (sessionId: string) => {
    return Boolean(get().sessions[sessionId]?.hasMarkers);
  },

  handleOsc133: (sessionId: string, marker: string, currentBufferY?: number) => {
    const sub = marker.trim();
    set((state) => {
      const prev = state.sessions[sessionId] || {
        hasMarkers: true,
        currentCwd: '',
        recentFolders: [],
        commandHistory: [],
      };

      const updated: SessionMarkerData = { ...prev, hasMarkers: true };

      if (sub === 'A') {
        // Prompt start
        updated.commandStartLine = currentBufferY;
      } else if (sub === 'B') {
        // Command start (prompt finished)
      } else if (sub === 'C') {
        // Command executed
        updated.lastCommandOutputStartLine = currentBufferY;
      } else if (sub.startsWith('D')) {
        // Command finished (e.g. D;0)
        updated.lastCommandOutputEndLine = currentBufferY;
        const parts = sub.split(';');
        const exitCode = parts[1] ? parseInt(parts[1], 10) : 0;
        const validCode = isNaN(exitCode) ? 0 : exitCode;
        if (updated.commandHistory.length > 0) {
          const lastEntry = updated.commandHistory[0];
          if (lastEntry && lastEntry.exitCode === undefined) {
            lastEntry.exitCode = validCode;
            lastEntry.durationMs = Date.now() - lastEntry.timestamp;
          }
        }
        try {
          useProjectRunnerStore.getState().handleOsc133Finished(sessionId, validCode);
        } catch {}
      }


      return {
        sessions: { ...state.sessions, [sessionId]: updated },
      };
    });
  },

  handleOsc7: (sessionId: string, rawUrl: string) => {
    try {
      // Format: file://hostname/C:/path or file:///path
      let decoded = decodeURIComponent(rawUrl.replace(/^file:\/\/[^\/]*\//i, ''));
      if (/^[a-zA-Z]:/.test(decoded)) {
        decoded = decoded.replace(/\//g, '\\');
      }
      if (!decoded) return;

      set((state) => {
        const prev = state.sessions[sessionId] || {
          hasMarkers: true,
          currentCwd: '',
          recentFolders: [],
          commandHistory: [],
        };
        const recent = [decoded, ...prev.recentFolders.filter((f) => f !== decoded)].slice(0, 10);
        try {
          useProjectRunnerStore.getState().detect(sessionId, decoded);
        } catch {}

        return {
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...prev,
              hasMarkers: true,
              currentCwd: decoded,
              recentFolders: recent,
            },
          },
        };

      });
    } catch {}
  },

  recordCommand: (sessionId: string, rawCommand: string, cwd?: string) => {
    if (!rawCommand || !rawCommand.trim()) return;
    const masked = maskSecret(rawCommand.trim());

    set((state) => {
      const prev = state.sessions[sessionId] || {
        hasMarkers: false,
        currentCwd: cwd || '',
        recentFolders: cwd ? [cwd] : [],
        commandHistory: [],
      };

      const entry: CommandHistoryEntry = {
        id: `cmd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        sessionId,
        command: masked,
        cwd: cwd || prev.currentCwd || '',
        timestamp: Date.now(),
      };

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...prev,
            commandHistory: [entry, ...prev.commandHistory.filter((c) => c.command !== masked)].slice(0, 100),
          },
        },
      };
    });
  },

  clearSessionHistory: (sessionId: string) => {
    set((state) => {
      const prev = state.sessions[sessionId];
      if (!prev) return state;
      return {
        sessions: {
          ...state.sessions,
          [sessionId]: { ...prev, commandHistory: [] },
        },
      };
    });
  },
}));
