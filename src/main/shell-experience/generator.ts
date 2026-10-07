import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ShellExperienceSettings } from '../../shared/shellExperienceTypes';
import { pathManager } from './pathManager';
import { themeManager } from './themeManager';
import { logger } from '../logger';

export class CttGenerator {
  private startMarker = '# >>> TERMINAL-MANAGER MANAGED BLOCK (regenerated from Settings; edit in the app) >>>';
  private endMarker = '# <<< END MANAGED BLOCK <<<';

  public generate(settings: ShellExperienceSettings): string {
    const customScriptPath = pathManager.getCustomScriptPath();
    let existingUserRegion = '';

    if (fs.existsSync(customScriptPath)) {
      const content = fs.readFileSync(customScriptPath, 'utf8');
      const parts = content.split(this.endMarker);
      if (parts.length > 1 && parts[1]) {
        existingUserRegion = parts[1];
      }
    }

    if (settings.advanced.rawUserCode) {
      existingUserRegion = '\n' + settings.advanced.rawUserCode.trim() + '\n';
    }

    const managedBlock = this.buildManagedBlock(settings);
    const fullScript = `${managedBlock}\n${this.endMarker}\n${existingUserRegion.trimStart()}`;

    // Atomic write (write to temp file then rename)
    const tempPath = `${customScriptPath}.tmp`;
    try {
      fs.writeFileSync(tempPath, fullScript, 'utf8');
      fs.renameSync(tempPath, customScriptPath);
      logger.info(`Generated CTTcustom.ps1 cleanly at ${customScriptPath}`);
    } catch (err) {
      logger.error('Failed to generate CTTcustom.ps1:', err);
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      throw err;
    }

    return fullScript;
  }

  public readUserRegion(): string {
    const customScriptPath = pathManager.getCustomScriptPath();
    if (!fs.existsSync(customScriptPath)) return '';

    const content = fs.readFileSync(customScriptPath, 'utf8');
    const parts = content.split(this.endMarker);
    return parts.length > 1 && parts[1] ? parts[1].trim() : '';
  }

  public parseSettingsFromScript(): Partial<ShellExperienceSettings> | null {
    const customScriptPath = pathManager.getCustomScriptPath();
    if (!fs.existsSync(customScriptPath)) return null;

    try {
      const content = fs.readFileSync(customScriptPath, 'utf8');
      const match = content.match(/# settings:\s*({.*})/);
      if (match && match[1]) {
        return JSON.parse(match[1]);
      }
    } catch (err) {
      logger.warn('Failed to parse settings JSON comment from CTTcustom.ps1:', err);
    }
    return null;
  }

  private buildManagedBlock(settings: ShellExperienceSettings): string {
    const escapedEditor = this.escapePsString(settings.editor === 'auto' ? 'code' : settings.editor);
    const timeFilePath = this.escapePsString(pathManager.getLastExecutionTimePath());
    const themesDir = pathManager.getThemesDir();
    const themeFileName = `${settings.activeTheme}.omp.json`;
    const themeFilePath = path.join(themesDir, themeFileName);
    const bundledThemePath = path.join(themesDir, 'cobalt2.omp.json');

    // Ensure default cobalt2 is always available on disk
    try {
      themeManager.ensureCobalt2Theme();
    } catch {}

    let themeHash = 'default';
    try {
      let content = '';
      if (fs.existsSync(themeFilePath)) {
        content = fs.readFileSync(themeFilePath, 'utf8');
      } else if (fs.existsSync(bundledThemePath)) {
        content = fs.readFileSync(bundledThemePath, 'utf8');
      }
      themeHash = crypto.createHash('md5').update(`${content}_${themeFilePath}`).digest('hex').substring(0, 8);
    } catch {
      // ignore
    }

    const cacheFileName = `omp_${settings.activeTheme}_${themeHash}_cache.ps1`;
    const cacheFilePath = path.join(themesDir, cacheFileName);

    const sensitiveRegex = settings.prediction.sensitiveFilters.length > 0
      ? settings.prediction.sensitiveFilters.map(f => this.escapeRegexp(f)).join('|')
      : 'password|secret|token|apikey|connectionstring';

    const colorItems = Object.entries(settings.colors)
      .map(([k, v]) => `    ${k} = '${this.escapePsString(v)}'`)
      .join('\n');

    const keybindingLines = settings.keybindings
      .map(k => `  Set-PSReadLineKeyHandler -Chord '${this.escapePsString(k.chord)}' -Function '${this.escapePsString(k.function)}'`)
      .join('\n');

    const disabledCmdList = settings.disabledCommands
      .map(cmd => `'${this.escapePsString(cmd)}'`)
      .join(', ');

    const customAliasLines = settings.customAliases.map(a => {
      if (a.isFunction && a.body) {
        return `  function ${a.name} {\n    ${a.body}\n  }`;
      } else {
        return `  Set-Alias -Name '${this.escapePsString(a.name)}' -Value '${this.escapePsString(a.value)}' -Force`;
      }
    }).join('\n');

    const envVarLines = Object.entries(settings.customEnvVars)
      .map(([k, v]) => `  $env:${k} = '${this.escapePsString(v)}'`)
      .join('\n');

    const jsonHeader = JSON.stringify(settings);

    const escapedThemeFilePath = this.escapePsString(themeFilePath);
    const escapedBundledThemePath = this.escapePsString(bundledThemePath);
    const escapedCacheFilePath = this.escapePsString(cacheFilePath);

    return `${this.startMarker}
# settings: ${jsonHeader}

# Pre-fix built-in 'gp' alias if it has AllScope option (Windows PowerShell 5.1 compatibility)
try {
  $gpAlias = Get-Item alias:gp -ErrorAction SilentlyContinue
  if ($gpAlias -and ($gpAlias.Options -band [System.Management.Automation.ScopedItemOptions]::AllScope)) {
    $field = $gpAlias.GetType().GetField('options', [System.Reflection.BindingFlags]'Instance, NonPublic')
    if ($field) {
      $field.SetValue($gpAlias, [System.Management.Automation.ScopedItemOptions]::None)
    }
    Remove-Item alias:gp -Force -ErrorAction SilentlyContinue
  }
} catch {}

# Provide clean zoxide stub when zoxide binary is missing on system
$zoxideCmd = Get-Command zoxide -ErrorAction SilentlyContinue
if ($Error.Count -gt 0) { $Error.Clear() }
if (-not $zoxideCmd) {
  function global:zoxide {
    param([string]$subcommand, [string]$cmd, [string]$shell)
    if ($subcommand -eq 'init') { return '# zoxide fallback' }
  }
}

$EDITOR_Override = '${escapedEditor}'
$debug_Override = $${settings.advanced.debugOverride}
$show_help_Override = $${settings.showHelpOnLaunch}
$timeFilePath_Override = '${timeFilePath}'
$updateInterval_Override = ${settings.advanced.updateIntervalDays}

function Update-Profile_Override {
  Write-Host 'Profile updates are managed by Terminal Manager (Settings > Shell Experience).' -ForegroundColor Yellow
}

function Get-Theme_Override {
  $ompCacheFile = '${escapedCacheFilePath}'
  $targetThemeFile = '${escapedThemeFilePath}'
  $bundledThemeFile = '${escapedBundledThemePath}'

  $effectiveTheme = $targetThemeFile
  if (-not (Test-Path -Path $targetThemeFile -PathType Leaf)) {
    if (Test-Path -Path $bundledThemeFile -PathType Leaf) {
      Write-Warning 'Specified oh-my-posh theme config missing or invalid. Falling back to bundled cobalt2 theme.'
      $effectiveTheme = $bundledThemeFile
    }
  }

  $fastStart = $${settings.advanced.fastStart}
  if ($fastStart -and (Test-Path -Path $ompCacheFile -PathType Leaf)) {
    try {
      $item = Get-Item $ompCacheFile
      if ($item.Length -ge 500) {
        $cacheText = Get-Content -Path $ompCacheFile -Raw -ErrorAction SilentlyContinue
        if ($cacheText -and ($cacheText -match 'oh-my-posh' -or $cacheText -match '_omp_executable' -or $cacheText -match '\$env:POSH_THEME' -or $cacheText -match 'function global:prompt')) {
          . $ompCacheFile
          return
        }
      }
    } catch {}
  }

  if (Get-Command oh-my-posh -ErrorAction SilentlyContinue) {
    try {
      $script = & oh-my-posh init pwsh --config "$effectiveTheme" 2>$null
      if ($LASTEXITCODE -eq 0 -and $script -and $script.Length -ge 500 -and ($script -match 'oh-my-posh' -or $script -match '_omp_executable' -or $script -match '\$env:POSH_THEME' -or $script -match 'function global:prompt')) {
        if ($fastStart) {
          try { Set-Content -Path $ompCacheFile -Value $script -Encoding UTF8 -ErrorAction SilentlyContinue } catch {}
        }
        Invoke-Expression $script
        return
      }
    } catch {}

    # Fall back to default oh-my-posh init if custom config initialization failed
    oh-my-posh init pwsh | Invoke-Expression
  } else {
    Write-Warning 'oh-my-posh is not installed. Open Settings > Shell Experience.'
  }

  if ($fastStart) {
    Register-EngineEvent -SourceIdentifier PowerShell.OnIdle -MaxTriggerCount 1 -Action {
      if (Get-Module -ListAvailable -Name Terminal-Icons) {
        Import-Module Terminal-Icons -ErrorAction SilentlyContinue
      }
    } | Out-Null
  }
}

function Set-PredictionSource_Override {
  if ($PSVersionTable.PSEdition -eq 'Core') {
    Set-PSReadLineOption -PredictionSource '${settings.prediction.predictionSource}' -PredictionViewStyle '${settings.prediction.viewStyle}'
  }
  Set-PSReadLineOption -MaximumHistoryCount ${settings.prediction.maximumHistoryCount}
  Set-PSReadLineOption -BellStyle '${settings.prediction.bellStyle}'
  Set-PSReadLineOption -EditMode '${settings.prediction.editMode}'

  $colors = @{
${colorItems}
  }
  Set-PSReadLineOption -Colors $colors

${keybindingLines}

  Set-PSReadLineOption -AddToHistoryHandler {
    param([string]$line)
    $line -notmatch '(?i)(${sensitiveRegex})'
  }

  $disabled = @(${disabledCmdList})
  foreach ($cmd in $disabled) {
    if ($cmd) {
      Remove-Item "Function:\\$cmd" -ErrorAction SilentlyContinue
      Remove-Item "Alias:\\$cmd" -ErrorAction SilentlyContinue
    }
  }

${customAliasLines}
${envVarLines}
}`;
  }

  private escapePsString(val: string): string {
    return val.replace(/'/g, "''");
  }

  private escapeRegexp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export const cttGenerator = new CttGenerator();
