import path from 'path';
import fs from 'fs';
import os from 'os';
import { logger } from './logger';
import { TerminalProfile } from '../shared/types';
import { logHop } from './launchDebugger';

export interface ParsedCliArgs {
  cwd?: string;
  rawCwd?: string;
  cwdNotFound?: boolean;
  profile?: string;
  newWindow?: boolean;
  dock?: boolean;
  hidden?: boolean;
  runSequence?: string;
  agent?: string;
  agentsPanel?: boolean;
  mode?: 'tab' | 'window';
  resume?: boolean;
}

/**
 * Strips damaged quotes caused by Windows command line trailing backslash escapes (e.g. "C:\" -> C:").
 */
export function cleanRawPathString(raw?: string): string | undefined {
  if (!raw) return undefined;
  let cleaned = raw.trim();
  if (!cleaned) return undefined;

  // 1. Strip matching outer quotes: "path" -> path
  if (cleaned.startsWith('"') && cleaned.endsWith('"') && cleaned.length >= 2) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  // 2. Handle swallowed quote artifact from trailing backslash:
  // e.g. "C:\" becomes C:" or C:\" in argv
  if (cleaned.endsWith('"')) {
    cleaned = cleaned.slice(0, -1).trim();
  }

  if (process.platform === 'win32') {
    // 3. Normalize forward slashes to backslashes
    cleaned = cleaned.replace(/\//g, '\\');

    if (cleaned.endsWith('\\') && cleaned.length > 3) {
      // If it ends with trailing slash (except drive roots like C:\)
      cleaned = cleaned.replace(/\\+$/, '');
    }

    // 4. Drive root normalization: "C:" or "C:\"
    if (/^[a-zA-Z]:\\?$/.test(cleaned)) {
      cleaned = `${cleaned.slice(0, 2)}\\`;
    }
  } else {
    // POSIX path normalization
    if (cleaned.endsWith('/') && cleaned.length > 1) {
      cleaned = cleaned.replace(/\/+$/, '');
    }
  }

  return cleaned || undefined;
}

/**
 * Validates and normalizes a candidate directory path.
 * - Must exist.
 * - If a file is passed, its parent folder is returned.
 * - Normalizes the path with backslashes.
 * - Rejects unresolvable UNC paths.
 */
export function validateAndNormalizeDirectory(rawPath?: string): string | undefined {
  const cleaned = cleanRawPathString(rawPath);
  if (!cleaned) {
    logHop('H3', { raw: rawPath, cleaned: null, normalized: null, stat: 'missing' });
    return undefined;
  }

  try {
    // Check UNC path resolution
    if (cleaned.startsWith('\\\\')) {
      if (!fs.existsSync(cleaned)) {
        logger.warn(`[Path Validation] Rejected unresolvable UNC path: "${cleaned}"`);
        logHop('H3', { raw: rawPath, cleaned, normalized: cleaned, stat: 'missing' });
        return undefined;
      }
    }

    let normalized = path.resolve(cleaned).replace(/\//g, '\\');
    // Ensure drive root like "C:\" has trailing backslash
    if (/^[a-zA-Z]:\\?$/.test(normalized)) {
      normalized = `${normalized.slice(0, 2)}\\`;
    }

    const exists = fs.existsSync(normalized);
    let stat = 'missing';
    let resultDir: string | undefined = undefined;

    if (exists) {
      const stats = fs.statSync(normalized);
      if (stats.isDirectory()) {
        stat = 'directory';
        resultDir = normalized;
      } else if (stats.isFile()) {
        stat = 'file';
        resultDir = path.dirname(normalized).replace(/\//g, '\\');
        if (/^[a-zA-Z]:\\?$/.test(resultDir)) {
          resultDir = `${resultDir.slice(0, 2)}\\`;
        }
        logger.info(`[Path Validation] File passed instead of folder. Using parent directory: "${resultDir}"`);
      } else {
        stat = 'other';
      }
    }

    logHop('H3', {
      raw: rawPath,
      cleaned,
      normalized,
      stat,
      resultDir,
    });

    return resultDir;
  } catch (err) {
    logger.warn(`[Path Validation] Failed to validate path "${rawPath}":`, err);
    logHop('H3', { raw: rawPath, cleaned, normalized: null, stat: 'error' });
  }

  return undefined;
}

/**
 * Resolves the effective working directory according to strict precedence:
 * Precedence: explicit requestedCwd (if exists) > profile CWD (with ~ expanded) > os.homedir().
 * If requestedCwd does not exist, marks as invalid and falls back to profile CWD.
 */
export function resolveLaunchCwd(
  requestedCwd?: string,
  profile?: TerminalProfile | null
): { cwd: string; requestedCwdInvalid?: string } {
  const homeDir = os.homedir() || process.cwd();

  // 1. Explicit requested CWD
  if (requestedCwd) {
    const validated = validateAndNormalizeDirectory(requestedCwd);
    if (validated) {
      return { cwd: validated };
    } else {
      logger.warn(`[CWD Resolution] Requested folder does not exist: "${requestedCwd}". Falling back.`);
      const fallback = resolveProfileOrHomeCwd(profile, homeDir);
      return { cwd: fallback, requestedCwdInvalid: requestedCwd };
    }
  }

  // 2. Profile CWD or Home
  return { cwd: resolveProfileOrHomeCwd(profile, homeDir) };
}

function resolveProfileOrHomeCwd(profile?: TerminalProfile | null, fallbackHome: string = os.homedir()): string {
  if (profile?.cwd) {
    let pCwd = profile.cwd.trim();
    if (pCwd === '~' || pCwd.startsWith('~/') || pCwd.startsWith('~\\')) {
      pCwd = pCwd === '~' ? fallbackHome : path.join(fallbackHome, pCwd.slice(2));
    }
    const validated = validateAndNormalizeDirectory(pCwd);
    if (validated) return validated;
  }
  return fallbackHome && fs.existsSync(fallbackHome) ? fallbackHome : process.cwd();
}

/**
 * Parses command-line arguments by flag name for both initial launch and second-instance events.
 * Supports:
 *   --cwd "<path>" or --cwd="<path>"
 *   --profile "<id or name>" or --profile="<id or name>"
 *   --new-window
 *   --dock
 *   --hidden
 */
export function parseCliArgs(argv: string[]): ParsedCliArgs {
  const result: ParsedCliArgs = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg) continue;

    if (arg === '--hidden') {
      result.hidden = true;
    } else if (arg === '--new-window') {
      result.newWindow = true;
    } else if (arg === '--dock') {
      result.dock = true;
    } else if (arg.startsWith('--cwd=')) {
      const raw = arg.slice('--cwd='.length);
      result.rawCwd = cleanRawPathString(raw);
      result.cwd = validateAndNormalizeDirectory(raw);
      if (result.rawCwd && !result.cwd) {
        result.cwdNotFound = true;
      }
    } else if (arg === '--cwd') {
      if (i + 1 < argv.length && argv[i + 1] && !argv[i + 1]!.startsWith('--')) {
        const raw = argv[++i]!;
        result.rawCwd = cleanRawPathString(raw);
        result.cwd = validateAndNormalizeDirectory(raw);
        if (result.rawCwd && !result.cwd) {
          result.cwdNotFound = true;
        }
      }
    } else if (arg.startsWith('--profile=')) {
      result.profile = cleanRawPathString(arg.slice('--profile='.length));
    } else if (arg === '--profile' && i + 1 < argv.length && argv[i + 1] && !argv[i + 1]!.startsWith('--')) {
      result.profile = cleanRawPathString(argv[++i]!);
    } else if (arg.startsWith('--run-sequence=')) {
      result.runSequence = cleanRawPathString(arg.slice('--run-sequence='.length));
    } else if (arg === '--run-sequence' && i + 1 < argv.length && argv[i + 1] && !argv[i + 1]!.startsWith('--')) {
      result.runSequence = cleanRawPathString(argv[++i]!);
    } else if (arg.startsWith('--agent=')) {
      result.agent = cleanRawPathString(arg.slice('--agent='.length));
    } else if (arg === '--agent' && i + 1 < argv.length && argv[i + 1] && !argv[i + 1]!.startsWith('--')) {
      result.agent = cleanRawPathString(argv[++i]!);
    } else if (arg === '--agents-panel') {
      result.agentsPanel = true;
    } else if (arg.startsWith('--mode=')) {
      const m = arg.slice('--mode='.length).toLowerCase();
      if (m === 'tab' || m === 'window') result.mode = m;
    } else if (arg === '--mode' && i + 1 < argv.length && argv[i + 1] && !argv[i + 1]!.startsWith('--')) {
      const m = argv[++i]!.toLowerCase();
      if (m === 'tab' || m === 'window') result.mode = m;
    } else if (arg === '--resume') {
      result.resume = true;
    }
  }

  // Fallback: If no explicit CWD was parsed from --cwd or --cwd=, inspect positional arguments in argv.
  // This handles unpackaged Electron launches where Chromium/Electron reorders flags or inserts
  // internal flags (e.g. [electron.exe, --new-window, --cwd, --allow-file-access-from-files, appPath, targetFolder])
  if (!result.cwd) {
    const cwdPath = path.resolve(process.cwd()).toLowerCase();

    for (let i = argv.length - 1; i >= 0; i--) {
      const candidate = argv[i];
      if (!candidate || candidate.startsWith('--')) continue;

      const candidateLower = candidate.toLowerCase();
      // Skip binary executables and source files
      if (
        candidateLower.endsWith('.exe') ||
        candidateLower.endsWith('.js') ||
        candidateLower.endsWith('.ts')
      ) {
        continue;
      }

      // Skip the root repository directory being launched
      const resolvedCand = path.resolve(cleanRawPathString(candidate) || candidate).toLowerCase();
      if (resolvedCand === cwdPath) {
        continue;
      }

      const validDir = validateAndNormalizeDirectory(candidate);
      if (validDir) {
        result.rawCwd = cleanRawPathString(candidate);
        result.cwd = validDir;
        break;
      }
    }
  }

  logHop('H2', {
    rawCwd: result.rawCwd ?? null,
    cwd: result.cwd ?? null,
    cwdNotFound: Boolean(result.cwdNotFound),
  });

  return result;
}
