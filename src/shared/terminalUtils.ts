export type ShellType = 'powershell' | 'cmd' | 'bash' | 'wsl' | 'unknown';

/**
 * Determine the shell family from shellPath or profile metadata.
 */
export function identifyShellType(shellPath?: string, shellName?: string): ShellType {
  const target = `${shellPath || ''} ${shellName || ''}`.toLowerCase();
  if (target.includes('pwsh') || target.includes('powershell')) return 'powershell';
  if (target.includes('cmd.exe') || target.includes('command prompt')) return 'cmd';
  if (target.includes('wsl.exe') || target.includes('wsl')) return 'wsl';
  if (target.includes('bash') || target.includes('zsh') || target.includes('sh')) return 'bash';
  return 'unknown';
}

/**
 * Safely quote strings for specific shell types to prevent argument splitting and command injection.
 */
export function quoteForShell(shellType: ShellType, value: string): string {
  if (shellType === 'powershell') {
    // In PowerShell, single quotes are literal. An internal single quote is escaped by doubling it (' -> '').
    return `'${value.replace(/'/g, "''")}'`;
  }

  if (shellType === 'cmd') {
    // In Windows cmd, arguments with spaces or special characters are wrapped in double quotes.
    // Inner double quotes are escaped as \" or "". Percent signs can be doubled %% to avoid var expansion.
    const escaped = value.replace(/"/g, '""').replace(/%/g, '%%');
    return `"${escaped}"`;
  }

  if (shellType === 'bash' || shellType === 'wsl') {
    // In POSIX shells (bash, zsh), single quotes preserve literal value.
    // To escape a single quote: '\'' (end quote, escaped single quote, start quote).
    return `'${value.replace(/'/g, `'\\''`)}'`;
  }

  // Fallback for unknown shells: use double quotes if contains space or special chars
  if (/[\s&|<>^;]/.test(value)) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  return value;
}

/**
 * Clean and normalize text from selection for analysis.
 */
export function cleanSelectionText(raw: string): string {
  if (!raw) return '';
  return raw.trim().replace(/^['"`\(\[\{<]+|['"`\)\]\}>]+$/g, '').trim();
}

/**
 * Detect if text represents a file or directory path.
 */
export function detectPath(raw: string): { isPath: boolean; path?: string; isDirectoryHint?: boolean } {
  const text = cleanSelectionText(raw);
  if (!text || text.length > 500) return { isPath: false };

  // Explicit URL check - don't treat URLs as paths
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(text)) {
    return { isPath: false };
  }

  // Windows drive path (e.g. C:\foo\bar or C:/foo/bar)
  const isWinDrive = /^[a-zA-Z]:[\\/][^<>:"|?*]*$/.test(text);
  // UNC path (\\server\share)
  const isUNC = /^\\\\[^<>:"|?*]+[\\/][^<>:"|?*]+$/.test(text);
  // Unix root / home path (/usr/bin or ~/projects)
  const isUnix = /^(\/|~\/)[^\0]+$/.test(text);
  // Relative path (.\foo, ../bar, ./src/app.ts)
  const isRelative = /^(\.\.?[\\/])[^<>:"|?*]+$/.test(text);
  // Common path with directory separator
  const hasSeparators = (text.includes('\\') || text.includes('/')) && !/[\r\n]/.test(text) && !/[\<\>\?\"\*]/.test(text);

  if (isWinDrive || isUNC || isUnix || isRelative || hasSeparators) {
    const isDirectoryHint = text.endsWith('\\') || text.endsWith('/') || !/\.[a-zA-Z0-9]{1,10}$/.test(text);
    return { isPath: true, path: text, isDirectoryHint };
  }

  return { isPath: false };
}

/**
 * Detect if text is a valid web URL.
 */
export function detectUrl(raw: string): { isUrl: boolean; url?: string } {
  const text = cleanSelectionText(raw);
  if (!text || text.length > 2000) return { isUrl: false };

  try {
    if (/^https?:\/\/[^\s$.?#].[^\s]*$/i.test(text)) {
      new URL(text);
      return { isUrl: true, url: text };
    }
  } catch {
    // Invalid URL
  }
  return { isUrl: false };
}

/**
 * Detect stack-trace / compiler error formats like file:line:col or file(line,col).
 */
export function detectFileLineCol(raw: string): {
  isMatch: boolean;
  file?: string;
  line?: number;
  col?: number;
} {
  // Strip outer quotes and spaces, but keep parentheses needed for (line,col)
  const text = raw.trim().replace(/^['"`<[]+|['"`>\]]+$/g, '').trim();
  if (!text || text.length > 500) return { isMatch: false };

  // Pattern 1: path/to/file.ts:42:7 or C:\path\file.ts:42:7 or file.ts:42
  const colonMatch = text.match(/^((?:[a-zA-Z]:[\\/])?[^:<>|?"\r\n]+):(\d+)(?::(\d+))?$/);
  if (colonMatch && colonMatch[1] && colonMatch[2]) {
    const file = colonMatch[1];
    // Check if filename has an extension or path separator
    if (file.includes('.') || file.includes('/') || file.includes('\\')) {
      return {
        isMatch: true,
        file,
        line: parseInt(colonMatch[2], 10),
        col: colonMatch[3] ? parseInt(colonMatch[3], 10) : undefined,
      };
    }
  }

  // Pattern 2: path/to/file.ts(42,7) or file.ts(42)
  const parenMatch = text.match(/^((?:[a-zA-Z]:[\\/])?[^()<>|?"\r\n]+)\((\d+)(?:,\s*(\d+))?\)$/);
  if (parenMatch && parenMatch[1] && parenMatch[2]) {
    const file = parenMatch[1];
    if (file.includes('.') || file.includes('/') || file.includes('\\')) {
      return {
        isMatch: true,
        file,
        line: parseInt(parenMatch[2], 10),
        col: parenMatch[3] ? parseInt(parenMatch[3], 10) : undefined,
      };
    }
  }

  return { isMatch: false };
}

/**
 * Detect IP addresses, port numbers, hashes, or UUIDs.
 */
export function detectNetworkOrId(raw: string): {
  type: 'ip' | 'port' | 'hash' | 'uuid' | 'none';
  value: string;
} {
  const text = cleanSelectionText(raw);
  if (!text) return { type: 'none', value: '' };

  // UUID
  if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(text)) {
    return { type: 'uuid', value: text };
  }

  // IPv4 address
  if (/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(text)) {
    return { type: 'ip', value: text };
  }

  // Standalone port number (e.g. :3000, 8080)
  const portMatch = text.match(/^:?([0-9]{2,5})$/);
  if (portMatch && portMatch[1]) {
    const num = parseInt(portMatch[1], 10);
    if (num >= 1 && num <= 65535) {
      return { type: 'port', value: num.toString() };
    }
  }

  // Hashes: MD5 (32 hex), SHA-1 (40 hex), SHA-256 (64 hex), Git SHA (7 to 40 hex)
  if (/^[0-9a-fA-F]{7,64}$/.test(text) && !/^\d+$/.test(text)) {
    return { type: 'hash', value: text };
  }

  return { type: 'none', value: '' };
}

/**
 * Sanitize clipboard text:
 * - Strip null bytes and control chars (preserve \r, \n, \t)
 * - Strip ANSI escape sequences
 * - Strip bracketed paste end markers
 */
export function sanitizeClipboardText(raw: string): string {
  if (!raw) return '';
  return raw
    // Strip bracketed paste start/end markers (\x1b[200~ and \x1b[201~)
    .replace(/\x1b\[20[01]~/g, '')
    // Strip ANSI escape codes
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
    .replace(/\x1b\].*?(\x07|\x1b\\)/g, '')
    // Strip null bytes and non-printable control chars except \r, \n, \t
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Analyze pasted text for multi-line confirmation and dangerous command warnings.
 */
export function analyzePastedText(raw: string): {
  lineCount: number;
  isMultiLine: boolean;
  isTooLong: boolean;
  isDangerous: boolean;
  dangerousReason?: string;
  previewLines: string[];
} {
  const sanitized = sanitizeClipboardText(raw);
  const lines = sanitized.split(/\r?\n/);
  const lineCount = lines.length;
  const isMultiLine = lineCount > 1;
  const isTooLong = sanitized.length > 2000;

  // Dangerous commands checks
  let isDangerous = false;
  let dangerousReason: string | undefined;

  const dangerPatterns: Array<{ pattern: RegExp; reason: string }> = [
    { pattern: /\brm\s+-[a-zA-Z]*r[a-zA-Z]*f\b/i, reason: 'Recursive force file deletion (rm -rf)' },
    { pattern: /\bRemove-Item\b.*-Recurse\b/i, reason: 'Recursive PowerShell deletion (Remove-Item -Recurse)' },
    { pattern: /\bdel\s+.*\/[sS]\b/i, reason: 'Recursive file deletion (del /s)' },
    { pattern: /\bformat\s+[a-zA-Z]:/i, reason: 'Drive formatting command (format)' },
    { pattern: /curl\b.*\|\s*(?:bash|sh|pwsh|powershell)/i, reason: 'Remote script execution via pipe (curl | sh)' },
    { pattern: /\b(?:iex|Invoke-Expression)\b/i, reason: 'Arbitrary expression evaluation (Invoke-Expression / iex)' },
  ];

  for (const { pattern, reason } of dangerPatterns) {
    if (pattern.test(sanitized)) {
      isDangerous = true;
      dangerousReason = reason;
      break;
    }
  }

  const previewLines = lines.slice(0, 5);

  return {
    lineCount,
    isMultiLine,
    isTooLong,
    isDangerous,
    dangerousReason,
    previewLines,
  };
}
