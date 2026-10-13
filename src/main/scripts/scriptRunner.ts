import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn, execFile, ChildProcess } from 'child_process';
import { app, Notification, BrowserWindow } from 'electron';
import * as pty from 'node-pty';
import {
  QueueItem,
  RunnerState,
  RunnerStatus,
  HistoryRecord,
  ScriptRunnerSettings,
} from '../../shared/scriptRunnerTypes';
import { scriptsStore } from './scriptsStore';
import { interpreterDetector } from './interpreterDetector';
import { settingsStore } from '../settingsStore';
import { logger } from '../logger';

const DEFAULT_RUNNER_SETTINGS: ScriptRunnerSettings = {
  defaultOnFailure: 'stop',
  defaultTimeoutSeconds: 0,
  logRetentionCount: 50,
  notificationsEnabled: true,
  preferPwsh: true,
};

function getRunnerSettings(): ScriptRunnerSettings {
  try {
    const s = settingsStore.get();
    if (s && s.scriptRunner) {
      return {
        defaultOnFailure: s.scriptRunner.defaultOnFailure ?? DEFAULT_RUNNER_SETTINGS.defaultOnFailure,
        defaultTimeoutSeconds: s.scriptRunner.defaultTimeoutSeconds ?? DEFAULT_RUNNER_SETTINGS.defaultTimeoutSeconds,
        logRetentionCount: s.scriptRunner.logRetentionCount ?? DEFAULT_RUNNER_SETTINGS.logRetentionCount,
        notificationsEnabled: s.scriptRunner.notificationsEnabled ?? DEFAULT_RUNNER_SETTINGS.notificationsEnabled,
        preferPwsh: s.scriptRunner.preferPwsh ?? DEFAULT_RUNNER_SETTINGS.preferPwsh,
      };
    }
  } catch {}
  return DEFAULT_RUNNER_SETTINGS;
}

// Regex to detect sensitive environment variable names
const SENSITIVE_KEY_REGEX = /(?:password|secret|token|api_?key|auth|credential|private_?key)/i;

/**
 * Masks sensitive environment variable values for display/logging.
 */
export function maskSensitiveEnv(env: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      sanitized[key] = '********';
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Ring buffer to retain live output up to maxBytes (default 2MB)
 */
export class ScriptOutputBuffer {
  private chunks: string[] = [];
  private totalLength = 0;
  private readonly maxBytes: number;

  constructor(maxBytes: number = 2 * 1024 * 1024) {
    this.maxBytes = maxBytes;
  }

  public write(chunk: string): void {
    if (!chunk) return;
    this.chunks.push(chunk);
    this.totalLength += chunk.length;

    while (this.totalLength > this.maxBytes && this.chunks.length > 1) {
      const removed = this.chunks.shift();
      if (removed) {
        this.totalLength -= removed.length;
      }
    }
  }

  public getAll(): string {
    return this.chunks.join('');
  }

  public clear(): void {
    this.chunks = [];
    this.totalLength = 0;
  }
}

export class ScriptRunner {
  private status: RunnerStatus = 'idle';
  private activeQueueId: string | null = null;
  private queue: QueueItem[] = [];

  // Currently running process tracking
  private activeProcess: ChildProcess | pty.IPty | null = null;
  private activePid: number | null = null;
  private activeTimeoutTimer: NodeJS.Timeout | null = null;
  private activeRetryTimer: NodeJS.Timeout | null = null;
  private activeLogPath: string | null = null;
  private activeLogStream: fs.WriteStream | null = null;
  private activeBuffer: ScriptOutputBuffer = new ScriptOutputBuffer();
  private activeRunId: string | null = null;
  private activeTempScriptFile: string | null = null;

  // Listeners for UI state updates
  private stateListeners: Set<(state: RunnerState) => void> = new Set();
  private outputListeners: Set<(data: { queueId: string; chunk: string; full: string }) => void> = new Set();

  constructor() {
    // Ensure logs directory exists
    try {
      const logsDir = this.getLogsDir();
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
    } catch {
      // ignore
    }
  }

  private getLogsDir(): string {
    try {
      return path.join(app.getPath('userData'), 'logs');
    } catch {
      return path.join(os.tmpdir(), 'terminal-manager-logs');
    }
  }

  public getActiveProcess(): ChildProcess | pty.IPty | null {
    return this.activeProcess;
  }

  public getActiveLogPath(): string | null {
    return this.activeLogPath;
  }

  public getState(): RunnerState {
    return {
      status: this.status,
      activeQueueId: this.activeQueueId,
      queue: this.queue.map((item) => ({ ...item })),
    };
  }

  public onStateChange(listener: (state: RunnerState) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  public onOutput(listener: (data: { queueId: string; chunk: string; full: string }) => void): () => void {
    this.outputListeners.add(listener);
    return () => this.outputListeners.delete(listener);
  }

  private emitState(): void {
    const state = this.getState();
    for (const listener of this.stateListeners) {
      try {
        listener(state);
      } catch (err) {
        logger.error('[ScriptRunner] Error in state listener:', err);
      }
    }
    // Broadcast to all open Electron windows
    try {
      const wins = BrowserWindow.getAllWindows();
      for (const win of wins) {
        if (!win.isDestroyed()) {
          win.webContents.send('scripts:runner-state', state);
        }
      }
    } catch {
      // ignore
    }
  }

  private emitOutput(queueId: string, chunk: string): void {
    this.activeBuffer.write(chunk);
    const full = this.activeBuffer.getAll();
    const payload = { queueId, chunk, full };

    for (const listener of this.outputListeners) {
      try {
        listener(payload);
      } catch (err) {
        logger.error('[ScriptRunner] Error in output listener:', err);
      }
    }

    try {
      const wins = BrowserWindow.getAllWindows();
      for (const win of wins) {
        if (!win.isDestroyed()) {
          win.webContents.send('scripts:output', payload);
        }
      }
    } catch {
      // ignore
    }
  }

  public getLiveOutput(queueId?: string): string {
    if (!queueId || queueId === this.activeQueueId) {
      return this.activeBuffer.getAll();
    }
    // If requesting output for a historical item in queue
    const item = this.queue.find((q) => q.queueId === queueId);
    if (item?.logPath && fs.existsSync(item.logPath)) {
      try {
        return fs.readFileSync(item.logPath, 'utf8');
      } catch {
        return '';
      }
    }
    return '';
  }

  public getQueueItemLogs(queueId?: string): string {
    return this.getLiveOutput(queueId);
  }

  // =========================================================================
  // Queue Management
  // =========================================================================

  /**
   * Adds scripts or custom queue items to the queue.
   * If a queue is currently running, appends as default.
   */
  public enqueue(
    items: Array<Partial<QueueItem> & { scriptId: string }>,
    startImmediately = true
  ): { addedCount: number; message: string } {
    const newItems: QueueItem[] = [];

    for (const it of items) {
      const def = scriptsStore.getScript(it.scriptId);
      if (!def && !it.content && !it.filePath) continue;

      const queueId = `q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const settings = getRunnerSettings();

      const queueItem: QueueItem = {
        queueId,
        scriptId: it.scriptId,
        scriptName: it.scriptName || def?.name || 'Untitled Script',
        type: it.type || def?.type || 'powershell',
        source: it.source || def?.source || 'inline',
        content: it.content !== undefined ? it.content : def?.content,
        filePath: it.filePath !== undefined ? it.filePath : def?.filePath,
        args: it.args ? [...it.args] : (def?.args ? [...def.args] : []),
        cwd: it.cwd || def?.cwd,
        env: { ...(def?.env || {}), ...(it.env || {}) },
        interpreterOverride: it.interpreterOverride || def?.interpreterOverride,
        timeoutSeconds: it.timeoutSeconds !== undefined ? it.timeoutSeconds : (def?.timeoutSeconds ?? settings.defaultTimeoutSeconds),
        visibility: it.visibility || def?.visibility || 'hidden',
        onFailure: it.onFailure || def?.onFailure || settings.defaultOnFailure,
        retryCount: it.retryCount !== undefined ? it.retryCount : (def?.retryCount ?? 2),
        retryDelaySeconds: it.retryDelaySeconds !== undefined ? it.retryDelaySeconds : (def?.retryDelaySeconds ?? 3),
        retryAttempt: 0,
        status: 'waiting',
      };

      newItems.push(queueItem);
    }

    if (newItems.length === 0) {
      return { addedCount: 0, message: 'No valid scripts to enqueue.' };
    }

    const wasRunning = this.status === 'running';
    this.queue.push(...newItems);
    this.emitState();

    let message = `Added ${newItems.length} item(s) to queue.`;
    if (wasRunning) {
      message += ' Appended to the running queue.';
    } else if (startImmediately) {
      this.startQueue();
    }

    return { addedCount: newItems.length, message };
  }

  /**
   * Loads a saved sequence and enqueues all its scripts.
   */
  public loadSequence(sequenceId: string, runImmediately = true): boolean {
    const seq = scriptsStore.getSequence(sequenceId);
    if (!seq) {
      logger.warn(`[ScriptRunner] Sequence not found: ${sequenceId}`);
      return false;
    }

    const items = seq.scriptIds
      .map((id) => ({ scriptId: id }))
      .filter((it) => !!scriptsStore.getScript(it.scriptId));

    if (items.length === 0) {
      logger.warn(`[ScriptRunner] Sequence "${seq.name}" has no valid scripts.`);
      return false;
    }

    this.enqueue(items, runImmediately);
    return true;
  }

  /**
   * Reorders waiting items in queue. Running item cannot be moved.
   */
  public reorderQueue(orderedQueueIds: string[]): boolean {
    if (this.status === 'running' && this.activeQueueId) {
      // Keep running item at position 0
      const activeIdx = orderedQueueIds.indexOf(this.activeQueueId);
      if (activeIdx > 0) {
        orderedQueueIds.splice(activeIdx, 1);
        orderedQueueIds.unshift(this.activeQueueId);
      }
    }

    const itemMap = new Map(this.queue.map((i) => [i.queueId, i]));
    const reordered: QueueItem[] = [];

    for (const qid of orderedQueueIds) {
      const found = itemMap.get(qid);
      if (found) {
        reordered.push(found);
        itemMap.delete(qid);
      }
    }

    // Append any missing items
    for (const remaining of itemMap.values()) {
      reordered.push(remaining);
    }

    this.queue = reordered;
    this.emitState();
    return true;
  }

  /**
   * Removes a specific queue item (if not running).
   */
  public removeItem(queueId: string): boolean {
    if (queueId === this.activeQueueId && this.status === 'running') {
      // Must use skip or stop
      return false;
    }

    const initLen = this.queue.length;
    this.queue = this.queue.filter((q) => q.queueId !== queueId);
    if (this.queue.length !== initLen) {
      this.emitState();
      return true;
    }
    return false;
  }

  /**
   * Clears the entire queue or all non-running items.
   */
  public clearQueue(): void {
    if (this.status === 'running') {
      this.stopQueue();
    }
    this.queue = [];
    this.activeQueueId = null;
    this.activeBuffer.clear();
    this.status = 'idle';
    this.emitState();
  }

  // =========================================================================
  // Runner Controls: Start, Pause, Resume, Stop, Skip, Retry
  // =========================================================================

  public startQueue(): void {
    if (this.status === 'running') {
      logger.info('[ScriptRunner] Queue is already running.');
      return;
    }

    const nextIndex = this.queue.findIndex((q) => q.status === 'waiting');
    if (nextIndex === -1) {
      this.status = 'idle';
      this.emitState();
      return;
    }

    this.status = 'running';
    this.emitState();
    this.runNext();
  }

  public pauseQueue(): void {
    if (this.status === 'running') {
      logger.info('[ScriptRunner] Queue paused. Current item will finish, then execution will hold.');
      this.status = 'paused';
      this.emitState();
    }
  }

  public resumeQueue(): void {
    if (this.status === 'paused') {
      logger.info('[ScriptRunner] Queue resumed.');
      this.status = 'running';
      this.emitState();
      this.runNext();
    }
  }

  public stopQueue(): void {
    logger.info('[ScriptRunner] Stop requested. Cancelling running process and remaining items.');
    this.status = 'stopping';

    if (this.activeRetryTimer) {
      clearTimeout(this.activeRetryTimer);
      this.activeRetryTimer = null;
    }

    if (this.activeTimeoutTimer) {
      clearTimeout(this.activeTimeoutTimer);
      this.activeTimeoutTimer = null;
    }

    // Kill currently running process tree
    if (this.activePid) {
      this.killProcessTree(this.activePid);
    }

    // Mark current item cancelled
    if (this.activeQueueId) {
      const cur = this.queue.find((q) => q.queueId === this.activeQueueId);
      if (cur && cur.status === 'running') {
        cur.status = 'cancelled';
        cur.endTime = Date.now();
        cur.durationMs = cur.endTime - (cur.startTime || cur.endTime);
        this.recordHistory(cur, 'cancelled');
      }
    }

    // Mark all subsequent waiting items as cancelled
    for (const item of this.queue) {
      if (item.status === 'waiting') {
        item.status = 'cancelled';
      }
    }

    this.finalizeRunCleanup();
    this.status = 'idle';
    this.activeQueueId = null;
    this.emitState();

    this.sendNotification('Script Queue Stopped', 'The script execution queue was stopped.');
  }

  public skipCurrent(): void {
    if (!this.activeQueueId || this.status !== 'running') return;

    logger.info(`[ScriptRunner] Skipping current item: ${this.activeQueueId}`);
    const currentItem = this.queue.find((q) => q.queueId === this.activeQueueId);

    if (this.activeRetryTimer) {
      clearTimeout(this.activeRetryTimer);
      this.activeRetryTimer = null;
    }

    if (this.activeTimeoutTimer) {
      clearTimeout(this.activeTimeoutTimer);
      this.activeTimeoutTimer = null;
    }

    if (this.activePid) {
      this.killProcessTree(this.activePid);
    }

    if (currentItem) {
      currentItem.status = 'skipped';
      currentItem.endTime = Date.now();
      currentItem.durationMs = currentItem.endTime - (currentItem.startTime || currentItem.endTime);
      this.recordHistory(currentItem, 'cancelled', 'Skipped by user');
    }

    this.finalizeRunCleanup();
    this.emitState();

    // Advance to next item
    setTimeout(() => {
      this.runNext();
    }, 100);
  }

  public retryFailed(): void {
    // Reset all failed, cancelled, or skipped items back to waiting
    let resetCount = 0;
    for (const item of this.queue) {
      if (item.status === 'failed' || item.status === 'cancelled' || item.status === 'timed-out' || item.status === 'skipped') {
        item.status = 'waiting';
        item.retryAttempt = 0;
        item.exitCode = undefined;
        item.error = undefined;
        resetCount++;
      }
    }

    if (resetCount > 0) {
      this.startQueue();
    }
  }

  public resumeFromHere(queueId: string): void {
    const idx = this.queue.findIndex((q) => q.queueId === queueId);
    if (idx === -1) return;

    // Reset this item and all subsequent items to waiting
    for (let i = idx; i < this.queue.length; i++) {
      const item = this.queue[i];
      if (item) {
        item.status = 'waiting';
        item.retryAttempt = 0;
        item.exitCode = undefined;
        item.error = undefined;
      }
    }

    this.startQueue();
  }

  // =========================================================================
  // Core Sequential Execution Loop
  // =========================================================================

  private async runNext(): Promise<void> {
    if (this.status !== 'running') {
      return;
    }

    // Find first waiting item
    const nextItem = this.queue.find((q) => q.status === 'waiting');
    if (!nextItem) {
      // All items completed
      this.status = 'idle';
      this.activeQueueId = null;
      this.emitState();
      logger.info('[ScriptRunner] Queue execution finished.');
      this.notifyQueueFinished();
      return;
    }

    this.activeQueueId = nextItem.queueId;
    nextItem.status = 'running';
    nextItem.startTime = Date.now();
    this.activeBuffer.clear();
    this.emitState();

    await this.executeItem(nextItem);
  }

  private async executeItem(item: QueueItem): Promise<void> {
    const runId = `run-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.activeRunId = runId;

    const logPath = path.join(this.getLogsDir(), `${runId}.log`);
    item.logPath = logPath;
    this.activeLogPath = logPath;

    try {
      this.activeLogStream = fs.createWriteStream(logPath, { flags: 'a', encoding: 'utf8' });
    } catch (err) {
      logger.error(`[ScriptRunner] Failed to create log file: ${logPath}`, err);
    }

    this.logHeader(item, runId);

    // Resolve interpreter and arguments
    const settings = getRunnerSettings();
    let targetFileOrSnippet = '';

    if (item.source === 'inline') {
      targetFileOrSnippet = item.content || '';
    } else {
      const resolvedFilePath = item.filePath ? path.resolve(item.filePath) : '';
      if (!fs.existsSync(resolvedFilePath)) {
        this.handleItemExit(item, null, `Script file does not exist: "${item.filePath}"`);
        return;
      }
      targetFileOrSnippet = resolvedFilePath;
    }

    // Resolve command
    const resolved = await interpreterDetector.resolveCommand(
      item.type,
      targetFileOrSnippet,
      item.source === 'inline',
      settings.preferPwsh,
      item.interpreterOverride
    );

    if (resolved.error || !resolved.executable) {
      this.handleItemExit(item, null, resolved.error || 'Failed to resolve interpreter.');
      return;
    }

    // If inline script required a temp file (e.g. powershell/py/node scripts that need a physical file)
    if (resolved.tempFileCreated) {
      this.activeTempScriptFile = resolved.tempFileCreated;
    }

    // Combined args: resolved interpreter args + user passed arguments (array safe)
    const combinedArgs = [...resolved.args, ...(item.args || [])];

    // Resolve Working Directory
    let cwd = process.cwd();
    if (item.cwd) {
      let expandedCwd = item.cwd;
      if (expandedCwd.startsWith('~')) {
        expandedCwd = path.join(os.homedir(), expandedCwd.substring(1));
      }
      expandedCwd = path.resolve(expandedCwd);
      if (fs.existsSync(expandedCwd) && fs.statSync(expandedCwd).isDirectory()) {
        cwd = expandedCwd;
      } else {
        this.writeLog(`[WARN] Working directory "${item.cwd}" not found. Falling back to default.`);
      }
    }

    // Environment variables with masked sensitive keys logged
    const sanitizedEnv = maskSensitiveEnv(item.env || {});
    this.writeLog(`[CONFIG] Executable: ${resolved.executable}`);
    this.writeLog(`[CONFIG] Arguments: ${JSON.stringify(combinedArgs)}`);
    this.writeLog(`[CONFIG] Working Directory: ${cwd}`);
    if (Object.keys(item.env || {}).length > 0) {
      this.writeLog(`[CONFIG] Custom Env: ${JSON.stringify(sanitizedEnv)}`);
    }
    this.writeLog('--------------------------------------------------\n');

    const mergedEnv: Record<string, string> = {
      ...(process.env as Record<string, string>),
      ...item.env,
    };

    // Setup timeout timer
    if (item.timeoutSeconds && item.timeoutSeconds > 0) {
      this.activeTimeoutTimer = setTimeout(() => {
        logger.warn(`[ScriptRunner] Script timed out after ${item.timeoutSeconds}s: ${item.scriptName}`);
        this.writeLog(`\n[TIMEOUT] Script timed out after ${item.timeoutSeconds} seconds. Killing process tree.`);
        if (this.activePid) {
          this.killProcessTree(this.activePid);
        }
        item.status = 'timed-out';
        this.handleItemExit(item, null, `Timed out after ${item.timeoutSeconds}s`);
      }, item.timeoutSeconds * 1000);
    }

    // Spawn Process
    try {
      if (item.visibility === 'terminal') {
        // Run via node-pty (interactive terminal tab capable)
        const ptyProc = pty.spawn(resolved.executable, combinedArgs, {
          name: 'xterm-256color',
          cols: 80,
          rows: 24,
          cwd,
          env: mergedEnv,
          useConpty: process.platform === 'win32',
        });

        this.activeProcess = ptyProc;
        this.activePid = ptyProc.pid;

        ptyProc.onData((data: string) => {
          this.writeLog(data, false);
          this.emitOutput(item.queueId, data);
        });

        ptyProc.onExit(({ exitCode }) => {
          this.handleItemExit(item, exitCode ?? 0);
        });
      } else {
        // Run via child_process.spawn with piped stdio (hidden)
        const proc = spawn(resolved.executable, combinedArgs, {
          cwd,
          env: mergedEnv,
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        this.activeProcess = proc;
        this.activePid = proc.pid || null;

        proc.stdout?.on('data', (chunk: Buffer) => {
          const text = chunk.toString('utf8');
          this.writeLog(text, false);
          this.emitOutput(item.queueId, text);
        });

        proc.stderr?.on('data', (chunk: Buffer) => {
          const text = chunk.toString('utf8');
          this.writeLog(text, false);
          this.emitOutput(item.queueId, text);
        });

        proc.on('close', (code: number | null) => {
          this.handleItemExit(item, code);
        });

        proc.on('error', (err: Error) => {
          logger.error(`[ScriptRunner] Process spawn error for "${item.scriptName}":`, err);
          this.handleItemExit(item, null, err.message);
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[ScriptRunner] Failed to spawn "${item.scriptName}":`, msg);
      this.handleItemExit(item, null, msg);
    }
  }

  /**
   * Called when a queue item process has exited.
   * STRICT ORDERING: Evaluates exit code, handles retry/policy, and only THEN moves to next.
   */
  private handleItemExit(item: QueueItem, exitCode: number | null, error?: string): void {
    // Prevent duplicate processing if already finalized (e.g. timeout kill followed by process close)
    if (item.status === 'succeeded' || item.status === 'cancelled') {
      return;
    }
    if (item.status === 'timed-out' && !error) {
      return;
    }

    if (this.activeTimeoutTimer) {
      clearTimeout(this.activeTimeoutTimer);
      this.activeTimeoutTimer = null;
    }

    const now = Date.now();
    item.endTime = now;
    item.durationMs = now - (item.startTime || now);
    item.exitCode = exitCode;
    if (error) item.error = error;

    const isSuccess = exitCode === 0 && !error && item.status !== 'timed-out';

    this.writeLog(`\n--------------------------------------------------`);
    this.writeLog(`[EXIT] Process finished with exit code ${exitCode !== null ? exitCode : 'N/A'}`);
    if (error) {
      this.writeLog(`[ERROR] ${error}`);
    }

    this.finalizeRunCleanup();

    if (isSuccess) {
      item.status = 'succeeded';
      this.recordHistory(item, 'succeeded');
      this.emitState();

      // Proceed to next item in queue
      this.proceedToNext();
    } else {
      // Failure branch
      if (item.status !== 'timed-out') {
        item.status = 'failed';
      }

      // Check retry policy
      const retryLimit = item.retryCount ?? 2;
      const currentAttempt = item.retryAttempt || 0;

      if (item.onFailure === 'retry' && currentAttempt < retryLimit) {
        item.retryAttempt = currentAttempt + 1;
        const delaySec = item.retryDelaySeconds ?? 3;
        this.writeLog(`[RETRY] Retrying in ${delaySec}s (Attempt ${item.retryAttempt} of ${retryLimit})...`);
        item.status = 'waiting';
        this.emitState();

        this.activeRetryTimer = setTimeout(() => {
          this.activeRetryTimer = null;
          if (this.status === 'running') {
            this.executeItem(item);
          }
        }, delaySec * 1000);
        return;
      }

      // Record final history for failure
      this.recordHistory(
        item,
        item.status === 'timed-out' ? 'timed-out' : 'failed',
        error || `Failed with exit code ${exitCode}`
      );
      this.emitState();

      // Policy decision: Stop vs Continue
      if (item.onFailure === 'continue') {
        logger.info(`[ScriptRunner] Script failed but onFailure is 'continue'. Advancing queue.`);
        this.proceedToNext();
      } else {
        // Default: 'stop'
        logger.warn(`[ScriptRunner] Script "${item.scriptName}" failed. Stopping remaining queue.`);
        // Mark subsequent waiting items as skipped
        let foundSelf = false;
        for (const q of this.queue) {
          if (q.queueId === item.queueId) {
            foundSelf = true;
            continue;
          }
          if (foundSelf && q.status === 'waiting') {
            q.status = 'skipped';
          }
        }
        this.status = 'idle';
        this.activeQueueId = null;
        this.emitState();

        this.sendNotification(
          'Script Execution Failed',
          `"${item.scriptName}" failed with code ${exitCode}. Queue halted.`
        );
      }
    }
  }

  private proceedToNext(): void {
    if (this.status === 'paused') {
      logger.info('[ScriptRunner] Queue is paused. Holding before next item.');
      this.activeQueueId = null;
      this.emitState();
      return;
    }

    if (this.status === 'running') {
      // Small tick to ensure clean process teardown before next starts
      setImmediate(() => {
        this.runNext();
      });
    }
  }

  // =========================================================================
  // Process Termination & Cleanup
  // =========================================================================

  /**
   * Kills the entire process tree on Windows via taskkill /PID <pid> /T /F
   */
  public killProcessTree(pid: number): void {
    if (!pid) return;

    if (process.platform === 'win32') {
      execFile('taskkill', ['/PID', String(pid), '/T', '/F'], (err) => {
        if (err) {
          logger.warn(`[ScriptRunner] taskkill notice for PID ${pid}: ${err.message}`);
        } else {
          logger.info(`[ScriptRunner] Killed process tree for PID ${pid}`);
        }
      });
    } else {
      try {
        process.kill(-pid, 'SIGKILL');
      } catch {
        try {
          process.kill(pid, 'SIGKILL');
        } catch {}
      }
    }
  }

  private finalizeRunCleanup(): void {
    this.activeProcess = null;
    this.activePid = null;

    if (this.activeLogStream) {
      try {
        this.activeLogStream.end();
      } catch {}
      this.activeLogStream = null;
    }

    // Clean up temporary script file if generated
    if (this.activeTempScriptFile && fs.existsSync(this.activeTempScriptFile)) {
      try {
        fs.unlinkSync(this.activeTempScriptFile);
      } catch {}
      this.activeTempScriptFile = null;
    }

    // Manage log retention
    this.enforceLogRetention();
  }

  private writeLog(text: string, withTimestamp = true): void {
    const formatted = withTimestamp
      ? `[${new Date().toISOString()}] ${text}\n`
      : text;

    if (this.activeLogStream && !this.activeLogStream.destroyed) {
      try {
        this.activeLogStream.write(formatted);
      } catch {}
    }
  }

  private logHeader(item: QueueItem, runId: string): void {
    this.writeLog(`==================================================`);
    this.writeLog(`RUN ID:    ${runId}`);
    this.writeLog(`SCRIPT:    ${item.scriptName} (${item.type})`);
    this.writeLog(`STARTED:   ${new Date().toISOString()}`);
    this.writeLog(`POLICY:    onFailure=${item.onFailure}, timeout=${item.timeoutSeconds}s`);
    this.writeLog(`==================================================\n`);
  }

  private recordHistory(
    item: QueueItem,
    status: 'succeeded' | 'failed' | 'cancelled' | 'timed-out',
    error?: string
  ): void {
    const record: HistoryRecord = {
      id: this.activeRunId || `run-${Date.now()}`,
      queueId: item.queueId,
      scriptId: item.scriptId,
      scriptName: item.scriptName,
      type: item.type,
      startTime: item.startTime || Date.now(),
      endTime: item.endTime || Date.now(),
      durationMs: item.durationMs || 0,
      exitCode: item.exitCode ?? null,
      status,
      logPath: item.logPath || '',
      error: error || item.error,
    };
    scriptsStore.addHistoryRecord(record);
  }

  private enforceLogRetention(): void {
    try {
      const settings = getRunnerSettings();
      const maxLogs = settings.logRetentionCount || 50;
      const logsDir = this.getLogsDir();
      if (!fs.existsSync(logsDir)) return;

      const files = fs.readdirSync(logsDir).filter((f) => f.endsWith('.log'));
      if (files.length > maxLogs) {
        const sorted = files
          .map((f) => ({
            name: f,
            time: fs.statSync(path.join(logsDir, f)).mtimeMs,
          }))
          .sort((a, b) => b.time - a.time);

        const toDelete = sorted.slice(maxLogs);
        for (const file of toDelete) {
          try {
            fs.unlinkSync(path.join(logsDir, file.name));
          } catch {}
        }
      }
    } catch (err) {
      logger.warn('[ScriptRunner] Error enforcing log retention:', err);
    }
  }

  private notifyQueueFinished(): void {
    const successCount = this.queue.filter((q) => q.status === 'succeeded').length;
    const failCount = this.queue.filter((q) => q.status === 'failed' || q.status === 'timed-out').length;
    const total = this.queue.length;

    const title = failCount > 0 ? 'Script Queue Completed with Errors' : 'Script Queue Finished';
    const body = `${successCount} of ${total} succeeded${failCount > 0 ? `, ${failCount} failed` : ''}.`;

    this.sendNotification(title, body);
  }

  private sendNotification(title: string, body: string): void {
    try {
      const settings = getRunnerSettings();
      if (!settings.notificationsEnabled) return;

      const iconPath = path.join(__dirname, '../../build/icons/icon.png');
      const icon = fs.existsSync(iconPath) ? iconPath : undefined;

      if (typeof Notification !== 'undefined' && Notification?.isSupported?.()) {
        const notif = new Notification({
          title,
          body,
          icon,
        });
        notif.show();
      }
    } catch (err) {
      logger.warn('[ScriptRunner] Failed to send native notification:', err);
    }
  }

  /**
   * Called during application shutdown to gracefully cancel active runner.
   */
  public handleAppQuit(): void {
    if (this.status === 'running') {
      logger.info('[ScriptRunner] App quitting. Stopping runner.');
      this.stopQueue();
    }
  }
}

export const scriptRunner = new ScriptRunner();
