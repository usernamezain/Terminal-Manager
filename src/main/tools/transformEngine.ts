import fs from 'fs';
import path from 'path';
import { logger } from '../logger';
import { ToolsPathManager } from './toolsPathManager';
import { CustomizationConfig, TransformReportEntry } from '../../shared/toolsTypes';

export class TransformEngine {
  private paths: ToolsPathManager;

  constructor(paths?: ToolsPathManager) {
    this.paths = paths || new ToolsPathManager();
  }

  public applyTransforms(config: CustomizationConfig): TransformReportEntry[] {
    const buildDir = this.paths.getBuildDir();
    const reports: TransformReportEntry[] = [];

    // 1. Branding: Search and Replace in all text/XAML/JSON files in buildDir
    const stringReplacements = config.branding.stringReplacements || [];
    const defaultReplacements = [
      { search: 'Chris Titus Tech', replace: 'System Tools' },
      { search: 'WinUtil', replace: config.branding.productName },
      { search: 'Windows Utility', replace: config.branding.headerText },
    ];

    const allReplacements = [...defaultReplacements, ...stringReplacements];

    // Scan and replace in build folder files
    this.walkDir(buildDir, (filePath) => {
      const ext = path.extname(filePath).toLowerCase();
      if (['.xaml', '.ps1', '.json', '.psm1'].includes(ext)) {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;

        for (const rep of allReplacements) {
          if (!rep.search || !rep.replace) continue;
          if (content.includes(rep.search)) {
            content = content.replaceAll(rep.search, rep.replace);
            modified = true;
            reports.push({
              anchor: `String replacement '${rep.search}'`,
              matched: true,
              result: `Replaced with '${rep.replace}' in ${path.relative(buildDir, filePath)}`,
            });
          }
        }

        // Apply Color/Font XAML resource overrides if XAML file
        if (ext === '.xaml' && config.branding.colors) {
          if (content.includes('SystemAccentColor')) {
            content = content.replaceAll('#0078D4', config.branding.colors.accent);
            modified = true;
            reports.push({
              anchor: 'XAML SystemAccentColor',
              matched: true,
              result: `Updated accent color to ${config.branding.colors.accent}`,
            });
          }
        }

        if (modified) {
          fs.writeFileSync(filePath, content, 'utf8');
        }
      }
    });

    // 2. Content: Merge custom tweaks and apps into config JSON files
    const configJsonPath = path.join(buildDir, 'config', 'config.json');
    if (fs.existsSync(configJsonPath)) {
      try {
        const jsonContent = JSON.parse(fs.readFileSync(configJsonPath, 'utf8'));

        // Update version and productName
        jsonContent.version = `${config.branding.productName} v${config.branding.versionLabel}`;

        // Hide requested tabs
        if (config.hide.tabs && config.hide.tabs.length > 0) {
          jsonContent.tabs = (jsonContent.tabs || []).filter(
            (t: any) => !config.hide.tabs.includes(t.id || t.name)
          );
          reports.push({
            anchor: 'Config JSON Hide Tabs',
            matched: true,
            result: `Filtered out tabs: ${config.hide.tabs.join(', ')}`,
          });
        }

        // Add custom tweaks
        if (config.add.tweaks && config.add.tweaks.length > 0) {
          if (!jsonContent.tweaks) jsonContent.tweaks = [];
          for (const customTweak of config.add.tweaks) {
            jsonContent.tweaks.push({
              id: customTweak.id,
              name: customTweak.name,
              description: customTweak.description,
              category: customTweak.category,
              code: customTweak.script,
              undo: customTweak.undoScript || '',
              isCustom: true,
            });
            reports.push({
              anchor: `Add Custom Tweak ${customTweak.id}`,
              matched: true,
              result: `Added custom tweak: ${customTweak.name}`,
            });
          }
        }

        // Add custom apps
        if (config.add.apps && config.add.apps.length > 0) {
          if (!jsonContent.apps) jsonContent.apps = [];
          for (const customApp of config.add.apps) {
            jsonContent.apps.push({
              id: customApp.id,
              name: customApp.name,
              winget: customApp.winget || '',
              choco: customApp.choco || '',
              isCustom: true,
            });
            reports.push({
              anchor: `Add Custom App ${customApp.id}`,
              matched: true,
              result: `Added custom app: ${customApp.name}`,
            });
          }
        }

        fs.writeFileSync(configJsonPath, JSON.stringify(jsonContent, null, 2), 'utf8');
      } catch (err: any) {
        logger.error('[TransformEngine] Failed to update config.json:', err);
        reports.push({
          anchor: 'Config JSON merge',
          matched: false,
          result: `Error: ${err.message}`,
        });
      }
    } else {
      reports.push({
        anchor: 'Config JSON file exist check',
        matched: false,
        result: 'config.json missing in build folder',
      });
    }

    return reports;
  }

  private walkDir(dir: string, callback: (filePath: string) => void): void {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        this.walkDir(fullPath, callback);
      } else {
        callback(fullPath);
      }
    }
  }
}

export const transformEngine = new TransformEngine();
