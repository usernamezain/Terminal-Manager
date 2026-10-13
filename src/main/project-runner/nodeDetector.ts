import fs from 'fs';
import path from 'path';
import {
  DetectedEcosystem,
  ProjectCommand,
  CommandGroup,
  WorkspacePackage,
  ProjectRunnerSettings,
} from '../../shared/projectRunnerTypes';
import { isValidScriptName } from './packageValidator';

const SCRIPT_PRIORITY = ['dev', 'start', 'build', 'test', 'lint', 'preview'];
const LONG_RUNNING_NAMES = new Set(['dev', 'start', 'serve', 'server', 'watch', 'preview', 'develop']);

export interface NodeDetectionResult {
  ecosystem?: DetectedEcosystem;
  workspaces?: WorkspacePackage[];
  error?: string;
  nodeVersionNote?: string;
}

export function detectNodeProject(
  folder: string,
  toolAvailability: Record<string, boolean>,
  settings?: Partial<ProjectRunnerSettings>
): NodeDetectionResult {
  const pkgPath = path.join(folder, 'package.json');
  const denoPath = path.join(folder, 'deno.json');
  const denoPathC = path.join(folder, 'deno.jsonc');

  const hasPkg = fs.existsSync(pkgPath);
  const hasDeno = fs.existsSync(denoPath) || fs.existsSync(denoPathC);

  if (!hasPkg && !hasDeno) {
    return {};
  }

  let pkgJson: any = null;
  if (hasPkg) {
    try {
      const stats = fs.statSync(pkgPath);
      if (stats.size > 1024 * 1024) {
        return { error: 'package.json exceeds 1MB limit' };
      }
      const raw = fs.readFileSync(pkgPath, 'utf8');
      pkgJson = JSON.parse(raw);
    } catch (err: any) {
      return { error: `Could not read package.json (${err.message})` };
    }
  }

  // 1. Determine package manager
  let pm = 'npm';
  if (pkgJson?.packageManager && typeof pkgJson.packageManager === 'string') {
    const pmField = pkgJson.packageManager.toLowerCase();
    if (pmField.startsWith('pnpm')) pm = 'pnpm';
    else if (pmField.startsWith('yarn')) pm = 'yarn';
    else if (pmField.startsWith('bun')) pm = 'bun';
    else if (pmField.startsWith('npm')) pm = 'npm';
  } else if (fs.existsSync(path.join(folder, 'pnpm-lock.yaml'))) {
    pm = 'pnpm';
  } else if (fs.existsSync(path.join(folder, 'yarn.lock'))) {
    pm = 'yarn';
  } else if (fs.existsSync(path.join(folder, 'bun.lockb')) || fs.existsSync(path.join(folder, 'bun.lock'))) {
    pm = 'bun';
  } else if (fs.existsSync(path.join(folder, 'package-lock.json')) || fs.existsSync(path.join(folder, 'npm-shrinkwrap.json'))) {
    pm = 'npm';
  } else if (hasDeno && !hasPkg) {
    pm = 'deno';
  }

  const isAvailable = Boolean(toolAvailability[pm]);
  const toolMissingReason = isAvailable ? undefined : `${pm} not found`;

  // 2. Node version note
  let nodeVersionNote: string | undefined;
  if (pkgJson?.engines?.node) {
    nodeVersionNote = `Node ${pkgJson.engines.node}`;
  } else {
    const nvmrcPath = path.join(folder, '.nvmrc');
    if (fs.existsSync(nvmrcPath)) {
      try {
        const nvmrc = fs.readFileSync(nvmrcPath, 'utf8').trim();
        if (nvmrc) nodeVersionNote = `Node ${nvmrc}`;
      } catch {}
    }
  }

  // 3. Build Scripts group
  const scripts: ProjectCommand[] = [];
  const rawScripts = pkgJson?.scripts || {};
  const showPrePost = settings?.showPrePostScripts ?? false;

  const scriptNames = Object.keys(rawScripts);
  // Sort: dev, start, build, test, lint, preview first, then alphabetical
  scriptNames.sort((a, b) => {
    const aIdx = SCRIPT_PRIORITY.indexOf(a);
    const bIdx = SCRIPT_PRIORITY.indexOf(b);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return a.localeCompare(b);
  });

  let primaryCandidate: ProjectCommand | undefined;

  for (const name of scriptNames) {
    const isPrePost = /^(pre|post)[a-zA-Z0-9_-]+/.test(name);
    if (isPrePost && !showPrePost) {
      continue;
    }

    const scriptText = String(rawScripts[name] || '');
    const valid = isValidScriptName(name);

    let runArgs: string[];
    let commandText: string;
    if (pm === 'npm') {
      runArgs = ['run', name];
      commandText = `npm run ${name}`;
    } else if (pm === 'pnpm') {
      runArgs = ['run', name];
      commandText = `pnpm run ${name}`;
    } else if (pm === 'yarn') {
      runArgs = [name];
      commandText = `yarn ${name}`;
    } else if (pm === 'bun') {
      runArgs = ['run', name];
      commandText = `bun run ${name}`;
    } else {
      runArgs = ['task', name];
      commandText = `deno task ${name}`;
    }

    const isLongRunning =
      LONG_RUNNING_NAMES.has(name) ||
      scriptText.includes('--watch') ||
      scriptText.includes('nodemon') ||
      scriptText.includes('vite') ||
      scriptText.includes('next dev');

    const cmd: ProjectCommand = {
      id: `node-script-${name}`,
      label: name,
      commandText,
      tool: pm,
      args: runArgs,
      cwd: folder,
      category: 'script',
      disabled: !isAvailable || !valid,
      disabledReason: !isAvailable ? `${pm} not found` : !valid ? 'unsafe script name' : undefined,
      isLongRunning,
    };

    if (!primaryCandidate && (name === 'dev' || name === 'start')) {
      primaryCandidate = cmd;
    }

    scripts.push(cmd);
  }

  // Fallback primary: first script or dev
  if (!primaryCandidate && scripts.length > 0) {
    primaryCandidate = scripts[0];
  }

  // 4. Install group
  const installCommands: ProjectCommand[] = [];
  const installCmdText =
    pm === 'pnpm' ? 'pnpm install' : pm === 'yarn' ? 'yarn install' : pm === 'bun' ? 'bun install' : 'npm install';
  const cleanCmdText =
    pm === 'npm'
      ? 'npm ci'
      : pm === 'pnpm'
      ? 'pnpm install --frozen-lockfile'
      : pm === 'yarn'
      ? 'yarn install --frozen-lockfile'
      : pm === 'bun'
      ? 'bun install --frozen-lockfile'
      : 'deno install';

  installCommands.push({
    id: `node-install`,
    label: 'Install dependencies',
    commandText: installCmdText,
    tool: pm,
    args: ['install'],
    cwd: folder,
    category: 'install',
    disabled: !isAvailable,
    disabledReason: toolMissingReason,
  });

  installCommands.push({
    id: `node-clean-install`,
    label: 'Clean install',
    commandText: cleanCmdText,
    tool: pm,
    args: pm === 'npm' ? ['ci'] : ['install', '--frozen-lockfile'],
    cwd: folder,
    category: 'install',
    requiresConfirm: true,
    confirmMessage: 'Clean install will reinstall all dependencies according to the lockfile. Continue?',
    disabled: !isAvailable,
    disabledReason: toolMissingReason,
  });

  installCommands.push({
    id: `node-update`,
    label: 'Update packages',
    commandText: `${pm} ${pm === 'yarn' ? 'upgrade' : 'update'}`,
    tool: pm,
    args: [pm === 'yarn' ? 'upgrade' : 'update'],
    cwd: folder,
    category: 'install',
    disabled: !isAvailable,
    disabledReason: toolMissingReason,
  });

  installCommands.push({
    id: `node-outdated`,
    label: 'Check outdated',
    commandText: `${pm} outdated`,
    tool: pm,
    args: ['outdated'],
    cwd: folder,
    category: 'install',
    disabled: !isAvailable,
    disabledReason: toolMissingReason,
  });

  installCommands.push({
    id: `node-audit`,
    label: 'Audit dependencies',
    commandText: pm === 'yarn' ? 'yarn npm audit' : `${pm} audit`,
    tool: pm,
    args: pm === 'yarn' ? ['npm', 'audit'] : ['audit'],
    cwd: folder,
    category: 'install',
    disabled: !isAvailable,
    disabledReason: toolMissingReason,
  });

  if (pm === 'npm' || pm === 'pnpm') {
    installCommands.push({
      id: `node-prune`,
      label: 'Prune dependencies',
      commandText: `${pm} prune`,
      tool: pm,
      args: ['prune'],
      cwd: folder,
      category: 'install',
      disabled: !isAvailable,
      disabledReason: toolMissingReason,
    });
    installCommands.push({
      id: `node-dedupe`,
      label: 'Dedupe dependencies',
      commandText: `${pm} dedupe`,
      tool: pm,
      args: ['dedupe'],
      cwd: folder,
      category: 'install',
      disabled: !isAvailable,
      disabledReason: toolMissingReason,
    });
  }

  // 5. Packages group (Remove / Upgrade submenus)
  const allDeps: string[] = [
    ...Object.keys(pkgJson?.dependencies || {}),
    ...Object.keys(pkgJson?.devDependencies || {}),
  ];

  const removeSubgroup: ProjectCommand[] = allDeps.slice(0, 100).map((dep) => {
    const removeCmd = pm === 'npm' ? `npm uninstall ${dep}` : `${pm} remove ${dep}`;
    return {
      id: `node-remove-${dep}`,
      label: dep,
      commandText: removeCmd,
      tool: pm,
      args: pm === 'npm' ? ['uninstall', dep] : ['remove', dep],
      cwd: folder,
      category: 'package',
      requiresConfirm: true,
      confirmMessage: `Are you sure you want to remove package "${dep}"?`,
      disabled: !isAvailable,
      disabledReason: toolMissingReason,
    };
  });

  const upgradeSubgroup: ProjectCommand[] = allDeps.slice(0, 100).map((dep) => {
    const upgradeCmd = pm === 'yarn' ? `yarn upgrade ${dep}` : `${pm} update ${dep}`;
    return {
      id: `node-upgrade-${dep}`,
      label: dep,
      commandText: upgradeCmd,
      tool: pm,
      args: pm === 'yarn' ? ['upgrade', dep] : ['update', dep],
      cwd: folder,
      category: 'package',
      disabled: !isAvailable,
      disabledReason: toolMissingReason,
    };
  });

  const packageCommands: ProjectCommand[] = [
    {
      id: 'node-add-package',
      label: 'Add package...',
      commandText: `${pm} ${pm === 'npm' ? 'install' : 'add'} <package>`,
      tool: pm,
      args: [],
      cwd: folder,
      category: 'package',
      disabled: !isAvailable,
      disabledReason: toolMissingReason,
    },
    {
      id: 'node-add-dev-package',
      label: 'Add dev dependency...',
      commandText: `${pm} ${pm === 'npm' ? 'install -D' : 'add -D'} <package>`,
      tool: pm,
      args: [],
      cwd: folder,
      category: 'package',
      disabled: !isAvailable,
      disabledReason: toolMissingReason,
    },
  ];

  const groups: CommandGroup[] = [];

  if (scripts.length > 0) {
    groups.push({
      id: 'node-group-scripts',
      title: 'Scripts',
      commands: scripts,
    });
  }

  groups.push({
    id: 'node-group-install',
    title: 'Install',
    commands: installCommands,
  });

  const packageSubgroups: CommandGroup[] = [];
  if (removeSubgroup.length > 0) {
    packageSubgroups.push({
      id: 'node-subgroup-remove',
      title: 'Remove package',
      commands: removeSubgroup,
    });
  }
  if (upgradeSubgroup.length > 0) {
    packageSubgroups.push({
      id: 'node-subgroup-upgrade',
      title: 'Upgrade package',
      commands: upgradeSubgroup,
    });
  }

  groups.push({
    id: 'node-group-packages',
    title: 'Packages',
    commands: packageCommands,
    subgroups: packageSubgroups,
  });

  // 6. Workspaces detection
  const workspaces: WorkspacePackage[] = [];
  const rawWorkspaces =
    Array.isArray(pkgJson?.workspaces)
      ? pkgJson.workspaces
      : Array.isArray(pkgJson?.workspaces?.packages)
      ? pkgJson.workspaces.packages
      : null;

  if (rawWorkspaces) {
    for (const pattern of rawWorkspaces) {
      const baseDir = pattern.replace(/\/\*.*$/, '').replace(/\\\*.*$/, '');
      const candidateDir = path.resolve(folder, baseDir);
      if (fs.existsSync(candidateDir) && fs.statSync(candidateDir).isDirectory()) {
        try {
          const subdirs = fs.readdirSync(candidateDir);
          for (const sub of subdirs) {
            const subPkgPath = path.join(candidateDir, sub, 'package.json');
            if (fs.existsSync(subPkgPath)) {
              try {
                const subPkg = JSON.parse(fs.readFileSync(subPkgPath, 'utf8'));
                const wsScripts: ProjectCommand[] = [];
                for (const [sName] of Object.entries(subPkg.scripts || {})) {
                  let wsCommandText: string;
                  let wsArgs: string[];
                  if (pm === 'npm') {
                    wsCommandText = `npm run ${sName} --workspace=${subPkg.name || sub}`;
                    wsArgs = ['run', sName, `--workspace=${subPkg.name || sub}`];
                  } else if (pm === 'pnpm') {
                    wsCommandText = `pnpm --filter ${subPkg.name || sub} run ${sName}`;
                    wsArgs = ['--filter', subPkg.name || sub, 'run', sName];
                  } else {
                    wsCommandText = `yarn workspace ${subPkg.name || sub} ${sName}`;
                    wsArgs = ['workspace', subPkg.name || sub, sName];
                  }

                  wsScripts.push({
                    id: `ws-${subPkg.name || sub}-${sName}`,
                    label: sName,
                    commandText: wsCommandText,
                    tool: pm,
                    args: wsArgs,
                    cwd: path.join(candidateDir, sub),
                    category: 'workspace',
                  });
                }

                workspaces.push({
                  name: subPkg.name || sub,
                  path: path.join(candidateDir, sub),
                  relativeDir: path.relative(folder, path.join(candidateDir, sub)),
                  scripts: wsScripts,
                });
              } catch {}
            }
          }
        } catch {}
      }
    }
  }

  // Workspaces subgroup if any found
  if (workspaces.length > 0) {
    const wsGroups: CommandGroup[] = workspaces.map((ws) => ({
      id: `node-ws-${ws.name}`,
      title: ws.name,
      commands: ws.scripts,
    }));
    groups.push({
      id: 'node-group-workspaces',
      title: 'Workspaces',
      commands: [],
      subgroups: wsGroups,
    });
  }

  // 7. Run with (npx / pnpm dlx / bunx)
  const dlxTool = pm === 'pnpm' ? 'pnpm dlx' : pm === 'bun' ? 'bunx' : 'npx';
  const dlxParts = dlxTool.split(' ');
  groups.push({
    id: 'node-group-dlx',
    title: 'Run with',
    commands: [
      {
        id: 'node-run-dlx',
        label: `${dlxTool} <package>`,
        commandText: `${dlxTool} `,
        tool: dlxParts[0] || 'npx',
        args: dlxParts[1] ? [dlxParts[1]] : [],
        cwd: folder,
        category: 'run',
      },
    ],
  });


  const ecosystem: DetectedEcosystem = {
    type: 'node',
    name: pkgJson?.name || path.basename(folder),
    tool: pm,
    toolAvailable: isAvailable,
    toolMissingReason,
    groups,
    note: nodeVersionNote,
  };

  return {
    ecosystem,
    workspaces,
    nodeVersionNote,
  };
}
