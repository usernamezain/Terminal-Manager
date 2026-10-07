import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';
import { DependencyItemStatus, ProgressEventPayload } from '../../shared/shellExperienceTypes';
import { pathManager } from './pathManager';
import { whichSync } from '../shellDetector';
import { logger } from '../logger';

export class DependencyManager {
  public async getStatusList(): Promise<DependencyItemStatus[]> {
    const pwshPath = whichSync('pwsh.exe');
    const ompPath = whichSync('oh-my-posh.exe') || whichSync('oh-my-posh');
    const zoxidePath = whichSync('zoxide.exe') || whichSync('zoxide');

    const pwshInstalled = !!pwshPath;
    const ompInstalled = !!ompPath;
    const zoxideInstalled = !!zoxidePath;
    const iconsInstalled = this.checkTerminalIconsInstalled();
    const fontInstalled = this.checkNerdFontInstalled();

    return [
      {
        id: 'pwsh',
        name: 'PowerShell 7+',
        installed: pwshInstalled,
        path: pwshPath || undefined,
        commandRequired: 'winget install --id Microsoft.PowerShell --exact --source winget',
        details: pwshInstalled ? 'Installed on PATH' : 'Missing (PowerShell 5.1 fallback active)',
      },
      {
        id: 'ohmyposh',
        name: 'Oh My Posh',
        installed: ompInstalled,
        path: ompPath || undefined,
        commandRequired: 'winget install --id JanDeDobbeleer.OhMyPosh --exact --source winget',
        details: ompInstalled ? 'Installed on PATH' : 'Missing (Prompt themes disabled)',
      },
      {
        id: 'zoxide',
        name: 'zoxide',
        installed: zoxideInstalled,
        path: zoxidePath || undefined,
        commandRequired: 'winget install --id ajeetdsouza.zoxide --exact --source winget',
        details: zoxideInstalled ? 'Installed on PATH' : 'Missing (Directory navigation fallback)',
      },
      {
        id: 'terminalicons',
        name: 'Terminal-Icons Module',
        installed: iconsInstalled,
        commandRequired: 'Install-Module -Name Terminal-Icons -Repository PSGallery -Scope CurrentUser -Force',
        details: iconsInstalled ? 'PSGallery module present' : 'Missing (File icons disabled)',
      },
      {
        id: 'nerdfont',
        name: 'CaskaydiaCove Nerd Font',
        installed: fontInstalled,
        commandRequired: 'Expand-Archive CascadiaCode.zip -> %LOCALAPPDATA%\\Microsoft\\Windows\\Fonts',
        details: fontInstalled ? 'Registered in User Fonts' : 'Missing (Powerline glyphs degraded)',
      },
    ];
  }

  public async installItem(
    itemId: string,
    onProgress: (payload: ProgressEventPayload) => void
  ): Promise<boolean> {
    logger.info(`Installing dependency item: ${itemId}`);
    onProgress({ step: itemId, label: `Starting ${itemId} installation`, state: 'running' });

    try {
      if (itemId === 'pwsh') {
        return this.runCommand(
          'winget',
          ['install', '--id', 'Microsoft.PowerShell', '--exact', '--source', 'winget', '--accept-source-agreements', '--accept-package-agreements', '--silent'],
          onProgress,
          itemId
        );
      } else if (itemId === 'ohmyposh') {
        return this.runCommand(
          'winget',
          ['install', '--id', 'JanDeDobbeleer.OhMyPosh', '--exact', '--source', 'winget', '--accept-source-agreements', '--accept-package-agreements', '--silent'],
          onProgress,
          itemId
        );
      } else if (itemId === 'zoxide') {
        return this.runCommand(
          'winget',
          ['install', '--id', 'ajeetdsouza.zoxide', '--exact', '--source', 'winget', '--accept-source-agreements', '--accept-package-agreements', '--silent'],
          onProgress,
          itemId
        );
      } else if (itemId === 'terminalicons') {
        const shell = whichSync('pwsh.exe') || 'powershell.exe';
        return this.runCommand(
          shell,
          ['-NoProfile', '-Command', 'Install-Module -Name Terminal-Icons -Repository PSGallery -Scope CurrentUser -Force -SkipPublisherCheck'],
          onProgress,
          itemId
        );
      } else if (itemId === 'nerdfont') {
        return this.installNerdFontNatively(onProgress);
      }
    } catch (err) {
      logger.error(`Failed to install ${itemId}:`, err);
      onProgress({ step: itemId, label: `Installation error: ${String(err)}`, state: 'error', detail: String(err) });
      return false;
    }

    return false;
  }

  private checkTerminalIconsInstalled(): boolean {
    try {
      const shell = whichSync('pwsh.exe') || 'powershell.exe';
      const res = execSync(`"${shell}" -NoProfile -Command "Get-Module -ListAvailable -Name Terminal-Icons"`, { timeout: 5000 });
      return res.toString().includes('Terminal-Icons');
    } catch {
      return false;
    }
  }

  private checkNerdFontInstalled(): boolean {
    if (process.platform !== 'win32') return true;
    const localFontsDir = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Windows', 'Fonts');
    if (fs.existsSync(localFontsDir)) {
      const files = fs.readdirSync(localFontsDir);
      if (files.some(f => f.toLowerCase().includes('caskaydia') || f.toLowerCase().includes('cascadiacode'))) {
        return true;
      }
    }
    return false;
  }

  private async installNerdFontNatively(onProgress: (payload: ProgressEventPayload) => void): Promise<boolean> {
    onProgress({ step: 'nerdfont', label: 'Downloading CaskaydiaCove Nerd Font archive...', state: 'running' });
    const fontUrl = 'https://github.com/ryanoasis/nerd-fonts/releases/download/v3.2.1/CascadiaCode.zip';
    const fontsDir = pathManager.getFontsDir();
    const zipPath = path.join(fontsDir, 'CascadiaCode.zip');

    try {
      execSync(`powershell -NoProfile -Command "Invoke-WebRequest -Uri '${fontUrl}' -OutFile '${zipPath}'"`, { timeout: 30000 });
      onProgress({ step: 'nerdfont', label: 'Extracting font files...', state: 'running' });

      const extractDir = path.join(fontsDir, 'extracted');
      if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true });
      fs.mkdirSync(extractDir, { recursive: true });

      execSync(`powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force"`, { timeout: 15000 });

      const targetUserFonts = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Windows', 'Fonts');
      if (!fs.existsSync(targetUserFonts)) fs.mkdirSync(targetUserFonts, { recursive: true });

      const ttfFiles = fs.readdirSync(extractDir).filter(f => f.endsWith('.ttf'));
      for (const file of ttfFiles) {
        const src = path.join(extractDir, file);
        const dest = path.join(targetUserFonts, file);
        fs.copyFileSync(src, dest);

        // Register font in HKCU registry
        const regCmd = `reg add "HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Fonts" /v "${file} (TrueType)" /t REG_SZ /d "${dest}" /f`;
        try { execSync(regCmd, { stdio: 'ignore' }); } catch {}
      }

      onProgress({ step: 'nerdfont', label: 'CaskaydiaCove Nerd Font installed successfully!', state: 'done' });
      return true;
    } catch (err) {
      onProgress({ step: 'nerdfont', label: `Font install failed: ${String(err)}`, state: 'error' });
      return false;
    }
  }

  private runCommand(
    bin: string,
    args: string[],
    onProgress: (payload: ProgressEventPayload) => void,
    step: string
  ): Promise<boolean> {
    return new Promise((resolve) => {
      onProgress({ step, label: `Executing: ${bin} ${args.join(' ')}`, state: 'running' });
      const child = spawn(bin, args, { shell: true });

      child.on('close', (code) => {
        if (code === 0) {
          onProgress({ step, label: 'Installation completed successfully', state: 'done' });
          resolve(true);
        } else {
          onProgress({ step, label: `Process exited with code ${code}`, state: 'error' });
          resolve(false);
        }
      });

      child.on('error', (err) => {
        onProgress({ step, label: `Execution failed: ${err.message}`, state: 'error' });
        resolve(false);
      });
    });
  }
}

export const dependencyManager = new DependencyManager();
