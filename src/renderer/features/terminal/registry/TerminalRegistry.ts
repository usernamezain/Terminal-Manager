import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { SerializeAddon } from '@xterm/addon-serialize';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import '@xterm/xterm/css/xterm.css';
import { AppSettings } from '../../../../shared/types';
import { XTERM_THEMES } from '../../../../shared/constants';
import { rendererPool } from '../renderer-pool/RendererPool';
import { activityStore } from './activityStore';
import { useWorkspaceStore } from '../../layout/useWorkspaceStore';
import { useShellIntegrationStore } from '../../terminal-actions/shellIntegrationStore';

export interface TerminalEntry {
  paneId: string;
  ptyId: string;
  terminal: Terminal;
  fitAddon: FitAddon;
  searchAddon: SearchAddon;
  serializeAddon: SerializeAddon;
  containerElement: HTMLDivElement;
  hostSlot: HTMLElement | null;
  inputQueue?: string[];
  unsubData?: () => void;
  unsubExit?: () => void;
  unsubFallback?: () => void;
  resizeDebounceTimer?: NodeJS.Timeout;
}

export class TerminalRegistry {
  private entries: Map<string, TerminalEntry> = new Map();
  private ptyToPaneMap: Map<string, string> = new Map();
  private hasReceivedOutputSet: Set<string> = new Set();
  private outputListeners: Map<string, Array<() => void>> = new Map();

  constructor() {
    this.setupGlobalPtyListeners();
    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.ready.then(() => {
        for (const entry of this.entries.values()) {
          this.scheduleFit(entry.paneId, true);
        }
      });
    }
  }

  private setupGlobalPtyListeners(): void {
    if (typeof window === 'undefined' || !window.api?.pty) return;

    window.api.pty.onData(({ id, data }: any) => {
      const paneId = this.ptyToPaneMap.get(id);
      if (!paneId) return;

      if (!this.hasReceivedOutputSet.has(paneId)) {
        this.hasReceivedOutputSet.add(paneId);
        const listeners = this.outputListeners.get(paneId);
        if (listeners) {
          listeners.forEach((fn) => fn());
          this.outputListeners.delete(paneId);
        }
      }

      const entry = this.entries.get(paneId);
      if (entry) {
        entry.terminal.write(data, () => {
          if (window.api?.pty) {
            window.api.pty.ack(id, data.length);
          }
        });
        activityStore.notify(paneId, 'activity');
      }
    });

    window.api.pty.onFallback(({ id, message }: any) => {
      const paneId = this.ptyToPaneMap.get(id);
      if (paneId) {
        console.warn(`PTY Fallback for pane [${paneId}]: ${message}`);
      }
    });
  }

  public getEntries(): TerminalEntry[] {
    return Array.from(this.entries.values());
  }

  public waitForOutput(paneId: string, timeoutMs = 10000): Promise<void> {
    if (this.hasReceivedOutputSet.has(paneId)) return Promise.resolve();

    return new Promise((resolve) => {
      let timer: NodeJS.Timeout;
      const done = () => {
        clearTimeout(timer);
        resolve();
      };

      timer = setTimeout(done, timeoutMs);

      const listeners = this.outputListeners.get(paneId) || [];
      listeners.push(done);
      this.outputListeners.set(paneId, listeners);
    });
  }

  public register(
    paneId: string,
    ptyId: string,
    settings: AppSettings,
    onContextMenu?: (e: MouseEvent) => void
  ): TerminalEntry {
    if (this.entries.has(paneId)) {
      const existing = this.entries.get(paneId)!;
      if (ptyId && existing.ptyId !== ptyId) {
        this.updatePtyId(paneId, ptyId);
      }
      return existing;
    }

    const containerElement = document.createElement('div');
    containerElement.style.width = '100%';
    containerElement.style.height = '100%';
    containerElement.style.overflow = 'hidden';

    const themeColors = XTERM_THEMES[settings.theme] || XTERM_THEMES.midnight;

    const terminal = new Terminal({
      fontFamily: settings.fontFamily,
      fontSize: settings.fontSize,
      lineHeight: settings.lineHeight,
      cursorStyle: settings.cursorStyle,
      cursorBlink: settings.cursorBlink,
      scrollback: settings.scrollback,
      theme: themeColors,
      customGlyphs: true,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();
    const serializeAddon = new SerializeAddon();
    const unicode11 = new Unicode11Addon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(searchAddon);
    terminal.loadAddon(serializeAddon);
    terminal.loadAddon(new WebLinksAddon());
    terminal.loadAddon(unicode11);
    terminal.unicode.activeVersion = '11';

    terminal.open(containerElement);

    const entry: TerminalEntry = {
      paneId,
      ptyId,
      terminal,
      fitAddon,
      searchAddon,
      serializeAddon,
      containerElement,
      hostSlot: null,
      inputQueue: [],
    };

    terminal.onData((data) => {
      // Support broadcast input to all tabs/panes
      const isBroadcast = useWorkspaceStore.getState().isBroadcastInput;
      if (isBroadcast) {
        this.getEntries().forEach((e) => {
          if (window.api?.pty && e.ptyId && e.ptyId !== '' && !e.ptyId.startsWith('pty-fresh')) {
            window.api.pty.write(e.ptyId, data);
          }
        });
        return;
      }

      const activePtyId = entry.ptyId;
      if (window.api?.pty && activePtyId && activePtyId !== '' && !activePtyId.startsWith('pty-fresh')) {
        window.api.pty.write(activePtyId, data);
      } else {
        entry.inputQueue = entry.inputQueue || [];
        entry.inputQueue.push(data);
      }
    });

    // Shell Integration: register OSC 133 (prompt/command markers) and OSC 7 (cwd)
    if (settings.shellIntegration ?? true) {
      terminal.parser.registerOscHandler(133, (data: string) => {
        const activePtyId = entry.ptyId;
        if (!activePtyId) return true;
        const currentY = terminal.buffer.active.cursorY + terminal.buffer.active.baseY;
        useShellIntegrationStore.getState().handleOsc133(activePtyId, data, currentY);
        return true;
      });

      terminal.parser.registerOscHandler(7, (data: string) => {
        const activePtyId = entry.ptyId;
        if (!activePtyId) return true;
        useShellIntegrationStore.getState().handleOsc7(activePtyId, data);
        return true;
      });
    }

    terminal.attachCustomKeyEventHandler((event: KeyboardEvent) => {
      if (event.type !== 'keydown') return true;

      // Copy / Paste handlers
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
        if (terminal.hasSelection()) {
          navigator.clipboard.writeText(terminal.getSelection());
          return false;
        }
        return true;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
        navigator.clipboard.readText().then((text) => {
          if (text && window.api?.pty && entry.ptyId) {
            window.api.pty.write(entry.ptyId, text);
          }
        });
        return false;
      }
      return true;
    });

    if (onContextMenu) {
      containerElement.addEventListener('contextmenu', onContextMenu);
    }

    this.entries.set(paneId, entry);
    if (ptyId) {
      this.ptyToPaneMap.set(ptyId, paneId);
    }

    return entry;
  }

  public attach(paneId: string, slotElement: HTMLElement): void {
    const entry = this.entries.get(paneId);
    if (!entry) return;

    if (entry.containerElement.parentElement !== slotElement) {
      slotElement.appendChild(entry.containerElement);
      entry.hostSlot = slotElement;
    }

    rendererPool.setVisible(paneId, true, entry.terminal);
    this.scheduleFit(paneId);
    setTimeout(() => {
      try { entry.terminal.focus(); } catch {}
    }, 20);
  }

  public detach(paneId: string): void {
    const entry = this.entries.get(paneId);
    if (!entry) return;

    rendererPool.setVisible(paneId, false);
    if (entry.containerElement.parentElement) {
      entry.containerElement.parentElement.removeChild(entry.containerElement);
    }
    entry.hostSlot = null;
  }

  public updatePtyId(paneId: string, newPtyId: string): void {
    const entry = this.entries.get(paneId);
    if (!entry) return;

    if (entry.ptyId) {
      this.ptyToPaneMap.delete(entry.ptyId);
    }
    entry.ptyId = newPtyId;
    this.ptyToPaneMap.set(newPtyId, paneId);
    this.scheduleFit(paneId, true);

    // Flush any queued input typed before PTY was created
    if (entry.inputQueue && entry.inputQueue.length > 0) {
      const queued = entry.inputQueue.join('');
      entry.inputQueue = [];
      if (window.api?.pty && newPtyId) {
        window.api.pty.write(newPtyId, queued);
      }
    }
  }

  public scheduleFit(paneId: string, immediate = false): void {
    const entry = this.entries.get(paneId);
    if (!entry) return;

    const doFit = () => {
      try {
        entry.fitAddon.fit();
        this.notifyPtyResize(paneId, immediate);
      } catch {
        // Container might not be visible yet
      }
    };

    if (immediate) {
      doFit();
    } else {
      requestAnimationFrame(doFit);
    }
  }

  public notifyPtyResize(paneId: string, immediate = false): void {
    const entry = this.entries.get(paneId);
    if (!entry || !entry.ptyId || !window.api?.pty) return;

    if (entry.resizeDebounceTimer) {
      clearTimeout(entry.resizeDebounceTimer);
      entry.resizeDebounceTimer = undefined;
    }

    const performResize = () => {
      if (entry.ptyId && window.api?.pty) {
        window.api.pty.resize(entry.ptyId, entry.terminal.cols, entry.terminal.rows);
      }
    };

    if (immediate) {
      performResize();
    } else {
      entry.resizeDebounceTimer = setTimeout(performResize, 40);
    }
  }

  public focus(paneId: string): void {
    const entry = this.entries.get(paneId);
    if (entry) {
      entry.terminal.focus();
    }
  }

  public get(paneId: string): TerminalEntry | undefined {
    return this.entries.get(paneId);
  }

  public getCount(): number {
    return this.entries.size;
  }

  public unregister(paneId: string): void {
    const entry = this.entries.get(paneId);
    if (!entry) return;

    this.detach(paneId);
    rendererPool.releaseWebgl(paneId);

    if (entry.resizeDebounceTimer) {
      clearTimeout(entry.resizeDebounceTimer);
    }

    if (entry.ptyId && window.api?.pty) {
      window.api.pty.kill(entry.ptyId);
    }

    entry.terminal.dispose();
    this.ptyToPaneMap.delete(entry.ptyId);
    this.entries.delete(paneId);
  }
}

export const terminalRegistry = new TerminalRegistry();
