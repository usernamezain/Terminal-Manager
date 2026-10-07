import fs from 'fs';
import path from 'path';

const searchRoots = [
  process.env.APPDATA ? path.join(process.env.APPDATA, 'terminal-manager') : null,
  process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'terminal-manager') : null,
  process.cwd(),
  process.env.TEMP || null,
].filter(Boolean);

console.log('[WinUtil Finder] Searching disk for Compile.ps1 and winutil.ps1...');

const foundFiles = [];

function searchDir(dir, depth = 0) {
  if (depth > 6 || !fs.existsSync(dir)) return;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (['node_modules', '.git'].includes(entry.name)) continue;
        searchDir(fullPath, depth + 1);
      } else {
        if (['Compile.ps1', 'winutil.ps1'].includes(entry.name)) {
          const stat = fs.statSync(fullPath);
          foundFiles.push({
            name: entry.name,
            path: fullPath,
            sizeBytes: stat.size,
            mtime: stat.mtime.toISOString(),
          });
        }
      }
    }
  } catch (_) {}
}

for (const root of searchRoots) {
  searchDir(root);
}

console.log(`[WinUtil Finder] Found ${foundFiles.length} file(s):`);
console.table(foundFiles);
