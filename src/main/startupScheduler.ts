import { logger } from './logger';

export type StartupPriority = 'critical' | 'deferred' | 'idle';

export interface StartupTask {
  name: string;
  priority: StartupPriority;
  execute: () => Promise<void> | void;
}

class StartupScheduler {
  private deferredTasks: StartupTask[] = [];
  private idleTasks: StartupTask[] = [];
  private hasFiredDeferred = false;

  public schedule(name: string, priority: StartupPriority, execute: () => Promise<void> | void): void {
    if (priority === 'critical') {
      this.runTask({ name, priority, execute });
      return;
    }

    if (priority === 'deferred') {
      if (this.hasFiredDeferred) {
        setImmediate(() => this.runTask({ name, priority, execute }));
      } else {
        this.deferredTasks.push({ name, priority, execute });
      }
      return;
    }

    if (priority === 'idle') {
      this.idleTasks.push({ name, priority, execute });
    }
  }

  public onFirstWindowReady(): void {
    if (this.hasFiredDeferred) return;
    this.hasFiredDeferred = true;

    // Run deferred tasks with micro-delays between them so event loop stays responsive
    const runNextDeferred = async () => {
      const task = this.deferredTasks.shift();
      if (task) {
        await this.runTask(task);
        setImmediate(runNextDeferred);
      } else {
        // When deferred are finished, schedule idle tasks
        this.runIdleTasks();
      }
    };

    setImmediate(runNextDeferred);
  }

  private runIdleTasks(): void {
    const runNextIdle = async () => {
      const task = this.idleTasks.shift();
      if (task) {
        await this.runTask(task);
        setTimeout(runNextIdle, 100);
      }
    };

    setTimeout(runNextIdle, 300);
  }

  private async runTask(task: StartupTask): Promise<void> {
    const start = performance.now();
    try {
      await task.execute();
      const elapsed = Math.round((performance.now() - start) * 100) / 100;
      logger.debug(`[StartupScheduler] Task "${task.name}" completed in ${elapsed}ms (${task.priority})`);
    } catch (err) {
      logger.warn(`[StartupScheduler] Task "${task.name}" failed:`, err);
    }
  }
}

export const startupScheduler = new StartupScheduler();
