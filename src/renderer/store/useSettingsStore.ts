import { create } from 'zustand';
import { AppSettings } from '@shared/types';
import { DEFAULT_SETTINGS } from '@shared/constants';

interface SettingsState {
  settings: AppSettings;
  loaded: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  loadSettings: async () => {
    try {
      if (window.api?.settings) {
        const fetched = await window.api.settings.get();
        set({ settings: fetched, loaded: true });
        applyThemeToDocument(fetched.theme);
      }
    } catch (err) {
      console.error('Failed to load settings from main process:', err);
    }
  },
  updateSettings: async (partial: Partial<AppSettings>) => {
    const current = get().settings;
    const updated = { ...current, ...partial };
    set({ settings: updated });
    if (partial.theme) {
      applyThemeToDocument(partial.theme);
    }
    try {
      if (window.api?.settings) {
        const saved = await window.api.settings.set(partial);
        set({ settings: saved });
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  },
}));

function applyThemeToDocument(theme: string): void {
  document.documentElement.setAttribute('data-theme', theme);
}
