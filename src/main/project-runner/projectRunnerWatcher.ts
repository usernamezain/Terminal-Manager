import fs from 'fs';
import path from 'path';
import { clearDetectionCache } from './projectDetector';
import { logger } from '../logger';

interface WatcherRecord {
  folder: string;
  watchers: fs.FSWatcher[];
  debounceTimer: NodeJS.Timeout | null;
}

const activeWatchers = new Map<string, WatcherRecord>();
let isAppHidden = false;

// Manifest filenames to watch specifically
const MANIFEST_PATTERNS = new Set([
  'package.json',
  'deno.json',
  'deno.jsonc',
  'pnpm-lock.yaml',
  'yarn.lock',
  'bun.lockb',
  'bun.lock',
  'package-lock.json',
  'pyproject.toml',
  'requirements.txt',
  'Pipfile',
  'Cargo.toml',
  'go.mod',
  'docker-compose.yml',
  'Makefile',
]);

export function watchProjectManifests(
  folder: string,
  onChanged: (folder: string) => void
): () => void {
  const normFolder = path.resolve(folder);
  if (activeWatchers.has(normFolder)) {
    return () => unwatchProject(normFolder);
  }

  const watchers: fs.FSWatcher[] = [];

  try {
    // Only watch if folder exists
    if (!fs.existsSync(normFolder)) return () => {};

    // Watch the folder for manifest file modifications
    const w = fs.watch(normFolder, (_eventType, filename) => {
      if (isAppHidden) return;
      if (!filename) return;


      const base = path.basename(filename).toLowerCase();
      if (MANIFEST_PATTERNS.has(base) || base.startsWith('requirements')) {
        const record = activeWatchers.get(normFolder);
        if (record) {
          if (record.debounceTimer) clearTimeout(record.debounceTimer);
          record.debounceTimer = setTimeout(() => {
            clearDetectionCache(normFolder);
            onChanged(normFolder);
          }, 300);
        }
      }
    });

    watchers.push(w);
  } catch (err: any) {
    logger.warn(`Could not set up manifest watcher on ${normFolder}: ${err.message}`);
  }

  activeWatchers.set(normFolder, {
    folder: normFolder,
    watchers,
    debounceTimer: null,
  });

  return () => unwatchProject(normFolder);
}

export function unwatchProject(folder: string): void {
  const normFolder = path.resolve(folder);
  const record = activeWatchers.get(normFolder);
  if (record) {
    if (record.debounceTimer) clearTimeout(record.debounceTimer);
    for (const w of record.watchers) {
      try {
        w.close();
      } catch {}
    }
    activeWatchers.delete(normFolder);
  }
}

export function setAppVisibility(visible: boolean): void {
  isAppHidden = !visible;
}

export function clearAllWatchers(): void {
  for (const [folder] of activeWatchers) {
    unwatchProject(folder);
  }
}
