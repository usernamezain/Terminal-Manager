import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { ThemeInfo } from '../../shared/shellExperienceTypes';
import { pathManager } from './pathManager';
import { whichSync } from '../shellDetector';
import { logger } from '../logger';

export class ThemeManager {
  private defaultThemes = [
    'cobalt2',
    'agnoster',
    'jandedobbeleer',
    'paradox',
    'sorin',
    'avit',
    'robbyrussell',
    'powerlevel10k_rainbow',
    'clean-detailed',
  ];

  public listThemes(): ThemeInfo[] {
    const themesDir = pathManager.getThemesDir();
    const themes: ThemeInfo[] = [];

    // Ensure default cobalt2 is copied to themesDir
    this.ensureCobalt2Theme();

    if (fs.existsSync(themesDir)) {
      const files = fs.readdirSync(themesDir).filter(f => f.endsWith('.omp.json') || f.endsWith('.omp.yaml'));
      for (const f of files) {
        const name = f.replace(/\.omp\.(json|yaml)$/, '');
        themes.push({
          name,
          path: path.join(themesDir, f),
          isCustom: name !== 'cobalt2',
        });
      }
    }

    for (const name of this.defaultThemes) {
      if (!themes.some(t => t.name === name)) {
        themes.push({
          name,
          path: path.join(themesDir, `${name}.omp.json`),
          isCustom: false,
        });
      }
    }

    return themes;
  }

  public ensureCobalt2Theme(): string {
    const themesDir = pathManager.getThemesDir();
    const cobaltPath = path.join(themesDir, 'cobalt2.omp.json');

    if (!fs.existsSync(cobaltPath)) {
      const defaultCobalt2Json = `{
  "$schema": "https://raw.githubusercontent.com/JanDeDobbeleer/oh-my-posh/main/themes/schema.json",
  "blocks": [
    {
      "alignment": "left",
      "segments": [
        {
          "background": "#ffeb3b",
          "foreground": "#000000",
          "powerline_symbol": "",
          "style": "powerline",
          "template": " {{ .Path }} ",
          "type": "path"
        },
        {
          "background": "#22da6e",
          "foreground": "#000000",
          "powerline_symbol": "",
          "style": "powerline",
          "template": " {{ .HEAD }} ",
          "type": "git"
        }
      ],
      "type": "prompt"
    }
  ],
  "version": 3
}`;
      fs.writeFileSync(cobaltPath, defaultCobalt2Json, 'utf8');
    }
    return cobaltPath;
  }

  public async previewTheme(themeName: string): Promise<string> {
    const ompBin = whichSync('oh-my-posh.exe') || whichSync('oh-my-posh');
    const themesDir = pathManager.getThemesDir();
    const themeFile = path.join(themesDir, `${themeName}.omp.json`);

    if (!ompBin || !fs.existsSync(themeFile)) {
      // Fallback mock ANSI prompt for cobalt2 / themes when oh-my-posh binary isn't present
      return `\x1b[48;2;255;235;59m\x1b[38;2;0;0;0m C:\\Users\\Administrator \x1b[48;2;34;218;110m\x1b[38;2;255;235;59m\x1b[38;2;0;0;0m  main \x1b[0m\x1b[38;2;34;218;110m\x1b[0m `;
    }

    try {
      const output = execSync(`"${ompBin}" print primary --config "${themeFile}" --shell pwsh`, {
        timeout: 3000,
      }).toString();
      return output;
    } catch (err) {
      logger.warn(`Failed to generate theme preview via oh-my-posh:`, err);
      return `\x1b[33m[${themeName}]\x1b[0m C:\\Users\\Desktop > `;
    }
  }
}

export const themeManager = new ThemeManager();
