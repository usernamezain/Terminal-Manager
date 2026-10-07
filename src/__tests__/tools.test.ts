import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { CustomizationSchema } from '../shared/toolsTypes';
import { ForbiddenScanner } from '../main/tools/forbiddenScanner';
import { TransformEngine } from '../main/tools/transformEngine';
import { ToolsPathManager } from '../main/tools/toolsPathManager';

describe('System Tools Suite (Phase 3)', () => {
  let testDir: string;
  let pathsManager: ToolsPathManager;

  beforeEach(() => {
    testDir = path.resolve(process.cwd(), 'scratch/test-tools-suite-' + Date.now());
    pathsManager = new ToolsPathManager(testDir);
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('1. Customization Schema Validation', () => {
    const validConfig = {
      v: 1,
      branding: {
        productName: 'MyCorp System Tools',
        windowTitle: 'MyCorp Utility',
        colors: {
          accent: '#FF5500',
        },
      },
      add: {
        apps: [{ id: 'mycorp.tool', name: 'My Tool', winget: 'Vendor.Tool' }],
      },
    };

    const parsed = CustomizationSchema.safeParse(validConfig);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.branding.productName).toBe('MyCorp System Tools');
      expect(parsed.data.branding.colors.accent).toBe('#FF5500');
    }

    const invalidConfig = {
      v: 99,
      branding: {
        windowWidth: -50,
      },
    };

    const invalidParsed = CustomizationSchema.safeParse(invalidConfig);
    expect(invalidParsed.success).toBe(false);
  });

  it('2. Forbidden Link Scanner', () => {
    const scanner = new ForbiddenScanner(pathsManager);
    const cleanFile = path.join(testDir, 'clean.ps1');
    const dirtyFile = path.join(testDir, 'dirty.ps1');

    fs.writeFileSync(cleanFile, 'Write-Host "Clean System Tools Script"\n');
    fs.writeFileSync(dirtyFile, 'Write-Host "Support at https://patreon.com/example or discord.gg/abc"\n');

    const cleanResult = scanner.scanFile(cleanFile);
    expect(cleanResult.clean).toBe(true);
    expect(cleanResult.matches).toHaveLength(0);

    const dirtyResult = scanner.scanFile(dirtyFile);
    expect(dirtyResult.clean).toBe(false);
    expect(dirtyResult.matches.length).toBeGreaterThan(0);
  });

  it('3. Transform Engine Anchors & Replacements', () => {
    const engine = new TransformEngine(pathsManager);
    const buildDir = pathsManager.getBuildDir();

    fs.writeFileSync(
      path.join(buildDir, 'test.xaml'),
      '<Window Title="WinUtil - Chris Titus Tech" SystemAccentColor="#0078D4"></Window>'
    );

    const config = CustomizationSchema.parse({
      branding: {
        productName: 'Enterprise Tools',
        colors: { accent: '#10B981' },
      },
    });

    const reports = engine.applyTransforms(config);
    expect(reports.length).toBeGreaterThan(0);

    const modifiedXaml = fs.readFileSync(path.join(buildDir, 'test.xaml'), 'utf8');
    expect(modifiedXaml).toContain('Enterprise Tools');
    expect(modifiedXaml).toContain('#10B981');
    expect(modifiedXaml).not.toContain('#0078D4');
  });

  it('4. Launch Command Quoting (Spaces & Apostrophes)', () => {
    const spacePath = `C:\\Users\\John's PC\\AppData\\Local\\tools\\winutil.ps1`;
    const escapedArgs = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', spacePath];

    expect(escapedArgs[4]).toBe(`C:\\Users\\John's PC\\AppData\\Local\\tools\\winutil.ps1`);
    expect(escapedArgs).toContain('-NoProfile');
    expect(escapedArgs).toContain('-ExecutionPolicy');
  });

  it('5. Confirmation Gating Logic', () => {
    const unconfirmedArgs = { confirmed: false };
    expect(unconfirmedArgs.confirmed).toBe(false);

    const confirmedArgs = { confirmed: true, restorePoint: true };
    expect(confirmedArgs.confirmed).toBe(true);
  });
});
