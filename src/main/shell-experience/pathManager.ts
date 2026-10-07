import path from 'path';
import fs from 'fs';
import { app } from 'electron';

export class PathManager {
  private customUserData: string | null = null;

  constructor() {
    this.ensureDirs();
  }

  public setCustomUserDataPath(customPath: string | null): void {
    this.customUserData = customPath;
    this.ensureDirs();
  }

  public getUserDataDir(): string {
    if (process.env.TERMINAL_MANAGER_TEST_USERDATA) {
      return process.env.TERMINAL_MANAGER_TEST_USERDATA;
    }
    if (this.customUserData) {
      return this.customUserData;
    }
    return app ? app.getPath('userData') : path.join(process.env.APPDATA || process.env.HOME || '', 'terminal-manager');
  }

  public getToolsDir(): string {
    return path.join(this.getUserDataDir(), 'tools');
  }

  public getRepoDir(): string {
    return path.join(this.getToolsDir(), 'powershell-profile');
  }

  public getBinDir(): string {
    return path.join(this.getToolsDir(), 'bin');
  }

  public getFontsDir(): string {
    return path.join(this.getToolsDir(), 'fonts');
  }

  public getShellDir(): string {
    return path.join(this.getUserDataDir(), 'shell');
  }

  public getThemesDir(): string {
    return path.join(this.getShellDir(), 'themes');
  }

  public getRuntimeProfilePath(): string {
    return path.join(this.getShellDir(), 'Microsoft.PowerShell_profile.ps1');
  }

  public getCustomScriptPath(): string {
    return path.join(this.getShellDir(), 'CTTcustom.ps1');
  }

  public getLastExecutionTimePath(): string {
    return path.join(this.getShellDir(), 'LastExecutionTime.txt');
  }

  public ensureDirs(): void {
    const dirs = [
      this.getToolsDir(),
      this.getRepoDir(),
      this.getBinDir(),
      this.getFontsDir(),
      this.getShellDir(),
      this.getThemesDir(),
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  public getSystemProfilePath(isCore = false): string {
    if (process.env.TERMINAL_MANAGER_TEST_DOCUMENTS) {
      const folder = isCore ? 'PowerShell' : 'WindowsPowerShell';
      return path.join(process.env.TERMINAL_MANAGER_TEST_DOCUMENTS, folder, 'Microsoft.PowerShell_profile.ps1');
    }
    const docs = app ? app.getPath('documents') : path.join(process.env.USERPROFILE || '', 'Documents');
    const folder = isCore ? 'PowerShell' : 'WindowsPowerShell';
    return path.join(docs, folder, 'Microsoft.PowerShell_profile.ps1');
  }
}

export const pathManager = new PathManager();
