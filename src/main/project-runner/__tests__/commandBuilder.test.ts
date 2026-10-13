import { describe, it, expect } from 'vitest';
import { renderCommandString } from '../commandBuilder';
import { ProjectCommand } from '../../../shared/projectRunnerTypes';

describe('renderCommandString Unit Tests', () => {
  it('renders command directly when cwd matches', () => {
    const cmd: ProjectCommand = {
      id: 'test-1',
      label: 'test',
      commandText: 'npm test',
      tool: 'npm',
      args: ['run', 'test'],
      cwd: 'C:\\Projects\\My App',
      category: 'script',
    };

    const outPwsh = renderCommandString(cmd, 'powershell', 'C:\\Projects\\My App');
    expect(outPwsh).toBe('npm run test');

    const outCmd = renderCommandString(cmd, 'cmd', 'C:\\Projects\\My App');
    expect(outCmd).toBe('npm run test');

    const outBash = renderCommandString(cmd, 'bash', 'C:\\Projects\\My App');
    expect(outBash).toBe('npm run test');
  });

  it('prepends safe cd/Set-Location when cwd differs', () => {
    const cmd: ProjectCommand = {
      id: 'test-ws',
      label: 'ws test',
      commandText: 'npm run test',
      tool: 'npm',
      args: ['run', 'test'],
      cwd: 'C:\\Projects\\My App\\packages\\sub & dir',
      category: 'workspace',
    };

    const outPwsh = renderCommandString(cmd, 'powershell', 'C:\\Projects\\My App');
    expect(outPwsh).toContain("Set-Location 'C:\\Projects\\My App\\packages\\sub & dir'");

    const outCmd = renderCommandString(cmd, 'cmd', 'C:\\Projects\\My App');
    expect(outCmd).toContain('cd /d "C:\\Projects\\My App\\packages\\sub & dir"');

    const outBash = renderCommandString(cmd, 'bash', 'C:\\Projects\\My App');
    expect(outBash).toContain("cd 'C:\\Projects\\My App\\packages\\sub & dir'");
  });

  it('handles spaces, ampersands, and unicode in arguments safely', () => {
    const cmd: ProjectCommand = {
      id: 'test-unicode',
      label: 'echo',
      commandText: 'echo hello',
      tool: 'echo',
      args: ['hello world & welcome', '📦 unicode package'],
      category: 'run',
    };

    const outPwsh = renderCommandString(cmd, 'powershell');
    expect(outPwsh).toBe("echo 'hello world & welcome' '📦 unicode package'");
  });
});
