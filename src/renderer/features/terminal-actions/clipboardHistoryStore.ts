import { create } from 'zustand';

interface ClipboardHistoryState {
  items: string[];
  history: string[];
  maxItems: number;
  addItem: (item: string) => void;
  clearHistory: () => void;
  setMaxItems: (max: number) => void;
}

export const useClipboardHistoryStore = create<ClipboardHistoryState>((set, get) => ({
  items: [],
  history: [],
  maxItems: 10,
  addItem: (item: string) => {
    if (!item || !item.trim()) return;
    const { items, maxItems } = get();
    // Filter out duplicate if already exists, put at front
    const filtered = items.filter((i) => i !== item);
    const updated = [item, ...filtered].slice(0, maxItems);
    set({ items: updated, history: updated });
  },
  clearHistory: () => set({ items: [], history: [] }),
  setMaxItems: (maxItems: number) => set({ maxItems }),
}));
