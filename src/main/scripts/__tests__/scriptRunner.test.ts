import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  maskSensitiveEnv,
  ScriptOutputBuffer,
  ScriptRunner,
} from '../scriptRunner';
import { scriptsStore } from '../scriptsStore';

describe('ScriptRunner & Utilities Unit Tests', () => {
  describe('maskSensitiveEnv', () => {
    it('should mask sensitive environment variables and preserve safe ones', () => {
      const rawEnv = {
        NODE_ENV: 'production',
        APP_PORT: '3000',
        API_KEY: 'secret12345',
        db_password: 'supersecretpassword',
        AUTH_TOKEN: 'bearer-xyz-987',
        SAFE_SETTING: 'true',
      };

      const masked = maskSensitiveEnv(rawEnv);
      expect(masked.NODE_ENV).toBe('production');
      expect(masked.APP_PORT).toBe('3000');
      expect(masked.SAFE_SETTING).toBe('true');
      expect(masked.API_KEY).toBe('********');
      expect(masked.db_password).toBe('********');
      expect(masked.AUTH_TOKEN).toBe('********');
    });
  });

  describe('ScriptOutputBuffer', () => {
    it('should buffer chunks and return joined string', () => {
      const buf = new ScriptOutputBuffer(1024);
      buf.write('Line 1\n');
      buf.write('Line 2\n');
      expect(buf.getAll()).toBe('Line 1\nLine 2\n');
    });

    it('should discard oldest chunks when exceeding maxBytes', () => {
      const buf = new ScriptOutputBuffer(25);
      buf.write('First chunk 1234567890; ');
      buf.write('Second chunk 1234567890; ');
      buf.write('Third!');
      const out = buf.getAll();
      expect(out.includes('Third!')).toBe(true);
      expect(out.includes('First chunk')).toBe(false);
    });

    it('should clear buffer on clear()', () => {
      const buf = new ScriptOutputBuffer(1024);
      buf.write('Some text');
      buf.clear();
      expect(buf.getAll()).toBe('');
    });
  });

  describe('ScriptRunner State Machine & Queue Management', () => {
    let runner: ScriptRunner;

    beforeEach(() => {
      runner = new ScriptRunner();
      // Mock scriptsStore if needed
      scriptsStore.saveScript({
        id: 'test-s1',
        name: 'Echo 1',
        type: 'command',
        source: 'inline',
        content: 'echo 1',
        args: [],
        env: {},
        timeoutSeconds: 0,
        visibility: 'hidden',
        onFailure: 'stop',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      scriptsStore.saveScript({
        id: 'test-s2',
        name: 'Echo 2',
        type: 'command',
        source: 'inline',
        content: 'echo 2',
        args: [],
        env: {},
        timeoutSeconds: 0,
        visibility: 'hidden',
        onFailure: 'stop',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      scriptsStore.saveScript({
        id: 'test-fail',
        name: 'Fail Script',
        type: 'command',
        source: 'inline',
        content: 'exit 1',
        args: [],
        env: {},
        timeoutSeconds: 0,
        visibility: 'hidden',
        onFailure: 'stop',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    afterEach(() => {
      runner.stopQueue();
      runner.clearQueue();
    });

    it('should initialize with idle state and empty queue', () => {
      const state = runner.getState();
      expect(state.status).toBe('idle');
      expect(state.activeQueueId).toBeNull();
      expect(state.queue).toEqual([]);
    });

    it('should enqueue items and maintain order', () => {
      const res = runner.enqueue(
        [{ scriptId: 'test-s1' }, { scriptId: 'test-s2' }],
        false // don't start immediately
      );

      expect(res.addedCount).toBe(2);
      const state = runner.getState();
      expect(state.queue.length).toBe(2);
      expect(state.queue[0]!.scriptId).toBe('test-s1');
      expect(state.queue[0]!.status).toBe('waiting');
      expect(state.queue[1]!.scriptId).toBe('test-s2');
      expect(state.queue[1]!.status).toBe('waiting');
    });

    it('should allow reordering waiting items', () => {
      runner.enqueue([{ scriptId: 'test-s1' }, { scriptId: 'test-s2' }], false);
      const state = runner.getState();
      const q1 = state.queue[0]!.queueId;
      const q2 = state.queue[1]!.queueId;

      runner.reorderQueue([q2, q1]);
      const newState = runner.getState();
      expect(newState.queue[0]!.queueId).toBe(q2);
      expect(newState.queue[1]!.queueId).toBe(q1);
    });

    it('should allow removing waiting items and clearing queue', () => {
      runner.enqueue([{ scriptId: 'test-s1' }, { scriptId: 'test-s2' }], false);
      const state = runner.getState();
      const q1 = state.queue[0]!.queueId;

      const removed = runner.removeItem(q1);
      expect(removed).toBe(true);
      expect(runner.getState().queue.length).toBe(1);

      runner.clearQueue();
      expect(runner.getState().queue.length).toBe(0);
    });

    it('should stop queue and cancel waiting items on stopQueue()', () => {
      runner.enqueue([{ scriptId: 'test-s1' }, { scriptId: 'test-s2' }], false);
      runner.stopQueue();
      const state = runner.getState();
      expect(state.status).toBe('idle');
      expect(state.queue.every((item) => item.status === 'cancelled')).toBe(true);
    });
  });
});
