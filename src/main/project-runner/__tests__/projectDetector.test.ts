import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { detectNodeProject } from '../nodeDetector';
import { detectPythonProject } from '../pythonDetector';
import { detectOtherEcosystems } from '../otherDetectors';
import { detectProject, findProjectRoot } from '../projectDetector';

describe('Project Runner Detectors & Walk-up Tests', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proj-runner-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('detects Node project and resolves package manager from lockfile (pnpm)', () => {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'test-pnpm-app',
        scripts: {
          test: 'vitest',
          start: 'node index.js',
          build: 'vite build',
          dev: 'vite',
          custom: 'echo 123',
        },
        dependencies: {
          react: '^18.2.0',
        },
      }),
      'utf8'
    );
    fs.writeFileSync(path.join(tempDir, 'pnpm-lock.yaml'), '', 'utf8');

    const tools = { pnpm: true, npm: true };
    const res = detectNodeProject(tempDir, tools);

    expect(res.ecosystem).toBeDefined();
    expect(res.ecosystem?.name).toBe('test-pnpm-app');
    expect(res.ecosystem?.tool).toBe('pnpm');
    expect(res.ecosystem?.toolAvailable).toBe(true);

    const scriptGroup = res.ecosystem?.groups.find((g) => g.title === 'Scripts');
    expect(scriptGroup).toBeDefined();

    // SCRIPT PRIORITY: dev, start, build, test, lint, preview first
    const labels = scriptGroup!.commands.map((c) => c.label);
    expect(labels[0]).toBe('dev');
    expect(labels[1]).toBe('start');
    expect(labels[2]).toBe('build');
    expect(labels[3]).toBe('test');

    // Run command format for pnpm: pnpm run <name>
    const devCmd = scriptGroup!.commands.find((c) => c.label === 'dev');
    expect(devCmd?.commandText).toBe('pnpm run dev');
  });

  it('handles yarn, bun, and packageManager field', () => {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'yarn-app',
        packageManager: 'yarn@3.6.0',
        scripts: { dev: 'next dev' },
      }),
      'utf8'
    );

    const tools = { yarn: true };
    const res = detectNodeProject(tempDir, tools);
    expect(res.ecosystem?.tool).toBe('yarn');

    const devCmd = res.ecosystem?.groups[0]?.commands.find((c) => c.label === 'dev');
    expect(devCmd?.commandText).toBe('yarn dev');
  });

  it('disables commands and provides reason when tool is missing', () => {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'bun-app',
        scripts: { dev: 'bun run index.ts' },
      }),
      'utf8'
    );
    fs.writeFileSync(path.join(tempDir, 'bun.lockb'), '', 'utf8');

    const tools = { bun: false }; // bun is missing!
    const res = detectNodeProject(tempDir, tools);
    expect(res.ecosystem?.tool).toBe('bun');
    expect(res.ecosystem?.toolAvailable).toBe(false);
    expect(res.ecosystem?.toolMissingReason).toBe('bun not found');

    const devCmd = res.ecosystem?.groups[0]?.commands[0];
    expect(devCmd?.disabled).toBe(true);
    expect(devCmd?.disabledReason).toBe('bun not found');
  });

  it('flags unsafe script names with reason', () => {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'unsafe-app',
        scripts: {
          'dev&test': 'echo bad',
          valid: 'echo good',
        },
      }),
      'utf8'
    );

    const tools = { npm: true };
    const res = detectNodeProject(tempDir, tools);
    const scripts = res.ecosystem?.groups.find((g) => g.title === 'Scripts')?.commands;
    const badScript = scripts?.find((s) => s.label === 'dev&test');
    const goodScript = scripts?.find((s) => s.label === 'valid');

    expect(badScript?.disabled).toBe(true);
    expect(badScript?.disabledReason).toBe('unsafe script name');
    expect(goodScript?.disabled).toBe(false);
  });

  it('safely handles corrupt package.json', () => {
    fs.writeFileSync(path.join(tempDir, 'package.json'), '{ invalid json ...', 'utf8');
    const tools = { npm: true };
    const res = detectNodeProject(tempDir, tools);
    expect(res.error).toBeDefined();
    expect(res.error).toContain('Could not read package.json');
  });

  it('detects Node monorepo workspaces and lists packages', () => {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'monorepo-root',
        workspaces: ['packages/*'],
      }),
      'utf8'
    );
    const pkgADir = path.join(tempDir, 'packages', 'pkg-a');
    fs.mkdirSync(pkgADir, { recursive: true });
    fs.writeFileSync(
      path.join(pkgADir, 'package.json'),
      JSON.stringify({
        name: '@mono/pkg-a',
        scripts: { build: 'tsc' },
      }),
      'utf8'
    );

    const tools = { npm: true };
    const res = detectNodeProject(tempDir, tools);
    expect(res.workspaces).toBeDefined();
    expect(res.workspaces?.length).toBe(1);
    expect(res.workspaces?.[0]?.name).toBe('@mono/pkg-a');
    expect(res.workspaces?.[0]?.scripts[0]?.commandText).toContain('--workspace=@mono/pkg-a');
  });


  it('detects Python project, .venv, activation per shell, requirements, and Django', () => {
    fs.writeFileSync(path.join(tempDir, 'requirements.txt'), 'django>=4.2\npytest\n', 'utf8');
    fs.writeFileSync(path.join(tempDir, 'manage.py'), '#!/usr/bin/env python\n', 'utf8');
    const venvDir = path.join(tempDir, '.venv');
    fs.mkdirSync(venvDir, { recursive: true });

    const tools = { python: true, pip: true, pytest: true };

    // PowerShell activation
    const resPwsh = detectPythonProject(tempDir, tools, 'powershell');
    const envGroup = resPwsh.ecosystem?.groups.find((g) => g.title === 'Environment');
    const activatePwsh = envGroup?.commands.find((c) => c.label === 'Activate .venv');
    expect(activatePwsh?.commandText).toBe('.\\.venv\\Scripts\\Activate.ps1');

    // Bash activation
    const resBash = detectPythonProject(tempDir, tools, 'bash');
    const envBash = resBash.ecosystem?.groups.find((g) => g.title === 'Environment');
    const activateBash = envBash?.commands.find((c) => c.label === 'Activate .venv');
    expect(activateBash?.commandText).toBe('source .venv/bin/activate');

    // Django runserver present in Run group
    const runGroup = resPwsh.ecosystem?.groups.find((g) => g.title === 'Run');
    const runserver = runGroup?.commands.find((c) => c.label.includes('runserver'));
    expect(runserver).toBeDefined();
    expect(runserver?.commandText).toBe('python manage.py runserver');
  });

  it('detects Rust, Go, Docker, and Makefile', () => {
    fs.writeFileSync(path.join(tempDir, 'Cargo.toml'), '[package]\nname = "my-crate"', 'utf8');
    fs.writeFileSync(path.join(tempDir, 'go.mod'), 'module example.com/app', 'utf8');
    fs.writeFileSync(path.join(tempDir, 'docker-compose.yml'), 'services:\n  web:\n    image: nginx', 'utf8');
    fs.writeFileSync(path.join(tempDir, 'Makefile'), 'all:\n\techo all\ntest:\n\techo test\n', 'utf8');

    const tools = { cargo: true, go: true, docker: true, make: true };
    const ecosystems = detectOtherEcosystems(tempDir, tools);

    const types = ecosystems.map((e) => e.type);
    expect(types).toContain('rust');
    expect(types).toContain('go');
    expect(types).toContain('docker');
    expect(types).toContain('generic');

    const makeEco = ecosystems.find((e) => e.name === 'Makefile');
    const makeGroup = makeEco?.groups[0];
    const targetLabels = makeGroup?.commands.map((c) => c.label);
    expect(targetLabels).toContain('make all');
    expect(targetLabels).toContain('make test');
  });

  it('walks up directory tree from subfolder to find root project, stopping at .git', () => {
    // Structure:
    // tempDir/
    //   package.json
    //   src/
    //     components/
    //       Button/
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'root-pkg' }), 'utf8');
    const deepSub = path.join(tempDir, 'src', 'components', 'Button');
    fs.mkdirSync(deepSub, { recursive: true });

    const root = findProjectRoot(deepSub);
    expect(root).toBe(tempDir);

    const projInfo = detectProject(deepSub, 'powershell', undefined, true);
    expect(projInfo).toBeDefined();
    expect(projInfo?.name).toBe('root-pkg');
    expect(projInfo?.rootPath).toBe(tempDir);
  });
});
