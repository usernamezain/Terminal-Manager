import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { TerminalProfile } from '../shared/types';
import { detectShells } from './shellDetector';
import { logger } from './logger';

export class ProfilesStore {
  private filePath: string = '';
  private profiles: TerminalProfile[] = [];

  constructor(customPath?: string) {
    if (customPath) {
      this.filePath = customPath.endsWith('.json') ? customPath : path.join(customPath, 'profiles.json');
    }
  }

  public init(customPath?: string): void {
    if (customPath) {
      this.filePath = customPath.endsWith('.json') ? customPath : path.join(customPath, 'profiles.json');
    } else if (!this.filePath) {
      const userDataPath = app?.getPath ? app.getPath('userData') : process.cwd();
      this.filePath = path.join(userDataPath, 'profiles.json');
    }
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.profiles = parsed;
          logger.info(`Profiles loaded successfully (${this.profiles.length} profiles)`);
          this.ensureDefaultExists();
          return;
        }
      }
    } catch (err) {
      logger.error('Failed to load profiles file, generating defaults', err);
    }

    // First run or corrupt file: generate from detected shells
    this.profiles = this.generateDefaultProfiles();
    this.saveAtomic();
    logger.info(`Generated ${this.profiles.length} default profiles`);
  }

  public getAll(): TerminalProfile[] {
    return [...this.profiles];
  }

  public getById(id: string): TerminalProfile | undefined {
    return this.profiles.find((p) => p.id === id);
  }

  public getDefault(): TerminalProfile {
    const found = this.profiles.find((p) => p.isDefault);
    return found || this.profiles[0] || this.createFallbackProfile();
  }

  public save(profile: TerminalProfile): TerminalProfile {
    const existingIndex = this.profiles.findIndex((p) => p.id === profile.id);

    // If marked as default, clear default flag on all others
    if (profile.isDefault) {
      this.profiles.forEach((p) => {
        p.isDefault = false;
      });
    }

    if (existingIndex >= 0) {
      this.profiles[existingIndex] = { ...this.profiles[existingIndex], ...profile };
    } else {
      // If this is the only profile, ensure it's default
      if (this.profiles.length === 0) {
        profile.isDefault = true;
      }
      this.profiles.push(profile);
    }

    this.ensureDefaultExists();
    this.saveAtomic();
    return this.getById(profile.id)!;
  }

  public setDefault(id: string): boolean {
    const target = this.profiles.find((p) => p.id === id);
    if (!target) return false;

    this.profiles.forEach((p) => {
      p.isDefault = p.id === id;
    });

    this.saveAtomic();
    return true;
  }

  public delete(id: string): boolean {
    if (this.profiles.length <= 1) {
      return false; // Cannot delete the only profile
    }

    const index = this.profiles.findIndex((p) => p.id === id);
    if (index === -1) return false;

    if (this.profiles[index]?.isDefault) {
      return false; // Cannot delete the default profile
    }

    this.profiles.splice(index, 1);
    this.saveAtomic();
    return true;
  }

  public detectAndMerge(): TerminalProfile[] {
    const detected = detectShells();
    let addedCount = 0;

    for (const shell of detected) {
      const exists = this.profiles.some(
        (p) => p.shellPath.toLowerCase() === shell.path.toLowerCase() || p.id === shell.id
      );

      if (!exists) {
        const newProf: TerminalProfile = {
          id: `profile-${shell.id}-${Date.now()}`,
          name: shell.name,
          shellPath: shell.path,
          shellArgs: shell.args || [],
          cwd: '~',
          icon: shell.icon || 'terminal',
          color: this.pickColorForShell(shell.id),
          isDefault: false,
          elevate: false,
        };
        this.profiles.push(newProf);
        addedCount++;
      }
    }

    if (addedCount > 0) {
      this.saveAtomic();
      logger.info(`Detected and merged ${addedCount} new shell profiles`);
    }

    return this.getAll();
  }

  private ensureDefaultExists(): void {
    if (this.profiles.length > 0 && !this.profiles.some((p) => p.isDefault)) {
      this.profiles[0]!.isDefault = true;
    }
  }

  private generateDefaultProfiles(): TerminalProfile[] {
    const detected = detectShells();
    if (detected.length === 0) {
      return [this.createFallbackProfile()];
    }

    return detected.map((shell, idx) => ({
      id: `profile-${shell.id}`,
      name: shell.name,
      shellPath: shell.path,
      shellArgs: shell.args || [],
      cwd: '~',
      icon: shell.icon || 'terminal',
      color: this.pickColorForShell(shell.id),
      isDefault: idx === 0, // First detected shell is default
      elevate: false,
    }));
  }

  private createFallbackProfile(): TerminalProfile {
    const isWin = process.platform === 'win32';
    return {
      id: 'default-profile',
      name: isWin ? 'PowerShell' : 'Terminal',
      shellPath: isWin ? 'powershell.exe' : '/bin/bash',
      shellArgs: [],
      cwd: '~',
      icon: 'terminal',
      color: '#6C8CFF',
      isDefault: true,
      elevate: false,
    };
  }

  private pickColorForShell(id: string): string {
    const lower = id.toLowerCase();
    if (lower.includes('pwsh') || lower.includes('powershell')) return '#6C8CFF';
    if (lower.includes('cmd')) return '#9E9EA8';
    if (lower.includes('wsl') || lower.includes('ubuntu') || lower.includes('linux')) return '#FACC15';
    if (lower.includes('git') || lower.includes('bash')) return '#F87171';
    if (lower.includes('zsh')) return '#4ADE80';
    return '#38BDF8';
  }

  private saveAtomic(): void {
    if (!this.filePath) return;
    const tempPath = `${this.filePath}.${Date.now()}.${Math.random().toString(36).substring(2, 6)}.tmp`;
    try {
      const data = JSON.stringify(this.profiles, null, 2);
      fs.writeFileSync(tempPath, data, 'utf8');
      try {
        fs.renameSync(tempPath, this.filePath);
      } catch {
        // Fallback for Windows if destination file exists and locks renameSync
        fs.copyFileSync(tempPath, this.filePath);
        try {
          fs.unlinkSync(tempPath);
        } catch {
          // ignore
        }
      }
    } catch (err) {
      logger.error('Failed to atomically save profiles', err);
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch {
          // ignore
        }
      }
    }
  }
}

export const profilesStore = new ProfilesStore();
