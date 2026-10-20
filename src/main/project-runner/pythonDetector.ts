import fs from 'fs';
import path from 'path';
import {
  DetectedEcosystem,
  ProjectCommand,
  CommandGroup,
  ProjectRunnerSettings,
} from '../../shared/projectRunnerTypes';
import { ShellType } from '../../shared/terminalUtils';

export interface PythonDetectionResult {
  ecosystem?: DetectedEcosystem;
  error?: string;
}

export function detectPythonProject(
  folder: string,
  toolAvailability: Record<string, boolean>,
  currentShell: ShellType = 'powershell',
  _settings?: Partial<ProjectRunnerSettings>
): PythonDetectionResult {

  const pyprojectPath = path.join(folder, 'pyproject.toml');
  const pipfilePath = path.join(folder, 'Pipfile');
  const setupPyPath = path.join(folder, 'setup.py');
  const setupCfgPath = path.join(folder, 'setup.cfg');
  const managePyPath = path.join(folder, 'manage.py');
  const appPyPath = path.join(folder, 'app.py');
  const mainPyPath = path.join(folder, 'main.py');
  const wsgiPyPath = path.join(folder, 'wsgi.py');

  // Check for any requirements*.txt
  let requirementFiles: string[] = [];
  try {
    const files = fs.readdirSync(folder);
    requirementFiles = files.filter((f) => /^requirements.*\.txt$/i.test(f));
  } catch {}

  const hasPyproject = fs.existsSync(pyprojectPath);
  const hasPipfile = fs.existsSync(pipfilePath);
  const hasSetupPy = fs.existsSync(setupPyPath) || fs.existsSync(setupCfgPath);
  const hasManagePy = fs.existsSync(managePyPath);
  const hasRequirements = requirementFiles.length > 0;
  const hasEntryPy = fs.existsSync(appPyPath) || fs.existsSync(mainPyPath) || fs.existsSync(wsgiPyPath);

  // Check for venvs
  const venvNames = ['.venv', 'venv', 'env'];
  const existingVenv = venvNames.find((v) => fs.existsSync(path.join(folder, v)));

  if (!hasPyproject && !hasPipfile && !hasSetupPy && !hasManagePy && !hasRequirements && !hasEntryPy && !existingVenv) {
    return {};
  }

  // 1. Tool resolution: uv.lock -> uv, poetry.lock -> poetry, pdm.lock -> pdm, Pipfile.lock -> pipenv, else pip
  let tool = 'pip';
  if (fs.existsSync(path.join(folder, 'uv.lock'))) {
    tool = 'uv';
  } else if (fs.existsSync(path.join(folder, 'poetry.lock'))) {
    tool = 'poetry';
  } else if (fs.existsSync(path.join(folder, 'pdm.lock'))) {
    tool = 'pdm';
  } else if (fs.existsSync(path.join(folder, 'Pipfile.lock')) || hasPipfile) {
    tool = 'pipenv';
  } else if (toolAvailability['uv'] && hasPyproject) {
    tool = 'uv';
  }

  const isAvailable = Boolean(toolAvailability[tool] || toolAvailability['python'] || toolAvailability['py']);
  const toolMissingReason = isAvailable ? undefined : `${tool} not found`;

  // 2. Read pyproject.toml safely if present
  let pyprojectText = '';
  if (hasPyproject) {
    try {
      const stats = fs.statSync(pyprojectPath);
      if (stats.size <= 1024 * 1024) {
        pyprojectText = fs.readFileSync(pyprojectPath, 'utf8');
      }
    } catch {}
  }

  // Read requirements content for package list & linter detection
  let requirementsContent = '';
  for (const rf of requirementFiles) {
    try {
      requirementsContent += fs.readFileSync(path.join(folder, rf), 'utf8') + '\n';
    } catch {}
  }

  // Light scan of entry files for framework hints
  let entryFileContent = '';
  const entryCandidate = [appPyPath, mainPyPath, wsgiPyPath, managePyPath].find((p) => fs.existsSync(p));
  if (entryCandidate) {
    try {
      entryFileContent = fs.readFileSync(entryCandidate, 'utf8').slice(0, 10000);
    } catch {}
  }

  const hasFlask = /import\s+flask|from\s+flask\s+import/i.test(entryFileContent) || requirementsContent.includes('flask') || pyprojectText.includes('flask');
  const hasFastAPI = /import\s+fastapi|from\s+fastapi\s+import/i.test(entryFileContent) || requirementsContent.includes('fastapi') || pyprojectText.includes('fastapi');
  const hasStreamlit = /import\s+streamlit|from\s+streamlit\s+import/i.test(entryFileContent) || requirementsContent.includes('streamlit') || pyprojectText.includes('streamlit');
  const hasPytest = fs.existsSync(path.join(folder, 'tests')) || requirementsContent.includes('pytest') || pyprojectText.includes('pytest');
  const hasRuff = requirementsContent.includes('ruff') || pyprojectText.includes('[tool.ruff]');
  const hasBlack = requirementsContent.includes('black') || pyprojectText.includes('[tool.black]');
  const hasMypy = requirementsContent.includes('mypy') || pyprojectText.includes('[tool.mypy]');
  const hasFlake8 = requirementsContent.includes('flake8') || fs.existsSync(path.join(folder, '.flake8'));

  const groups: CommandGroup[] = [];

  // Environment group
  const envCommands: ProjectCommand[] = [];

  // Activate command per shell
  const venvDir = existingVenv || '.venv';
  let activateCmdText: string;
  let activateArgs: string[];

  if (currentShell === 'cmd') {
    activateCmdText = `.\\${venvDir}\\Scripts\\activate.bat`;
    activateArgs = [`${venvDir}\\Scripts\\activate.bat`];
  } else if (currentShell === 'bash' || currentShell === 'wsl') {
    activateCmdText = `source ${venvDir}/bin/activate`;
    activateArgs = ['source', `${venvDir}/bin/activate`];
  } else {
    // PowerShell
    activateCmdText = `.\\${venvDir}\\Scripts\\Activate.ps1`;
    activateArgs = [`.\\${venvDir}\\Scripts\\Activate.ps1`];
  }

  if (existingVenv) {
    envCommands.push({
      id: 'python-activate-venv',
      label: `Activate ${venvDir}`,
      commandText: activateCmdText,
      tool: 'shell',
      args: activateArgs,
      cwd: folder,
      category: 'env',
    });
  }

  // Create venv
  const createVenvCmd = toolAvailability['uv'] ? 'uv venv' : 'python -m venv .venv';
  envCommands.push({
    id: 'python-create-venv',
    label: 'Create virtual environment (.venv)',
    commandText: createVenvCmd,
    tool: toolAvailability['uv'] ? 'uv' : 'python',
    args: toolAvailability['uv'] ? ['venv'] : ['-m', 'venv', '.venv'],
    cwd: folder,
    category: 'env',
  });

  // Show active interpreter
  envCommands.push({
    id: 'python-show-interpreter',
    label: 'Show active interpreter',
    commandText: `python -c "import sys; print(sys.executable)"`,
    tool: 'python',
    args: ['-c', 'import sys; print(sys.executable)'],
    cwd: folder,
    category: 'env',
  });

  // Delete venv
  if (existingVenv) {
    envCommands.push({
      id: 'python-delete-venv',
      label: `Delete environment (${venvDir})`,
      commandText: currentShell === 'cmd' ? `rmdir /s /q ${venvDir}` : `Remove-Item -Recurse -Force .\\${venvDir}`,
      tool: 'shell',
      args: currentShell === 'cmd' ? ['rmdir', '/s', '/q', venvDir] : ['Remove-Item', '-Recurse', '-Force', `.\\${venvDir}`],
      cwd: folder,
      category: 'env',
      requiresConfirm: true,
      confirmMessage: `Are you sure you want to delete the ${venvDir} virtual environment directory?`,
    });
  }

  groups.push({
    id: 'python-group-env',
    title: 'Environment',
    commands: envCommands,
  });

  // Install group
  const installCommands: ProjectCommand[] = [];

  for (const rf of requirementFiles) {
    installCommands.push({
      id: `python-install-${rf}`,
      label: `Install ${rf}`,
      commandText: tool === 'uv' ? `uv pip install -r ${rf}` : `pip install -r ${rf}`,
      tool: tool === 'uv' ? 'uv' : 'pip',
      args: tool === 'uv' ? ['pip', 'install', '-r', rf] : ['install', '-r', rf],
      cwd: folder,
      category: 'install',
    });
  }

  if (hasPyproject || hasSetupPy) {
    let installProjCmd = 'pip install -e .';
    let installProjArgs = ['install', '-e', '.'];
    if (tool === 'poetry') {
      installProjCmd = 'poetry install';
      installProjArgs = ['install'];
    } else if (tool === 'uv') {
      installProjCmd = 'uv sync';
      installProjArgs = ['sync'];
    } else if (tool === 'pdm') {
      installProjCmd = 'pdm install';
      installProjArgs = ['install'];
    }

    installCommands.push({
      id: 'python-install-project',
      label: 'Install project (editable)',
      commandText: installProjCmd,
      tool,
      args: installProjArgs,
      cwd: folder,
      category: 'install',
    });
  }

  installCommands.push({
    id: 'python-freeze-reqs',
    label: 'Freeze to requirements.txt',
    commandText: tool === 'uv' ? 'uv pip freeze > requirements.txt' : 'pip freeze > requirements.txt',
    tool: tool === 'uv' ? 'uv' : 'pip',
    args: tool === 'uv' ? ['pip', 'freeze'] : ['freeze'],
    cwd: folder,
    category: 'install',
  });

  installCommands.push({
    id: 'python-upgrade-pip',
    label: 'Upgrade pip',
    commandText: 'python -m pip install --upgrade pip',
    tool: 'python',
    args: ['-m', 'pip', 'install', '--upgrade', 'pip'],
    cwd: folder,
    category: 'install',
  });

  installCommands.push({
    id: 'python-list-outdated',
    label: 'Show outdated packages',
    commandText: 'pip list --outdated',
    tool: 'pip',
    args: ['list', '--outdated'],
    cwd: folder,
    category: 'install',
  });

  installCommands.push({
    id: 'python-list-installed',
    label: 'Show installed packages',
    commandText: 'pip list',
    tool: 'pip',
    args: ['list'],
    cwd: folder,
    category: 'install',
  });

  groups.push({
    id: 'python-group-install',
    title: 'Install',
    commands: installCommands,
  });

  // Packages group
  const parsedDeps: string[] = [];
  const reqLines = requirementsContent.split(/\r?\n/);
  for (const line of reqLines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('-')) {
      const match = trimmed.match(/^([a-zA-Z0-9._-]+)/);
      if (match && match[1]) {
        parsedDeps.push(match[1]);
      }
    }
  }

  const uninstallSubgroup: ProjectCommand[] = [...new Set(parsedDeps)].slice(0, 50).map((dep) => ({
    id: `python-uninstall-${dep}`,
    label: dep,
    commandText: tool === 'uv' ? `uv pip uninstall ${dep}` : `pip uninstall -y ${dep}`,
    tool: tool === 'uv' ? 'uv' : 'pip',
    args: tool === 'uv' ? ['pip', 'uninstall', dep] : ['uninstall', '-y', dep],
    cwd: folder,
    category: 'package',
    requiresConfirm: true,
    confirmMessage: `Uninstall package "${dep}"?`,
  }));

  const upgradeSubgroup: ProjectCommand[] = [...new Set(parsedDeps)].slice(0, 50).map((dep) => ({
    id: `python-upgrade-${dep}`,
    label: dep,
    commandText: tool === 'uv' ? `uv pip install --upgrade ${dep}` : `pip install --upgrade ${dep}`,
    tool: tool === 'uv' ? 'uv' : 'pip',
    args: tool === 'uv' ? ['pip', 'install', '--upgrade', dep] : ['install', '--upgrade', dep],
    cwd: folder,
    category: 'package',
  }));

  const packageCommands: ProjectCommand[] = [
    {
      id: 'python-add-package',
      label: 'Add package...',
      commandText: tool === 'uv' ? 'uv add <package>' : tool === 'poetry' ? 'poetry add <package>' : 'pip install <package>',
      tool,
      args: [],
      cwd: folder,
      category: 'package',
    },
  ];

  const packageSubgroups: CommandGroup[] = [];
  if (uninstallSubgroup.length > 0) {
    packageSubgroups.push({
      id: 'python-subgroup-uninstall',
      title: 'Uninstall package',
      commands: uninstallSubgroup,
    });
  }
  if (upgradeSubgroup.length > 0) {
    packageSubgroups.push({
      id: 'python-subgroup-upgrade',
      title: 'Upgrade package',
      commands: upgradeSubgroup,
    });
  }

  groups.push({
    id: 'python-group-packages',
    title: 'Packages',
    commands: packageCommands,
    subgroups: packageSubgroups,
  });

  // Run group
  const runCommands: ProjectCommand[] = [];

  // Parse scripts from pyproject.toml ([project.scripts], [tool.poetry.scripts], etc.)
  if (pyprojectText) {
    const lines = pyprojectText.split(/\r?\n/);
    let inScriptsSection = false;
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line.startsWith('[') && line.endsWith(']')) {
        const header = line.slice(1, -1).trim();
        inScriptsSection = [
          'project.scripts',
          'tool.poetry.scripts',
          'tool.pdm.scripts',
          'tool.taskipy.tasks',
          'tool.poe.tasks',
        ].includes(header);
        continue;
      }
      if (inScriptsSection && line && !line.startsWith('#')) {
        const eqIdx = line.indexOf('=');
        if (eqIdx > 0) {
          const scriptName = line.slice(0, eqIdx).trim();
          if (/^[a-zA-Z0-9_-]+$/.test(scriptName)) {
            const runnerTool = tool === 'poetry' ? 'poetry' : tool === 'uv' ? 'uv' : tool === 'pdm' ? 'pdm' : 'python';
            const cmdText = runnerTool === 'python' ? `python -m ${scriptName}` : `${runnerTool} run ${scriptName}`;
            const cmdArgs = runnerTool === 'python' ? ['-m', scriptName] : ['run', scriptName];
            runCommands.push({
              id: `python-script-${scriptName}`,
              label: scriptName,
              commandText: cmdText,
              tool: runnerTool,
              args: cmdArgs,
              cwd: folder,
              category: 'run',
            });
          }
        }
      }
    }
  }

  // Django commands
  if (hasManagePy) {
    runCommands.push({
      id: 'python-django-runserver',
      label: 'runserver (Django)',
      commandText: 'python manage.py runserver',
      tool: 'python',
      args: ['manage.py', 'runserver'],
      cwd: folder,
      category: 'run',
      isLongRunning: true,
      isPrimary: true,
    });
    runCommands.push({
      id: 'python-django-migrate',
      label: 'migrate (Django)',
      commandText: 'python manage.py migrate',
      tool: 'python',
      args: ['manage.py', 'migrate'],
      cwd: folder,
      category: 'run',
    });
    runCommands.push({
      id: 'python-django-makemigrations',
      label: 'makemigrations (Django)',
      commandText: 'python manage.py makemigrations',
      tool: 'python',
      args: ['manage.py', 'makemigrations'],
      cwd: folder,
      category: 'run',
    });
    runCommands.push({
      id: 'python-django-createsuperuser',
      label: 'createsuperuser (Django)',
      commandText: 'python manage.py createsuperuser',
      tool: 'python',
      args: ['manage.py', 'createsuperuser'],
      cwd: folder,
      category: 'run',
    });
    runCommands.push({
      id: 'python-django-shell',
      label: 'shell (Django)',
      commandText: 'python manage.py shell',
      tool: 'python',
      args: ['manage.py', 'shell'],
      cwd: folder,
      category: 'run',
    });
  }

  // FastAPI
  if (hasFastAPI) {
    const entryBase = fs.existsSync(mainPyPath) ? 'main' : fs.existsSync(appPyPath) ? 'app' : 'main';
    runCommands.push({
      id: 'python-fastapi-run',
      label: `uvicorn ${entryBase}:app --reload`,
      commandText: `uvicorn ${entryBase}:app --reload`,
      tool: 'uvicorn',
      args: [`${entryBase}:app`, '--reload'],
      cwd: folder,
      category: 'run',
      isLongRunning: true,
      isPrimary: !hasManagePy,
    });
  }

  // Flask
  if (hasFlask && !hasFastAPI) {
    runCommands.push({
      id: 'python-flask-run',
      label: 'flask run',
      commandText: 'flask run',
      tool: 'flask',
      args: ['run'],
      cwd: folder,
      category: 'run',
      isLongRunning: true,
      isPrimary: !hasManagePy,
    });
  }

  // Streamlit
  if (hasStreamlit) {
    const appFile = fs.existsSync(appPyPath) ? 'app.py' : fs.existsSync(mainPyPath) ? 'main.py' : 'app.py';
    runCommands.push({
      id: 'python-streamlit-run',
      label: `streamlit run ${appFile}`,
      commandText: `streamlit run ${appFile}`,
      tool: 'streamlit',
      args: ['run', appFile],
      cwd: folder,
      category: 'run',
      isLongRunning: true,
    });
  }

  // Pytest
  if (hasPytest) {
    runCommands.push({
      id: 'python-pytest-all',
      label: 'pytest (all)',
      commandText: 'pytest',
      tool: 'pytest',
      args: [],
      cwd: folder,
      category: 'run',
    });
    runCommands.push({
      id: 'python-pytest-lastfailed',
      label: 'pytest --last-failed',
      commandText: 'pytest --last-failed',
      tool: 'pytest',
      args: ['--last-failed'],
      cwd: folder,
      category: 'run',
    });
    if (requirementsContent.includes('pytest-cov') || pyprojectText.includes('pytest-cov')) {
      runCommands.push({
        id: 'python-pytest-cov',
        label: 'pytest with coverage',
        commandText: 'pytest --cov',
        tool: 'pytest',
        args: ['--cov'],
        cwd: folder,
        category: 'run',
      });
    }
  }

  // Entry file fallback
  if (fs.existsSync(mainPyPath)) {
    runCommands.push({
      id: 'python-run-main',
      label: 'python main.py',
      commandText: 'python main.py',
      tool: 'python',
      args: ['main.py'],
      cwd: folder,
      category: 'run',
      isPrimary: !hasManagePy && !hasFastAPI && !hasFlask,
    });
  } else if (fs.existsSync(appPyPath)) {
    runCommands.push({
      id: 'python-run-app',
      label: 'python app.py',
      commandText: 'python app.py',
      tool: 'python',
      args: ['app.py'],
      cwd: folder,
      category: 'run',
      isPrimary: !hasManagePy && !hasFastAPI && !hasFlask,
    });
  }

  if (runCommands.length > 0) {
    groups.push({
      id: 'python-group-run',
      title: 'Run',
      commands: runCommands,
    });
  }

  // Lint / Format group
  const lintCommands: ProjectCommand[] = [];
  if (hasRuff) {
    lintCommands.push({
      id: 'python-ruff-check',
      label: 'ruff check .',
      commandText: 'ruff check .',
      tool: 'ruff',
      args: ['check', '.'],
      cwd: folder,
      category: 'lint',
    });
    lintCommands.push({
      id: 'python-ruff-format',
      label: 'ruff format .',
      commandText: 'ruff format .',
      tool: 'ruff',
      args: ['format', '.'],
      cwd: folder,
      category: 'lint',
    });
  }
  if (hasBlack) {
    lintCommands.push({
      id: 'python-black',
      label: 'black .',
      commandText: 'black .',
      tool: 'black',
      args: ['.'],
      cwd: folder,
      category: 'lint',
    });
  }
  if (hasMypy) {
    lintCommands.push({
      id: 'python-mypy',
      label: 'mypy .',
      commandText: 'mypy .',
      tool: 'mypy',
      args: ['.'],
      cwd: folder,
      category: 'lint',
    });
  }
  if (hasFlake8) {
    lintCommands.push({
      id: 'python-flake8',
      label: 'flake8 .',
      commandText: 'flake8 .',
      tool: 'flake8',
      args: ['.'],
      cwd: folder,
      category: 'lint',
    });
  }

  if (lintCommands.length > 0) {
    groups.push({
      id: 'python-group-lint',
      title: 'Lint & Format',
      commands: lintCommands,
    });
  }

  const ecosystem: DetectedEcosystem = {
    type: 'python',
    name: path.basename(folder),
    tool,
    toolAvailable: isAvailable,
    toolMissingReason,
    groups,
    note: existingVenv ? `Environment: ${existingVenv}` : undefined,
  };

  return { ecosystem };
}
