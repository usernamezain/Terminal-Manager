import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { logger } from '../logger';
import { ToolsPathManager } from './toolsPathManager';

export class SourceManager {
  private paths: ToolsPathManager;
  private pinnedRef: string | null = null; // null = latest main
  private devBranch: boolean = false;

  constructor(paths?: ToolsPathManager) {
    this.paths = paths || new ToolsPathManager();
  }

  public getUpstreamRepoUrl(): string {
    return 'https://github.com/ChrisTitusTech/winutil.git';
  }

  public isPinned(): boolean {
    return this.pinnedRef !== null;
  }

  public getPinnedRef(): string | null {
    return this.pinnedRef;
  }

  public isDevBranch(): boolean {
    return this.devBranch;
  }

  public setDevBranch(enabled: boolean): void {
    this.devBranch = enabled;
  }

  public setPinnedRef(ref: string | null): void {
    this.pinnedRef = ref;
  }

  public upstreamExists(): boolean {
    const dir = this.paths.getUpstreamDir();
    return fs.existsSync(dir) && (fs.existsSync(path.join(dir, 'Compile.ps1')) || fs.existsSync(path.join(dir, 'config')));
  }

  public async fetchOrCloneUpstream(onProgress?: (label: string) => void): Promise<boolean> {
    const targetDir = this.paths.getUpstreamDir();

    if (this.upstreamExists()) {
      onProgress?.('Upstream pristine repository exists locally');
      return true;
    }

    onProgress?.('Cloning WinUtil upstream repository...');
    try {
      const branch = this.devBranch ? 'dev' : 'main';
      const cmd = `git clone --depth 1 -b ${branch} ${this.getUpstreamRepoUrl()} "${targetDir}"`;
      execSync(cmd, { stdio: 'pipe' });
      onProgress?.('Cloned upstream git repository successfully');
      return true;
    } catch (gitErr) {
      logger.warn('[SourceManager] Git clone failed or git missing. Attempting ZIP download fallback...', gitErr);
      onProgress?.('Git unavailable/failed. Downloading ZIP archive fallback...');
      const success = await this.downloadZipFallback(targetDir);
      if (success) {
        onProgress?.('Downloaded ZIP archive fallback successfully');
        return true;
      }
      return false;
    }
  }

  private downloadZipFallback(targetDir: string): Promise<boolean> {
    return new Promise((resolve) => {
      const branch = this.devBranch ? 'dev' : 'main';
      const zipUrl = `https://github.com/ChrisTitusTech/winutil/archive/refs/heads/${branch}.zip`;
      const zipPath = path.join(this.paths.getBaseDir(), 'winutil-fallback.zip');

      const file = fs.createWriteStream(zipPath);
      https.get(zipUrl, (res) => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          https.get(res.headers.location!, (redirectRes) => {
            redirectRes.pipe(file);
            file.on('finish', () => {
              file.close();
              this.extractZip(zipPath, targetDir).then(resolve);
            });
          });
        } else if (res.statusCode === 200) {
          res.pipe(file);
          file.on('finish', () => {
            file.close();
            this.extractZip(zipPath, targetDir).then(resolve);
          });
        } else {
          resolve(false);
        }
      }).on('error', () => resolve(false));
    });
  }

  private extractZip(zipPath: string, targetDir: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const escapedZip = zipPath.replace(/'/g, "''");
        const escapedBase = this.paths.getBaseDir().replace(/'/g, "''");
        const psCmd = `Expand-Archive -Path '${escapedZip}' -DestinationPath '${escapedBase}' -Force`;
        execSync(`powershell.exe -NoProfile -Command "${psCmd}"`, { stdio: 'pipe' });
        const extractedFolder = path.join(this.paths.getBaseDir(), `winutil-${this.devBranch ? 'dev' : 'main'}`);
        if (fs.existsSync(extractedFolder)) {
          if (fs.existsSync(targetDir)) {
            fs.rmSync(targetDir, { recursive: true, force: true });
          }
          fs.renameSync(extractedFolder, targetDir);
        }
        if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
        resolve(true);
      } catch (err) {
        logger.error('[SourceManager] Extract ZIP failed:', err);
        resolve(false);
      }
    });
  }

  public getCommitInfo(): { hash: string; date: string } {
    const dir = this.paths.getUpstreamDir();
    try {
      const hash = execSync('git rev-parse HEAD', { cwd: dir, stdio: 'pipe' }).toString().trim();
      const date = execSync('git log -1 --format=%cd --date=short', { cwd: dir, stdio: 'pipe' }).toString().trim();
      return { hash: hash.substring(0, 8), date };
    } catch (_) {
      return { hash: 'offline-v1', date: new Date().toISOString().split('T')[0] || '' };
    }
  }

  public async pullLatest(): Promise<{ success: boolean; commits: string[] }> {
    const dir = this.paths.getUpstreamDir();
    try {
      const logBefore = execSync('git rev-parse HEAD', { cwd: dir, stdio: 'pipe' }).toString().trim();
      execSync('git pull', { cwd: dir, stdio: 'pipe' });
      const logAfter = execSync('git rev-parse HEAD', { cwd: dir, stdio: 'pipe' }).toString().trim();

      let commits: string[] = [];
      if (logBefore !== logAfter) {
        commits = execSync(`git log --oneline ${logBefore}..${logAfter}`, { cwd: dir, stdio: 'pipe' })
          .toString()
          .split('\n')
          .filter((l) => l.trim().length > 0);
      }
      return { success: true, commits };
    } catch (err: any) {
      logger.error('[SourceManager] Git pull failed:', err);
      return { success: false, commits: [] };
    }
  }
}

export const sourceManager = new SourceManager();
