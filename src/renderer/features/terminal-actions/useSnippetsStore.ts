import { create } from 'zustand';
import { Snippet, DEFAULT_SNIPPETS } from '@shared/snippetTypes';

interface SnippetsState {
  snippets: Snippet[];
  folders: string[];
  isLoading: boolean;
  loadSnippets: () => Promise<void>;
  saveSnippet: (snippet: Snippet) => Promise<void>;
  deleteSnippet: (id: string) => Promise<void>;
  importSnippets: (snippets: Snippet[]) => Promise<void>;
}

export const useSnippetsStore = create<SnippetsState>((set, get) => ({
  snippets: [...DEFAULT_SNIPPETS],
  folders: Array.from(new Set(DEFAULT_SNIPPETS.map((s) => s.folder || 'General'))),
  isLoading: false,

  loadSnippets: async () => {
    if (!window.api?.snippets?.getAll) return;
    set({ isLoading: true });
    try {
      const list = await window.api.snippets.getAll();
      const folders = Array.from(new Set(list.map((s) => s.folder || 'General'))).sort();
      set({ snippets: list, folders, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  saveSnippet: async (snippet: Snippet) => {
    if (window.api?.snippets?.save) {
      const saved = await window.api.snippets.save(snippet);
      const updated = get().snippets.filter((s) => s.id !== saved.id);
      const list = [saved, ...updated];
      const folders = Array.from(new Set(list.map((s) => s.folder || 'General'))).sort();
      set({ snippets: list, folders });
    } else {
      const updated = get().snippets.filter((s) => s.id !== snippet.id);
      const list = [snippet, ...updated];
      const folders = Array.from(new Set(list.map((s) => s.folder || 'General'))).sort();
      set({ snippets: list, folders });
    }
  },

  deleteSnippet: async (id: string) => {
    if (window.api?.snippets?.delete) {
      await window.api.snippets.delete(id);
    }
    const list = get().snippets.filter((s) => s.id !== id);
    const folders = Array.from(new Set(list.map((s) => s.folder || 'General'))).sort();
    set({ snippets: list, folders });
  },

  importSnippets: async (imported: Snippet[]) => {
    if (window.api?.snippets?.import) {
      const list = await window.api.snippets.import(imported);
      const folders = Array.from(new Set(list.map((s) => s.folder || 'General'))).sort();
      set({ snippets: list, folders });
    }
  },
}));
