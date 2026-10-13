import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export function getLaunchDebugLogPath(): string {
  try {
    const userData = app?.getPath ? app.getPath('userData') : process.cwd();
    return path.join(userData, 'launch-debug.log');
  } catch {
    return path.join(process.cwd(), 'launch-debug.log');
  }
}

export function logHop(
  hop: 'H1' | 'H2' | 'H3' | 'H4' | 'H5' | 'H6' | 'H7',
  payload: any
): void {
  const timestamp = new Date().toISOString();
  const serialized = JSON.stringify(payload);
  const logLine = `[${timestamp}] [${hop}] ${serialized}\n`;

  try {
    process.stdout.write(logLine);
  } catch {}

  try {
    const logPath = getLaunchDebugLogPath();
    const dir = path.dirname(logPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.appendFileSync(logPath, logLine, 'utf8');
  } catch (err) {
    console.error('[LaunchDebugger] Failed to append to launch-debug.log:', err);
  }
}
