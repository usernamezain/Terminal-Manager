import { create } from 'zustand';
import {
  ScriptDefinition,
  ScriptSequence,
  HistoryRecord,
  InterpreterInfo,
  RunnerState,
} from '../../../shared/scriptRunnerTypes';

interface ScriptsState {
  scripts: ScriptDefinition[];
  sequences: ScriptSequence[];
  history: HistoryRecord[];
  interpreters: InterpreterInfo[];
  runnerState: RunnerState;

  selectedScriptId: string | null;
  activeSubSection: 'editor' | 'queue' | 'history';
  filterQuery: string;
  selectedScriptIds: string[]; // For multi-select actions in library

  liveOutput: string;
  selectedQueueId: string | null; // For inspecting finished queue item output
  isPauseScroll: boolean;
  isLoading: boolean;
  isInterpretersLoading: boolean;

  // Actions
  loadAll: () => Promise<void>;
  setSelectedScriptId: (id: string | null) => void;
  setActiveSubSection: (sub: 'editor' | 'queue' | 'history') => void;
  setFilterQuery: (query: string) => void;
  toggleSelectScript: (id: string) => void;
  clearSelectedScripts: () => void;
  setSelectedQueueId: (queueId: string | null) => void;
  setIsPauseScroll: (paused: boolean) => void;

  // Scripts CRUD
  saveScript: (script: ScriptDefinition) => Promise<ScriptDefinition>;
  deleteScript: (id: string) => Promise<boolean>;
  duplicateScript: (id: string) => Promise<ScriptDefinition | null>;
  createNewScript: () => ScriptDefinition;
  importScripts: () => Promise<void>;
  exportScripts: (scriptIds?: string[]) => Promise<void>;

  // Execution & Queue
  runNow: (scriptId: string) => Promise<void>;
  addToQueue: (scriptId: string) => Promise<void>;
  runAllSelectedInOrder: () => Promise<void>;
  loadSequence: (sequenceId: string, runImmediately?: boolean) => Promise<void>;
  saveSequence: (seq: ScriptSequence) => Promise<void>;
  deleteSequence: (sequenceId: string) => Promise<void>;

  startQueue: () => Promise<void>;
  pauseQueue: () => Promise<void>;
  resumeQueue: () => Promise<void>;
  stopQueue: () => Promise<void>;
  skipCurrent: () => Promise<void>;
  retryFailed: () => Promise<void>;
  resumeFromHere: (queueId: string) => Promise<void>;
  removeItem: (queueId: string) => Promise<void>;
  clearQueue: () => Promise<void>;
  reorderQueue: (orderedQueueIds: string[]) => Promise<void>;
  clearLiveOutput: () => void;

  // History & Interpreters
  refreshInterpreters: () => Promise<void>;
  deleteHistoryRecord: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  openLog: (logPath: string) => Promise<void>;
}

export const useScriptsStore = create<ScriptsState>((set, get) => ({
  scripts: [],
  sequences: [],
  history: [],
  interpreters: [],
  runnerState: {
    status: 'idle',
    activeQueueId: null,
    queue: [],
  },

  selectedScriptId: null,
  activeSubSection: 'editor',
  filterQuery: '',
  selectedScriptIds: [],

  liveOutput: '',
  selectedQueueId: null,
  isPauseScroll: false,
  isLoading: false,
  isInterpretersLoading: false,

  loadAll: async () => {
    if (!window.api?.scripts) return;
    set({ isLoading: true });
    try {
      const [scripts, sequences, history, interpreters, runnerState] = await Promise.all([
        window.api.scripts.getAll(),
        window.api.scripts.getSequences(),
        window.api.scripts.getHistory(),
        window.api.scripts.getInterpreters(),
        window.api.scripts.getRunnerState(),
      ]);

      const currentSelected = get().selectedScriptId;
      const validSelected = currentSelected && scripts.some((s) => s.id === currentSelected)
        ? currentSelected
        : scripts[0]?.id || null;

      set({
        scripts,
        sequences,
        history,
        interpreters,
        runnerState,
        selectedScriptId: validSelected,
        isLoading: false,
      });

      // Fetch live output for active queue item if running
      if (runnerState.activeQueueId) {
        const out = await window.api.scripts.getOutput(runnerState.activeQueueId);
        set({ liveOutput: out });
      }
    } catch (err) {
      console.error('[useScriptsStore] Failed to loadAll:', err);
      set({ isLoading: false });
    }
  },

  setSelectedScriptId: (id) => set({ selectedScriptId: id }),
  setActiveSubSection: (sub) => set({ activeSubSection: sub }),
  setFilterQuery: (query) => set({ filterQuery: query }),
  toggleSelectScript: (id) => {
    const cur = get().selectedScriptIds;
    if (cur.includes(id)) {
      set({ selectedScriptIds: cur.filter((item) => item !== id) });
    } else {
      set({ selectedScriptIds: [...cur, id] });
    }
  },
  clearSelectedScripts: () => set({ selectedScriptIds: [] }),
  setSelectedQueueId: (queueId) => {
    set({ selectedQueueId: queueId });
    if (queueId && window.api?.scripts) {
      window.api.scripts.getOutput(queueId).then((out) => {
        set({ liveOutput: out });
      });
    }
  },
  setIsPauseScroll: (paused) => set({ isPauseScroll: paused }),

  saveScript: async (script) => {
    if (!window.api?.scripts) return script;
    const saved = await window.api.scripts.save(script);
    set((state) => ({
      scripts: state.scripts.some((s) => s.id === saved.id)
        ? state.scripts.map((s) => (s.id === saved.id ? saved : s))
        : [...state.scripts, saved],
      selectedScriptId: saved.id,
    }));
    return saved;
  },

  deleteScript: async (id) => {
    if (!window.api?.scripts) return false;
    const ok = await window.api.scripts.delete(id);
    if (ok) {
      set((state) => {
        const updated = state.scripts.filter((s) => s.id !== id);
        const nextSelected = updated[0]?.id || null;
        return {
          scripts: updated,
          selectedScriptId: state.selectedScriptId === id ? nextSelected : state.selectedScriptId,
          selectedScriptIds: state.selectedScriptIds.filter((item) => item !== id),
        };
      });
    }
    return ok;
  },

  duplicateScript: async (id) => {
    const existing = get().scripts.find((s) => s.id === id);
    if (!existing || !window.api?.scripts) return null;

    const dup: ScriptDefinition = {
      ...existing,
      id: `script-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `${existing.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const saved = await window.api.scripts.save(dup);
    set((state) => ({
      scripts: [...state.scripts, saved],
      selectedScriptId: saved.id,
    }));
    return saved;
  },

  createNewScript: () => {
    const now = Date.now();
    const newScript: ScriptDefinition = {
      id: `script-${now}-${Math.random().toString(36).substring(2, 6)}`,
      name: 'New Script',
      type: 'powershell',
      source: 'inline',
      content: '# PowerShell script\nWrite-Host "Hello from Terminal Manager!"\n',
      args: [],
      env: {},
      timeoutSeconds: 0,
      visibility: 'hidden',
      onFailure: 'stop',
      retryCount: 2,
      retryDelaySeconds: 3,
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({
      scripts: [newScript, ...state.scripts],
      selectedScriptId: newScript.id,
      activeSubSection: 'editor',
    }));

    if (window.api?.scripts) {
      window.api.scripts.save(newScript);
    }
    return newScript;
  },

  importScripts: async () => {
    if (!window.api?.scripts) return;
    const imported = await window.api.scripts.import();
    if (imported && imported.length > 0) {
      set((state) => ({
        scripts: [...imported, ...state.scripts],
        selectedScriptId: imported[0]!.id,
      }));
    }
  },

  exportScripts: async (scriptIds) => {
    if (!window.api?.scripts) return;
    const ids = scriptIds || (get().selectedScriptIds.length > 0 ? get().selectedScriptIds : undefined);
    await window.api.scripts.export(ids || []);
  },

  runNow: async (scriptId) => {
    if (!window.api?.scripts) return;
    await window.api.scripts.enqueue([{ scriptId }], true);
    set({ activeSubSection: 'queue' });
  },

  addToQueue: async (scriptId) => {
    if (!window.api?.scripts) return;
    await window.api.scripts.enqueue([{ scriptId }], false);
  },

  runAllSelectedInOrder: async () => {
    const ids = get().selectedScriptIds;
    if (ids.length === 0 || !window.api?.scripts) return;
    await window.api.scripts.enqueue(
      ids.map((id) => ({ scriptId: id })),
      true
    );
    set({ activeSubSection: 'queue', selectedScriptIds: [] });
  },

  loadSequence: async (sequenceId, runImmediately = true) => {
    if (!window.api?.scripts) return;
    await window.api.scripts.loadSequence(sequenceId, runImmediately);
    set({ activeSubSection: 'queue' });
  },

  saveSequence: async (seq) => {
    if (!window.api?.scripts) return;
    const saved = await window.api.scripts.saveSequence(seq);
    set((state) => ({
      sequences: state.sequences.some((s) => s.id === saved.id)
        ? state.sequences.map((s) => (s.id === saved.id ? saved : s))
        : [...state.sequences, saved],
    }));
  },

  deleteSequence: async (sequenceId) => {
    if (!window.api?.scripts) return;
    const ok = await window.api.scripts.deleteSequence(sequenceId);
    if (ok) {
      set((state) => ({
        sequences: state.sequences.filter((s) => s.id !== sequenceId),
      }));
    }
  },

  startQueue: async () => {
    if (!window.api?.scripts) return;
    await window.api.scripts.start();
  },

  pauseQueue: async () => {
    if (!window.api?.scripts) return;
    await window.api.scripts.pause();
  },

  resumeQueue: async () => {
    if (!window.api?.scripts) return;
    await window.api.scripts.resume();
  },

  stopQueue: async () => {
    if (!window.api?.scripts) return;
    await window.api.scripts.stop();
  },

  skipCurrent: async () => {
    if (!window.api?.scripts) return;
    await window.api.scripts.skip();
  },

  retryFailed: async () => {
    if (!window.api?.scripts) return;
    await window.api.scripts.retryFailed();
  },

  resumeFromHere: async (queueId) => {
    if (!window.api?.scripts) return;
    await window.api.scripts.resumeFromHere(queueId);
  },

  removeItem: async (queueId) => {
    if (!window.api?.scripts) return;
    const ok = await window.api.scripts.removeItem(queueId);
    if (ok) {
      set((state) => ({
        runnerState: {
          ...state.runnerState,
          queue: state.runnerState.queue.filter((item) => item.queueId !== queueId),
        },
      }));
    }
  },

  clearQueue: async () => {
    if (!window.api?.scripts) return;
    await window.api.scripts.clear();
    set({ liveOutput: '', selectedQueueId: null });
  },

  reorderQueue: async (orderedQueueIds) => {
    if (!window.api?.scripts) return;
    await window.api.scripts.reorder(orderedQueueIds);
  },

  clearLiveOutput: () => set({ liveOutput: '' }),

  refreshInterpreters: async () => {
    if (!window.api?.scripts) return;
    set({ isInterpretersLoading: true });
    try {
      const interpreters = await window.api.scripts.getInterpreters(true);
      set({ interpreters, isInterpretersLoading: false });
    } catch {
      set({ isInterpretersLoading: false });
    }
  },

  deleteHistoryRecord: async (id) => {
    if (!window.api?.scripts) return;
    const ok = await window.api.scripts.deleteHistory(id);
    if (ok) {
      set((state) => ({
        history: state.history.filter((h) => h.id !== id),
      }));
    }
  },

  clearHistory: async () => {
    if (!window.api?.scripts) return;
    await window.api.scripts.clearHistory();
    set({ history: [] });
  },

  openLog: async (logPath) => {
    if (!window.api?.scripts) return;
    await window.api.scripts.openLog(logPath);
  },
}));
