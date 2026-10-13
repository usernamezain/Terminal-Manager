import { create } from 'zustand';
import { TerminalProfile } from '../../shared/types';

interface ProfilesState {
  profiles: TerminalProfile[];
  selectedProfileId: string | null;
  isLoading: boolean;
  isDetecting: boolean;
  error: string | null;

  loadProfiles: () => Promise<void>;
  setSelectedProfileId: (id: string | null) => void;
  saveProfile: (profile: TerminalProfile) => Promise<TerminalProfile | null>;
  setDefaultProfile: (id: string) => Promise<boolean>;
  deleteProfile: (id: string) => Promise<boolean>;
  duplicateProfile: (id: string) => Promise<TerminalProfile | null>;
  detectShells: () => Promise<void>;
  createNewProfile: () => TerminalProfile;
}

export const useProfilesStore = create<ProfilesState>((set, get) => ({
  profiles: [],
  selectedProfileId: null,
  isLoading: false,
  isDetecting: false,
  error: null,

  loadProfiles: async () => {
    if (!window.api?.profiles) return;
    set({ isLoading: true, error: null });
    try {
      const list = await window.api.profiles.getAll();
      set({
        profiles: list,
        isLoading: false,
        selectedProfileId: get().selectedProfileId || (list[0]?.id ?? null),
      });
    } catch (err: any) {
      set({ isLoading: false, error: err?.message || 'Failed to load profiles' });
    }
  },

  setSelectedProfileId: (id: string | null) => {
    set({ selectedProfileId: id });
  },

  saveProfile: async (profile: TerminalProfile) => {
    if (!window.api?.profiles) return null;
    try {
      const saved = await window.api.profiles.save(profile);
      const current = get().profiles;
      const idx = current.findIndex((p) => p.id === saved.id);
      let updated: TerminalProfile[];
      if (idx >= 0) {
        updated = [...current];
        updated[idx] = saved;
      } else {
        updated = [...current, saved];
      }
      set({ profiles: updated, selectedProfileId: saved.id });
      return saved;
    } catch (err: any) {
      set({ error: err?.message || 'Failed to save profile' });
      return null;
    }
  },

  setDefaultProfile: async (id: string) => {
    if (!window.api?.profiles) return false;
    try {
      const ok = await window.api.profiles.setDefault(id);
      if (ok) {
        set((state) => ({
          profiles: state.profiles.map((p) => ({
            ...p,
            isDefault: p.id === id,
          })),
        }));
      }
      return ok;
    } catch (err: any) {
      set({ error: err?.message || 'Failed to set default profile' });
      return false;
    }
  },

  deleteProfile: async (id: string) => {
    if (!window.api?.profiles) return false;
    try {
      const ok = await window.api.profiles.delete(id);
      if (ok) {
        const remaining = get().profiles.filter((p) => p.id !== id);
        const currentSelected = get().selectedProfileId;
        const newSelected = currentSelected === id ? (remaining[0]?.id ?? null) : currentSelected;
        set({
          profiles: remaining,
          selectedProfileId: newSelected,
        });
      }
      return ok;
    } catch (err: any) {
      set({ error: err?.message || 'Failed to delete profile' });
      return false;
    }
  },

  duplicateProfile: async (id: string) => {
    const target = get().profiles.find((p) => p.id === id);
    if (!target) return null;

    const copyId = `profile-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const copy: TerminalProfile = {
      ...target,
      id: copyId,
      name: `${target.name} (Copy)`,
      isDefault: false,
    };

    return await get().saveProfile(copy);
  },

  detectShells: async () => {
    if (!window.api?.profiles) return;
    set({ isDetecting: true, error: null });
    try {
      const merged = await window.api.profiles.detect();
      set({
        profiles: merged,
        isDetecting: false,
        selectedProfileId: get().selectedProfileId || (merged[0]?.id ?? null),
      });
    } catch (err: any) {
      set({ isDetecting: false, error: err?.message || 'Failed to detect shells' });
    }
  },

  createNewProfile: () => {
    const newId = `profile-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const isWindows = window.api?.platform === 'win32';
    const draft: TerminalProfile = {
      id: newId,
      name: 'Custom Profile',
      shellPath: isWindows ? 'powershell.exe' : '/bin/bash',
      shellArgs: [],
      cwd: '',
      icon: 'terminal',
      color: '#6C8CFF',
      env: {},
      isDefault: false,
      elevate: false,
      tabTitle: '',
    };

    set((state) => ({
      profiles: [...state.profiles, draft],
      selectedProfileId: newId,
    }));

    // Trigger save to persist immediately
    get().saveProfile(draft);
    return draft;
  },
}));
