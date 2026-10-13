import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useProfilesStore } from '../useProfilesStore';
import { TerminalProfile } from '../../../shared/types';

if (typeof window === 'undefined') {
  (globalThis as any).window = globalThis;
}

describe('useProfilesStore Renderer Store Tests', () => {
  const mockProfiles: TerminalProfile[] = [
    {
      id: 'profile-pwsh',
      name: 'PowerShell 7',
      shellPath: 'pwsh.exe',
      shellArgs: [],
      isDefault: true,
      color: '#6C8CFF',
    },
    {
      id: 'profile-cmd',
      name: 'Command Prompt',
      shellPath: 'cmd.exe',
      shellArgs: [],
      isDefault: false,
      color: '#10B981',
    },
  ];

  beforeEach(() => {
    useProfilesStore.setState({
      profiles: [],
      selectedProfileId: null,
      isLoading: false,
      isDetecting: false,
      error: null,
    });

    (window as any).api = {
      platform: 'win32',
      profiles: {
        getAll: vi.fn().mockResolvedValue([...mockProfiles]),
        save: vi.fn().mockImplementation(async (p: TerminalProfile) => p),
        setDefault: vi.fn().mockResolvedValue(true),
        delete: vi.fn().mockResolvedValue(true),
        detect: vi.fn().mockResolvedValue([...mockProfiles]),
      },
    };
  });

  it('loads profiles and sets default selected profile', async () => {
    await useProfilesStore.getState().loadProfiles();
    const state = useProfilesStore.getState();
    expect(state.profiles.length).toBe(2);
    expect(state.selectedProfileId).toBe('profile-pwsh');
  });

  it('creates and saves a new custom profile draft', async () => {
    await useProfilesStore.getState().loadProfiles();
    const draft = useProfilesStore.getState().createNewProfile();

    expect(draft.id).toBeDefined();
    expect(draft.name).toBe('Custom Profile');
    expect(useProfilesStore.getState().selectedProfileId).toBe(draft.id);
    expect(useProfilesStore.getState().profiles.some((p) => p.id === draft.id)).toBe(true);
  });

  it('duplicates an existing profile with (Copy) name', async () => {
    await useProfilesStore.getState().loadProfiles();
    const copy = await useProfilesStore.getState().duplicateProfile('profile-pwsh');

    expect(copy).toBeDefined();
    expect(copy?.name).toBe('PowerShell 7 (Copy)');
    expect(copy?.isDefault).toBe(false);
  });

  it('updates default profile in state', async () => {
    await useProfilesStore.getState().loadProfiles();
    const ok = await useProfilesStore.getState().setDefaultProfile('profile-cmd');

    expect(ok).toBe(true);
    const state = useProfilesStore.getState();
    expect(state.profiles.find((p) => p.id === 'profile-cmd')?.isDefault).toBe(true);
    expect(state.profiles.find((p) => p.id === 'profile-pwsh')?.isDefault).toBe(false);
  });

  it('deletes profile and switches selectedProfileId', async () => {
    await useProfilesStore.getState().loadProfiles();
    useProfilesStore.setState({ selectedProfileId: 'profile-cmd' });

    const ok = await useProfilesStore.getState().deleteProfile('profile-cmd');
    expect(ok).toBe(true);
    const state = useProfilesStore.getState();
    expect(state.profiles.length).toBe(1);
    expect(state.selectedProfileId).toBe('profile-pwsh');
  });
});
