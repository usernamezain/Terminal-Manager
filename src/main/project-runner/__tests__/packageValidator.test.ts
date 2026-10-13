import { describe, it, expect } from 'vitest';
import {
  validateSinglePackage,
  validatePackageInput,
  isValidScriptName,
} from '../packageValidator';

describe('Project Runner Package Validator', () => {
  it('validates standard npm package names', () => {
    expect(validateSinglePackage('node', 'react').valid).toBe(true);
    expect(validateSinglePackage('node', 'react-dom').valid).toBe(true);
    expect(validateSinglePackage('node', '@types/node').valid).toBe(true);
    expect(validateSinglePackage('node', '@emotion/styled').valid).toBe(true);
    expect(validateSinglePackage('node', 'lodash.debounce').valid).toBe(true);
  });

  it('rejects shell injection in package names', () => {
    const malicious = [
      'react; rm -rf /',
      'x; calc',
      'a && b',
      'foo | bar',
      '`id`',
      '$(whoami)',
      'pkg"withquote',
      "pkg'withsinglequote",
      'pkg<redirect',
      'pkg>redirect',
      'pkg with space',
    ];

    for (const name of malicious) {
      const res = validateSinglePackage('node', name);
      expect(res.valid).toBe(false);
      expect(res.error).toBeDefined();
    }
  });

  it('validates python package names', () => {
    expect(validateSinglePackage('python', 'numpy').valid).toBe(true);
    expect(validateSinglePackage('python', 'scikit-learn').valid).toBe(true);
    expect(validateSinglePackage('python', 'python_dotenv').valid).toBe(true);
    expect(validateSinglePackage('python', 'requests').valid).toBe(true);

    expect(validateSinglePackage('python', 'numpy; ls').valid).toBe(false);
    expect(validateSinglePackage('python', 'pip & calc').valid).toBe(false);
  });

  it('validates rust crate names', () => {
    expect(validateSinglePackage('rust', 'serde').valid).toBe(true);
    expect(validateSinglePackage('rust', 'tokio').valid).toBe(true);
    expect(validateSinglePackage('rust', 'serde-json').valid).toBe(true);
    expect(validateSinglePackage('rust', 'bad crate;').valid).toBe(false);
  });

  it('validates versions and formats specifiers safely', () => {
    const nodeRes = validateSinglePackage('node', 'react', '^18.2.0');
    expect(nodeRes.valid).toBe(true);
    expect(nodeRes.sanitized).toBe('react@^18.2.0');

    const pyRes = validateSinglePackage('python', 'pandas', '2.0.0');
    expect(pyRes.valid).toBe(true);
    expect(pyRes.sanitized).toBe('pandas==2.0.0');

    const badVer = validateSinglePackage('node', 'react', '1.0.0; calc');
    expect(badVer.valid).toBe(false);
  });

  it('validates multi-package comma or space separated input', () => {
    const res = validatePackageInput('node', 'react, react-dom, @types/react');
    expect(res.valid).toBe(true);
    expect(res.packages).toEqual(['react', 'react-dom', '@types/react']);

    const resSpaces = validatePackageInput('python', 'numpy pandas requests');
    expect(resSpaces.valid).toBe(true);
    expect(resSpaces.packages).toEqual(['numpy', 'pandas', 'requests']);

    const resWithBad = validatePackageInput('node', 'react, x; calc, lodash');
    expect(resWithBad.valid).toBe(false);
  });

  it('validates script names and flags unsafe names with spaces or operators', () => {
    expect(isValidScriptName('dev')).toBe(true);
    expect(isValidScriptName('build:prod')).toBe(true);
    expect(isValidScriptName('test-coverage')).toBe(true);

    expect(isValidScriptName('run dev')).toBe(false);
    expect(isValidScriptName('test&build')).toBe(false);
    expect(isValidScriptName('start;calc')).toBe(false);
    expect(isValidScriptName('build|grep')).toBe(false);
    expect(isValidScriptName('foo`bar')).toBe(false);
    expect(isValidScriptName('foo$bar')).toBe(false);
  });
});
