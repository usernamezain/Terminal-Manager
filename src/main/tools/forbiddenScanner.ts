import fs from 'fs';
import path from 'path';
import { ToolsPathManager } from './toolsPathManager';

export const FORBIDDEN_PATTERNS = [
  /discord\.gg/i,
  /discord\.com\/invite/i,
  /github\.com\/sponsors/i,
  /patreon\.com/i,
  /ko-fi\.com/i,
  /buymeacoffee\.com/i,
  /paypal\.me/i,
  /cttstore/i,
  /youtube\.com\/c\//i,
  /youtube\.com\/christitustech/i,
  /twitter\.com/i,
  /x\.com/i,
  /reddit\.com\/r\//i,
  /"donate"/i,
  /"sponsor"/i,
  /"support the project"/i,
];

export interface ScanMatch {
  file: string;
  line: number;
  pattern: string;
  matchedText: string;
}

export class ForbiddenScanner {
  private paths: ToolsPathManager;

  constructor(paths?: ToolsPathManager) {
    this.paths = paths || new ToolsPathManager();
  }

  public scanCompiledScript(): { clean: boolean; matches: ScanMatch[] } {
    const scriptPath = this.paths.getCompiledScriptPath();
    if (!fs.existsSync(scriptPath)) {
      return { clean: true, matches: [] };
    }
    return this.scanFile(scriptPath);
  }

  public scanDirectory(dirPath: string, allowedFiles: string[] = []): { clean: boolean; matches: ScanMatch[] } {
    const matches: ScanMatch[] = [];
    if (!fs.existsSync(dirPath)) {
      return { clean: true, matches };
    }

    this.walkDir(dirPath, (filePath) => {
      const filename = path.basename(filePath);
      if (allowedFiles.some((allowed) => filePath.includes(allowed) || filename === allowed)) {
        return; // Skip allowed license/attribution files
      }

      const fileResult = this.scanFile(filePath);
      if (!fileResult.clean) {
        matches.push(...fileResult.matches);
      }
    });

    return {
      clean: matches.length === 0,
      matches,
    };
  }

  public scanFile(filePath: string): { clean: boolean; matches: ScanMatch[] } {
    const matches: ScanMatch[] = [];
    if (!fs.existsSync(filePath)) {
      return { clean: true, matches };
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        for (const pattern of FORBIDDEN_PATTERNS) {
          if (pattern.test(line)) {
            matches.push({
              file: filePath,
              line: index + 1,
              pattern: pattern.source,
              matchedText: line.trim().substring(0, 100),
            });
          }
        }
      });
    } catch (_) {}

    return {
      clean: matches.length === 0,
      matches,
    };
  }

  private walkDir(dir: string, callback: (filePath: string) => void): void {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        if (file === 'node_modules' || file === '.git' || file === 'dist') continue;
        this.walkDir(fullPath, callback);
      } else {
        callback(fullPath);
      }
    }
  }
}

export const forbiddenScanner = new ForbiddenScanner();
