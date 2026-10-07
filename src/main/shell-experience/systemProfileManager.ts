import fs from 'fs';
import path from 'path';
import { pathManager } from './pathManager';
import { logger } from '../logger';

export interface SystemProfileBackupInfo {
  filename: string;
  fullPath: string;
  timestamp: string;
}

export class SystemProfileManager {
  public getSystemProfilePath(): string {
    return pathManager.getSystemProfilePath();
  }

  public backupSystemProfile(): SystemProfileBackupInfo | null {
    const sysProfile = this.getSystemProfilePath();
    if (!fs.existsSync(sysProfile)) return null;

    const sysDir = path.dirname(sysProfile);
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:T.]/g, '').slice(0, 15);
    const uniqueSuffix = Math.random().toString(36).substring(2, 6);
    const filename = `oldprofile-${timestamp}-${uniqueSuffix}.ps1`;
    const backupPath = path.join(sysDir, filename);

    try {
      fs.copyFileSync(sysProfile, backupPath, fs.constants.COPYFILE_EXCL);
      logger.info(`Backed up system profile (append-only) to ${backupPath}`);
      return { filename, fullPath: backupPath, timestamp };
    } catch (err) {
      logger.error('Failed to backup system profile:', err);
      throw err;
    }
  }

  public applySystemWide(explicitUserConfirmation: boolean): boolean {
    if (!explicitUserConfirmation) {
      throw new Error('applySystemWide requires explicit user confirmation via dialog.');
    }

    const sysProfile = this.getSystemProfilePath();
    const sysDir = path.dirname(sysProfile);

    if (!fs.existsSync(sysDir)) {
      fs.mkdirSync(sysDir, { recursive: true });
    }

    // 1. Backup first (append-only)
    this.backupSystemProfile();

    // 2. Copy Microsoft.PowerShell_profile.ps1 and CTTcustom.ps1 into sysDir
    const runtimeProfile = pathManager.getRuntimeProfilePath();
    const customScript = pathManager.getCustomScriptPath();

    try {
      fs.copyFileSync(runtimeProfile, sysProfile);
      const destCustom = path.join(sysDir, 'CTTcustom.ps1');
      if (fs.existsSync(customScript)) {
        fs.copyFileSync(customScript, destCustom);
      }
      logger.info(`Applied Shell Experience system-wide at ${sysProfile}`);
      return true;
    } catch (err) {
      logger.error('Failed to apply system-wide profile:', err);
      throw err;
    }
  }

  public listBackups(): SystemProfileBackupInfo[] {
    const sysDir = path.dirname(this.getSystemProfilePath());
    if (!fs.existsSync(sysDir)) return [];

    try {
      const files = fs.readdirSync(sysDir);
      return files
        .filter(f => f.startsWith('oldprofile-') && f.endsWith('.ps1'))
        .map(f => ({
          filename: f,
          fullPath: path.join(sysDir, f),
          timestamp: f.replace('oldprofile-', '').replace('.ps1', ''),
        }));
    } catch {
      return [];
    }
  }

  public restoreBackup(backupFilename: string): boolean {
    const sysProfile = this.getSystemProfilePath();
    const sysDir = path.dirname(sysProfile);
    const backupPath = path.join(sysDir, backupFilename);

    if (!fs.existsSync(backupPath)) return false;

    try {
      fs.copyFileSync(backupPath, sysProfile);
      logger.info(`Restored system profile from ${backupFilename}`);
      return true;
    } catch (err) {
      logger.error('Failed to restore system profile backup:', err);
      return false;
    }
  }

  public uninstallSystemWide(): boolean {
    const sysProfile = this.getSystemProfilePath();
    const sysDir = path.dirname(sysProfile);
    const customScript = path.join(sysDir, 'CTTcustom.ps1');

    try {
      if (fs.existsSync(sysProfile)) fs.unlinkSync(sysProfile);
      if (fs.existsSync(customScript)) fs.unlinkSync(customScript);
      logger.info(`Uninstalled Shell Experience system-wide from ${sysProfile}`);
      return true;
    } catch (err) {
      logger.error('Failed to uninstall system-wide profile:', err);
      return false;
    }
  }
}

export const systemProfileManager = new SystemProfileManager();
