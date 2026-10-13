export interface PerfStageTiming {
  processStart: number;
  appReady?: number;
  windowCreated?: number;
  readyToShow?: number;
  windowVisible?: number;
  rendererFirstPaint?: number;
  reactMounted?: number;
  registryCreated?: number;
  xtermOpened?: number;
  fontsLoaded?: number;
  fitDone?: number;
  ptyCreateSent?: number;
  ptySpawned?: number;
  firstPtyOutput?: number;
  promptVisible?: number;
  firstKeystrokeSent?: number;
  firstEchoRendered?: number;
}

export interface KeystrokeProbeResult {
  dispatchTime: number;
  ptyWriteTime: number;
  echoTime: number;
  latencyMs: number;
}

export interface PerfSummary {
  stages: Record<string, number>;
  keystrokeProbe?: KeystrokeProbeResult;
  shellMemory?: {
    count: number;
    totalMemoryMb: number;
    formatted: string;
  };
  warmPoolStatus?: {
    poolSize: number;
    activePoolCount: number;
  };
}
