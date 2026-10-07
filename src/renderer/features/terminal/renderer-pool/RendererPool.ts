import { WebglAddon } from '@xterm/addon-webgl';
import { Terminal } from '@xterm/xterm';

export class RendererPool {
  private maxWebglContexts = 12;
  private visiblePanes: Set<string> = new Set();
  private activeWebglPanes: Map<string, { addon: WebglAddon; term: Terminal }> = new Map();

  public setVisible(paneId: string, visible: boolean, term?: Terminal): void {
    if (visible) {
      this.visiblePanes.add(paneId);
      if (term) {
        this.ensureWebglIfBudget(paneId, term);
      }
    } else {
      this.visiblePanes.delete(paneId);
      this.releaseWebgl(paneId);
    }
  }

  public ensureWebglIfBudget(paneId: string, term: Terminal): void {
    if (this.activeWebglPanes.has(paneId)) return;
    if (this.activeWebglPanes.size >= this.maxWebglContexts) return;

    try {
      const addon = new WebglAddon();
      addon.onContextLoss(() => {
        this.releaseWebgl(paneId);
      });
      term.loadAddon(addon);
      this.activeWebglPanes.set(paneId, { addon, term });
    } catch {
      // Fallback to DOM/canvas renderer
    }
  }

  public releaseWebgl(paneId: string): void {
    const entry = this.activeWebglPanes.get(paneId);
    if (entry) {
      try {
        entry.addon.dispose();
      } catch {
        // Ignore
      }
      this.activeWebglPanes.delete(paneId);
    }
  }

  public isWebglActive(paneId: string): boolean {
    return this.activeWebglPanes.has(paneId);
  }

  public getActiveCount(): number {
    return this.activeWebglPanes.size;
  }

  public disposeAll(): void {
    for (const [paneId] of this.activeWebglPanes) {
      this.releaseWebgl(paneId);
    }
    this.visiblePanes.clear();
  }
}

export const rendererPool = new RendererPool();
