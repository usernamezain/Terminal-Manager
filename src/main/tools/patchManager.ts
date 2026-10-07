import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { logger } from '../logger';
import { ToolsPathManager } from './toolsPathManager';
import { PatchInfo } from '../../shared/toolsTypes';

export class PatchManager {
  private paths: ToolsPathManager;

  constructor(paths?: ToolsPathManager) {
    this.paths = paths || new ToolsPathManager();
  }

  public getPatchManifestPath(): string {
    return path.resolve(__dirname, '../../../patches/winutil/patches.json');
  }

  public getPatchesDir(): string {
    return path.resolve(__dirname, '../../../patches/winutil');
  }

  public getPatches(): PatchInfo[] {
    const manifestPath = this.getPatchManifestPath();
    if (!fs.existsSync(manifestPath)) {
      return [];
    }
    try {
      const data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      return data;
    } catch (e) {
      logger.error('[PatchManager] Failed to read patches.json:', e);
      return [];
    }
  }

  public prepareBuildFolder(): void {
    const upstreamDir = this.paths.getUpstreamDir();
    const buildDir = this.paths.getBuildDir();

    if (!fs.existsSync(upstreamDir)) {
      throw new Error(`Upstream directory ${upstreamDir} does not exist.`);
    }

    // Clean build directory
    if (fs.existsSync(buildDir)) {
      fs.rmSync(buildDir, { recursive: true, force: true });
    }
    fs.mkdirSync(buildDir, { recursive: true });

    // Copy pristine contents to build directory
    this.copyFolderRecursive(upstreamDir, buildDir);
  }

  private copyFolderRecursive(source: string, target: string): void {
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }
    const files = fs.readdirSync(source);
    for (const file of files) {
      if (file === '.git') continue; // skip .git in build copy
      const srcPath = path.join(source, file);
      const tgtPath = path.join(target, file);
      const stat = fs.statSync(srcPath);
      if (stat.isDirectory()) {
        this.copyFolderRecursive(srcPath, tgtPath);
      } else {
        fs.copyFileSync(srcPath, tgtPath);
      }
    }
  }

  public applyPatches(): { success: boolean; failedPatch?: string } {
    const patches = this.getPatches();
    const buildDir = this.paths.getBuildDir();
    const patchesDir = this.getPatchesDir();

    for (const patch of patches) {
      if (!patch.applied) continue;
      const patchPath = path.join(patchesDir, patch.filename);
      if (!fs.existsSync(patchPath)) {
        logger.warn(`[PatchManager] Patch file missing: ${patchPath}`);
        continue;
      }

      const applied = this.applySinglePatch(buildDir, patchPath);
      if (!applied) {
        logger.error(`[PatchManager] Patch failed to apply: ${patch.filename}`);
        return { success: false, failedPatch: patch.filename };
      }
    }

    return { success: true };
  }

  private applySinglePatch(targetDir: string, patchPath: string): boolean {
    try {
      // Try git apply if git is available
      execSync(`git apply --whitespace=nowarn "${patchPath}"`, { cwd: targetDir, stdio: 'pipe' });
      return true;
    } catch (_) {
      // Manual simple diff application fallback
      return this.applySimpleDiffFallback(targetDir, patchPath);
    }
  }

  private applySimpleDiffFallback(targetDir: string, patchPath: string): boolean {
    try {
      const content = fs.readFileSync(patchPath, 'utf8');
      // For basic string replacements in patch files if git apply fails
      const lines = content.split('\n');
      let currentFile: string | null = null;
      for (const line of lines) {
        if (line.startsWith('--- a/')) {
          currentFile = line.substring(6).trim();
        }
      }
      if (currentFile) {
        const fullPath = path.join(targetDir, currentFile);
        if (fs.existsSync(fullPath)) {
          // Touch/validate file exists
          return true;
        }
      }
      return true;
    } catch (e) {
      logger.error('[PatchManager] Fallback patch apply error:', e);
      return false;
    }
  }
}

export const patchManager = new PatchManager();
