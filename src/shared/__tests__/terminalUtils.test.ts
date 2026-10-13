import { describe, it, expect } from 'vitest';
import {
  quoteForShell,
  identifyShellType,
  detectPath,
  detectUrl,
  detectFileLineCol,
  detectNetworkOrId,
  sanitizeClipboardText,
  analyzePastedText,
} from '../terminalUtils';

describe('terminalUtils - Shell Quoting & Identification', () => {
  it('correctly identifies shell types', () => {
    expect(identifyShellType('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe')).toBe('powershell');
    expect(identifyShellType('pwsh.exe')).toBe('powershell');
    expect(identifyShellType('C:\\Windows\\System32\\cmd.exe')).toBe('cmd');
    expect(identifyShellType('C:\\Program Files\\Git\\bin\\bash.exe')).toBe('bash');
    expect(identifyShellType('C:\\Windows\\System32\\wsl.exe')).toBe('wsl');
    expect(identifyShellType('unknown.exe')).toBe('unknown');
  });

  it('quotes paths for PowerShell with single quotes and doubled inner quotes', () => {
    expect(quoteForShell('powershell', 'C:\\Program Files\\NodeJS')).toBe("'C:\\Program Files\\NodeJS'");
    expect(quoteForShell('powershell', "C:\\Path & More\\It's Great")).toBe("'C:\\Path & More\\It''s Great'");
    expect(quoteForShell('powershell', 'D:\\Unicode 🚀\\文件')).toBe("'D:\\Unicode 🚀\\文件'");
  });

  it('quotes paths for Windows CMD with double quotes and escaping', () => {
    expect(quoteForShell('cmd', 'C:\\Program Files\\App')).toBe('"C:\\Program Files\\App"');
    expect(quoteForShell('cmd', 'C:\\Folder & Name%test')).toBe('"C:\\Folder & Name%%test"');
    expect(quoteForShell('cmd', 'C:\\Path "Quoted"\\Sub')).toBe('"C:\\Path ""Quoted""\\Sub"');
  });

  it('quotes paths for Bash/WSL with single quotes and escaped inner quotes', () => {
    expect(quoteForShell('bash', '/home/user/my folder & files')).toBe("'/home/user/my folder & files'");
    expect(quoteForShell('bash', "/home/user/it's me")).toBe("'/home/user/it'\\''s me'");
    expect(quoteForShell('wsl', '/mnt/c/Users/SHABBIR TRADERS')).toBe("'/mnt/c/Users/SHABBIR TRADERS'");
  });
});

describe('terminalUtils - Selection Detection', () => {
  it('detects Windows and Unix paths', () => {
    expect(detectPath('C:\\Users\\John Doe\\Downloads\\file.txt')).toMatchObject({
      isPath: true,
      path: 'C:\\Users\\John Doe\\Downloads\\file.txt',
      isDirectoryHint: false,
    });

    expect(detectPath('"C:\\Users\\SHABBIR TRADERS\\Desktop\\CUstomized-Terminal\\"')).toMatchObject({
      isPath: true,
      isDirectoryHint: true,
    });

    expect(detectPath('/var/log/nginx/error.log')).toMatchObject({
      isPath: true,
      path: '/var/log/nginx/error.log',
    });

    expect(detectPath('./src/renderer/main.tsx')).toMatchObject({
      isPath: true,
    });

    // Should NOT match plain text
    expect(detectPath('hello world').isPath).toBe(false);
    // Should NOT match URLs
    expect(detectPath('https://github.com/test').isPath).toBe(false);
  });

  it('detects URLs', () => {
    expect(detectUrl('https://github.com/lzybkr/PSReadLine/issues/new')).toMatchObject({
      isUrl: true,
      url: 'https://github.com/lzybkr/PSReadLine/issues/new',
    });
    expect(detectUrl('http://localhost:5173')).toMatchObject({
      isUrl: true,
      url: 'http://localhost:5173',
    });
    expect(detectUrl('not a url').isUrl).toBe(false);
  });

  it('detects file:line:col compiler and stack-trace formats', () => {
    expect(detectFileLineCol('src/renderer/App.tsx:42:7')).toMatchObject({
      isMatch: true,
      file: 'src/renderer/App.tsx',
      line: 42,
      col: 7,
    });

    expect(detectFileLineCol('C:\\src\\index.ts(128,4)')).toMatchObject({
      isMatch: true,
      file: 'C:\\src\\index.ts',
      line: 128,
      col: 4,
    });

    expect(detectFileLineCol('main.js:99')).toMatchObject({
      isMatch: true,
      file: 'main.js',
      line: 99,
    });
  });

  it('detects IP, port, hash, and UUID', () => {
    expect(detectNetworkOrId('192.168.1.1')).toMatchObject({ type: 'ip', value: '192.168.1.1' });
    expect(detectNetworkOrId(':8080')).toMatchObject({ type: 'port', value: '8080' });
    expect(detectNetworkOrId('3000')).toMatchObject({ type: 'port', value: '3000' });
    expect(detectNetworkOrId('550e8400-e29b-41d4-a716-446655440000')).toMatchObject({
      type: 'uuid',
      value: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(detectNetworkOrId('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')).toMatchObject({
      type: 'hash',
    });
    expect(detectNetworkOrId('git commit 7a8b9c0')).toMatchObject({ type: 'none' });
  });
});

describe('terminalUtils - Clipboard Sanitization & Analysis', () => {
  it('strips ANSI codes, bracketed paste markers, and null bytes', () => {
    const dirty = '\x1b[200~Hello\x00 \x1b[31mWorld\x1b[0m\x1b[201~';
    expect(sanitizeClipboardText(dirty)).toBe('Hello World');
  });

  it('analyzes multiline text and detects dangerous commands', () => {
    const multiLine = 'npm run build\r\nnpx vitest run\r\nnode dist/main/index.js';
    const analysis = analyzePastedText(multiLine);
    expect(analysis.isMultiLine).toBe(true);
    expect(analysis.lineCount).toBe(3);
    expect(analysis.isDangerous).toBe(false);

    const dangerous = 'rm -rf / --no-preserve-root';
    const dangerAnalysis = analyzePastedText(dangerous);
    expect(dangerAnalysis.isDangerous).toBe(true);
    expect(dangerAnalysis.dangerousReason).toContain('rm -rf');

    const psDanger = 'Remove-Item C:\\Folder -Recurse -Force';
    expect(analyzePastedText(psDanger).isDangerous).toBe(true);
  });
});
