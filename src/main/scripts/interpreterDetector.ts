import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { whichSync } from '../shellDetector';
import { InterpreterInfo, ScriptType } from '../../shared/scriptRunnerTypes';
import { settingsStore } from '../settingsStore';

function execCommandAsync(
  file: string,
  args: string[],
  timeoutMs = 3000
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    execFile(file, args, { timeout: timeoutMs, windowsHide: true }, (err, stdout, stderr) => {
      resolve({
        stdout: (stdout || '').trim(),
        stderr: (stderr || '').trim(),
        code: err ? (err as any).code || 1 : 0,
      });
    });
  });
}

export class InterpreterDetector {
  private cache: Map<string, InterpreterInfo> = new Map();
  private lastDetectTime = 0;

  public async detectAll(forceRefresh = false): Promise<InterpreterInfo[]> {
    const now = Date.now();
    if (!forceRefresh && this.cache.size > 0 && now - this.lastDetectTime < 60000) {
      return Array.from(this.cache.values());
    }

    const results: InterpreterInfo[] = [];

    // 1. PowerShell 7 (pwsh)
    const pwshPath = whichSync('pwsh.exe') || whichSync('pwsh');
    if (pwshPath) {
      const v = await execCommandAsync(pwshPath, ['--version']);
      results.push({
        id: 'pwsh',
        name: 'PowerShell 7 (pwsh)',
        found: true,
        path: pwshPath,
        version: v.stdout || 'PowerShell 7+',
      });
    } else {
      results.push({
        id: 'pwsh',
        name: 'PowerShell 7 (pwsh)',
        found: false,
        hint: 'Install via winget install Microsoft.PowerShell',
      });
    }

    // 2. Windows PowerShell (powershell.exe)
    const winPsPath =
      whichSync('powershell.exe') ||
      path.join(process.env.SystemRoot || 'C:\\Windows', 'System32\\WindowsPowerShell\\v1.0\\powershell.exe');
    if (fs.existsSync(winPsPath)) {
      results.push({
        id: 'powershell',
        name: 'Windows PowerShell',
        found: true,
        path: winPsPath,
        version: '5.1 (Built-in)',
      });
    } else {
      results.push({
        id: 'powershell',
        name: 'Windows PowerShell',
        found: false,
        hint: 'Built-in Windows component missing',
      });
    }

    // 3. Command Prompt (cmd.exe)
    const cmdPath =
      whichSync('cmd.exe') ||
      path.join(process.env.SystemRoot || 'C:\\Windows', 'System32\\cmd.exe');
    if (fs.existsSync(cmdPath)) {
      results.push({
        id: 'cmd',
        name: 'Command Prompt (cmd.exe)',
        found: true,
        path: cmdPath,
        version: 'Windows CMD',
      });
    } else {
      results.push({
        id: 'cmd',
        name: 'Command Prompt (cmd.exe)',
        found: false,
        hint: 'System32 cmd.exe missing',
      });
    }

    // 4. Node.js
    const nodePath = whichSync('node.exe') || whichSync('node');
    if (nodePath) {
      const v = await execCommandAsync(nodePath, ['--version']);
      results.push({
        id: 'node',
        name: 'Node.js',
        found: true,
        path: nodePath,
        version: v.stdout || 'Node.js',
      });
    } else {
      results.push({
        id: 'node',
        name: 'Node.js',
        found: false,
        hint: 'Install from nodejs.org or winget install OpenJS.NodeJS',
      });
    }

    // 5. TypeScript (tsx)
    const tsxPath = whichSync('tsx.cmd') || whichSync('tsx');
    if (tsxPath) {
      const v = await execCommandAsync(tsxPath, ['--version']);
      results.push({
        id: 'tsx',
        name: 'TypeScript (tsx)',
        found: true,
        path: tsxPath,
        version: v.stdout || 'tsx runner',
      });
    } else {
      results.push({
        id: 'tsx',
        name: 'TypeScript (tsx)',
        found: false,
        hint: 'Install globally via npm install -g tsx',
      });
    }

    // 6. Python
    let pyPath = whichSync('py.exe') || whichSync('py');
    let pyVer = '';
    if (pyPath) {
      const v = await execCommandAsync(pyPath, ['-3', '--version']);
      if (v.code === 0 && v.stdout) {
        pyVer = v.stdout;
      }
    }
    if (!pyPath) {
      pyPath = whichSync('python.exe') || whichSync('python');
      if (pyPath) {
        const v = await execCommandAsync(pyPath, ['--version']);
        if (v.code === 0 && v.stdout) {
          pyVer = v.stdout;
        }
      }
    }
    if (!pyPath) {
      pyPath = whichSync('python3.exe') || whichSync('python3');
      if (pyPath) {
        const v = await execCommandAsync(pyPath, ['--version']);
        if (v.code === 0 && v.stdout) {
          pyVer = v.stdout;
        }
      }
    }

    if (pyPath) {
      results.push({
        id: 'python',
        name: 'Python',
        found: true,
        path: pyPath,
        version: pyVer || 'Python',
      });
    } else {
      results.push({
        id: 'python',
        name: 'Python',
        found: false,
        hint: 'Install from python.org or Microsoft Store',
      });
    }

    // 7. Bash / Shell (WSL / Git Bash)
    const wslPath = whichSync('wsl.exe') || path.join(process.env.SystemRoot || 'C:\\Windows', 'System32\\wsl.exe');
    const gitBashPath =
      whichSync('bash.exe') ||
      'C:\\Program Files\\Git\\bin\\bash.exe';

    if (fs.existsSync(wslPath)) {
      results.push({
        id: 'bash',
        name: 'WSL Bash',
        found: true,
        path: wslPath,
        version: 'WSL Default Distro',
      });
    } else if (fs.existsSync(gitBashPath)) {
      results.push({
        id: 'bash',
        name: 'Git Bash',
        found: true,
        path: gitBashPath,
        version: 'Git for Windows Bash',
      });
    } else {
      results.push({
        id: 'bash',
        name: 'Bash / Linux Shell',
        found: false,
        hint: 'Install WSL via wsl --install or Git for Windows',
      });
    }

    // 8. VBScript / JScript (cscript.exe)
    const cscriptPath =
      whichSync('cscript.exe') ||
      path.join(process.env.SystemRoot || 'C:\\Windows', 'System32\\cscript.exe');
    if (fs.existsSync(cscriptPath)) {
      results.push({
        id: 'cscript',
        name: 'Windows Script Host (cscript)',
        found: true,
        path: cscriptPath,
        version: 'VBScript / JScript Engine',
      });
    } else {
      results.push({
        id: 'cscript',
        name: 'Windows Script Host (cscript)',
        found: false,
        hint: 'System32 cscript.exe missing',
      });
    }

    this.cache.clear();
    for (const r of results) {
      this.cache.set(r.id, r);
    }
    this.lastDetectTime = Date.now();

    return results;
  }

  /**
   * Resolves the executable path and arguments to launch a script of a given type.
   */
  public async resolveExecution(
    type: ScriptType,
    targetFileOrSnippet: string,
    isInline: boolean,
    preferPwshOverride?: boolean,
    userOverride?: string
  ): Promise<{ executable: string; args: string[]; error?: string; tempFileCreated?: string }> {
    const interpreters = await this.detectAll();
    const settings = settingsStore.get();
    const preferPwsh = preferPwshOverride !== undefined ? preferPwshOverride : (settings.scriptRunner?.preferPwsh ?? true);

    // Custom user interpreter override
    if (userOverride) {
      if (fs.existsSync(userOverride) || whichSync(userOverride)) {
        return { executable: userOverride, args: [targetFileOrSnippet] };
      }
      return { executable: '', args: [], error: `Custom interpreter not found: "${userOverride}"` };
    }

    switch (type) {
      case 'powershell': {
        const pwsh = interpreters.find((i) => i.id === 'pwsh');
        const winps = interpreters.find((i) => i.id === 'powershell');
        const chosen = (preferPwsh && pwsh?.found ? pwsh : (winps?.found ? winps : pwsh)) || winps;

        if (!chosen || !chosen.found || !chosen.path) {
          return { executable: '', args: [], error: 'PowerShell executable not found on system.' };
        }

        if (isInline) {
          return {
            executable: chosen.path,
            args: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', targetFileOrSnippet],
          };
        } else {
          return {
            executable: chosen.path,
            args: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', targetFileOrSnippet],
          };
        }
      }

      case 'bat' as any:
      case 'cmd': {
        const cmd = interpreters.find((i) => i.id === 'cmd');
        if (!cmd || !cmd.found || !cmd.path) {
          return { executable: '', args: [], error: 'Command Prompt (cmd.exe) not found.' };
        }
        if (isInline) {
          return { executable: cmd.path, args: ['/d', '/c', targetFileOrSnippet] };
        } else {
          return { executable: cmd.path, args: ['/d', '/c', 'call', targetFileOrSnippet] };
        }
      }

      case 'node': {
        const node = interpreters.find((i) => i.id === 'node');
        if (!node || !node.found || !node.path) {
          return { executable: '', args: [], error: 'Node.js is not installed or not found on PATH.' };
        }
        if (isInline) {
          return { executable: node.path, args: ['-e', targetFileOrSnippet] };
        } else {
          return { executable: node.path, args: [targetFileOrSnippet] };
        }
      }

      case 'typescript': {
        const tsx = interpreters.find((i) => i.id === 'tsx');
        if (tsx?.found && tsx.path) {
          return { executable: tsx.path, args: [targetFileOrSnippet] };
        }
        // Fallback: check if npx is available
        const npx = whichSync('npx.cmd') || whichSync('npx');
        if (npx) {
          return { executable: npx, args: ['tsx', targetFileOrSnippet] };
        }
        return { executable: '', args: [], error: 'TypeScript runner (tsx) not found. Install via: npm install -g tsx' };
      }

      case 'python': {
        const py = interpreters.find((i) => i.id === 'python');
        if (!py || !py.found || !py.path) {
          return { executable: '', args: [], error: 'Python interpreter not found on system.' };
        }
        if (isInline) {
          return { executable: py.path, args: ['-c', targetFileOrSnippet] };
        } else {
          return { executable: py.path, args: [targetFileOrSnippet] };
        }
      }

      case 'bash': {
        const bash = interpreters.find((i) => i.id === 'bash');
        if (!bash || !bash.found || !bash.path) {
          return { executable: '', args: [], error: 'Bash (WSL or Git Bash) not found on system.' };
        }
        if (bash.name.includes('WSL')) {
          if (isInline) {
            return { executable: bash.path, args: ['bash', '-c', targetFileOrSnippet] };
          } else {
            return { executable: bash.path, args: ['bash', targetFileOrSnippet] };
          }
        } else {
          if (isInline) {
            return { executable: bash.path, args: ['-c', targetFileOrSnippet] };
          } else {
            return { executable: bash.path, args: [targetFileOrSnippet] };
          }
        }
      }

      case 'vbs': {
        const cscript = interpreters.find((i) => i.id === 'cscript');
        if (!cscript || !cscript.found || !cscript.path) {
          return { executable: '', args: [], error: 'cscript.exe not found on system.' };
        }
        return { executable: cscript.path, args: ['//Nologo', targetFileOrSnippet] };
      }

      case 'inline' as any:
      case 'command': {
        // Run inline command in preferred shell (PowerShell or cmd)
        const pwsh = interpreters.find((i) => i.id === 'pwsh');
        const winps = interpreters.find((i) => i.id === 'powershell');
        const chosen = (preferPwsh && pwsh?.found ? pwsh : winps) || winps;
        if (chosen?.found && chosen.path) {
          return {
            executable: chosen.path,
            args: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', targetFileOrSnippet],
          };
        }
        const cmd = interpreters.find((i) => i.id === 'cmd');
        if (cmd?.found && cmd.path) {
          return { executable: cmd.path, args: ['/d', '/c', targetFileOrSnippet] };
        }
        return { executable: '', args: [], error: 'No shell available to execute command.' };
      }

      default:
        return { executable: '', args: [], error: `Unsupported script type: "${type}"` };
    }
  }

  /**
   * Detects script type from file extension.
   */
  public detectTypeFromExtension(filename: string): ScriptType {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
      case '.ps1':
        return 'powershell';
      case '.bat':
      case '.cmd':
        return 'cmd';
      case '.js':
      case '.mjs':
      case '.cjs':
        return 'node';
      case '.ts':
        return 'typescript';
      case '.py':
        return 'python';
      case '.sh':
        return 'bash';
      case '.vbs':
        return 'vbs';
      default:
        return 'powershell';
    }
  }

  public resolveCommand = this.resolveExecution.bind(this);
}

export const interpreterDetector = new InterpreterDetector();
