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

  public getSystemThemesDir(): string | null {
    // 1. Check POSH_THEMES_PATH env var
    if (process.env.POSH_THEMES_PATH && fs.existsSync(process.env.POSH_THEMES_PATH)) {
      return process.env.POSH_THEMES_PATH;
    }

    // 2. Check localappdata Programs/oh-my-posh/themes
    const localAppData = process.env.LOCALAPPDATA;
    if (localAppData) {
      const p = path.join(localAppData, 'Programs', 'oh-my-posh', 'themes');
      if (fs.existsSync(p)) return p;
    }

    // 3. Check WindowsApps ohmyposh package directory
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const winApps = path.join(programFiles, 'WindowsApps');
    if (fs.existsSync(winApps)) {
      try {
        const matches = fs.readdirSync(winApps).filter(d => d.startsWith('ohmyposh.cli_'));
        for (const m of matches) {
          const p = path.join(winApps, m, 'themes');
          if (fs.existsSync(p)) return p;
        }
      } catch {}
    }

    // 4. User profile .poshthemes
    const homeDir = process.env.USERPROFILE || process.env.HOME;
    if (homeDir) {
      const p = path.join(homeDir, '.poshthemes');
      if (fs.existsSync(p)) return p;
    }

    return null;
  }

  public ensureDefaultThemes(): void {
    const themesDir = pathManager.getThemesDir();
    if (!fs.existsSync(themesDir)) {
      fs.mkdirSync(themesDir, { recursive: true });
    }

    // 1. Try syncing from system oh-my-posh directory if available
    const systemThemesDir = this.getSystemThemesDir();
    if (systemThemesDir && fs.existsSync(systemThemesDir)) {
      try {
        const files = fs.readdirSync(systemThemesDir).filter(f => f.endsWith('.omp.json'));
        for (const f of files) {
          const dest = path.join(themesDir, f);
          if (!fs.existsSync(dest)) {
            try {
              fs.copyFileSync(path.join(systemThemesDir, f), dest);
            } catch {}
          }
        }
      } catch (err) {
        logger.warn('Failed to copy system oh-my-posh themes:', err);
      }
    }

    // 2. Ensure bundled fallback configurations exist for all default presets
    this.ensureCobalt2Theme();
    this.ensureRobbyRussellTheme();
    this.ensureGenericDefaultThemes();
  }

  public listThemes(): ThemeInfo[] {
    const themesDir = pathManager.getThemesDir();
    const themes: ThemeInfo[] = [];

    // Ensure all default themes exist in themesDir
    this.ensureDefaultThemes();

    if (fs.existsSync(themesDir)) {
      const files = fs.readdirSync(themesDir).filter(f => f.endsWith('.omp.json') || f.endsWith('.omp.yaml'));
      for (const f of files) {
        const name = f.replace(/\.omp\.(json|yaml)$/, '');
        themes.push({
          name,
          path: path.join(themesDir, f),
          isCustom: !this.defaultThemes.includes(name),
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

  public ensureRobbyRussellTheme(): string {
    const themesDir = pathManager.getThemesDir();
    const robbyPath = path.join(themesDir, 'robbyrussell.omp.json');

    if (!fs.existsSync(robbyPath)) {
      const robbyJson = `{
  "$schema": "https://raw.githubusercontent.com/JanDeDobbeleer/oh-my-posh/main/themes/schema.json",
  "blocks": [
    {
      "alignment": "left",
      "segments": [
        {
          "foreground": "#00afff",
          "style": "plain",
          "template": "➜ ",
          "type": "text"
        },
        {
          "foreground": "#00d700",
          "style": "plain",
          "template": "{{ .Path }} ",
          "type": "path"
        },
        {
          "foreground": "#ff0055",
          "style": "plain",
          "template": "git:({{ .HEAD }}) ",
          "type": "git"
        }
      ],
      "type": "prompt"
    }
  ],
  "version": 3
}`;
      fs.writeFileSync(robbyPath, robbyJson, 'utf8');
    }
    return robbyPath;
  }

  private ensureGenericDefaultThemes(): void {
    const themesDir = pathManager.getThemesDir();
    for (const name of this.defaultThemes) {
      const p = path.join(themesDir, `${name}.omp.json`);
      if (!fs.existsSync(p)) {
        const json = `{
  "$schema": "https://raw.githubusercontent.com/JanDeDobbeleer/oh-my-posh/main/themes/schema.json",
  "blocks": [
    {
      "alignment": "left",
      "segments": [
        {
          "background": "#007acc",
          "foreground": "#ffffff",
          "powerline_symbol": "",
          "style": "powerline",
          "template": " {{ .Path }} ",
          "type": "path"
        },
        {
          "background": "#2ea44f",
          "foreground": "#ffffff",
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
        try {
          fs.writeFileSync(p, json, 'utf8');
        } catch {}
      }
    }
  }

  public async previewTheme(themeName: string): Promise<string> {
    const ompBin = whichSync('oh-my-posh.exe') || whichSync('oh-my-posh');
    const themesDir = pathManager.getThemesDir();
    let themeFile = path.join(themesDir, `${themeName}.omp.json`);
    if (!fs.existsSync(themeFile)) {
      const yamlFile = path.join(themesDir, `${themeName}.omp.yaml`);
      if (fs.existsSync(yamlFile)) {
        themeFile = yamlFile;
      }
    }

    if (ompBin) {
      try {
        const configArg = fs.existsSync(themeFile) ? themeFile : themeName;
        const output = execSync(`"${ompBin}" print primary --config "${configArg}" --shell pwsh`, {
          timeout: 3000,
        }).toString();
        if (output && output.trim()) {
          return output;
        }
      } catch (err) {
        logger.warn(`Failed to generate theme preview via oh-my-posh:`, err);
      }
    }

    return `\x1b[48;2;255;235;59m\x1b[38;2;0;0;0m C:\\Users\\Administrator \x1b[48;2;34;218;110m\x1b[38;2;255;235;59m\x1b[38;2;0;0;0m  main \x1b[0m\x1b[38;2;34;218;110m\x1b[0m `;
  }
}

export const themeManager = new ThemeManager();
