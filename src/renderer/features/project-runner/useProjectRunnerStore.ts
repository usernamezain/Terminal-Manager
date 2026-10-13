import { create } from 'zustand';
import {
  ProjectInfo,
  StoredProjectData,
  ProjectCommand,
  RunTarget,
  EcosystemType,
} from '../../../shared/projectRunnerTypes';
import { ShellType } from '../../../shared/terminalUtils';

export interface StatusFeedbackItem {
  text: string;
  success: boolean;
  timestamp: number;
}

export interface BusyDialogState {
  sessionId: string;
  command: ProjectCommand;
  target?: RunTarget;
  sessionCwd?: string;
  processes: any[];
}

export interface AddPackageModalState {
  sessionId: string;
  projectPath: string;
  ecosystem: EcosystemType;
  isDev?: boolean;
}

interface ProjectRunnerState {
  projects: Record<string, ProjectInfo | null>;
  storedData: Record<string, StoredProjectData>;
  runningCommands: Record<string, ProjectCommand | null>;
  statusFeedback: Record<string, StatusFeedbackItem | null>;
  busyDialog: BusyDialogState | null;
  addPackageModal: AddPackageModalState | null;
  activeMenuSessionId: string | null;

  detect: (sessionId: string, cwd: string, shellType?: ShellType, forceRefresh?: boolean) => Promise<ProjectInfo | null>;
  runCommand: (
    sessionId: string,
    command: ProjectCommand,
    target?: RunTarget,
    sessionCwd?: string
  ) => Promise<{ status: 'executed' | 'busy' | 'copied' | 'enqueued'; commandText?: string }>;
  stopCommand: (sessionId: string) => Promise<void>;
  restartCommand: (sessionId: string) => Promise<void>;
  setRunningCommand: (sessionId: string, cmd: ProjectCommand | null) => void;
  handleOsc133Finished: (sessionId: string, exitCode: number) => void;
  openAddPackage: (sessionId: string, projectPath: string, ecosystem: EcosystemType, isDev?: boolean) => void;
  closeAddPackage: () => void;
  openBusyDialog: (state: BusyDialogState) => void;
  closeBusyDialog: () => void;
  toggleMenu: (sessionId: string | null) => void;
  togglePin: (projectPath: string, commandId: string) => Promise<void>;
  toggleHide: (projectPath: string, commandId: string) => Promise<void>;
  setPrimary: (projectPath: string, commandId: string) => Promise<void>;
  clearSavedData: (projectPath?: string) => Promise<void>;
}

export const useProjectRunnerStore = create<ProjectRunnerState>((set, get) => ({
  projects: {},
  storedData: {},
  runningCommands: {},
  statusFeedback: {},
  busyDialog: null,
  addPackageModal: null,
  activeMenuSessionId: null,

  detect: async (sessionId: string, cwd: string, shellType?: ShellType, forceRefresh?: boolean) => {
    if (!window.api?.projectRunner) return null;
    try {
      const project = await window.api.projectRunner.detect({
        cwd,
        shellType,
        forceRefresh,
      });

      set((state) => ({
        projects: { ...state.projects, [sessionId]: project },
      }));

      if (project?.rootPath) {
        const stored = await window.api.projectRunner.getStore({
          projectPath: project.rootPath,
        });
        set((state) => ({
          storedData: { ...state.storedData, [project.rootPath]: stored },
        }));
      }

      return project;
    } catch {
      return null;
    }
  },

  runCommand: async (
    sessionId: string,
    command: ProjectCommand,
    target: RunTarget = 'terminal',
    sessionCwd?: string
  ) => {
    if (!window.api?.projectRunner) return { status: 'executed' };

    const res = await window.api.projectRunner.run({
      sessionId,
      command,
      target,
      sessionCwd,
    });

    if (res.status === 'busy') {
      set({
        busyDialog: {
          sessionId,
          command,
          target,
          sessionCwd,
          processes: res.runningProcesses || [],
        },
      });
      return res;
    }

    if (res.status === 'executed' && command.isLongRunning) {
      set((state) => ({
        runningCommands: { ...state.runningCommands, [sessionId]: command },
      }));
    }

    // Refresh store
    const proj = get().projects[sessionId];
    if (proj?.rootPath) {
      const stored = await window.api.projectRunner.getStore({
        projectPath: proj.rootPath,
      });
      set((state) => ({
        storedData: { ...state.storedData, [proj.rootPath]: stored },
      }));
    }

    return res;
  },

  stopCommand: async (sessionId: string) => {
    if (!window.api?.projectRunner) return;
    await window.api.projectRunner.stop({ sessionId });
    set((state) => ({
      runningCommands: { ...state.runningCommands, [sessionId]: null },
    }));
  },

  restartCommand: async (sessionId: string) => {
    if (!window.api?.projectRunner) return;
    const running = get().runningCommands[sessionId];
    if (running) {
      await window.api.projectRunner.restart({
        sessionId,
        command: running,
      });
    }
  },

  setRunningCommand: (sessionId: string, cmd: ProjectCommand | null) => {
    set((state) => ({
      runningCommands: { ...state.runningCommands, [sessionId]: cmd },
    }));
  },

  handleOsc133Finished: (sessionId: string, exitCode: number) => {
    const success = exitCode === 0;
    const text = success ? 'Passed' : `Failed (exit ${exitCode})`;
    set((state) => ({
      statusFeedback: {
        ...state.statusFeedback,
        [sessionId]: { text, success, timestamp: Date.now() },
      },
      runningCommands: { ...state.runningCommands, [sessionId]: null },
    }));

    // Auto-clear feedback after 6s
    setTimeout(() => {
      set((state) => {
        const cur = state.statusFeedback[sessionId];
        if (cur && Date.now() - cur.timestamp >= 5800) {
          return {
            statusFeedback: { ...state.statusFeedback, [sessionId]: null },
          };
        }
        return state;
      });
    }, 6000);
  },

  openAddPackage: (sessionId: string, projectPath: string, ecosystem: EcosystemType, isDev?: boolean) => {
    set({
      addPackageModal: { sessionId, projectPath, ecosystem, isDev },
      activeMenuSessionId: null,
    });
  },

  closeAddPackage: () => {
    set({ addPackageModal: null });
  },

  openBusyDialog: (state: BusyDialogState) => {
    set({ busyDialog: state, activeMenuSessionId: null });
  },

  closeBusyDialog: () => {
    set({ busyDialog: null });
  },

  toggleMenu: (sessionId: string | null) => {
    set({ activeMenuSessionId: sessionId });
  },

  togglePin: async (projectPath: string, commandId: string) => {
    if (!window.api?.projectRunner) return;
    const updated = await window.api.projectRunner.saveStore({
      action: 'pin',
      projectPath,
      payload: { commandId },
    });
    set((state) => ({
      storedData: { ...state.storedData, [projectPath]: updated },
    }));
  },

  toggleHide: async (projectPath: string, commandId: string) => {
    if (!window.api?.projectRunner) return;
    const updated = await window.api.projectRunner.saveStore({
      action: 'hide',
      projectPath,
      payload: { commandId },
    });
    set((state) => ({
      storedData: { ...state.storedData, [projectPath]: updated },
    }));
  },

  setPrimary: async (projectPath: string, commandId: string) => {
    if (!window.api?.projectRunner) return;
    const updated = await window.api.projectRunner.saveStore({
      action: 'primary',
      projectPath,
      payload: { commandId },
    });
    set((state) => ({
      storedData: { ...state.storedData, [projectPath]: updated },
    }));
  },

  clearSavedData: async (projectPath?: string) => {
    if (!window.api?.projectRunner) return;
    await window.api.projectRunner.saveStore({
      action: 'clear',
      projectPath: projectPath || '',
    });
    if (projectPath) {
      set((state) => {
        const cp = { ...state.storedData };
        delete cp[projectPath];
        return { storedData: cp };
      });
    } else {
      set({ storedData: {} });
    }
  },
}));
