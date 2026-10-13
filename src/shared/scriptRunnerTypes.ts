export type ScriptType =
  | 'powershell'
  | 'cmd'
  | 'node'
  | 'typescript'
  | 'python'
  | 'bash'
  | 'vbs'
  | 'command';

export type ScriptSource = 'inline' | 'file';

export type OnFailurePolicy = 'stop' | 'continue' | 'retry';

export type ScriptVisibility = 'hidden' | 'terminal';

export interface ScriptDefinition {
  id: string;
  name: string;
  description?: string;
  type: ScriptType;
  source: ScriptSource;
  content?: string;
  filePath?: string;
  args: string[];
  cwd?: string;
  env: Record<string, string>;
  interpreterOverride?: string;
  timeoutSeconds: number; // 0 = none
  visibility: ScriptVisibility;
  onFailure: OnFailurePolicy;
  retryCount?: number; // default 2
  retryDelaySeconds?: number; // default 3
  isImported?: boolean;
  hasApprovedRun?: boolean; // first-run confirmation for imported scripts
  createdAt: number;
  updatedAt: number;
}

export interface ScriptSequence {
  id: string;
  name: string;
  description?: string;
  scriptIds: string[];
  runOnAppStart?: boolean;
  createdAt: number;
  updatedAt: number;
}

export type QueueItemStatus =
  | 'waiting'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'skipped'
  | 'cancelled'
  | 'timed-out';

export interface QueueItem {
  queueId: string;
  scriptId: string;
  scriptName: string;
  type: ScriptType;
  source: ScriptSource;
  content?: string;
  filePath?: string;
  args: string[];
  cwd?: string;
  env: Record<string, string>;
  interpreterOverride?: string;
  timeoutSeconds: number;
  visibility: ScriptVisibility;
  onFailure: OnFailurePolicy;
  retryCount?: number;
  retryDelaySeconds?: number;
  retryAttempt?: number;
  status: QueueItemStatus;
  exitCode?: number | null;
  startTime?: number;
  endTime?: number;
  durationMs?: number;
  logPath?: string;
  error?: string;
}

export type RunnerStatus = 'idle' | 'running' | 'paused' | 'stopping';

export interface RunnerState {
  status: RunnerStatus;
  activeQueueId: string | null;
  queue: QueueItem[];
}

export interface HistoryRecord {
  id: string; // runId
  queueId: string;
  scriptId: string;
  scriptName: string;
  type: ScriptType;
  startTime: number;
  endTime: number;
  durationMs: number;
  exitCode: number | null;
  status: 'succeeded' | 'failed' | 'cancelled' | 'timed-out';
  logPath: string;
  error?: string;
}

export interface InterpreterInfo {
  id: string;
  name: string;
  found: boolean;
  path?: string;
  version?: string;
  hint?: string;
}

export interface ScriptRunnerSettings {
  defaultOnFailure: OnFailurePolicy;
  defaultTimeoutSeconds: number;
  logRetentionCount: number;
  notificationsEnabled: boolean;
  preferPwsh: boolean;
}
