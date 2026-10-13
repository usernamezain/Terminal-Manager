import { logger } from './logger';
import { PerfStageTiming } from '../shared/perf';

class MainPerfTracker {
  private startTime: number = Date.now();
  private hrStartTime: bigint = process.hrtime.bigint();
  private timestamps: Partial<PerfStageTiming> = {};

  constructor() {
    this.timestamps.processStart = 0; // relative to start in ms
  }

  public record(stage: keyof PerfStageTiming): void {
    const elapsedNs = process.hrtime.bigint() - this.hrStartTime;
    const elapsedMs = Number(elapsedNs) / 1e6;
    this.timestamps[stage] = Math.round(elapsedMs * 100) / 100;
    logger.info(`[Perf Main] ${stage}: ${this.timestamps[stage]} ms`);
  }

  public getTimestamps(): Partial<PerfStageTiming> {
    return { ...this.timestamps };
  }

  public getStartTime(): number {
    return this.startTime;
  }
}

export const mainPerfTracker = new MainPerfTracker();
