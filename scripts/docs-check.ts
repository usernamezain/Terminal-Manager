import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KEYBINDINGS_REGISTRY } from '../src/shared/keybindingsRegistry.js';
import { SETTINGS_METADATA } from '../src/shared/settingsMetadata.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const contentDir = path.join(rootDir, 'docs', 'content');

interface ValidationError {
  file: string;
  line: number;
  message: string;
}

const errors: ValidationError[] = [];

function addError(file: string, line: number, message: string) {
  errors.push({ file: path.relative(rootDir, file), line, message });
}

function parseFrontmatter(content: string, filePath: string) {
  const lines = content.split(/\r?\n/);
  if (!lines[0] || lines[0].trim() !== '---') {
    addError(filePath, 1, 'Missing opening frontmatter delimiter "---"');
    return null;
  }

  let endIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      endIdx = i;
      break;
    }
  }

  if (endIdx === -1) {
    addError(filePath, 1, 'Missing closing frontmatter delimiter "---"');
    return null;
  }

  const fmText = lines.slice(1, endIdx).join('\n');
  const metadata: Record<string, any> = {};

  // Simple YAML line-by-line parser for standard fields
  let currentKey = '';
  let inList = false;
  const fmLines = lines.slice(1, endIdx);

  fmLines.forEach((line, idx) => {
    const lineNum = idx + 2;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    if (trimmed.startsWith('- ') && inList && currentKey) {
      if (!Array.isArray(metadata[currentKey])) metadata[currentKey] = [];
      metadata[currentKey].push(trimmed.slice(2).trim());
      return;
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const val = line.slice(colonIdx + 1).trim();
      currentKey = key;
      if (val === '') {
        inList = true;
        metadata[key] = [];
      } else {
        inList = false;
        metadata[key] = val;
      }
    }
  });

  const requiredFields = ['id', 'title', 'order', 'summary', 'tags', 'since', 'updated'];
  for (const field of requiredFields) {
    if (!metadata[field]) {
      addError(filePath, 1, `Frontmatter missing required field: "${field}"`);
    }
  }

  return { metadata, bodyStartIndex: endIdx + 1 };
}

function extractHeadings(content: string): Set<string> {
  const headings = new Set<string>();
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^#{1,6}\s+(.+)$/);
    if (match) {
      const slug = match[1]
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      headings.add(slug);
    }
  }
  return headings;
}

function getAllDocFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllDocFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(fullPath);
    }
  }
  return results;
}

console.log('Running docs:check validation on docs/content/...');

const allDocFiles = getAllDocFiles(contentDir);
const topicIds = new Map<string, string>();
const fileHeadingsMap = new Map<string, Set<string>>();
const fileContentsMap = new Map<string, string>();

// 1. Validate frontmatter and collect headings & IDs
for (const filePath of allDocFiles) {
  const content = fs.readFileSync(filePath, 'utf-8');
  fileContentsMap.set(filePath, content);
  const headings = extractHeadings(content);
  fileHeadingsMap.set(filePath, headings);

  const fm = parseFrontmatter(content, filePath);
  if (fm && fm.metadata.id) {
    const id = String(fm.metadata.id).trim();
    if (topicIds.has(id)) {
      addError(filePath, 1, `Duplicate topic ID "${id}" (already defined in ${topicIds.get(id)})`);
    } else {
      topicIds.set(id, path.relative(rootDir, filePath));
    }
  }
}

// 2. Validate code fences, links, images line by line
for (const filePath of allDocFiles) {
  const content = fileContentsMap.get(filePath)!;
  const lines = content.split(/\r?\n/);

  let inCodeFence = false;
  let codeFenceStartLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i];

    // Check code fences
    if (line.trim().startsWith('```')) {
      if (!inCodeFence) {
        inCodeFence = true;
        codeFenceStartLine = lineNum;
        const tag = line.trim().slice(3).trim();
        if (!tag) {
          addError(filePath, lineNum, 'Code fence has no language identifier');
        }
      } else {
        inCodeFence = false;
      }
      continue;
    }

    if (inCodeFence) continue;

    // Check images ![alt](url)
    const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let imgMatch: RegExpExecArray | null;
    while ((imgMatch = imgRegex.exec(line)) !== null) {
      const imgPath = imgMatch[2].trim();
      if (!imgPath.startsWith('http://') && !imgPath.startsWith('https://')) {
        const resolvedImg = path.resolve(path.dirname(filePath), imgPath);
        if (!fs.existsSync(resolvedImg)) {
          addError(filePath, lineNum, `Missing image file: "${imgPath}"`);
        }
      }
    }

    // Check internal links [text](target)
    const linkRegex = /(?<!!)\[([^\]]+)\]\(([^)]+)\)/g;
    let linkMatch: RegExpExecArray | null;
    while ((linkMatch = linkRegex.exec(line)) !== null) {
      const target = linkMatch[2].trim();
      if (
        target.startsWith('http://') ||
        target.startsWith('https://') ||
        target.startsWith('mailto:') ||
        target.startsWith('#')
      ) {
        if (target.startsWith('#')) {
          const anchor = target.slice(1);
          const headings = fileHeadingsMap.get(filePath);
          if (headings && !headings.has(anchor)) {
            addError(filePath, lineNum, `Broken local anchor link: "${target}"`);
          }
        }
        continue;
      }

      // Target is a file or file#anchor
      const [targetFile, targetAnchor] = target.split('#');
      const resolvedTarget = path.resolve(path.dirname(filePath), targetFile);

      if (!fs.existsSync(resolvedTarget)) {
        addError(filePath, lineNum, `Broken internal link to missing file: "${targetFile}"`);
      } else if (targetAnchor) {
        const targetHeadings = fileHeadingsMap.get(resolvedTarget);
        if (targetHeadings && !targetHeadings.has(targetAnchor)) {
          addError(
            filePath,
            lineNum,
            `Broken anchor "${targetAnchor}" in target file "${targetFile}"`
          );
        }
      }
    }
  }
}

// 3. Verify Generated Shortcuts Page contains all registered shortcuts
const shortcutsPath = path.join(contentDir, '_generated', '13-keyboard-shortcuts.md');
if (!fs.existsSync(shortcutsPath)) {
  addError(shortcutsPath, 1, 'Generated keyboard shortcuts page is missing');
} else {
  const shortcutsContent = fs.readFileSync(shortcutsPath, 'utf-8');
  for (const item of KEYBINDINGS_REGISTRY) {
    if (!shortcutsContent.includes(item.id)) {
      addError(
        shortcutsPath,
        1,
        `Shortcut id "${item.id}" (${item.keys}) from KEYBINDINGS_REGISTRY is missing in generated docs`
      );
    }
  }
}

// 4. Verify Generated Settings Page contains all registered settings keys
const settingsRefPath = path.join(contentDir, '_generated', '14-settings-reference.md');
if (!fs.existsSync(settingsRefPath)) {
  addError(settingsRefPath, 1, 'Generated settings reference page is missing');
} else {
  const settingsContent = fs.readFileSync(settingsRefPath, 'utf-8');
  for (const item of SETTINGS_METADATA) {
    if (!settingsContent.includes(item.key)) {
      addError(
        settingsRefPath,
        1,
        `Setting key "${item.key}" from SETTINGS_METADATA is missing in generated docs`
      );
    }
  }
}

// 5. Verify all CLI flags are documented in 09-explorer-integration-and-command-line.md
const cliDocPath = path.join(contentDir, '09-explorer-integration-and-command-line.md');
if (!fs.existsSync(cliDocPath)) {
  addError(cliDocPath, 1, 'Missing topic 09-explorer-integration-and-command-line.md');
} else {
  const cliContent = fs.readFileSync(cliDocPath, 'utf-8');
  const cliHandlerFile = path.join(rootDir, 'src', 'main', 'cliHandler.ts');
  const cliSource = fs.existsSync(cliHandlerFile) ? fs.readFileSync(cliHandlerFile, 'utf-8') : '';

  // Extract flag strings like '--cwd', '--profile', etc.
  const flagRegex = /'(--[a-z0-9-]+)'/g;
  const flagsInCode = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = flagRegex.exec(cliSource)) !== null) {
    flagsInCode.add(match[1]);
  }

  for (const flag of flagsInCode) {
    if (!cliContent.includes(`\`${flag}\``) && !cliContent.includes(flag)) {
      addError(
        cliDocPath,
        1,
        `CLI flag "${flag}" from cliHandler.ts is not mentioned in 09-explorer-integration-and-command-line.md`
      );
    }
  }
}

// Report results
if (errors.length > 0) {
  console.error(`\n[FAIL] docs:check found ${errors.length} error(s):\n`);
  for (const err of errors) {
    console.error(`  ${err.file}:${err.line} - ${err.message}`);
  }
  process.exit(1);
} else {
  console.log(`\n[PASS] docs:check verified ${allDocFiles.length} documentation topics cleanly. Zero errors found.`);
  process.exit(0);
}
