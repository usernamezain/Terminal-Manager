import { z } from 'zod';

export const ShellExperienceModeSchema = z.enum(['app-scoped', 'system-wide']);
export type ShellExperienceMode = z.infer<typeof ShellExperienceModeSchema>;

export const PsReadLineColorsSchema = z.object({
  Command: z.string().default('#87CEEB'),
  Parameter: z.string().default('#98FB98'),
  Operator: z.string().default('#FFB6C1'),
  Variable: z.string().default('#DDA0DD'),
  String: z.string().default('#FFDAB9'),
  Number: z.string().default('#B0E0E6'),
  Type: z.string().default('#F0E68C'),
  Comment: z.string().default('#D3D3D3'),
  Keyword: z.string().default('#8367c7'),
  Error: z.string().default('#FF6347'),
  Member: z.string().default('#B5CEA8'),
  Default: z.string().default('#CCCCCC'),
  Emphasis: z.string().default('#4EC9B0'),
  InlinePrediction: z.string().default('#666666'),
  ListPrediction: z.string().default('#999999'),
  ListPredictionSelected: z.string().default('#007ACC'),
  Selection: z.string().default('#264F78'),
});
export type PsReadLineColors = z.infer<typeof PsReadLineColorsSchema>;

export const KeybindingItemSchema = z.object({
  chord: z.string(),
  function: z.string(),
  description: z.string().optional(),
});
export type KeybindingItem = z.infer<typeof KeybindingItemSchema>;

export const CustomAliasItemSchema = z.object({
  name: z.string(),
  value: z.string(),
  isFunction: z.boolean().default(false),
  body: z.string().optional(),
  description: z.string().optional(),
});
export type CustomAliasItem = z.infer<typeof CustomAliasItemSchema>;

export const IconOverrideSchema = z.object({
  target: z.string(),
  icon: z.string(),
  color: z.string(),
});
export type IconOverride = z.infer<typeof IconOverrideSchema>;

export const ShellExperienceSettingsSchema = z.object({
  version: z.number().default(1),
  mode: ShellExperienceModeSchema.default('app-scoped'),
  activeTheme: z.string().default('cobalt2'),
  colors: PsReadLineColorsSchema.default({}),
  icons: z.object({
    enabled: z.boolean().default(true),
    colorTheme: z.string().default('Default'),
    iconTheme: z.string().default('Default'),
    customOverrides: z.array(IconOverrideSchema).default([]),
  }).default({}),
  prediction: z.object({
    predictionSource: z.enum(['None', 'History', 'Plugin', 'HistoryAndPlugin']).default('HistoryAndPlugin'),
    viewStyle: z.enum(['InlineView', 'ListView']).default('ListView'),
    maximumHistoryCount: z.number().default(10000),
    historyNoDuplicates: z.boolean().default(true),
    bellStyle: z.enum(['None', 'Audible', 'Visual']).default('None'),
    editMode: z.enum(['Windows', 'Emacs', 'Vi']).default('Windows'),
    sensitiveFilters: z.array(z.string()).default(['password', 'secret', 'token', 'apikey', 'connectionstring']),
  }).default({}),
  keybindings: z.array(KeybindingItemSchema).default([
    { chord: 'UpArrow', function: 'HistorySearchBackward', description: 'Search backward in history' },
    { chord: 'DownArrow', function: 'HistorySearchForward', description: 'Search forward in history' },
    { chord: 'Tab', function: 'MenuComplete', description: 'Tab menu completion' },
    { chord: 'Ctrl+d', function: 'DeleteChar', description: 'Delete character' },
    { chord: 'Ctrl+w', function: 'BackwardDeleteWord', description: 'Delete previous word' },
    { chord: 'Alt+d', function: 'DeleteWord', description: 'Delete word' },
    { chord: 'Ctrl+LeftArrow', function: 'BackwardWord', description: 'Move backward word' },
    { chord: 'Ctrl+RightArrow', function: 'ForwardWord', description: 'Move forward word' },
    { chord: 'Ctrl+z', function: 'Undo', description: 'Undo edit' },
    { chord: 'Ctrl+y', function: 'Redo', description: 'Redo edit' },
  ]),
  disabledCommands: z.array(z.string()).default([]),
  customAliases: z.array(CustomAliasItemSchema).default([]),
  customEnvVars: z.record(z.string()).default({}),
  editor: z.string().default('auto'),
  showHelpOnLaunch: z.boolean().default(false),
  startupInput: z.string().default(''),
  tools: z.object({
    zoxideEnabled: z.boolean().default(true),
    zoxideCmd: z.string().default('z'),
    ohMyPoshEnabled: z.boolean().default(true),
    importChocolatey: z.boolean().default(true),
  }).default({}),
  advanced: z.object({
    fastStart: z.boolean().default(true),
    debugOverride: z.boolean().default(false),
    updateIntervalDays: z.number().default(7),
    rawUserCode: z.string().default(''),
  }).default({}),
});

export type ShellExperienceSettings = z.infer<typeof ShellExperienceSettingsSchema>;

export interface DependencyItemStatus {
  id: 'pwsh' | 'ohmyposh' | 'zoxide' | 'terminalicons' | 'nerdfont';
  name: string;
  installed: boolean;
  version?: string;
  path?: string;
  commandRequired: string;
  details?: string;
}

export interface ShellExperienceStatus {
  mode: ShellExperienceMode;
  profileLoaded: boolean;
  profilePath: string;
  customScriptPath: string;
  repoHash: string;
  repoDate: string;
  pinnedCommit?: string;
  dependencies: DependencyItemStatus[];
  measuredLoadTimeMs?: number;
}

export interface ProgressEventPayload {
  step: string;
  label: string;
  state: 'running' | 'done' | 'error';
  detail?: string;
}

export interface UpstreamCommandInfo {
  name: string;
  alias?: string;
  description: string;
  category: 'Git' | 'File' | 'Process' | 'System' | 'Profile' | 'WinUtil' | 'Navigation';
  defaultEnabled: boolean;
}

export interface ThemeInfo {
  name: string;
  path: string;
  isCustom: boolean;
}
