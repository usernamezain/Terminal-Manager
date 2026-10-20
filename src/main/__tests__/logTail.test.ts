import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { logger } from '../logger';

describe('Logger getLogTail Unit Tests', () => {
  let tempDir: string;
  let testLogFile: string;
  let originalLogPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-logtail-test-'));
    testLogFile = path.join(tempDir, 'test.log');

    // Point logger's private logPath to testLogFile for isolated unit testing
    originalLogPath = logger.getLogPath();
    (logger as any).logPath = testLogFile;
    (logger as any).initialized = true;
  });

  afterEach(() => {
    (logger as any).logPath = originalLogPath;
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (_) {}
  });

  it('reads bounded tail lines from a standard log file', () => {
    const lines = [
      '[2026-10-14T01:00:00.000Z] [INFO] [System] Startup completed',
      '[2026-10-14T01:00:01.000Z] [WARN] [Network] High latency detected',
      '[2026-10-14T01:00:02.000Z] [ERROR] [PTY] Process crash code 1',
    ];
    fs.writeFileSync(testLogFile, lines.join('\n') + '\n', 'utf8');

    const tail = logger.getLogTail(256 * 1024, 100);
    expect(tail.length).toBe(3);
    expect(tail[0]?.level).toBe('info');
    expect(tail[0]?.category).toBe('System');
    expect(tail[0]?.message).toBe('Startup completed');
    expect(tail[1]?.level).toBe('warn');
    expect(tail[2]?.level).toBe('error');
  });

  it('truncates lines longer than 5000 characters to prevent renderer freezing', () => {
    const hugeLine = '[2026-10-14T01:00:00.000Z] [INFO] ' + 'X'.repeat(8000);
    fs.writeFileSync(testLogFile, hugeLine + '\n', 'utf8');

    const tail = logger.getLogTail(256 * 1024, 100);
    expect(tail.length).toBe(1);
    expect(tail[0]?.message.length).toBeLessThanOrEqual(5020);
    expect(tail[0]?.message).toContain('[truncated]');
  });

  it('performs bounded reads on large files without reading the entire file', () => {
    // Generate a file larger than 300KB
    const fd = fs.openSync(testLogFile, 'w');
    const chunk = '[2026-10-14T01:00:00.000Z] [INFO] [Benchmark] Bulk padding entry\n';
    for (let i = 0; i < 6000; i++) {
      fs.writeSync(fd, chunk);
    }
    fs.writeSync(fd, '[2026-10-14T01:00:05.000Z] [INFO] [Benchmark] Final tail marker line\n');
    fs.closeSync(fd);

    const fileSize = fs.statSync(testLogFile).size;
    expect(fileSize).toBeGreaterThan(300 * 1024);

    // Read only last 64KB and at most 10 lines
    const tail = logger.getLogTail(64 * 1024, 10);
    expect(tail.length).toBeLessThanOrEqual(10);
    const lastEntry = tail[tail.length - 1];
    expect(lastEntry?.message).toContain('Final tail marker line');
  });

  it('handles empty or non-existent log file gracefully', () => {
    (logger as any).logPath = path.join(tempDir, 'does-not-exist.log');
    const tail = logger.getLogTail(256 * 1024, 100);
    expect(Array.isArray(tail)).toBe(true);
  });
});
