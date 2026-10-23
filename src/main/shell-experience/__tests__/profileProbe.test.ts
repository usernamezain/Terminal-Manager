import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { cttGenerator } from '../generator';
import { ShellExperienceSettingsSchema } from '../../../shared/shellExperienceTypes';

describe('Shell Experience Profile Probe', () => {
  it.skipIf(process.platform !== 'win32')(
    'should dot-source the app-scoped profile in Windows PowerShell with zero errors',
    () => {
    const defaultSettings = ShellExperienceSettingsSchema.parse({});
    const customScriptContent = cttGenerator.generate(defaultSettings);

    expect(customScriptContent).toContain("Remove-Item alias:gp");

    // Write a temporary probe script that dot-sources CTTcustom.ps1 and profile
    const tmpDir = path.join(process.cwd(), 'scratch', 'probe-test');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const cttCustomPath = path.join(tmpDir, 'CTTcustom.ps1');
    const profilePath = path.join(tmpDir, 'Microsoft.PowerShell_profile.ps1');

    fs.writeFileSync(cttCustomPath, customScriptContent, 'utf8');
    fs.writeFileSync(profilePath, `
$script:ProfileRoot = $PSScriptRoot
$script:CustomProfile = Join-Path -Path $script:ProfileRoot -ChildPath 'CTTcustom.ps1'
if (Test-Path -Path $script:CustomProfile -PathType Leaf) { . $script:CustomProfile }

# Test alias definition
Set-Alias -Name gp -Value gpush -Force

if ($Error.Count -gt 0) {
  Write-Error "Profile probe detected errors: $($Error[0])"
  exit 1
}
`, 'utf8');

    const probeCmd = `powershell -NoProfile -Command ". '${profilePath.replace(/'/g, "''")}'"`;
    let output = '';
    let hasError = false;

    try {
      output = execSync(probeCmd, { stdio: 'pipe' }).toString();
    } catch (err: any) {
      hasError = true;
      output = err.stderr ? err.stderr.toString() : String(err);
    }

    expect(hasError).toBe(false);
    expect(output).not.toContain("Set-Alias : The AllScope option cannot be removed from the alias 'gp'");
  }, 30000);
});
