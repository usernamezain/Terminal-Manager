import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const targetScript = path.resolve(__dirname, '../scratch/test-tools-data/winutil.ps1');

if (!fs.existsSync(targetScript)) {
  const dir = path.dirname(targetScript);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(targetScript, '# Test winutil.ps1\nWrite-Host "System Tools Initialized" -ForegroundColor Green\n', 'utf8');
}

const psCommand = `
$content = Get-Content -Path '${targetScript.replace(/'/g, "''")}' -Raw;
$tokens = $null;
$errors = $null;
$ast = [System.Management.Automation.Language.Parser]::ParseInput($content, [ref]$tokens, [ref]$errors);
if ($errors.Count -eq 0) {
    Write-Host "PS AST Parse Status: SUCCESS"
} else {
    Write-Host "PS AST Parse Status: FAILED"
    $errors | ForEach-Object { Write-Host $_.Message }
}
`;

try {
  const output = execSync(`powershell.exe -NoProfile -Command "${psCommand.replace(/\n/g, ' ')}"`, { stdio: 'pipe' }).toString();
  console.log(output.trim());
} catch (err) {
  console.error('PowerShell Parse Check Error:', err);
}
