import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { logger } from './logger';
import { Snippet, DEFAULT_SNIPPETS } from '../shared/snippetTypes';

interface SnippetsData {
  version: number;
  snippets: Snippet[];
}

export class SnippetsStore {
  private filePath: string | null = null;
  private cache: SnippetsData | null = null;

  private getFilePath(): string {
    if (!this.filePath) {
      let baseDir: string;
      try {
        baseDir = app?.getPath ? app.getPath('userData') : process.cwd();
      } catch {
        baseDir = process.cwd();
      }
      this.filePath = path.join(baseDir, 'snippets.json');
    }
    return this.filePath;
  }

  private load(): SnippetsData {
    if (this.cache) return this.cache;

    const file = this.getFilePath();
    if (fs.existsSync(file)) {
      try {
        const raw = fs.readFileSync(file, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.snippets)) {
          this.cache = parsed;
          return this.cache!;
        }
      } catch (err) {
        logger.error('Failed to parse snippets.json, restoring defaults:', err);
        try {
          if (fs.existsSync(file)) {
            fs.copyFileSync(file, `${file}.corrupt.${Date.now()}.bak`);
          }
        } catch {}
      }
    }

    this.cache = {
      version: 1,
      snippets: [...DEFAULT_SNIPPETS],
    };
    this.saveToDisk();
    return this.cache;
  }

  private saveToDisk(): void {
    if (!this.cache) return;
    const file = this.getFilePath();
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const tempFile = `${file}.tmp.${process.pid}`;
    try {
      fs.writeFileSync(tempFile, JSON.stringify(this.cache, null, 2), 'utf8');
      fs.renameSync(tempFile, file);
    } catch (err) {
      logger.error('Failed to atomically write snippets.json:', err);
      if (fs.existsSync(tempFile)) {
        try { fs.unlinkSync(tempFile); } catch {}
      }
    }
  }

  public getAll(): Snippet[] {
    return this.load().snippets;
  }

  public save(snippet: Snippet): Snippet {
    const data = this.load();
    const existingIdx = data.snippets.findIndex((s) => s.id === snippet.id);
    const updated: Snippet = {
      ...snippet,
      updatedAt: Date.now(),
    };

    if (existingIdx >= 0) {
      data.snippets[existingIdx] = updated;
    } else {
      data.snippets.push(updated);
    }

    this.saveToDisk();
    return updated;
  }

  public delete(id: string): boolean {
    const data = this.load();
    const prevLen = data.snippets.length;
    data.snippets = data.snippets.filter((s) => s.id !== id);
    if (data.snippets.length !== prevLen) {
      this.saveToDisk();
      return true;
    }
    return false;
  }

  public import(snippets: Snippet[]): Snippet[] {
    const data = this.load();
    for (const item of snippets) {
      const idx = data.snippets.findIndex((s) => s.id === item.id);
      if (idx >= 0) {
        data.snippets[idx] = { ...item, updatedAt: Date.now() };
      } else {
        data.snippets.push({ ...item, updatedAt: Date.now() });
      }
    }
    this.saveToDisk();
    return data.snippets;
  }
}

export const snippetsStore = new SnippetsStore();
