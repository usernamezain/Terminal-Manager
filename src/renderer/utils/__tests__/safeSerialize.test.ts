import { describe, it, expect } from 'vitest';
import { safeStringify } from '../safeSerialize';

describe('safeStringify Unit Tests', () => {
  it('should stringify primitives and objects normally', () => {
    expect(safeStringify('hello')).toBe('hello');
    expect(safeStringify(123)).toBe('123');
    expect(safeStringify(null)).toBe('null');
    expect(safeStringify({ a: 1 })).toBe('{"a":1}');
  });

  it('should handle circular references without throwing', () => {
    const obj: any = { name: 'test' };
    obj.self = obj;

    const result = safeStringify(obj);
    expect(result).toContain('"self":"[Circular]"');
    expect(result).toContain('"name":"test"');
  });

  it('should handle Error objects with stack and message', () => {
    const err = new Error('Test Failure');
    const result = safeStringify(err);
    expect(result).toContain('Test Failure');
    expect(result).toContain('Error');
  });

  it('should handle functions without throwing', () => {
    const obj = { fn: () => 'hi' };
    const result = safeStringify(obj);
    expect(result).toContain('"fn":"[Function]"');
  });
});
