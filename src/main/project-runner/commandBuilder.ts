import { ShellType, quoteForShell } from '../../shared/terminalUtils';
import { ProjectCommand } from '../../shared/projectRunnerTypes';

export function renderCommandString(
  cmd: ProjectCommand,
  shellType: ShellType,
  sessionCwd?: string
): string {
  let execString = cmd.commandText;

  if (cmd.args && cmd.args.length > 0) {
    const quotedArgs = cmd.args.map((a) => {
      // Don't quote simple alphanumeric identifiers or flags (e.g. run, -v, --dev, @scope/pkg)
      if (/^[a-zA-Z0-9_\-.:/@]+$/.test(a)) {
        return a;
      }
      return quoteForShell(shellType, a);
    });
    execString = `${cmd.tool} ${quotedArgs.join(' ')}`;
  }

  // Handle cwd change if required and different
  if (cmd.cwd && sessionCwd && cmd.cwd.toLowerCase() !== sessionCwd.toLowerCase()) {
    if (shellType === 'powershell') {
      return `Set-Location ${quoteForShell('powershell', cmd.cwd)} ; ${execString}`;
    } else if (shellType === 'cmd') {
      return `cd /d ${quoteForShell('cmd', cmd.cwd)} && ${execString}`;
    } else {
      // bash / wsl / posix
      return `cd ${quoteForShell('bash', cmd.cwd)} && ${execString}`;
    }
  }

  return execString;
}
