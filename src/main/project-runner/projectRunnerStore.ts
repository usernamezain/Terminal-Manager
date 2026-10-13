import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import {
  StoredProjectData,
  CustomProjectCommand,
} from '../../shared/projectRunnerTypes';
import { logger } from '../logger';

interface ProjectRunnerStorageSchema {
  version: number;
  projects: Record<string, StoredProjectData>;
}

export class ProjectRunnerStore {
  private filePath: string;
  private data: ProjectRunnerStorageSchema = {
    version: 1,
    projects: {},
  };

  constructor(customPath?: string) {
    if (customPath) {
      this.filePath = customPath;
    } else {
      try {
        this.filePath = path.join(app.getPath('userData'), 'project-runner.json');
      } catch {
        this.filePath = path.join(process.cwd(), 'project-runner.json');
      }
    }
    this.load();
  }

  private normalizeKey(projectPath: string): string {
    return path.resolve(projectPath).toLowerCase();
  }

  private load(): void {
    if (!fs.existsSync(this.filePath)) {
      this.data = { version: 1, projects: {} };
      return;
    }

    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.projects === 'object') {
        this.data = {
          version: parsed.version || 1,
          projects: parsed.projects,
        };
      }
    } catch (err: any) {
      logger.warn(`Failed to parse project-runner.json: ${err.message}`);
      this.data = { version: 1, projects: {} };
    }
  }

  private save(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const tempPath = `${this.filePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf8');

      // Atomic rename with Windows fallback
      try {
        fs.renameSync(tempPath, this.filePath);
      } catch {
        fs.copyFileSync(tempPath, this.filePath);
        fs.unlinkSync(tempPath);
      }
    } catch (err: any) {
      logger.error(`Failed to save project-runner.json: ${err.message}`);
    }
  }

  public get(projectPath: string): StoredProjectData {
    const key = this.normalizeKey(projectPath);
    if (!this.data.projects[key]) {
      this.data.projects[key] = {
        projectPath: path.resolve(projectPath),
        lastRunCommandIds: [],
        pinnedCommandIds: [],
        hiddenCommandIds: [],
        customCommands: [],
      };
    }
    return this.data.projects[key];
  }

  public recordRun(projectPath: string, commandId: string): void {
    const entry = this.get(projectPath);
    entry.lastRunCommandIds = [
      commandId,
      ...entry.lastRunCommandIds.filter((id) => id !== commandId),
    ].slice(0, 5);
    entry.primaryCommandId = commandId;
    this.save();
  }

  public togglePinned(projectPath: string, commandId: string): boolean {
    const entry = this.get(projectPath);
    const idx = entry.pinnedCommandIds.indexOf(commandId);
    let pinned: boolean;
    if (idx !== -1) {
      entry.pinnedCommandIds.splice(idx, 1);
      pinned = false;
    } else {
      entry.pinnedCommandIds.push(commandId);
      pinned = true;
    }
    this.save();
    return pinned;
  }

  public toggleHidden(projectPath: string, commandId: string): boolean {
    const entry = this.get(projectPath);
    const idx = entry.hiddenCommandIds.indexOf(commandId);
    let hidden: boolean;
    if (idx !== -1) {
      entry.hiddenCommandIds.splice(idx, 1);
      hidden = false;
    } else {
      entry.hiddenCommandIds.push(commandId);
      hidden = true;
    }
    this.save();
    return hidden;
  }

  public setPrimary(projectPath: string, commandId: string): void {
    const entry = this.get(projectPath);
    entry.primaryCommandId = commandId;
    this.save();
  }

  public addCustomCommand(projectPath: string, cmd: CustomProjectCommand): void {
    const entry = this.get(projectPath);
    entry.customCommands = [
      ...entry.customCommands.filter((c) => c.id !== cmd.id),
      cmd,
    ];
    this.save();
  }

  public removeCustomCommand(projectPath: string, cmdId: string): void {
    const entry = this.get(projectPath);
    entry.customCommands = entry.customCommands.filter((c) => c.id !== cmdId);
    this.save();
  }

  public clearAll(projectPath?: string): void {
    if (projectPath) {
      const key = this.normalizeKey(projectPath);
      delete this.data.projects[key];
    } else {
      this.data.projects = {};
    }
    this.save();
  }
}

export const projectRunnerStore = new ProjectRunnerStore();
