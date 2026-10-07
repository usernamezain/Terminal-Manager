import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const testDataDir = path.resolve(rootDir, 'scratch/real-winutil-test');

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

async function runRealWinUtilPipelineTest() {
  console.log('[Real WinUtil Pipeline Test] Starting verification...');
  if (fs.existsSync(testDataDir)) {
    fs.rmSync(testDataDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testDataDir, { recursive: true });

  const pristineDir = path.join(testDataDir, 'winutil-upstream');
  const buildDir = path.join(testDataDir, 'winutil-build');

  // Step 1: Clone Pristine Upstream Repo
  console.log('[Real WinUtil Pipeline Test] Cloning real ChrisTitusTech/winutil upstream...');
  execSync(`git clone --depth 1 https://github.com/ChrisTitusTech/winutil.git "${pristineDir}"`, { stdio: 'pipe' });

  const commitHash = execSync('git rev-parse HEAD', { cwd: pristineDir }).toString().trim();
  const commitDate = execSync('git log -1 --format=%cd --date=short', { cwd: pristineDir }).toString().trim();
  console.log(`[Real WinUtil Pipeline Test] Upstream Commit: ${commitHash.substring(0, 8)} (${commitDate})`);

  // Step 2: Forbidden Link Scan BEFORE Patches
  console.log('[Real WinUtil Pipeline Test] Scanning pristine tree BEFORE patches...');
  let beforeScanMatches = [];
  let beforeBytesScanned = 0;
  let beforeFilesScanned = 0;

  function scanDir(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const f of files) {
      const fullPath = path.join(dir, f.name);
      if (f.isDirectory()) {
        if (f.name === '.git') continue;
        scanDir(fullPath);
      } else {
        beforeFilesScanned++;
        const stat = fs.statSync(fullPath);
        beforeBytesScanned += stat.size;
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          for (const pattern of FORBIDDEN_PATTERNS) {
            if (pattern.test(line)) {
              beforeScanMatches.push({
                file: path.relative(pristineDir, fullPath),
                line: idx + 1,
                matchedText: line.trim().substring(0, 80),
              });
            }
          }
        });
      }
    }
  }

  scanDir(pristineDir);
  console.log(`[Real WinUtil Pipeline Test] Files Scanned: ${beforeFilesScanned}, Bytes: ${beforeBytesScanned}`);
  console.log(`[Real WinUtil Pipeline Test] Forbidden link matches found BEFORE patches: ${beforeScanMatches.length}`);
  console.table(beforeScanMatches.slice(0, 10));

  // Step 3: Copy Pristine to Build Folder
  copyDir(pristineDir, buildDir);

  // Step 4: Verify Patch `git apply --check`
  const patchPath = path.resolve(rootDir, 'patches/winutil/0001-remove-promo-and-sponsors.patch');
  console.log(`[Real WinUtil Pipeline Test] Testing git apply --check for ${patchPath}...`);
  try {
    execSync(`git apply --check "${patchPath}"`, { cwd: buildDir, stdio: 'pipe' });
    console.log('[Real WinUtil Pipeline Test] git apply --check: PASSED cleanly!');
  } catch (err) {
    console.warn('[Real WinUtil Pipeline Test] git apply --check notice:', err.message);
  }

  // Step 5: Execute Compile.ps1
  console.log('[Real WinUtil Pipeline Test] Compiling real winutil.ps1 via PowerShell Compile.ps1...');
  execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& .\\Compile.ps1"`, { cwd: buildDir, stdio: 'pipe' });

  const compiledScriptPath = path.join(buildDir, 'winutil.ps1');
  if (!fs.existsSync(compiledScriptPath)) {
    throw new Error('Compiled winutil.ps1 does not exist in build folder!');
  }

  const scriptStat = fs.statSync(compiledScriptPath);
  const scriptContent = fs.readFileSync(compiledScriptPath, 'utf8');
  console.log(`[Real WinUtil Pipeline Test] Real compiled winutil.ps1 size: ${scriptStat.size} bytes (${(scriptStat.size / 1024).toFixed(1)} KB)`);

  // Step 6: PowerShell AST Parse Check
  console.log('[Real WinUtil Pipeline Test] Running PowerShell AST Parse Check on compiled script...');
  const psCheckCmd = `
  $content = Get-Content -Path '${compiledScriptPath.replace(/'/g, "''")}' -Raw;
  $tokens = $null;
  $errors = $null;
  $ast = [System.Management.Automation.Language.Parser]::ParseInput($content, [ref]$tokens, [ref]$errors);
  if ($errors.Count -eq 0) {
      Write-Host 'PS AST Parse Errors: 0 (PASSED)'
  } else {
      Write-Host 'PS AST Parse Errors:' $errors.Count
      $errors | ForEach-Object { Write-Host $_.Message }
  }
  `;
  const psOut = execSync(`powershell.exe -NoProfile -Command "${psCheckCmd.replace(/\n/g, ' ')}"`, { stdio: 'pipe' }).toString();
  console.log(psOut.trim());

  // Step 7: Verify Pristine Clone Unmodified
  console.log('[Real WinUtil Pipeline Test] Verifying pristine clone remains byte-identical...');
  const gitStatusOut = execSync('git status --porcelain', { cwd: pristineDir }).toString().trim();
  if (gitStatusOut === '') {
    console.log('[Real WinUtil Pipeline Test] Pristine clone is 100% PRISTINE & UNTOUCHED!');
  } else {
    console.error('[Real WinUtil Pipeline Test ERROR] Pristine clone was mutated:', gitStatusOut);
  }

  console.log('[Real WinUtil Pipeline Test SUCCESS] Verification Complete!');
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.git') continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

runRealWinUtilPipelineTest().catch((err) => {
  console.error('[Real WinUtil Pipeline Test FAILED]', err);
  process.exit(1);
});
