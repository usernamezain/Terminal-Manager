export type EcosystemType =
  | 'node'
  | 'python'
  | 'rust'
  | 'go'
  | 'dotnet'
  | 'java'
  | 'php'
  | 'ruby'
  | 'docker'
  | 'generic';

export type CommandCategory =
  | 'script'
  | 'install'
  | 'package'
  | 'env'
  | 'run'
  | 'lint'
  | 'docker'
  | 'workspace'
  | 'custom';

export type RunTarget = 'terminal' | 'new-tab' | 'split' | 'copy' | 'script-runner';

export interface ProjectCommand {
  id: string;
  label: string;
  commandText: string;
  tool: string;
  args: string[];
  cwd?: string;
  category: CommandCategory;
  isDangerous?: boolean;
  isPrimary?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  requiresConfirm?: boolean;
  confirmMessage?: string;
  isLongRunning?: boolean;
}

export interface CommandGroup {
  id: string;
  title: string;
  commands: ProjectCommand[];
  subgroups?: CommandGroup[];
}

export interface WorkspacePackage {
  name: string;
  path: string;
  relativeDir: string;
  scripts: ProjectCommand[];
}

export interface DetectedEcosystem {
  type: EcosystemType;
  name: string;
  tool: string;
  toolAvailable: boolean;
  toolMissingReason?: string;
  groups: CommandGroup[];
  note?: string;
}

export interface ProjectInfo {
  id: string;
  name: string;
  rootPath: string;
  cwd: string;
  ecosystems: DetectedEcosystem[];
  primaryCommand?: ProjectCommand;
  workspaces?: WorkspacePackage[];
  errors?: string[];
  nodeVersionNote?: string;
}

export interface CustomProjectCommand {
  id: string;
  name: string;
  command: string;
  shell?: 'powershell' | 'cmd' | 'bash';
  cwd?: string;
}

export interface StoredProjectData {
  projectPath: string;
  lastRunCommandIds: string[];
  pinnedCommandIds: string[];
  hiddenCommandIds: string[];
  customCommands: CustomProjectCommand[];
  primaryCommandId?: string;
}

export interface ProjectRunnerSettings {
  showPlayButton: boolean;
  autoDetect: boolean;
  showPrePostScripts: boolean;
  defaultRunTarget: 'terminal' | 'new-tab';
  confirmGlobalInstalls: boolean;
  suggestFromInternet: boolean;
  offlineMode: boolean;
  enabledEcosystems: Record<EcosystemType, boolean>;
}

export interface PackageValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: string;
  commandPreview?: string;
}

export interface PackageSearchResult {
  name: string;
  description?: string;
  version?: string;
}
