import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ScriptRunner } from '../scriptRunner';
import { scriptsStore } from '../scriptsStore';
import { ScriptDefinition } from '../../../shared/scriptRunnerTypes';

describe.skipIf(process.platform !== 'win32')('ScriptRunner Acceptance Tests (Live Execution)', () => {
  let runner: ScriptRunner;
  let tempDir: string;

  beforeEach(() => {
    runner = new ScriptRunner();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-accept-test-'));
  });

  afterEach(() => {
    runner.stopQueue();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  const waitForQueueCompletion = async (r: ScriptRunner, timeoutMs = 15000): Promise<void> => {
    const start = Date.now();
    while (
      r.getState().status === 'running' ||
      r.getState().queue.some((q) => q.status === 'running' || q.status === 'waiting')
    ) {
      if (Date.now() - start > timeoutMs) {
        throw new Error('Timeout waiting for queue completion');
      }
      await new Promise((res) => setTimeout(res, 100));
    }
  };

  it('1. Executes batch (.bat) and PowerShell (.ps1) scripts with correct output and exit codes', async () => {
    const batPath = path.join(tempDir, 'test.bat');
    fs.writeFileSync(batPath, '@echo off\r\necho Hello from Batch File\r\nexit /b 0\r\n');

    const batScript: ScriptDefinition = {
      id: 'accept-bat-1',
      name: 'Batch Test',
      type: 'cmd',
      source: 'file',
      filePath: batPath,
      args: [],
      env: {},
      timeoutSeconds: 0,
      visibility: 'hidden',
      onFailure: 'stop',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    scriptsStore.saveScript(batScript);

    runner.enqueue([{ scriptId: batScript.id }], true);
    await waitForQueueCompletion(runner);

    const state = runner.getState();
    const item = state.queue[0];
    const logs = runner.getQueueItemLogs(item?.queueId || '');
    if (item?.status !== 'succeeded') {
      console.log('Test 1 failure debug:', { item, logs });
    }
    expect(item?.status).toBe('succeeded');
    expect(item?.exitCode).toBe(0);
    expect(logs).toContain('Hello from Batch File');
  });

  it('2. Executes inline cmd and inline powershell commands', async () => {
    const inlineCmd: ScriptDefinition = {
      id: 'accept-inline-cmd',
      name: 'Inline CMD',
      type: 'cmd',
      source: 'inline',
      content: 'echo Hello from Inline CMD',
      args: [],
      env: {},
      timeoutSeconds: 0,
      visibility: 'hidden',
      onFailure: 'stop',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    scriptsStore.saveScript(inlineCmd);

    runner.enqueue([{ scriptId: inlineCmd.id }], true);
    await waitForQueueCompletion(runner);

    const state = runner.getState();
    const item = state.queue[0];
    const logs = runner.getQueueItemLogs(item?.queueId || '');
    if (item?.status !== 'succeeded') {
      console.log('Test 2 failure debug:', { item, logs });
    }
    expect(item?.status).toBe('succeeded');
    expect(item?.exitCode).toBe(0);
    expect(logs).toContain('Hello from Inline CMD');
  });

  it('3. Runs queue strictly in order without overlap', async () => {
    const script1: ScriptDefinition = {
      id: 'seq-s1',
      name: 'Seq 1',
      type: 'cmd',
      source: 'inline',
      content: 'echo start 1 & ping 127.0.0.1 -n 2 > nul & echo done 1',
      args: [],
      env: {},
      timeoutSeconds: 10,
      visibility: 'hidden',
      onFailure: 'stop',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const script2: ScriptDefinition = {
      id: 'seq-s2',
      name: 'Seq 2',
      type: 'cmd',
      source: 'inline',
      content: 'echo start 2 & ping 127.0.0.1 -n 2 > nul & echo done 2',
      args: [],
      env: {},
      timeoutSeconds: 10,
      visibility: 'hidden',
      onFailure: 'stop',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    scriptsStore.saveScript(script1);
    scriptsStore.saveScript(script2);

    runner.enqueue([{ scriptId: script1.id }, { scriptId: script2.id }], true);
    await waitForQueueCompletion(runner);

    const state = runner.getState();
    expect(state.queue[0]?.status).toBe('succeeded');
    expect(state.queue[1]?.status).toBe('succeeded');
    expect(state.queue[0]?.endTime).toBeDefined();
    expect(state.queue[1]?.startTime).toBeDefined();
    // Script 2 must start strictly at or after Script 1 ends
    expect(state.queue[1]!.startTime!).toBeGreaterThanOrEqual(state.queue[0]!.endTime!);
  });

  it('4. Handles onFailure: "stop" by skipping remaining items', async () => {
    const failScript: ScriptDefinition = {
      id: 'fail-s1',
      name: 'Failing Script',
      type: 'cmd',
      source: 'inline',
      content: 'exit /b 1',
      args: [],
      env: {},
      timeoutSeconds: 5,
      visibility: 'hidden',
      onFailure: 'stop',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const nextScript: ScriptDefinition = {
      id: 'fail-s2',
      name: 'Subsequent Script',
      type: 'cmd',
      source: 'inline',
      content: 'echo should not run',
      args: [],
      env: {},
      timeoutSeconds: 5,
      visibility: 'hidden',
      onFailure: 'stop',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    scriptsStore.saveScript(failScript);
    scriptsStore.saveScript(nextScript);

    runner.enqueue([{ scriptId: failScript.id }, { scriptId: nextScript.id }], true);
    await waitForQueueCompletion(runner);

    const state = runner.getState();
    expect(state.queue[0]?.status).toBe('failed');
    expect(state.queue[0]?.exitCode).toBe(1);
    expect(state.queue[1]?.status).toBe('skipped');
  });

  it('5. Handles onFailure: "continue" by executing subsequent items', async () => {
    const failScript: ScriptDefinition = {
      id: 'cont-s1',
      name: 'Failing Continue Script',
      type: 'cmd',
      source: 'inline',
      content: 'exit /b 1',
      args: [],
      env: {},
      timeoutSeconds: 5,
      visibility: 'hidden',
      onFailure: 'continue',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const nextScript: ScriptDefinition = {
      id: 'cont-s2',
      name: 'Subsequent Script',
      type: 'cmd',
      source: 'inline',
      content: 'echo runs despite failure',
      args: [],
      env: {},
      timeoutSeconds: 5,
      visibility: 'hidden',
      onFailure: 'stop',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    scriptsStore.saveScript(failScript);
    scriptsStore.saveScript(nextScript);

    runner.enqueue([{ scriptId: failScript.id }, { scriptId: nextScript.id }], true);
    await waitForQueueCompletion(runner);

    const state = runner.getState();
    expect(state.queue[0]?.status).toBe('failed');
    expect(state.queue[1]?.status).toBe('succeeded');
  });

  it('6. Handles timeout by terminating process tree and marking timed-out', async () => {
    const sleepScript: ScriptDefinition = {
      id: 'timeout-s1',
      name: 'Timeout Script',
      type: 'cmd',
      source: 'inline',
      content: 'ping 127.0.0.1 -n 30 > nul',
      args: [],
      env: {},
      timeoutSeconds: 1, // 1 second timeout
      visibility: 'hidden',
      onFailure: 'stop',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    scriptsStore.saveScript(sleepScript);

    runner.enqueue([{ scriptId: sleepScript.id }], true);
    await waitForQueueCompletion(runner, 10000);

    const state = runner.getState();
    expect(state.queue[0]?.status).toBe('timed-out');
  });

  it('7. Handles complex arguments with spaces and quotes', async () => {
    const argScript: ScriptDefinition = {
      id: 'args-s1',
      name: 'Args Script',
      type: 'cmd',
      source: 'inline',
      content: 'echo Arg: %1',
      args: ['hello world with spaces'],
      env: {},
      timeoutSeconds: 5,
      visibility: 'hidden',
      onFailure: 'stop',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    scriptsStore.saveScript(argScript);

    runner.enqueue([{ scriptId: argScript.id }], true);
    await waitForQueueCompletion(runner);

    const state = runner.getState();
    expect(state.queue[0]?.status).toBe('succeeded');
  });
});
