import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { AppSettings } from '../shared/types';
import { DEFAULT_SETTINGS } from '../shared/constants';
import { logger } from './logger';

export class SettingsStore {
  private filePath: string = '';
  private settings: AppSettings = { ...DEFAULT_SETTINGS };

  public init(): void {
    const userDataPath = app.getPath('userData');
    this.filePath = path.join(userDataPath, 'settings.json');
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(data) as Partial<AppSettings>;
        this.settings = { ...DEFAULT_SETTINGS, ...parsed };
        logger.info('Settings loaded successfully');
      } else {
        this.settings = { ...DEFAULT_SETTINGS };
        this.saveAtomic();
        logger.info('Settings file created with defaults');
      }
    } catch (err) {
      logger.error('Failed to load settings, reverting to defaults', err);
      this.settings = { ...DEFAULT_SETTINGS };
      this.saveAtomic();
    }
  }

  public get(): AppSettings {
    return { ...this.settings };
  }

  public set(partialSettings: Partial<AppSettings>): AppSettings {
    this.settings = {
      ...this.settings,
      ...partialSettings,
    };
    this.saveAtomic();
    logger.info('Settings updated', partialSettings);
    return this.get();
  }

  private saveAtomic(): void {
    if (!this.filePath) return;
    const tempPath = `${this.filePath}.${Date.now()}.tmp`;
    try {
      const data = JSON.stringify(this.settings, null, 2);
      fs.writeFileSync(tempPath, data, 'utf8');
      fs.renameSync(tempPath, this.filePath);
    } catch (err) {
      logger.error('Failed to atomically save settings', err);
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch {
          // ignore
        }
      }
    }
  }
}

export const settingsStore = new SettingsStore();
