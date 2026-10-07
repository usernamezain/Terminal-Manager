import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { logger } from '../logger';
import { ToolsPathManager } from './toolsPathManager';
import { sourceManager } from './sourceManager';
import { patchManager } from './patchManager';
import { transformEngine } from './transformEngine';
import { forbiddenScanner } from './forbiddenScanner';
import {
  CustomizationConfig,
  CustomizationSchema,
  SystemToolsStatus,
  BuildProgressEvent,
} from '../../shared/toolsTypes';

export class CompileManager {
  private paths: ToolsPathManager;
  private buildFallbackUsed?: 'last-good' | 'unpatched-upstream';

  constructor(paths?: ToolsPathManager) {
    this.paths = paths || new ToolsPathManager();
  }

  public getCustomizationConfig(): CustomizationConfig {
    const customPath = this.paths.getCustomizationPath();
    if (!fs.existsSync(customPath)) {
      const defaultConfig = CustomizationSchema.parse({});
      fs.writeFileSync(customPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
      return defaultConfig;
    }
    try {
      const raw = JSON.parse(fs.readFileSync(customPath, 'utf8'));
      return CustomizationSchema.parse(raw);
    } catch (e) {
      logger.error('[CompileManager] Failed to load customization.json, using defaults:', e);
      return CustomizationSchema.parse({});
    }
  }

  public saveCustomizationConfig(config: CustomizationConfig): void {
    const customPath = this.paths.getCustomizationPath();
    const validated = CustomizationSchema.parse(config);
    fs.writeFileSync(customPath, JSON.stringify(validated, null, 2), 'utf8');
  }

  public getStatus(): SystemToolsStatus {
    const isWin = process.platform === 'win32';
    const upstreamExists = sourceManager.upstreamExists();
    const commitInfo = upstreamExists ? sourceManager.getCommitInfo() : { hash: undefined, date: undefined };

    const compiledPath = this.paths.getCompiledScriptPath();
    const buildExists = fs.existsSync(compiledPath);
    let buildScriptHash: string | undefined;

    if (buildExists) {
      const content = fs.readFileSync(compiledPath);
      buildScriptHash = crypto.createHash('sha256').update(content).digest('hex');
    }

    const patches = patchManager.getPatches();
    const scanResult = forbiddenScanner.scanCompiledScript();

    return {
      isSupportedPlatform: isWin || process.env.TERMINAL_MANAGER_E2E === '1',
      toolsDir: this.paths.getBaseDir(),
      upstreamExists,
      upstreamCommitHash: commitInfo.hash,
      upstreamCommitDate: commitInfo.date,
      isPinned: sourceManager.isPinned(),
      pinnedRef: sourceManager.getPinnedRef() || undefined,
      devBranch: sourceManager.isDevBranch(),
      buildExists,
      buildScriptHash,
      patches,
      buildFallbackUsed: this.buildFallbackUsed,
      forbiddenScanClean: scanResult.clean,
      forbiddenScanReport: {
        totalMatches: scanResult.matches.length,
        filesScanned: buildExists ? 1 : 0,
        removalsCount: scanResult.matches.length,
      },
    };
  }

  public async runFullBuildPipeline(
    onProgress?: (event: BuildProgressEvent) => void
  ): Promise<{ success: boolean; hash?: string; error?: string }> {
    try {
      // Step 1: Clone / Fetch
      onProgress?.({ step: 'clone', label: 'Cloning upstream repository...', state: 'running' });
      const cloneOk = await sourceManager.fetchOrCloneUpstream((detail) => {
        onProgress?.({ step: 'clone', label: 'Cloning upstream repository', state: 'running', detail });
      });
      if (!cloneOk) {
        onProgress?.({ step: 'clone', label: 'Failed to clone upstream repository', state: 'error' });
        return { success: false, error: 'Failed to clone upstream repository' };
      }
      onProgress?.({ step: 'clone', label: 'Upstream pristine repository ready', state: 'done' });

      // Step 2: Prepare build folder & apply patches
      onProgress?.({ step: 'patch', label: 'Applying patches to build copy...', state: 'running' });
      patchManager.prepareBuildFolder();
      const patchResult = patchManager.applyPatches();

      if (!patchResult.success) {
        logger.warn(`[CompileManager] Patch ${patchResult.failedPatch} failed. Using fallback build mode.`);
        if (fs.existsSync(this.paths.getLastGoodScriptPath())) {
          fs.copyFileSync(this.paths.getLastGoodScriptPath(), this.paths.getCompiledScriptPath());
          this.buildFallbackUsed = 'last-good';
          onProgress?.({
            step: 'patch',
            label: `Patch ${patchResult.failedPatch} failed. Restored last good build fallback.`,
            state: 'done',
          });
        } else {
          this.buildFallbackUsed = 'unpatched-upstream';
          onProgress?.({
            step: 'patch',
            label: `Patch ${patchResult.failedPatch} failed. Falling back to unpatched upstream.`,
            state: 'done',
          });
        }
      } else {
        onProgress?.({ step: 'patch', label: 'Patches applied successfully', state: 'done' });
      }

      // Step 3: Customize (Build-time transforms)
      onProgress?.({ step: 'customize', label: 'Applying customization transforms...', state: 'running' });
      const customConfig = this.getCustomizationConfig();
      const transformReports = transformEngine.applyTransforms(customConfig);
      onProgress?.({
        step: 'customize',
        label: `Applied ${transformReports.filter((r) => r.matched).length} custom transforms`,
        state: 'done',
      });

      // Step 4: Compile
      onProgress?.({ step: 'compile', label: 'Compiling winutil.ps1 script...', state: 'running' });
      const compileOk = this.executeCompileScript();
      if (!compileOk) {
        onProgress?.({ step: 'compile', label: 'Failed to execute Compile.ps1', state: 'error' });
        return { success: false, error: 'Failed to execute Compile.ps1 script' };
      }

      const compiledPath = this.paths.getCompiledScriptPath();
      const scriptContent = fs.readFileSync(compiledPath);
      const hash = crypto.createHash('sha256').update(scriptContent).digest('hex');

      // Update last-good copy
      fs.copyFileSync(compiledPath, this.paths.getLastGoodScriptPath());

      onProgress?.({ step: 'ready', label: `Build complete! Hash: ${hash.substring(0, 12)}`, state: 'done' });
      return { success: true, hash };
    } catch (err: any) {
      logger.error('[CompileManager] Build pipeline failed:', err);
      onProgress?.({ step: 'compile', label: 'Build pipeline error', state: 'error', detail: err.message });
      return { success: false, error: err.message || 'Build pipeline error' };
    }
  }

  private executeCompileScript(): boolean {
    const buildDir = this.paths.getBuildDir();
    const compileScriptPath = path.join(buildDir, 'Compile.ps1');
    const builtWinutilPath = path.join(buildDir, 'winutil.ps1');
    const targetScriptPath = this.paths.getCompiledScriptPath();

    if (!fs.existsSync(compileScriptPath)) {
      logger.error(`[CompileManager] Compile.ps1 missing at ${compileScriptPath}`);
      return false;
    }

    try {
      execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${compileScriptPath}"`, {
        cwd: buildDir,
        stdio: 'pipe',
      });
    } catch (err) {
      logger.error('[CompileManager] Compile.ps1 execution error:', err);
      return false;
    }

    if (fs.existsSync(builtWinutilPath)) {
      fs.copyFileSync(builtWinutilPath, targetScriptPath);
      logger.info(`[CompileManager] Successfully compiled winutil.ps1 (${fs.statSync(targetScriptPath).size} bytes)`);
      return true;
    }

    logger.error('[CompileManager] Compiled winutil.ps1 missing after Compile.ps1 execution');
    return false;
  }
}

export const compileManager = new CompileManager();
