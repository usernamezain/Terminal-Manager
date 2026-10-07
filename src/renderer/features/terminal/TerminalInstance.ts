import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import { SearchAddon } from '@xterm/addon-search';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { SerializeAddon } from '@xterm/addon-serialize';
import '@xterm/xterm/css/xterm.css';
import { AppSettings } from '@shared/types';
import { XTERM_THEMES } from '@shared/constants';

export interface TerminalInstanceOptions {
  container: HTMLElement;
  settings: AppSettings;
  onFallbackToast?: (message: string) => void;
  onExit?: (code: number) => void;
}

export class TerminalInstance {
  public terminal: Terminal;
  public fitAddon: FitAddon;
  public searchAddon: SearchAddon;
  public serializeAddon: SerializeAddon;
  public webglAddon: WebglAddon | null = null;
  private ptyId: string | null = null;
  private unsubData: (() => void) | null = null;
  private unsubExit: (() => void) | null = null;
  private resizeDebounceTimer: NodeJS.Timeout | null = null;
  private rafId: number | null = null;
  private container: HTMLElement;
  private onFallbackToast?: (msg: string) => void;
  private isDisposed = false;

  constructor(options: TerminalInstanceOptions) {
    this.container = options.container;
    this.onFallbackToast = options.onFallbackToast;

    const themeColors = XTERM_THEMES[options.settings.theme] || XTERM_THEMES.midnight;

    this.terminal = new Terminal({
      fontFamily: options.settings.fontFamily,
      fontSize: options.settings.fontSize,
      lineHeight: options.settings.lineHeight,
      cursorStyle: options.settings.cursorStyle,
      cursorBlink: options.settings.cursorBlink,
      scrollback: options.settings.scrollback,
      theme: themeColors,
      customGlyphs: true,
      allowProposedApi: true,
      smoothScrollDuration: options.settings.animationLevel === 'off' ? 0 : 120,
    });

    this.fitAddon = new FitAddon();
    this.searchAddon = new SearchAddon();
    this.serializeAddon = new SerializeAddon();

    this.terminal.loadAddon(this.fitAddon);
    this.terminal.loadAddon(this.searchAddon);
    this.terminal.loadAddon(this.serializeAddon);
    this.terminal.loadAddon(new WebLinksAddon());

    const unicode11 = new Unicode11Addon();
    this.terminal.loadAddon(unicode11);
    this.terminal.unicode.activeVersion = '11';

    // Mount xterm to DOM container
    this.terminal.open(this.container);

    // Initialize WebGL Renderer with Fallback
    this.setupWebgl();

    // Data flow: Keystroke -> xterm.onData -> api.pty.write
    this.terminal.onData((data) => {
      if (this.ptyId && window.api?.pty) {
        window.api.pty.write(this.ptyId, data);
      }
    });

    // Smart Keybindings: Ctrl+C (copy if selection, else SIGINT), Ctrl+V (paste)
    this.terminal.attachCustomKeyEventHandler((event: KeyboardEvent) => {
      if (event.type !== 'keydown') return true;

      // Ctrl + C or Cmd + C
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
        if (this.terminal.hasSelection()) {
          const selection = this.terminal.getSelection();
          navigator.clipboard.writeText(selection);
          return false; // Handled
        }
        return true; // Let default SIGINT \x03 flow to onData
      }

      // Ctrl + V or Cmd + V
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
        navigator.clipboard.readText().then((text) => {
          if (text && this.ptyId && window.api?.pty) {
            window.api.pty.write(this.ptyId!, text);
          }
        });
        return false;
      }

      return true;
    });

    // Right-click paste
    this.container.addEventListener('contextmenu', this.handleContextMenu);
    this.container.addEventListener('click', this.handleContainerClick);
  }

  private handleContainerClick = () => {
    if (!this.isDisposed) {
      this.terminal.focus();
    }
  };

  private setupWebgl(): void {
    try {
      this.webglAddon = new WebglAddon();
      this.webglAddon.onContextLoss(() => {
        this.webglAddon?.dispose();
        this.webglAddon = null;
        if (this.onFallbackToast) {
          this.onFallbackToast('WebGL context lost. Switched to canvas renderer.');
        }
      });
      this.terminal.loadAddon(this.webglAddon);
    } catch (e) {
      this.webglAddon = null;
      if (this.onFallbackToast) {
        this.onFallbackToast('WebGL unavailable. Falling back to canvas renderer.');
      }
    }
  }

  private handleContextMenu = async (e: MouseEvent) => {
    e.preventDefault();
    if (this.terminal.hasSelection()) {
      const selection = this.terminal.getSelection();
      await navigator.clipboard.writeText(selection);
    } else {
      const text = await navigator.clipboard.readText();
      if (text && this.ptyId && window.api?.pty) {
        window.api.pty.write(this.ptyId, text);
      }
    }
  };

  public attachPty(ptyId: string): void {
    this.ptyId = ptyId;

    // Listen for PTY data -> xterm.write with ACK callback
    if (window.api?.pty) {
      this.unsubData = window.api.pty.onData((event) => {
        if (event.id === this.ptyId && !this.isDisposed) {
          this.terminal.write(event.data, () => {
            if (this.ptyId && window.api?.pty) {
              window.api.pty.ack(this.ptyId, event.data.length);
            }
          });
        }
      });
    }

    // Initial fit & focus
    this.fit();
    setTimeout(() => {
      if (!this.isDisposed) {
        this.terminal.focus();
      }
    }, 50);
  }

  public fit(): void {
    if (this.isDisposed) return;
    if (this.rafId) cancelAnimationFrame(this.rafId);

    this.rafId = requestAnimationFrame(() => {
      try {
        this.fitAddon.fit();
        this.notifyPtyResize();
      } catch (err) {
        // Container might not be visible or sized yet
      }
    });
  }

  public notifyPtyResize(): void {
    if (!this.ptyId || !window.api?.pty) return;
    const cols = this.terminal.cols;
    const rows = this.terminal.rows;

    if (this.resizeDebounceTimer) {
      clearTimeout(this.resizeDebounceTimer);
    }

    this.resizeDebounceTimer = setTimeout(() => {
      if (this.ptyId && window.api?.pty && !this.isDisposed) {
        window.api.pty.resize(this.ptyId, cols, rows);
      }
    }, 60);
  }

  public updateSettings(settings: AppSettings): void {
    const themeColors = XTERM_THEMES[settings.theme] || XTERM_THEMES.midnight;
    this.terminal.options.theme = themeColors;
    this.terminal.options.fontFamily = settings.fontFamily;
    this.terminal.options.fontSize = settings.fontSize;
    this.terminal.options.lineHeight = settings.lineHeight;
    this.terminal.options.cursorStyle = settings.cursorStyle;
    this.terminal.options.cursorBlink = settings.cursorBlink;
    this.terminal.options.scrollback = settings.scrollback;
    this.fit();
  }

  public dispose(): void {
    this.isDisposed = true;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.resizeDebounceTimer) clearTimeout(this.resizeDebounceTimer);

    this.container.removeEventListener('contextmenu', this.handleContextMenu);
    this.container.removeEventListener('click', this.handleContainerClick);

    if (this.unsubData) this.unsubData();
    if (this.unsubExit) this.unsubExit();

    if (this.webglAddon) {
      try {
        this.webglAddon.dispose();
      } catch {
        // ignore
      }
    }

    this.terminal.dispose();
  }
}
