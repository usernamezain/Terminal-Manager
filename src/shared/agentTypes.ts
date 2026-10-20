import { z } from 'zod';

export type AgentInstallShell = 'powershell' | 'cmd';
export type AgentSignInType = 'browser' | 'apikey' | 'account' | 'none';
export type AgentStatus = 'active' | 'legacy' | 'unverified';
export type WindowsSupport = 'native' | 'wsl-only' | 'unknown';
export type AgentDetectionStatus = 'installed' | 'not_installed' | 'not_on_path' | 'broken' | 'wsl_only';
export type AgentLaunchMode = 'terminal' | 'tab' | 'split' | 'window';

export interface AgentInstallMethod {
  id: string;
  label: string;
  shell: AgentInstallShell;
  command: string;
  requires: string[];
  isScriptPipe: boolean;
  source: string;
  recommended: boolean;
}

export interface AgentSignIn {
  type: AgentSignInType;
  instructions: string;
  command?: string;
}

export interface AgentCost {
  note: string;
  verifiedOn: string;
}

export interface AgentCatalogEntry {
  id: string;
  name: string;
  vendor: string;
  description: string;
  command: string;
  altCommands?: string[];
  versionArgs?: string[];
  installMethods: AgentInstallMethod[];
  updateCommand?: string;
  uninstallHint?: string;
  signIn: AgentSignIn;
  cost: AgentCost;
  docsUrl: string;
  status: AgentStatus;
  windows: WindowsSupport;
  resumeArgs?: string[];
  knownInstallDirs?: string[];
  isCustom?: boolean;
}

export interface AgentCatalogFile {
  schemaVersion: number;
  agents: AgentCatalogEntry[];
}

export interface AgentDetectionState {
  status: AgentDetectionStatus;
  version?: string;
  resolvedPath?: string;
  error?: string;
  desktopConflict?: boolean;
  desktopConflictFix?: string;
  lastChecked: number;
}

export interface AgentWithState {
  entry: AgentCatalogEntry;
  state: AgentDetectionState;
}

export interface PrerequisiteItem {
  id: string;
  name: string;
  installed: boolean;
  version?: string;
  resolvedPath?: string;
  wingetId?: string;
  installUrl: string;
}

export interface AgentLaunchRequest {
  agentId: string;
  cwd?: string;
  mode: AgentLaunchMode;
  extraArgs?: string[];
  resume?: boolean;
  sessionId?: string;
}

export interface AgentUserState {
  lastFolder?: string;
  lastMode?: AgentLaunchMode;
  recentFolders: string[];
  env?: Record<string, string>; // base64 encrypted values or masked in UI
}

export interface AgentCacheData {
  updatedAt: number;
  installedAgents: Array<{
    id: string;
    name: string;
    command: string;
    resolvedPath?: string;
    version?: string;
  }>;
}

// Zod Schemas for Validation
export const AgentInstallMethodSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  shell: z.enum(['powershell', 'cmd']),
  command: z.string().min(1),
  requires: z.array(z.string()).default([]),
  isScriptPipe: z.boolean().default(false),
  source: z.string().min(1),
  recommended: z.boolean().default(false),
});

export const AgentSignInSchema = z.object({
  type: z.enum(['browser', 'apikey', 'account', 'none']),
  instructions: z.string(),
  command: z.string().optional(),
});

export const AgentCostSchema = z.object({
  note: z.string(),
  verifiedOn: z.string(),
});

export const AgentCatalogEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  vendor: z.string().min(1),
  description: z.string(),
  command: z.string().min(1),
  altCommands: z.array(z.string()).optional(),
  versionArgs: z.array(z.string()).default(['--version']),
  installMethods: z.array(AgentInstallMethodSchema).default([]),
  updateCommand: z.string().optional(),
  uninstallHint: z.string().optional(),
  signIn: AgentSignInSchema,
  cost: AgentCostSchema,
  docsUrl: z.string().url(),
  status: z.enum(['active', 'legacy', 'unverified']).default('active'),
  windows: z.enum(['native', 'wsl-only', 'unknown']).default('native'),
  resumeArgs: z.array(z.string()).optional(),
  knownInstallDirs: z.array(z.string()).optional(),
  isCustom: z.boolean().optional(),
});

export const AgentCatalogFileSchema = z.object({
  schemaVersion: z.number().int().min(1),
  agents: z.array(AgentCatalogEntrySchema),
});

export const CustomAgentCreateSchema = z.object({
  name: z.string().min(1).max(100),
  command: z.string().min(1).max(100),
  installCommand: z.string().max(1000).optional(),
  installShell: z.enum(['powershell', 'cmd']).default('powershell'),
  signInNote: z.string().max(500).optional(),
  docsUrl: z.string().url().optional(),
  defaultArgs: z.string().max(1000).optional(),
});

export type CustomAgentInput = z.input<typeof CustomAgentCreateSchema>;

/**
 * Splits raw argument strings respecting quotes.
 */
export function parseArgsString(input: string): string[] {
  if (!input || !input.trim()) return [];
  const matches = input.match(/"[^"]*"|'[^']*'|\S+/g);
  if (!matches) return [];
  return matches.map((m) => {
    if ((m.startsWith('"') && m.endsWith('"')) || (m.startsWith("'") && m.endsWith("'"))) {
      return m.slice(1, -1);
    }
    return m;
  });
}

