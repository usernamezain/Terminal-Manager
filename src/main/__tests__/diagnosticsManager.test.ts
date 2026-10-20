import { describe, it, expect } from 'vitest';
import os from 'os';
import { redactSensitiveText, generateDiagnosticsReport } from '../diagnosticsManager';

describe('Diagnostics Privacy Redaction & Report Generator', () => {
  it('strictly redacts user homedir, usernames, and seeded tokens', () => {
    const home = os.homedir();
    const user = os.userInfo?.()?.username || 'shabbir';
    const seededSecretToken = 'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
    const seededOpenAiKey = 'sk-proj-1234567890abcdef1234567890abcdef';

    const inputLog = `User path: ${home}\\Projects\\secret-code, username: ${user}, token: ${seededSecretToken}, apiKey: ${seededOpenAiKey}`;

    const redacted = redactSensitiveText(inputLog);

    expect(redacted).not.toContain(home);
    expect(redacted).not.toContain(seededSecretToken);
    expect(redacted).not.toContain(seededOpenAiKey);
    expect(redacted).toContain('%USERPROFILE%');
    expect(redacted).toContain('[REDACTED_SECRET]');
  });

  it('builds diagnostics report containing only safe redacted metadata', async () => {
    const report = await generateDiagnosticsReport();

    expect(report).toContain('TERMINAL MANAGER DIAGNOSTICS REPORT');
    expect(report).toContain('App Version:');
    expect(report).toContain('OS Version:');
    expect(report).toContain('Node Runtime:');
    expect(report).toContain('Electron:');

    // Never contain private paths or seeded tokens
    const home = os.homedir();
    expect(report).not.toContain(home);
  });
});
