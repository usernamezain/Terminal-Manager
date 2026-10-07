import path from 'path';
import fs from 'fs';
import { app } from 'electron';

export class ToolsPathManager {
  private baseDir: string;

  constructor(customBaseDir?: string) {
    if (customBaseDir) {
      this.baseDir = customBaseDir;
    } else {
      try {
        this.baseDir = path.join(app.getPath('userData'), 'tools');
      } catch (_) {
        // Fallback for non-electron test env
        this.baseDir = path.resolve(process.cwd(), 'scratch/test-tools-data');
      }
    }
    this.ensureDirs();
  }

  public getBaseDir(): string {
    return this.baseDir;
  }

  public getUpstreamDir(): string {
    return path.join(this.baseDir, 'winutil-upstream');
  }

  public getBuildDir(): string {
    return path.join(this.baseDir, 'winutil-build');
  }

  public getCustomizationPath(): string {
    return path.join(this.baseDir, 'customization.json');
  }

  public getCompiledScriptPath(): string {
    return path.join(this.baseDir, 'winutil.ps1');
  }

  public getLastGoodScriptPath(): string {
    return path.join(this.baseDir, 'last-good', 'winutil.ps1');
  }

  public getRemovalsReportPath(): string {
    return path.join(this.baseDir, 'removals-report.json');
  }

  public ensureDirs(): void {
    const dirs = [
      this.baseDir,
      this.getUpstreamDir(),
      this.getBuildDir(),
      path.join(this.baseDir, 'last-good'),
    ];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }
}

export const toolsPathManager = new ToolsPathManager();
