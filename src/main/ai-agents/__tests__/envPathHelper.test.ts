import { describe, it, expect } from 'vitest';
import os from 'os';
import path from 'path';
import { expandWindowsEnv, refreshEnvPath } from '../envPathHelper';

describe('Environment PATH Helper Unit Tests', () => {
  it('expands standard Windows environment variables in strings', () => {
    const input = '%USERPROFILE%\\.local\\bin;%LOCALAPPDATA%\\Programs;%APPDATA%\\npm';
    const expanded = expandWindowsEnv(input);

    expect(expanded).toContain(os.homedir());
    expect(expanded).toContain(path.join(os.homedir(), 'AppData', 'Local'));
    expect(expanded).toContain(path.join(os.homedir(), 'AppData', 'Roaming'));
    expect(expanded).not.toContain('%USERPROFILE%');
    expect(expanded).not.toContain('%LOCALAPPDATA%');
    expect(expanded).not.toContain('%APPDATA%');
  });

  it('preserves unknown variable tokens gracefully', () => {
    const input = '%SOME_NONEXISTENT_VAR_12345%\\bin';
    const expanded = expandWindowsEnv(input);
    expect(expanded).toBe('%SOME_NONEXISTENT_VAR_12345%\\bin');
  });

  it('refreshEnvPath returns non-empty PATH and caches results', async () => {
    const envPath = await refreshEnvPath(true);
    expect(envPath).toBeDefined();
    expect(typeof envPath).toBe('string');
    expect(envPath.length).toBeGreaterThan(0);

    // Fast subsequent call should return cached path
    const cached = await refreshEnvPath(false);
    expect(cached).toBe(envPath);
  });
});
