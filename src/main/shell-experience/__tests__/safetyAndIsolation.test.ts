import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pathManager } from '../pathManager';
import { systemProfileManager } from '../systemProfileManager';

function computeHash(filePath: string): string {
  if (!fs.existsSync(filePath)) return 'NON_EXISTENT';
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

describe('Test Safety & Path Isolation Audit', () => {
  const tmpTestUserData = path.join(process.cwd(), 'scratch', 'test-userdata-isolated');
  const tmpTestDocs = path.join(process.cwd(), 'scratch', 'test-docs-isolated');

  beforeEach(() => {
    process.env.TERMINAL_MANAGER_TEST_USERDATA = tmpTestUserData;
    process.env.TERMINAL_MANAGER_TEST_DOCUMENTS = tmpTestDocs;
    if (!fs.existsSync(tmpTestUserData)) fs.mkdirSync(tmpTestUserData, { recursive: true });
    if (!fs.existsSync(tmpTestDocs)) fs.mkdirSync(tmpTestDocs, { recursive: true });
  });

  afterEach(() => {
    delete process.env.TERMINAL_MANAGER_TEST_USERDATA;
    delete process.env.TERMINAL_MANAGER_TEST_DOCUMENTS;
  });

  it('Guard Test: PathManager must NEVER resolve real APPDATA or real $PROFILE in test environment', () => {
    const userData = pathManager.getUserDataDir();
    const sysProfile = pathManager.getSystemProfilePath();

    const realAppData = process.env.APPDATA || '';
    const realUserProfile = process.env.USERPROFILE || '';

    expect(userData).not.toContain(path.join(realAppData, 'terminal-manager'));
    expect(sysProfile).not.toContain(path.join(realUserProfile, 'Documents'));
    expect(userData).toBe(tmpTestUserData);
    expect(sysProfile).toContain(tmpTestDocs);
  });

  it('unit test: getSystemProfilePath differs for Windows PowerShell 5.1 vs PowerShell 7 (Core)', () => {
    const path51 = pathManager.getSystemProfilePath(false);
    const path7 = pathManager.getSystemProfilePath(true);

    expect(path51).toContain('WindowsPowerShell');
    expect(path7).toContain('PowerShell');
    expect(path51).not.toBe(path7);
  });

  it('Real Profile Hash Invariance: user real profile files must remain 100% untouched', () => {
    const realDocsProfile = path.join(process.env.USERPROFILE || '', 'Documents', 'WindowsPowerShell', 'Microsoft.PowerShell_profile.ps1');
    const realParkedProfile = path.join(process.env.USERPROFILE || '', 'Documents', 'WindowsPowerShell', 'upstream-profile-parked.ps1');

    const beforeDocsHash = computeHash(realDocsProfile);
    const beforeParkedHash = computeHash(realParkedProfile);

    // Perform pathManager operations in isolated mode
    pathManager.ensureDirs();
    const sysPath = pathManager.getSystemProfilePath(false);
    expect(sysPath).toBe(path.join(tmpTestDocs, 'WindowsPowerShell', 'Microsoft.PowerShell_profile.ps1'));

    const afterDocsHash = computeHash(realDocsProfile);
    const afterParkedHash = computeHash(realParkedProfile);

    expect(afterDocsHash).toBe(beforeDocsHash);
    expect(afterParkedHash).toBe(beforeParkedHash);
  });

  it('Append-Only Backups: systemProfileManager creates unique timestamped backups without unlinking user files', () => {
    // Create a mock system profile in test docs dir
    const mockSysDir = path.join(tmpTestDocs, 'WindowsPowerShell');
    fs.mkdirSync(mockSysDir, { recursive: true });
    const mockProfilePath = path.join(mockSysDir, 'Microsoft.PowerShell_profile.ps1');
    fs.writeFileSync(mockProfilePath, '# Initial Content', 'utf8');

    const backup1 = systemProfileManager.backupSystemProfile();
    const backup2 = systemProfileManager.backupSystemProfile();

    expect(backup1).not.toBeNull();
    expect(backup2).not.toBeNull();
    expect(backup1?.filename).not.toBe(backup2?.filename);
    expect(fs.existsSync(backup1!.fullPath)).toBe(true);
    expect(fs.existsSync(backup2!.fullPath)).toBe(true);
  });
});
