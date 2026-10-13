import { PerfStageTiming, PerfSummary, KeystrokeProbeResult } from '../shared/perf';

class RendererPerfTracker {
  private startTime: number = performance.now();
  private stages: Record<string, number> = {};
  private keystrokeProbe?: KeystrokeProbeResult;

  constructor() {
    this.stages['rendererStart'] = 0;
  }

  public mark(stage: keyof PerfStageTiming | string): void {
    const time = Math.round((performance.now() - this.startTime) * 100) / 100;
    this.stages[stage] = time;
    try {
      performance.mark(`tm:${stage}`);
    } catch {}
  }

  public async getFullTimeline(): Promise<PerfSummary> {
    let mainTimestamps: Record<string, number> = {};
    if (window.api?.perf) {
      try {
        mainTimestamps = await window.api.perf.getMainTimestamps();
      } catch {}
    }

    const merged = {
      ...mainTimestamps,
      ...this.stages,
    };

    let shellMem: any = null;
    if (window.api?.app?.getShellMemory) {
      try {
        shellMem = await window.api.app.getShellMemory();
      } catch {}
    }

    const summary: PerfSummary = {
      stages: merged,
      keystrokeProbe: this.keystrokeProbe,
      shellMemory: shellMem || undefined,
    };

    if (window.api?.perf) {
      try {
        await window.api.perf.logSummary(summary);
      } catch {}
    }

    return summary;
  }

  public recordKeystrokeProbe(result: KeystrokeProbeResult): void {
    this.keystrokeProbe = result;
  }

  public getStages(): Record<string, number> {
    return { ...this.stages };
  }
}

export const rendererPerfTracker = new RendererPerfTracker();

if (typeof window !== 'undefined') {
  (window as any).__perfTracker = rendererPerfTracker;
}
