import { create } from 'zustand';
import {
  AgentWithState,
  PrerequisiteItem,
  AgentLaunchRequest,
  CustomAgentInput,
} from '../../../shared/agentTypes';

interface DangerousConfirmState {
  isOpen: boolean;
  flag?: string;
  req?: AgentLaunchRequest;
}

interface AgentsState {
  agents: AgentWithState[];
  prerequisites: PrerequisiteItem[];
  selectedAgentId: string | null;
  filter: 'all' | 'installed' | 'not_installed';
  searchQuery: string;
  selectedNotInstalledIds: string[];
  isScanning: boolean;
  isPrereqsCollapsed: boolean;
  isCustomAgentModalOpen: boolean;
  dangerousConfirm: DangerousConfirmState;
  agentEnvMasked: Record<string, string>;
  isEncryptionAvailable: boolean;

  // Actions
  loadAgents: (force?: boolean) => Promise<void>;
  loadPrerequisites: () => Promise<void>;
  setSelectedAgentId: (id: string | null) => void;
  setFilter: (filter: 'all' | 'installed' | 'not_installed') => void;
  setSearchQuery: (query: string) => void;
  toggleSelectNotInstalled: (id: string) => void;
  selectAllNotInstalled: () => void;
  clearSelectedNotInstalled: () => void;
  togglePrereqsCollapsed: () => void;
  setCustomAgentModalOpen: (open: boolean) => void;
  setDangerousConfirm: (state: DangerousConfirmState) => void;

  launchAgent: (
    req: AgentLaunchRequest & { confirmedDangerous?: boolean }
  ) => Promise<{ success: boolean; busy?: boolean; requiresDangerousConfirm?: boolean; dangerousFlag?: string; error?: string }>;
  installAgent: (agentId: string, methodId?: string) => Promise<{ success: boolean; sessionId?: string; error?: string }>;
  updateAgent: (agentId: string) => Promise<{ success: boolean; sessionId?: string; error?: string }>;
  uninstallAgent: (agentId: string) => Promise<{ success: boolean; message?: string; manualInstructions?: string; error?: string }>;
  installPrerequisite: (id: string) => Promise<{ success: boolean; error?: string }>;
  addToPath: (agentId: string) => Promise<{ success: boolean; error?: string }>;
  saveCustomAgent: (input: CustomAgentInput) => Promise<{ success: boolean; error?: string }>;
  deleteCustomAgent: (id: string) => Promise<{ success: boolean; error?: string }>;

  loadAgentEnv: (agentId: string) => Promise<void>;
  saveAgentEnv: (agentId: string, env: Record<string, string>) => Promise<{ success: boolean; error?: string }>;
  installSelectedAgents: () => Promise<void>;
}

export const useAgentsStore = create<AgentsState>((set, get) => ({
  agents: [],
  prerequisites: [],
  selectedAgentId: null,
  filter: 'all',
  searchQuery: '',
  selectedNotInstalledIds: [],
  isScanning: false,
  isPrereqsCollapsed: false,
  isCustomAgentModalOpen: false,
  dangerousConfirm: { isOpen: false },
  agentEnvMasked: {},
  isEncryptionAvailable: true,

  loadAgents: async (force = false) => {
    if (!window.api?.aiAgents) return;
    set({ isScanning: true });
    try {
      const items = await window.api.aiAgents.scanAll(force);
      const prereqs = await window.api.aiAgents.getPrerequisites();
      set((state) => {
        const currentSelected = state.selectedAgentId;
        const exists = items.some((i: AgentWithState) => i.entry.id === currentSelected);
        const newSelected = exists ? currentSelected : items[0]?.entry.id || null;
        return {
          agents: items,
          prerequisites: prereqs,
          selectedAgentId: newSelected,
          isScanning: false,
        };
      });

      if (get().selectedAgentId) {
        get().loadAgentEnv(get().selectedAgentId!);
      }
    } catch {
      set({ isScanning: false });
    }
  },

  loadPrerequisites: async () => {
    if (!window.api?.aiAgents) return;
    try {
      const prereqs = await window.api.aiAgents.getPrerequisites();
      set({ prerequisites: prereqs });
    } catch {}
  },

  setSelectedAgentId: (id: string | null) => {
    set({ selectedAgentId: id });
    if (id) {
      get().loadAgentEnv(id);
    }
  },

  setFilter: (filter) => set({ filter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  toggleSelectNotInstalled: (id: string) => {
    set((state) => {
      const prev = state.selectedNotInstalledIds;
      return {
        selectedNotInstalledIds: prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
      };
    });
  },

  selectAllNotInstalled: () => {
    const { agents } = get();
    const notInstalled = agents
      .filter((a) => a.state.status === 'not_installed' && a.entry.status !== 'legacy')
      .map((a) => a.entry.id);
    set({ selectedNotInstalledIds: notInstalled });
  },

  clearSelectedNotInstalled: () => {
    set({ selectedNotInstalledIds: [] });
  },

  togglePrereqsCollapsed: () => {
    set((state) => ({ isPrereqsCollapsed: !state.isPrereqsCollapsed }));
  },

  setCustomAgentModalOpen: (open: boolean) => {
    set({ isCustomAgentModalOpen: open });
  },

  setDangerousConfirm: (dangerousConfirm) => {
    set({ dangerousConfirm });
  },

  launchAgent: async (req) => {
    if (!window.api?.aiAgents) return { success: false, error: 'AI Agents API not available.' };
    const res = await window.api.aiAgents.launch(req);
    if (res.requiresDangerousConfirm) {
      set({
        dangerousConfirm: {
          isOpen: true,
          flag: res.dangerousFlag,
          req,
        },
      });
    }
    return res;
  },

  installAgent: async (agentId: string, methodId?: string) => {
    if (!window.api?.aiAgents) return { success: false, error: 'AI Agents API not available.' };
    return await window.api.aiAgents.install({ agentId, methodId: methodId || '' });
  },

  updateAgent: async (agentId: string) => {
    if (!window.api?.aiAgents) return { success: false, error: 'AI Agents API not available.' };
    return await window.api.aiAgents.update({ agentId });
  },

  uninstallAgent: async (agentId: string) => {
    if (!window.api?.aiAgents) return { success: false, error: 'AI Agents API not available.' };
    const res = await window.api.aiAgents.uninstall({ agentId });
    if (res.success) {
      await get().loadAgents(true);
    }
    return res;
  },

  installPrerequisite: async (id: string) => {
    if (!window.api?.aiAgents) return { success: false, error: 'AI Agents API not available.' };
    return await window.api.aiAgents.installPrerequisite({ id });
  },

  addToPath: async (agentId: string) => {
    if (!window.api?.aiAgents) return { success: false, error: 'AI Agents API not available.' };
    const res = await window.api.aiAgents.addToPath({ agentId });
    if (res.success) {
      await get().loadAgents(true);
    }
    return res;
  },

  saveCustomAgent: async (input: CustomAgentInput) => {
    if (!window.api?.aiAgents) return { success: false, error: 'AI Agents API not available.' };
    const res = await window.api.aiAgents.addCustomAgent(input);
    if (res.success) {
      await get().loadAgents(true);
      set({ isCustomAgentModalOpen: false });
    }
    return res;
  },

  deleteCustomAgent: async (id: string) => {
    if (!window.api?.aiAgents) return { success: false, error: 'AI Agents API not available.' };
    const res = await window.api.aiAgents.deleteCustomAgent({ id });
    if (res.success) {
      await get().loadAgents(true);
    }
    return res;
  },

  loadAgentEnv: async (agentId: string) => {
    if (!window.api?.aiAgents) return;
    try {
      const res = await window.api.aiAgents.getEnv(agentId);
      set({
        agentEnvMasked: res.maskedEnv || {},
        isEncryptionAvailable: res.isEncryptionAvailable,
      });
    } catch {}
  },

  saveAgentEnv: async (agentId: string, env: Record<string, string>) => {
    if (!window.api?.aiAgents) return { success: false, error: 'AI Agents API not available.' };
    const res = await window.api.aiAgents.setEnv({ agentId, env });
    if (res.success) {
      await get().loadAgentEnv(agentId);
    }
    return res;
  },

  installSelectedAgents: async () => {
    const { agents, selectedNotInstalledIds } = get();
    if (selectedNotInstalledIds.length === 0 || !window.api?.scripts) return;

    const itemsToQueue: any[] = [];
    for (const id of selectedNotInstalledIds) {
      const target = agents.find((a) => a.entry.id === id);
      if (!target) continue;
      const recMethod =
        target.entry.installMethods.find((m) => m.recommended) ||
        target.entry.installMethods[0];
      if (!recMethod) continue;

      itemsToQueue.push({
        scriptId: `agent-install-${target.entry.id}`,
        scriptName: `Install ${target.entry.name}`,
        content: recMethod.command,
        type: recMethod.shell === 'cmd' ? 'cmd' : 'powershell',
        source: 'inline',
        onFailure: 'stop',
      });
    }

    if (itemsToQueue.length > 0) {
      await window.api.scripts.enqueue(itemsToQueue, true);
      set({ selectedNotInstalledIds: [] });
    }
  },
}));
