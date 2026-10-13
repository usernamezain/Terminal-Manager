import { EcosystemType, PackageValidationResult } from '../../shared/projectRunnerTypes';

// Strict regex patterns per ecosystem for package names
const PACKAGE_NAME_PATTERNS: Record<EcosystemType, RegExp> = {
  // npm: ^(@[a-z0-9-~][a-z0-9-._~]*/)?[a-z0-9-~][a-z0-9-._~]*$
  node: /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/i,
  // PyPI: ^[A-Za-z0-9][A-Za-z0-9._-]*$
  python: /^[A-Za-z0-9][A-Za-z0-9._-]*$/,
  // Crates.io: ^[a-zA-Z0-9_-]+$
  rust: /^[a-zA-Z0-9_-]+$/,
  // Go modules: domain/path format e.g. github.com/gin-gonic/gin
  go: /^[a-zA-Z0-9_.-]+(\/[a-zA-Z0-9_.-]+)+$/,
  // NuGet: ^[a-zA-Z0-9_.-]+$
  dotnet: /^[a-zA-Z0-9_.-]+$/,
  // Maven: groupId:artifactId
  java: /^[a-zA-Z0-9_.-]+(:[a-zA-Z0-9_.-]+)?$/,
  // Packagist: vendor/package
  php: /^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i,
  // RubyGems: ^[a-zA-Z0-9_.-]+$
  ruby: /^[a-zA-Z0-9_.-]+$/,
  docker: /^[a-z0-9._\/-]+(:[a-z0-9._-]+)?$/i,
  generic: /^[a-zA-Z0-9_.-]+$/,
};

// Safe version characters: numbers, dots, dashes, alphas, ^, ~, =, <, >, *, +, @
const SAFE_VERSION_PATTERN = /^[a-zA-Z0-9^~=<>.*+\-_@]+$/;

// Forbidden shell injection characters
const INJECTION_CHARS_PATTERN = /[\s;&|`$<>"'\\]/;

/**
 * Validates a single package specifier (e.g. "react" or "react@^18.2.0")
 */
export function validateSinglePackage(
  ecosystem: EcosystemType,
  rawName: string,
  rawVersion?: string,
  allowAdvanced: boolean = false
): PackageValidationResult {
  const trimmedName = rawName.trim();
  const trimmedVersion = rawVersion?.trim();

  if (!trimmedName) {
    return { valid: false, error: 'Package name cannot be empty.' };
  }

  // Check for shell injection characters in name
  if (INJECTION_CHARS_PATTERN.test(trimmedName)) {
    return {
      valid: false,
      error: `Package name "${trimmedName}" contains illegal characters (spaces, quotes, or shell operators).`,
    };
  }

  // Version validation if supplied
  if (trimmedVersion) {
    if (!SAFE_VERSION_PATTERN.test(trimmedVersion)) {
      return {
        valid: false,
        error: `Version "${trimmedVersion}" contains illegal or unsafe characters.`,
      };
    }
  }

  // If advanced mode (e.g. git url or local path)
  if (allowAdvanced) {
    // Advanced allows git urls (git+https://...) or file paths without shell metachars
    if (/^https?:\/\/[a-zA-Z0-9._\-\/]+\.git(#.*)?$/.test(trimmedName) || /^(\.\.?\/|[a-zA-Z]:\\)[a-zA-Z0-9._\-\/\\]+$/.test(trimmedName)) {
      return { valid: true, sanitized: trimmedName };
    }
  }

  // Ecosystem pattern test
  const pattern = PACKAGE_NAME_PATTERNS[ecosystem] || PACKAGE_NAME_PATTERNS.generic;
  if (!pattern.test(trimmedName)) {
    return {
      valid: false,
      error: `"${trimmedName}" is not a valid ${ecosystem} package name.`,
    };
  }

  let fullSpec = trimmedName;
  if (trimmedVersion) {
    if (ecosystem === 'node' || ecosystem === 'rust') {
      fullSpec = `${trimmedName}@${trimmedVersion}`;
    } else if (ecosystem === 'python') {
      fullSpec = `${trimmedName}${trimmedVersion.startsWith('=') || trimmedVersion.startsWith('>') || trimmedVersion.startsWith('<') || trimmedVersion.startsWith('~') ? '' : '=='}${trimmedVersion}`;
    } else {
      fullSpec = `${trimmedName}@${trimmedVersion}`;
    }
  }

  return { valid: true, sanitized: fullSpec };
}

/**
 * Validates multiple package names (space or comma separated)
 */
export function validatePackageInput(
  ecosystem: EcosystemType,
  input: string,
  rawVersion?: string,
  allowAdvanced: boolean = false
): { valid: boolean; packages: string[]; error?: string } {
  if (!input || !input.trim()) {
    return { valid: false, packages: [], error: 'Package name cannot be empty.' };
  }

  // Split by comma or whitespace
  const tokens = input
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return { valid: false, packages: [], error: 'No packages specified.' };
  }

  const validPackages: string[] = [];

  for (const token of tokens) {
    // If token already has @version e.g. "react@18.2.0"
    let namePart = token;
    let versionPart = rawVersion;

    if (ecosystem === 'node' && token.includes('@') && !token.startsWith('@')) {
      const parts = token.split('@');
      namePart = parts[0] || '';
      versionPart = parts[1];
    } else if (ecosystem === 'node' && token.startsWith('@') && token.indexOf('@', 1) !== -1) {
      // Scoped package with version: @scope/pkg@1.0.0
      const atIdx = token.indexOf('@', 1);
      namePart = token.slice(0, atIdx);
      versionPart = token.slice(atIdx + 1);
    } else if (ecosystem === 'python' && /[=<>~]/.test(token)) {
      const match = token.match(/^([A-Za-z0-9._-]+)([=<>~].*)$/);
      if (match) {
        namePart = match[1] || '';
        versionPart = match[2];
      }
    }


    const res = validateSinglePackage(ecosystem, namePart, versionPart, allowAdvanced);
    if (!res.valid) {
      return { valid: false, packages: [], error: res.error };
    }
    if (res.sanitized) {
      validPackages.push(res.sanitized);
    }
  }

  return { valid: true, packages: validPackages };
}

/**
 * Validates script names from package.json/pyproject
 * Name must match ^[^\s"'&|;<>`$]+$
 */
export function isValidScriptName(name: string): boolean {
  if (!name || !name.trim()) return false;
  return !/[\s"'&|;<>`$]/.test(name);
}
