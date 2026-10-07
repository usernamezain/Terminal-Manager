import { z } from 'zod';

export const CustomTweakSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(''),
  category: z.string().default('Custom'),
  script: z.string().min(1),
  undoScript: z.string().optional(),
});

export const CustomAppSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  winget: z.string().optional(),
  choco: z.string().optional(),
});

export const CustomizationSchema = z.object({
  v: z.literal(1).default(1),
  branding: z.object({
    productName: z.string().default('System Tools'),
    windowTitle: z.string().default('System Tools'),
    headerText: z.string().default('System Tools - Windows Maintenance'),
    aboutText: z.string().default('Customized Windows Maintenance Utility'),
    versionLabel: z.string().default('1.0.0'),
    stringReplacements: z.array(z.object({
      search: z.string(),
      replace: z.string(),
    })).default([]),
    iconPath: z.string().optional(),
    colors: z.object({
      accent: z.string().default('#6C8CFF'),
      primary: z.string().default('#2B303C'),
      background: z.string().default('#1E222B'),
      foreground: z.string().default('#F0F4F8'),
      fontFamily: z.string().default('Segoe UI'),
    }).default({}),
    windowWidth: z.number().int().min(400).max(3840).default(1000),
    windowHeight: z.number().int().min(300).max(2160).default(700),
  }).default({}),
  hide: z.object({
    tabs: z.array(z.string()).default([]),
    categories: z.array(z.string()).default([]),
    tweaks: z.array(z.string()).default([]),
    apps: z.array(z.string()).default([]),
  }).default({}),
  add: z.object({
    tweaks: z.array(CustomTweakSchema).default([]),
    apps: z.array(CustomAppSchema).default([]),
  }).default({}),
  advanced: z.object({
    customPatches: z.array(z.string()).default([]),
  }).default({}),
});

export type CustomizationConfig = z.infer<typeof CustomizationSchema>;

export interface PatchInfo {
  id: string;
  filename: string;
  title: string;
  description: string;
  applied: boolean;
  required: boolean;
}

export interface SystemToolsStatus {
  isSupportedPlatform: boolean; // Windows only
  toolsDir?: string;
  upstreamExists: boolean;
  upstreamCommitHash?: string;
  upstreamCommitDate?: string;
  isPinned: boolean;
  pinnedRef?: string;
  devBranch: boolean;
  buildExists: boolean;
  buildScriptHash?: string;
  lastBuildTime?: string;
  patches: PatchInfo[];
  failedPatch?: string;
  buildFallbackUsed?: 'last-good' | 'unpatched-upstream';
  forbiddenScanClean?: boolean;
  forbiddenScanReport?: {
    totalMatches: number;
    filesScanned: number;
    removalsCount: number;
  };
}

export interface BuildProgressEvent {
  step: 'clone' | 'patch' | 'customize' | 'compile' | 'ready';
  label: string;
  state: 'running' | 'done' | 'error';
  detail?: string;
}

export interface LaunchToolsArgs {
  confirmed: boolean;
  restorePoint?: boolean;
  showTerminal?: boolean;
  closeOnExit?: boolean;
}

export interface RemovalsReportEntry {
  file: string;
  removedItems: string[];
}

export interface TransformReportEntry {
  anchor: string;
  matched: boolean;
  result: string;
}
