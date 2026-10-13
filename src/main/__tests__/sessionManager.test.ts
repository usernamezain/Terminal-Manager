import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OutputRingBuffer, SessionManager } from '../sessionManager';

describe('OutputRingBuffer Unit Tests', () => {
  it('should store and retrieve output data correctly', () => {
    const buffer = new OutputRingBuffer(100);
    buffer.write('Hello ');
    buffer.write('World!');
    expect(buffer.getAll()).toBe('Hello World!');
  });

  it('should discard oldest chunks when exceeding max capacity', () => {
    const buffer = new OutputRingBuffer(20);
    buffer.write('Chunk 1: 0123456789; ');
    buffer.write('Chunk 2: 0123456789; ');
    buffer.write('Chunk 3: Final!');
    const content = buffer.getAll();
    expect(content.includes('Chunk 3: Final!')).toBe(true);
    expect(content.includes('Chunk 1:')).toBe(false);
  });

  it('should clear buffer on clear()', () => {
    const buffer = new OutputRingBuffer(100);
    buffer.write('Some output');
    buffer.clear();
    expect(buffer.getAll()).toBe('');
  });
});

describe('SessionManager Lifecycle Tests', () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = new SessionManager();
  });

  afterEach(() => {
    manager.killAll();
  });

  it('should list sessions as empty initially', () => {
    expect(manager.list()).toEqual([]);
  });
});
