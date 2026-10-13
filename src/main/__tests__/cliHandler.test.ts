import { describe, it, expect } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs';
import {
  parseCliArgs,
  validateAndNormalizeDirectory,
  cleanRawPathString,
  resolveLaunchCwd,
} from '../cliHandler';
import { TerminalProfile } from '../../shared/types';

describe('CLI Handler & Path Validation Unit Tests', () => {
  it('should validate and normalize existing directory', () => {
    const tmp = os.tmpdir();
    const result = validateAndNormalizeDirectory(tmp);
    expect(result).toBeDefined();
    expect(path.resolve(result!)).toBe(path.resolve(tmp));
  });

  it('should resolve to parent directory if file path is provided', () => {
    const testFile = path.join(os.tmpdir(), `test-file-${Date.now()}.txt`);
    fs.writeFileSync(testFile, 'test content', 'utf8');
    try {
      const result = validateAndNormalizeDirectory(testFile);
      expect(result).toBe(path.dirname(testFile));
    } finally {
      if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
    }
  });

  it('should reject non-existent paths', () => {
    const invalidPath = path.join(os.tmpdir(), 'non_existent_dir_99999');
    const result = validateAndNormalizeDirectory(invalidPath);
    expect(result).toBeUndefined();
  });

  it('should handle quote-damaged trailing backslash and drive root strings', () => {
    // Windows Explorer C:\" turning into C:"
    expect(cleanRawPathString('C:"')).toBe('C:\\');
    expect(cleanRawPathString('C:\\')).toBe('C:\\');
    expect(cleanRawPathString('C:')).toBe('C:\\');
    expect(cleanRawPathString('"C:\\"')).toBe('C:\\');
    expect(cleanRawPathString('D:\\Some Folder"')).toBe('D:\\Some Folder');
    expect(cleanRawPathString('"D:\\Some Folder"')).toBe('D:\\Some Folder');
  });

  it('should validate paths with spaces, &, and unicode characters', () => {
    const specialFolder = path.join(os.tmpdir(), `Test & Spaced Folder 日本語-${Date.now()}`);
    fs.mkdirSync(specialFolder, { recursive: true });
    try {
      const result = validateAndNormalizeDirectory(specialFolder);
      expect(result).toBe(path.resolve(specialFolder));

      // With quotes
      const quoted = `"${specialFolder}"`;
      const resultQuoted = validateAndNormalizeDirectory(quoted);
      expect(resultQuoted).toBe(path.resolve(specialFolder));

      // With trailing swallowed quote artifact
      const swallowedQuote = `${specialFolder}"`;
      const resultSwallowed = validateAndNormalizeDirectory(swallowedQuote);
      expect(resultSwallowed).toBe(path.resolve(specialFolder));
    } finally {
      if (fs.existsSync(specialFolder)) fs.rmdirSync(specialFolder);
    }
  });

  it('should parse --cwd, --profile, --new-window, --dock, and --hidden flags', () => {
    const tmp = os.tmpdir();
    const argv = [
      'electron',
      'main.js',
      '--hidden',
      '--new-window',
      '--profile',
      'PowerShell Core',
      '--cwd',
      tmp,
    ];

    const parsed = parseCliArgs(argv);
    expect(parsed.hidden).toBe(true);
    expect(parsed.newWindow).toBe(true);
    expect(parsed.profile).toBe('PowerShell Core');
    expect(parsed.cwd).toBe(path.resolve(tmp));
  });

  it('should parse equals-style arguments', () => {
    const tmp = os.tmpdir();
    const argv = [
      'electron',
      `--cwd=${tmp}`,
      '--profile="Command Prompt"',
      '--dock',
    ];

    const parsed = parseCliArgs(argv);
    expect(parsed.dock).toBe(true);
    expect(parsed.profile).toBe('Command Prompt');
    expect(parsed.cwd).toBe(path.resolve(tmp));
  });

  it('should enforce resolveLaunchCwd precedence: explicit > profile > home', () => {
    const tmp = os.tmpdir();
    const home = os.homedir();
    const profile: TerminalProfile = {
      id: 'test-p',
      name: 'Test Profile',
      shellPath: 'cmd.exe',
      shellArgs: [],
      cwd: tmp,
      isDefault: false,
    };

    // 1. Explicit request wins over profile CWD
    const subFolder = path.join(tmp, `explicit-${Date.now()}`);
    fs.mkdirSync(subFolder, { recursive: true });
    try {
      const r1 = resolveLaunchCwd(subFolder, profile);
      expect(r1.cwd).toBe(path.resolve(subFolder));
      expect(r1.requestedCwdInvalid).toBeUndefined();

      // 2. No explicit request: profile CWD wins
      const r2 = resolveLaunchCwd(undefined, profile);
      expect(r2.cwd).toBe(path.resolve(tmp));

      // 3. Profile with ~ expands to home
      const profileTilde: TerminalProfile = {
        ...profile,
        cwd: '~',
      };
      const r3 = resolveLaunchCwd(undefined, profileTilde);
      expect(r3.cwd).toBe(path.resolve(home));

      // 4. Invalid explicit request falls back to profile CWD with warning info
      const invalidPath = path.join(tmp, 'does_not_exist_xyz_999');
      const r4 = resolveLaunchCwd(invalidPath, profile);
      expect(r4.cwd).toBe(path.resolve(tmp));
      expect(r4.requestedCwdInvalid).toBe(invalidPath);
    } finally {
      if (fs.existsSync(subFolder)) fs.rmdirSync(subFolder);
    }
  });

  it('should parse --run-sequence CLI flag', () => {
    const res1 = parseCliArgs(['--run-sequence', 'Setup project']);
    expect(res1.runSequence).toBe('Setup project');

    const res2 = parseCliArgs(['--run-sequence="Deploy Stack"']);
    expect(res2.runSequence).toBe('Deploy Stack');
  });

  it('should safely extract positional directory when electron reorders flags or inserts internal flags', () => {
    const tmp = os.tmpdir();
    const fakeArgv = [
      'C:\\path\\electron.exe',
      '--new-window',
      '--cwd',
      '--allow-file-access-from-files',
      'C:\\project\\app',
      tmp,
    ];

    const parsed = parseCliArgs(fakeArgv);
    expect(parsed.newWindow).toBe(true);
    expect(parsed.cwd).toBe(path.resolve(tmp));
  });
});
