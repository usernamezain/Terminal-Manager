import { describe, it, expect } from 'vitest';
import {
  buildAgentCommandString,
  parseArgsString,
  checkDangerousArgs,
  DANGEROUS_FLAGS,
  launchAgent,
} from '../agentLauncher';

describe('AI Agent Launcher Unit Tests', () => {
  describe('buildAgentCommandString & Shell Quoting', () => {
    it('quotes command and arguments safely for PowerShell', () => {
      const cmd = buildAgentCommandString('powershell', 'claude.exe', ['--resume', 'Hello World & Test']);
      expect(cmd).toBe("& 'claude.exe' '--resume' 'Hello World & Test'");
    });

    it('quotes commands with spaces, quotes, and ampersands in PowerShell', () => {
      const exe = 'C:\\Program Files\\AI Tools\\agy.exe';
      const args = ['--prompt', 'Code & "Refactor"', 'C:\\Projets\\D&D ñoño'];
      const cmd = buildAgentCommandString('powershell', exe, args);

      expect(cmd.startsWith('& ')).toBe(true);
      expect(cmd).toContain("'C:\\Program Files\\AI Tools\\agy.exe'");
      expect(cmd).toContain("'C:\\Projets\\D&D ñoño'");
    });

    it('quotes command and arguments safely for CMD', () => {
      const exe = 'C:\\Tools\\codex.exe';
      const args = ['--file', 'path with spaces.txt', 'arg&arg'];
      const cmd = buildAgentCommandString('cmd', exe, args);

      expect(cmd).toContain('"C:\\Tools\\codex.exe"');
      expect(cmd).toContain('"path with spaces.txt"');
      expect(cmd).toContain('"arg&arg"');
    });

    it('quotes drive roots and trailing backslashes safely', () => {
      const driveRoot = 'C:\\';
      const cmd = buildAgentCommandString('powershell', 'hermes', ['--dir', driveRoot]);
      expect(cmd).toBe("& 'hermes' '--dir' 'C:\\'");
    });

    it('quotes command and arguments safely for bash / WSL', () => {
      const exe = '/home/user/.local/bin/opencode';
      const args = ['--query', 'hello world', 'foo&bar'];
      const cmd = buildAgentCommandString('wsl', exe, args);

      expect(cmd).toBe("'/home/user/.local/bin/opencode' '--query' 'hello world' 'foo&bar'");
    });
  });

  describe('parseArgsString', () => {
    it('parses empty or whitespace input into empty array', () => {
      expect(parseArgsString('')).toEqual([]);
      expect(parseArgsString('   ')).toEqual([]);
    });

    it('splits simple arguments', () => {
      expect(parseArgsString('--resume --model gpt-5')).toEqual(['--resume', '--model', 'gpt-5']);
    });

    it('preserves double-quoted tokens containing spaces and special characters', () => {
      const parsed = parseArgsString('--message "Fix the login bug & retest" --fast');
      expect(parsed).toEqual(['--message', 'Fix the login bug & retest', '--fast']);
    });

    it('preserves single-quoted tokens', () => {
      const parsed = parseArgsString("--path 'D:\\Projects\\Test App' -v");
      expect(parsed).toEqual(['--path', 'D:\\Projects\\Test App', '-v']);
    });
  });

  describe('checkDangerousArgs', () => {
    it('identifies all known dangerous flags', () => {
      for (const flag of DANGEROUS_FLAGS) {
        const result = checkDangerousArgs([flag]);
        expect(result.hasDangerous).toBe(true);
        expect(result.flag).toBe(flag);
      }
    });

    it('identifies dangerous flag with key-value syntax', () => {
      const result = checkDangerousArgs(['--yolo=true']);
      expect(result.hasDangerous).toBe(true);
      expect(result.flag).toBe('--yolo');
    });

    it('passes safe arguments without triggering warning', () => {
      const result = checkDangerousArgs(['--resume', '--verbose', '--output', 'results.json']);
      expect(result.hasDangerous).toBe(false);
      expect(result.flag).toBeUndefined();
    });
  });

  describe('launchAgent Folder Validation', () => {
    it('returns error when given a non-existent folder instead of silently falling back', async () => {
      const result = await launchAgent({
        agentId: 'claude',
        cwd: 'C:\\NonExistent_Directory_For_Testing_12345',
        mode: 'tab',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Folder not found');
      expect(result.requestedCwdInvalid).toBeDefined();
    });

    it('rejects unconfirmed dangerous arguments', async () => {
      const result = await launchAgent({
        agentId: 'claude',
        mode: 'tab',
        extraArgs: ['--dangerously-skip-permissions'],
      });

      expect(result.success).toBe(false);
      expect(result.requiresDangerousConfirm).toBe(true);
      expect(result.dangerousFlag).toBe('--dangerously-skip-permissions');
    });
  });
});
