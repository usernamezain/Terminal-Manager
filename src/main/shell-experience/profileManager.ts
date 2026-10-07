import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { pathManager } from './pathManager';
import { logger } from '../logger';

export interface RepoCommitInfo {
  hash: string;
  date: string;
  message: string;
}

export class ProfileManager {
  private repoUrl = 'https://github.com/ChrisTitusTech/powershell-profile';

  public ensurePristineRepo(): void {
    try {
      const repoDir = pathManager.getRepoDir();
      const profileInRepo = path.join(repoDir, 'Microsoft.PowerShell_profile.ps1');
      const licenseInRepo = path.join(repoDir, 'LICENSE');
      const timestamp = Date.now();
      const backupDir = path.join(pathManager.getToolsDir(), 'backups');

      // Check for pre-existing stub files and move to backups folder outside repoDir
      if (fs.existsSync(profileInRepo)) {
        const stat = fs.statSync(profileInRepo);
        const content = fs.readFileSync(profileInRepo, 'utf8');
        if (stat.size < 1500 || !content.includes('Chris Titus Tech')) {
          if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
          const backupPath = path.join(backupDir, `Microsoft.PowerShell_profile.ps1.stub-backup-${timestamp}`);
          logger.info(`Moving legacy stub profile to ${backupPath}`);
          fs.renameSync(profileInRepo, backupPath);
        }
      }

      if (fs.existsSync(licenseInRepo)) {
        const stat = fs.statSync(licenseInRepo);
        const content = fs.readFileSync(licenseInRepo, 'utf8');
        if (stat.size < 500 || !content.includes('MIT License')) {
          if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
          const backupPath = path.join(backupDir, `LICENSE.stub-backup-${timestamp}`);
          logger.info(`Moving legacy stub LICENSE to ${backupPath}`);
          fs.renameSync(licenseInRepo, backupPath);
        }
      }

      if (!fs.existsSync(profileInRepo) || !fs.existsSync(licenseInRepo)) {
        logger.info(`Cloning pristine powershell-profile from ${this.repoUrl} into ${repoDir}`);
        
        // Ensure repoDir is clean before git clone if it exists without .git
        if (fs.existsSync(repoDir)) {
          const files = fs.readdirSync(repoDir);
          if (files.length > 0 && !fs.existsSync(path.join(repoDir, '.git'))) {
            logger.info(`Cleaning non-git files from repoDir ${repoDir} before cloning`);
            fs.rmSync(repoDir, { recursive: true, force: true });
          }
        }

        try {
          if (!fs.existsSync(repoDir)) fs.mkdirSync(repoDir, { recursive: true });
          execSync(`git clone --depth 1 ${this.repoUrl} "${repoDir}"`, {
            timeout: 45000,
            stdio: 'ignore',
          });
        } catch (gitErr) {
          logger.warn(`Git clone failed for powershell-profile repository:`, gitErr);
          if (fs.existsSync(repoDir) && !fs.existsSync(profileInRepo)) {
            try {
              fs.rmSync(repoDir, { recursive: true, force: true });
            } catch {}
          }
        }

        // Marker validation
        if (fs.existsSync(profileInRepo)) {
          const profileTxt = fs.readFileSync(profileInRepo, 'utf8');
          if (!profileTxt.includes('Chris Titus Tech')) {
            logger.warn('Downloaded profile failed marker validation ("Chris Titus Tech" missing).');
          }
        } else {
          logger.warn('Pristine profile file missing after clone attempt.');
        }

        if (fs.existsSync(licenseInRepo)) {
          const licenseTxt = fs.readFileSync(licenseInRepo, 'utf8');
          if (!licenseTxt.includes('MIT License')) {
            logger.warn('Downloaded LICENSE failed marker validation ("MIT License" missing).');
          }
        }
      }

      this.ensureThemeProvisioned();
      this.syncRuntimeProfile();
    } catch (err) {
      logger.error('Error in ensurePristineRepo:', err);
    }
  }

  public ensureThemeProvisioned(): void {
    const themesDir = pathManager.getThemesDir();
    const targetThemePath = path.join(themesDir, 'cobalt2.omp.json');
    if (fs.existsSync(targetThemePath)) return;

    // Try copying from Documents/WindowsPowerShell if present
    const docsTheme = path.join(process.env.USERPROFILE || '', 'Documents', 'WindowsPowerShell', 'cobalt2.omp.json');
    if (fs.existsSync(docsTheme)) {
      try {
        fs.copyFileSync(docsTheme, targetThemePath);
        logger.info(`Copied cobalt2.omp.json theme from Documents to ${targetThemePath}`);
        return;
      } catch {}
    }

    // Default minimal cobalt2 theme structure
    const defaultCobalt2 = JSON.stringify({
      "$schema": "https://raw.githubusercontent.com/JanDeDobbeleer/oh-my-posh/main/themes/schema.json",
      "blocks": [
        {
          "type": "prompt",
          "alignment": "left",
          "segments": [
            {
              "type": "path",
              "style": "powerline",
              "powerline_symbol": "\uE0B0",
              "foreground": "#ffffff",
              "background": "#005f87",
              "properties": { "style": "full" }
            },
            {
              "type": "git",
              "style": "powerline",
              "powerline_symbol": "\uE0B0",
              "foreground": "#000000",
              "background": "#ffc500"
            }
          ]
        }
      ],
      "final_space": true,
      "version": 2
    }, null, 2);

    try {
      fs.writeFileSync(targetThemePath, defaultCobalt2, 'utf8');
      logger.info(`Provisioned default cobalt2.omp.json at ${targetThemePath}`);
    } catch (err) {
      logger.error('Failed to write default cobalt2.omp.json:', err);
    }
  }

  public syncRuntimeProfile(): void {
    const repoProfile = path.join(pathManager.getRepoDir(), 'Microsoft.PowerShell_profile.ps1');
    const runtimeProfile = pathManager.getRuntimeProfilePath();

    if (!fs.existsSync(repoProfile)) return;

    const repoHash = this.computeHash(repoProfile);
    const runtimeHash = fs.existsSync(runtimeProfile) ? this.computeHash(runtimeProfile) : '';

    if (repoHash !== runtimeHash) {
      logger.info(`Syncing runtime profile (SHA256 mismatch or missing)`);
      fs.copyFileSync(repoProfile, runtimeProfile);
    }
  }

  public getRepoCommitInfo(): RepoCommitInfo {
    const repoDir = pathManager.getRepoDir();
    try {
      const hash = execSync('git rev-parse --short HEAD', { cwd: repoDir, timeout: 3000 })
        .toString()
        .trim();
      const date = execSync('git log -1 --format=%cd --date=short', { cwd: repoDir, timeout: 3000 })
        .toString()
        .trim();
      const message = execSync('git log -1 --format=%s', { cwd: repoDir, timeout: 3000 })
        .toString()
        .trim();
      return { hash, date, message };
    } catch {
      return { hash: 'main', date: new Date().toISOString().split('T')[0] || '', message: 'ChrisTitusTech Profile' };
    }
  }

  public pullUpdates(): { success: boolean; commits: string[] } {
    const repoDir = pathManager.getRepoDir();
    try {
      execSync('git fetch --depth 1 origin main', { cwd: repoDir, timeout: 30000 });
      const logOutput = execSync('git log HEAD..origin/main --oneline', { cwd: repoDir, timeout: 5000 })
        .toString()
        .trim();
      const commits = logOutput ? logOutput.split('\n') : ['Profile is up to date'];

      execSync('git reset --hard origin/main', { cwd: repoDir, timeout: 10000 });
      this.syncRuntimeProfile();
      return { success: true, commits };
    } catch (err) {
      logger.error('Failed to pull powershell-profile updates:', err);
      return { success: false, commits: [String(err)] };
    }
  }

  private computeHash(filePath: string): string {
    try {
      const content = fs.readFileSync(filePath);
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch {
      return '';
    }
  }
}

export const profileManager = new ProfileManager();
