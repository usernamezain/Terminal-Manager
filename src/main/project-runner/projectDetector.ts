import fs from 'fs';
import path from 'path';
import {
  ProjectInfo,
  DetectedEcosystem,
  ProjectCommand,
  WorkspacePackage,
  ProjectRunnerSettings,
} from '../../shared/projectRunnerTypes';
import { ShellType } from '../../shared/terminalUtils';
import { whichSync } from '../shellDetector';
import { detectNodeProject } from './nodeDetector';
import { detectPythonProject } from './pythonDetector';
import { detectOtherEcosystems } from './otherDetectors';

// Manifest files that define a project root
const MANIFEST_FILES = [
  'package.json',
  'deno.json',
  'deno.jsonc',
  'pyproject.toml',
  'Pipfile',
  'setup.py',
  'manage.py',
  'Cargo.toml',
  'go.mod',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'composer.json',
  'Gemfile',
  'docker-compose.yml',
  'docker-compose.yaml',
  'compose.yml',
  'Dockerfile',
  'Makefile',
  'justfile',
  'Taskfile.yml',
];

interface CacheEntry {
  mtime: number;
  projectInfo: ProjectInfo;
}

const detectionCache = new Map<string, CacheEntry>();

// Tool availability cache
let toolCache: Record<string, boolean> | null = null;
let lastToolCheck = 0;
const TOOL_CACHE_TTL = 30000; // 30s

export function getToolAvailability(forceRefresh: boolean = false): Record<string, boolean> {
  const now = Date.now();
  if (!forceRefresh && toolCache && now - lastToolCheck < TOOL_CACHE_TTL) {
    return toolCache;
  }

  const tools = [
    'npm',
    'pnpm',
    'yarn',
    'bun',
    'node',
    'deno',
    'python',
    'py',
    'pip',
    'uv',
    'poetry',
    'pdm',
    'pipenv',
    'cargo',
    'go',
    'dotnet',
    'mvn',
    'gradle',
    'composer',
    'ruby',
    'bundle',
    'docker',
    'make',
    'just',
    'task',
    'ruff',
    'black',
    'mypy',
    'flake8',
    'pytest',
    'uvicorn',
    'streamlit',
  ];

  const result: Record<string, boolean> = {};
  for (const t of tools) {
    result[t] = whichSync(t) !== null;
  }

  // Handle windows python / py aliases
  if (result['py'] && !result['python']) {
    result['python'] = true;
  }

  toolCache = result;
  lastToolCheck = now;
  return result;
}

/**
 * Checks if a folder contains any project manifest file.
 */
export function hasProjectManifest(folder: string): boolean {
  try {
    const files = fs.readdirSync(folder);
    const fileSet = new Set(files.map((f) => f.toLowerCase()));

    for (const m of MANIFEST_FILES) {
      if (fileSet.has(m.toLowerCase())) return true;
    }

    // Check for requirements*.txt or *.sln / *.csproj
    if (files.some((f) => /^requirements.*\.txt$/i.test(f) || f.endsWith('.sln') || f.endsWith('.csproj'))) {
      return true;
    }

    // Check for .venv / venv
    if (fileSet.has('.venv') || fileSet.has('venv')) {
      return true;
    }
  } catch {}
  return false;
}

/**
 * Walks up the directory tree to find the nearest project root.
 * Stops at .git, drive root, or max 5 levels.
 */
export function findProjectRoot(startCwd: string): string | null {
  if (!startCwd || !fs.existsSync(startCwd)) return null;

  let current = path.resolve(startCwd);
  let levels = 0;

  while (levels < 5) {
    if (hasProjectManifest(current)) {
      return current;
    }

    // Check if reached .git
    if (fs.existsSync(path.join(current, '.git'))) {
      // If .git is here and no manifest was found, stop walking up
      break;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      // Reached drive root
      break;
    }

    current = parent;
    levels++;
  }

  return null;
}

/**
 * Calculates a quick combined mtime for cached invalidation.
 */
function getCombinedMtime(rootFolder: string): number {
  try {
    let maxMtime = 0;
    const files = fs.readdirSync(rootFolder);
    for (const f of files) {
      const lower = f.toLowerCase();
      if (
        lower === 'package.json' ||
        lower === 'pyproject.toml' ||
        lower === 'cargo.toml' ||
        lower === 'go.mod' ||
        lower === 'docker-compose.yml' ||
        lower === 'makefile' ||
        lower.startsWith('requirements')
      ) {
        try {
          const stats = fs.statSync(path.join(rootFolder, f));
          if (stats.mtimeMs > maxMtime) {
            maxMtime = stats.mtimeMs;
          }
        } catch {}
      }
    }
    return maxMtime;
  } catch {
    return 0;
  }
}

/**
 * Detects the project in the given cwd or nearest ancestor folder.
 */
export function detectProject(
  startCwd: string,
  shellType: ShellType = 'powershell',
  settings?: Partial<ProjectRunnerSettings>,
  forceRefresh: boolean = false
): ProjectInfo | null {
  const root = findProjectRoot(startCwd);
  if (!root) return null;

  const currentMtime = getCombinedMtime(root);
  const cacheKey = `${root.toLowerCase()}`;

  if (!forceRefresh) {
    const cached = detectionCache.get(cacheKey);
    if (cached && cached.mtime === currentMtime) {
      return cached.projectInfo;
    }
  }

  const toolAvailability = getToolAvailability(forceRefresh);
  const ecosystems: DetectedEcosystem[] = [];
  const errors: string[] = [];
  let allWorkspaces: WorkspacePackage[] = [];
  let nodeVersionNote: string | undefined;

  // 1. Node.js detection
  const nodeRes = detectNodeProject(root, toolAvailability, settings);
  if (nodeRes.error) {
    errors.push(nodeRes.error);
  }
  if (nodeRes.ecosystem) {
    ecosystems.push(nodeRes.ecosystem);
  }
  if (nodeRes.workspaces) {
    allWorkspaces = nodeRes.workspaces;
  }
  if (nodeRes.nodeVersionNote) {
    nodeVersionNote = nodeRes.nodeVersionNote;
  }

  // 2. Python detection
  const pyRes = detectPythonProject(root, toolAvailability, shellType, settings);
  if (pyRes.error) {
    errors.push(pyRes.error);
  }
  if (pyRes.ecosystem) {
    ecosystems.push(pyRes.ecosystem);
  }

  // 3. Other ecosystems (Rust, Go, .NET, Java, PHP, Ruby, Docker, Generic)
  const others = detectOtherEcosystems(root, toolAvailability);
  for (const other of others) {
    ecosystems.push(other);
  }

  // Filter ecosystems if enabledEcosystems setting exists
  const filteredEcosystems = ecosystems.filter((eco) => {
    if (settings?.enabledEcosystems && settings.enabledEcosystems[eco.type] === false) {
      return false;
    }
    return true;
  });

  if (filteredEcosystems.length === 0 && errors.length === 0) {
    return null;
  }

  // Find primary command
  let primaryCmd: ProjectCommand | undefined;
  for (const eco of filteredEcosystems) {
    for (const grp of eco.groups) {
      for (const cmd of grp.commands) {
        if (cmd.isPrimary) {
          primaryCmd = cmd;
          break;
        }
      }
      if (primaryCmd) break;
    }
    if (primaryCmd) break;
  }

  // Fallback primary: first available command
  if (!primaryCmd && filteredEcosystems.length > 0) {
    const firstGroup = filteredEcosystems[0]?.groups[0];
    if (firstGroup && firstGroup.commands.length > 0) {
      primaryCmd = firstGroup.commands[0];
    }
  }


  const projectName =
    (filteredEcosystems[0] && filteredEcosystems[0].name) || path.basename(root);

  const projectInfo: ProjectInfo = {
    id: `proj-${Buffer.from(root).toString('base64').replace(/[/+=]/g, '')}`,
    name: projectName,
    rootPath: root,
    cwd: startCwd,
    ecosystems: filteredEcosystems,
    primaryCommand: primaryCmd,
    workspaces: allWorkspaces.length > 0 ? allWorkspaces : undefined,
    errors: errors.length > 0 ? errors : undefined,
    nodeVersionNote,
  };

  detectionCache.set(cacheKey, {
    mtime: currentMtime,
    projectInfo,
  });

  return projectInfo;
}

export function clearDetectionCache(rootPath?: string): void {
  if (rootPath) {
    detectionCache.delete(rootPath.toLowerCase());
  } else {
    detectionCache.clear();
  }
}
