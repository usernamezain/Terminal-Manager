import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const FORBIDDEN_PATTERNS = [
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
];

// Allowed files containing third-party licenses or attribution
const ALLOWED_FILES = [
  'ThirdPartyLicensesModal.tsx',
  'licenses.tsx',
  'LICENSE',
  'LICENSES.md',
  'check-forbidden-links.mjs',
  'forbiddenScanner.ts',
  'tools.test.ts',
  '0001-remove-promo-and-sponsors.patch',
  'patches.json',
  'AGENT.md',
];

function scanDirectory(dir) {
  const matches = [];
  if (!fs.existsSync(dir)) return matches;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'dist'].includes(entry.name)) continue;
      matches.push(...scanDirectory(fullPath));
    } else {
      if (ALLOWED_FILES.some((allowed) => fullPath.includes(allowed) || entry.name === allowed)) {
        continue;
      }
      const fileMatches = scanFile(fullPath);
      matches.push(...fileMatches);
    }
  }
  return matches;
}

function scanFile(filePath) {
  const matches = [];
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, lineIdx) => {
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(line)) {
          matches.push({
            file: path.relative(rootDir, filePath),
            line: lineIdx + 1,
            pattern: pattern.source,
            text: line.trim().substring(0, 100),
          });
        }
      }
    });
  } catch (_) {}
  return matches;
}

console.log('[Forbidden Scanner] Checking shipped files and codebase for forbidden promo links...');
const srcMatches = scanDirectory(path.join(rootDir, 'src'));

if (srcMatches.length > 0) {
  console.error('[Forbidden Scanner ERROR] Found forbidden links in codebase:');
  console.table(srcMatches);
  process.exit(1);
} else {
  console.log('[Forbidden Scanner SUCCESS] Clean! No forbidden promo links found outside license view.');
  process.exit(0);
}
