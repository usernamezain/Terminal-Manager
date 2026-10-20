import { logger } from './logger';

export interface ScheduledTask {
  name: string;
  intervalMs: number;
  runWhenHidden: boolean;
  execute: () => Promise<void> | void;
  timerId?: NodeJS.Timeout;
}

export class TimerService {
  private tasks: Map<string, ScheduledTask> = new Map();
  private isAppVisible = true;

  public register(
    name: string,
    intervalMs: number,
    runWhenHidden: boolean,
    execute: () => Promise<void> | void
  ): void {
    this.unregister(name);
    const task: ScheduledTask = { name, intervalMs, runWhenHidden, execute };
    this.tasks.set(name, task);
    this.scheduleTask(task);
  }

  public unregister(name: string): void {
    const existing = this.tasks.get(name);
    if (existing?.timerId) {
      clearInterval(existing.timerId);
    }
    this.tasks.delete(name);
  }

  public setAppVisibility(visible: boolean): void {
    if (this.isAppVisible === visible) return;
    this.isAppVisible = visible;
    logger.debug(`[TimerService] App visibility toggled: ${visible}`);

    for (const task of this.tasks.values()) {
      if (!task.runWhenHidden) {
        if (!visible && task.timerId) {
          clearInterval(task.timerId);
          task.timerId = undefined;
        } else if (visible && !task.timerId) {
          this.scheduleTask(task);
        }
      }
    }
  }

  public isVisible(): boolean {
    return this.isAppVisible;
  }

  private scheduleTask(task: ScheduledTask): void {
    if (!task.runWhenHidden && !this.isAppVisible) return;
    task.timerId = setInterval(async () => {
      try {
        await task.execute();
      } catch (err) {
        logger.warn(`[TimerService] Task "${task.name}" failed:`, err);
      }
    }, task.intervalMs);
  }

  public dispose(): void {
    for (const task of this.tasks.values()) {
      if (task.timerId) {
        clearInterval(task.timerId);
      }
    }
    this.tasks.clear();
  }
}

export const timerService = new TimerService();
