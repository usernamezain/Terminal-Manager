import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { detectProject } from '../projectDetector';
import { validatePackageInput, validateVersion } from '../packageValidator';
import { renderCommandString } from '../commandBuilder';

describe('Project Runner End-to-End Acceptance Tests', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-runner-e2e-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('Scenario 1: Node + pnpm project detection, scripts, and command generation', () => {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'web-portal',
        scripts: {
          test: 'vitest run',
          build: 'vite build',
          dev: 'vite --port 3000',
        },
        dependencies: {
          react: '^18.3.1',
        },
      }),
      'utf8'
    );
    fs.writeFileSync(path.join(tempDir, 'pnpm-lock.yaml'), '', 'utf8');

    const project = detectProject(tempDir, 'powershell', undefined, true);
    expect(project).toBeDefined();
    expect(project?.name).toBe('web-portal');
    expect(project?.ecosystems[0]?.tool).toBe('pnpm');

    const scriptsGroup = project?.ecosystems[0]?.groups.find((g) => g.title === 'Scripts');
    const devCmd = scriptsGroup?.commands.find((c) => c.label === 'dev');
    expect(devCmd?.commandText).toBe('pnpm run dev');

    // Build execution string for PowerShell
    const execStr = renderCommandString(devCmd!, 'powershell');
    expect(execStr).toBe('pnpm run dev');
  });

  it('Scenario 2: Python + .venv activation and Django detection per shell', () => {
    fs.writeFileSync(path.join(tempDir, 'requirements.txt'), 'Django>=5.0\npytest\n', 'utf8');
    fs.writeFileSync(path.join(tempDir, 'manage.py'), '#!/usr/bin/env python\n', 'utf8');
    fs.mkdirSync(path.join(tempDir, '.venv', 'Scripts'), { recursive: true });

    // PowerShell
    const projPwsh = detectProject(tempDir, 'powershell', undefined, true);
    const envGroupPwsh = projPwsh?.ecosystems[0]?.groups.find((g) => g.title === 'Environment');
    const activatePwsh = envGroupPwsh?.commands.find((c) => c.label.includes('Activate'));
    expect(activatePwsh?.commandText).toBe('.\\.venv\\Scripts\\Activate.ps1');

    // Bash
    const projBash = detectProject(tempDir, 'bash', undefined, true);
    const envGroupBash = projBash?.ecosystems[0]?.groups.find((g) => g.title === 'Environment');
    const activateBash = envGroupBash?.commands.find((c) => c.label.includes('Activate'));
    expect(activateBash?.commandText).toBe('source .venv/bin/activate');

    // CMD
    const projCmd = detectProject(tempDir, 'cmd', undefined, true);
    const envGroupCmd = projCmd?.ecosystems[0]?.groups.find((g) => g.title === 'Environment');
    const activateCmd = envGroupCmd?.commands.find((c) => c.label.includes('Activate'));
    expect(activateCmd?.commandText).toBe('.\\.venv\\Scripts\\activate.bat');
  });

  it('Scenario 3: Multi-ecosystem detection (Node + Docker + Makefile)', () => {
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'full-stack' }), 'utf8');
    fs.writeFileSync(path.join(tempDir, 'docker-compose.yml'), 'services:\n  api:\n    image: node:20', 'utf8');
    fs.writeFileSync(path.join(tempDir, 'Makefile'), 'deploy:\n\tdocker compose up -d\n', 'utf8');

    const project = detectProject(tempDir, 'powershell', undefined, true);
    expect(project).toBeDefined();

    const ecoTypes = project?.ecosystems.map((e) => e.type);
    expect(ecoTypes).toContain('node');
    expect(ecoTypes).toContain('docker');
    expect(ecoTypes).toContain('generic');
  });

  it('Scenario 4: Strict package validation rejects malicious shell injection', () => {
    // Malicious inputs
    const injections = [
      'react; calc',
      'react && notepad',
      'axios | rm -rf /',
      'express`whoami`',
      'pkg$(whoami)',
      'pkg\nmalicious',
      'pkg<input',
      'pkg>output',
      'pkg"quote',
      "pkg'quote",
    ];

    for (const badInput of injections) {
      const res = validatePackageInput('node', badInput, undefined, false);
      expect(res.valid).toBe(false);
      expect(res.error).toBeDefined();
    }

    // Valid inputs
    const validInputs = ['react', '@types/node', 'lodash.debounce', 'react, axios, zod'];
    for (const goodInput of validInputs) {
      const res = validatePackageInput('node', goodInput, undefined, false);
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    }
  });

  it('Scenario 5: Version specifier safety validation', () => {
    expect(validateVersion('^18.2.0').valid).toBe(true);
    expect(validateVersion('==2.1.0').valid).toBe(true);
    expect(validateVersion('~1.0.0').valid).toBe(true);
    expect(validateVersion('>=3.0.0').valid).toBe(true);

    // Rejects shell injection inside versions
    expect(validateVersion('^1.0.0; rm -rf').valid).toBe(false);
    expect(validateVersion('1.0.0 && calc').valid).toBe(false);
    expect(validateVersion('1.0.0`cmd`').valid).toBe(false);
  });

  it('Scenario 6: Nearest manifest search up the folder tree', () => {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ name: 'root-monorepo' }),
      'utf8'
    );
    const nestedSub = path.join(tempDir, 'src', 'features', 'terminal', 'components');
    fs.mkdirSync(nestedSub, { recursive: true });

    const detected = detectProject(nestedSub, 'powershell', undefined, true);
    expect(detected).toBeDefined();
    expect(detected?.name).toBe('root-monorepo');
    expect(detected?.rootPath).toBe(tempDir);
  });

  it('Scenario 7: Corrupt manifest returns error without crashing app', () => {
    fs.writeFileSync(path.join(tempDir, 'package.json'), '{{{ INVALID JSON syntax', 'utf8');
    const project = detectProject(tempDir, 'powershell', undefined, true);

    expect(project).toBeDefined();
    expect(project?.errors).toBeDefined();
    expect(project?.errors?.length).toBeGreaterThan(0);
    expect(project?.errors?.[0]).toContain('Could not read package.json');
  });
});
