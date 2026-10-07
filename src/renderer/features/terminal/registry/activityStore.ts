type ActivityCallback = (paneId: string, type: 'activity' | 'bell') => void;

class ActivityStore {
  private listeners: Set<ActivityCallback> = new Set();
  private pendingActivity: Map<string, 'activity' | 'bell'> = new Map();
  private rafId: number | null = null;

  public subscribe(cb: ActivityCallback): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  public notify(paneId: string, type: 'activity' | 'bell'): void {
    this.pendingActivity.set(paneId, type);
    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => {
        this.flush();
      });
    }
  }

  private flush(): void {
    this.rafId = null;
    for (const [paneId, type] of this.pendingActivity.entries()) {
      for (const listener of this.listeners) {
        listener(paneId, type);
      }
    }
    this.pendingActivity.clear();
  }
}

export const activityStore = new ActivityStore();
