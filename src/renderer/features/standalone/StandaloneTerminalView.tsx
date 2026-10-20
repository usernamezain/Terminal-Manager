import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import {
  Terminal as TerminalIcon,
  ArrowDownToLine,
  Minus,
  Square,
  X,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { XTERM_THEMES } from '../../../shared/constants';
import { useSettingsStore } from '@renderer/store/useSettingsStore';
import { useClipboardHistoryStore } from '../terminal-actions/clipboardHistoryStore';
import { useShellIntegrationStore } from '../terminal-actions/shellIntegrationStore';
import { TerminalContextMenu } from '../terminal-actions/TerminalContextMenu';
import { ActionsPanel } from '../terminal-actions/ActionsPanel';
import { MultiLinePasteDialog } from '../terminal-actions/MultiLinePasteDialog';
import { SnippetVariableDialog } from '../terminal-actions/SnippetVariableDialog';
import { DangerousCommandDialog } from '../terminal-actions/DangerousCommandDialog';
import { analyzePastedText, sanitizeClipboardText } from '@shared/terminalUtils';
import { Snippet } from '@shared/snippetTypes';
import { ProjectRunnerBar } from '../project-runner/ProjectRunnerBar';
import styles from './StandaloneTerminalView.module.css';

interface StandaloneTerminalViewProps {
  sessionId: string;
}

export const StandaloneTerminalView: React.FC<StandaloneTerminalViewProps> = ({ sessionId }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const { settings } = useSettingsStore();

  const [sessionTitle, setSessionTitle] = useState('Terminal');
  const [sessionCwd, setSessionCwd] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Handshake connection state
  const [handshakeState, setHandshakeState] = useState<'pending' | 'connected' | 'error'>('pending');
  const [handshakeError, setHandshakeError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  // Live CWD from shell integration OSC 7
  const liveMarkerCwd = useShellIntegrationStore((state) => state.sessions[sessionId]?.currentCwd);
  const effectiveCwd = liveMarkerCwd || sessionCwd;

  // Context menu and Actions Panel state
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [isActionsPanelOpen, setIsActionsPanelOpen] = useState(false);
  const [actionsPanelSection, setActionsPanelSection] = useState<string | undefined>(undefined);
  const [isReadOnly, setIsReadOnly] = useState(false);

  // Dialog states
  const [pendingPasteText, setPendingPasteText] = useState<string | null>(null);
  const [variableSnippet, setVariableSnippet] = useState<{ snippet: Snippet; runImmediately: boolean } | null>(null);
  const [dangerousCmd, setDangerousCmd] = useState<{ command: string; reason: string } | null>(null);

  useEffect(() => {
    const unsub = window.api?.app?.onToast?.((t) => {
      setToastMessage(t.message);
      setTimeout(() => setToastMessage(null), 4000);
    });
    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Handshake and Terminal Initialization
  useEffect(() => {
    let isCancelled = false;
    let unsubPtyData: (() => void) | undefined;
    let onDataSub: { dispose: () => void } | undefined;
    let resizeTimer: NodeJS.Timeout | null = null;

    setHandshakeState('pending');
    setHandshakeError(null);

    const initTerminal = async () => {
      // 1. Initiate typed handshake with 3s timeout
      let handshakeData: any = null;
      try {
        const handshakePromise = window.api?.window?.ready
          ? window.api.window.ready({ sessionId })
          : Promise.reject(new Error('window.api.window.ready is missing'));

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Handshake timed out after 3000ms')), 3000)
        );

        handshakeData = await Promise.race([handshakePromise, timeoutPromise]);
      } catch (err: any) {
        if (!isCancelled) {
          setHandshakeState('error');
          setHandshakeError(err?.message || 'Failed to connect to terminal session');
        }
        return;
      }

      if (isCancelled || !containerRef.current) return;

      if (!handshakeData || !handshakeData.success) {
        setHandshakeState('error');
        setHandshakeError(handshakeData?.error || 'Handshake rejected by main process');
        return;
      }

      if (handshakeData.title) setSessionTitle(handshakeData.title);
      if (handshakeData.cwd) setSessionCwd(handshakeData.cwd);

      // 2. Initialize Xterm instance
      const themeKey = (handshakeData.theme || settings.theme || 'midnight') as keyof typeof XTERM_THEMES;
      const termTheme = XTERM_THEMES[themeKey] || XTERM_THEMES.midnight;
      const term = new Terminal({
        cursorBlink: true,
        cursorStyle: 'block',
        fontFamily: "'CaskaydiaCove Nerd Font Mono', 'Cascadia Code', Consolas, monospace",
        fontSize: settings.fontSize || 14,
        lineHeight: settings.lineHeight || 1.2,
        theme: termTheme,
        allowTransparency: true,
        allowProposedApi: true,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.loadAddon(new WebLinksAddon());

      term.open(containerRef.current);
      terminalRef.current = term;
      fitAddonRef.current = fitAddon;

      // 3. Register Shell Integration OSC handlers
      if (settings.shellIntegration ?? true) {
        term.parser.registerOscHandler(133, (data: string) => {
          const currentY = term.buffer.active.cursorY + term.buffer.active.baseY;
          useShellIntegrationStore.getState().handleOsc133(sessionId, data, currentY);
          return true;
        });

        term.parser.registerOscHandler(7, (data: string) => {
          useShellIntegrationStore.getState().handleOsc7(sessionId, data);
          return true;
        });
      }

      // 4. Wire user input to PTY
      onDataSub = term.onData((data) => {
        if (window.api?.pty && !isReadOnly) {
          window.api.pty.write(sessionId, data);
        }
      });

      // 5. Wire PTY data events
      if (window.api?.pty) {
        unsubPtyData = window.api.pty.onData(({ id, data }) => {
          if (id === sessionId) {
            term.write(data, () => {
              if (window.api?.pty) {
                window.api.pty.ack(id, data.length);
              }
            });
          }
        });
      }

      // 6. Write scrollback replay buffer from handshake
      if (handshakeData.scrollback) {
        term.write(handshakeData.scrollback);
      }

      // 7. Initial fit & size reporting
      fitAddon.fit();
      if (window.api?.pty && term.cols > 0 && term.rows > 0) {
        window.api.pty.resize(sessionId, term.cols, term.rows);
      }

      term.focus();
      setHandshakeState('connected');

      // Double-fit after paint to guarantee accurate layout
      resizeTimer = setTimeout(() => {
        try {
          fitAddon.fit();
          if (window.api?.pty && term.cols > 0 && term.rows > 0) {
            window.api.pty.resize(sessionId, term.cols, term.rows);
          }
        } catch (_) {}
      }, 60);
    };

    initTerminal();

    const handleWindowResize = () => {
      try {
        fitAddonRef.current?.fit();
        if (terminalRef.current && window.api?.pty) {
          window.api.pty.resize(sessionId, terminalRef.current.cols, terminalRef.current.rows);
        }
      } catch (_) {}
    };

    const handleWindowFocus = () => {
      terminalRef.current?.focus();
    };

    window.addEventListener('resize', handleWindowResize);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      isCancelled = true;
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('focus', handleWindowFocus);
      if (onDataSub) onDataSub.dispose();
      if (unsubPtyData) unsubPtyData();
      if (terminalRef.current) {
        terminalRef.current.dispose();
        terminalRef.current = null;
      }
    };
  }, [sessionId, retryKey, settings.theme, settings.fontSize, settings.lineHeight, settings.shellIntegration]);

  // Read-only keyboard interceptor & Project Runner hotkey forwarder
  useEffect(() => {
    const term = terminalRef.current;
    if (!term) return;
    term.attachCustomKeyEventHandler((e) => {
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'r') {
        if (e.type === 'keydown') {
          window.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'r', ctrlKey: true, altKey: true, bubbles: true })
          );
        }
        return false;
      }
      if (isReadOnly) return false;
      return true;
    });
  }, [isReadOnly]);

  // Refit terminal when Actions Panel toggles
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        fitAddonRef.current?.fit();
        if (terminalRef.current && window.api?.pty) {
          window.api.pty.resize(sessionId, terminalRef.current.cols, terminalRef.current.rows);
        }
      } catch {}
    }, 40);
    return () => clearTimeout(timer);
  }, [sessionId, isActionsPanelOpen]);

  // Safe paste helper
  const performPaste = useCallback((text: string, asSingleLine = false) => {
    let clean = sanitizeClipboardText(text);
    if (asSingleLine) {
      clean = clean.replace(/[\r\n]+/g, ' ').trim();
    }
    if (window.api?.pty && !isReadOnly) {
      window.api.pty.write(sessionId, clean);
    }
    terminalRef.current?.focus();
  }, [sessionId, isReadOnly]);

  const handlePasteWithConfirm = useCallback((text: string, asSingleLine = false) => {
    const analysis = analyzePastedText(text);
    const shouldConfirm = settings.confirmMultiLinePaste ?? true;

    if (shouldConfirm && (analysis.isMultiLine || analysis.isTooLong)) {
      setPendingPasteText(text);
      return;
    }

    performPaste(text, asSingleLine);
  }, [settings.confirmMultiLinePaste, performPaste]);

  const handlePasteClipboard = useCallback(async (asSingleLine = false) => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      handlePasteWithConfirm(text, asSingleLine);
    } catch {}
  }, [handlePasteWithConfirm]);

  // Context menu handler
  const handleContextMenu = useCallback(async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const term = terminalRef.current;
    if (!term) return;

    if (e.shiftKey) {
      setContextMenuPos({ x: e.clientX, y: e.clientY });
      return;
    }

    const action = settings.rightClickAction || 'contextMenu';

    if (action === 'contextMenu') {
      setContextMenuPos({ x: e.clientX, y: e.clientY });
    } else if (action === 'copyOrPaste') {
      if (term.hasSelection()) {
        const selected = term.getSelection();
        await navigator.clipboard.writeText(selected);
        useClipboardHistoryStore.getState().addItem(selected);
      } else {
        handlePasteClipboard();
      }
    } else if (action === 'paste') {
      handlePasteClipboard();
    }
  }, [settings.rightClickAction, handlePasteClipboard]);

  // Keydown shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        e.stopPropagation();
        setIsActionsPanelOpen((prev) => !prev);
        return;
      }

      if ((e.shiftKey && e.key === 'F10') || e.key === 'ContextMenu') {
        e.preventDefault();
        e.stopPropagation();
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setContextMenuPos({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
        }
      }
    };

    const containerEl = containerRef.current;
    if (containerEl) {
      containerEl.addEventListener('keydown', handleKeyDown);
      containerEl.addEventListener('contextmenu', handleContextMenu);
    }
    return () => {
      if (containerEl) {
        containerEl.removeEventListener('keydown', handleKeyDown);
        containerEl.removeEventListener('contextmenu', handleContextMenu);
      }
    };
  }, [handleContextMenu]);

  const handleDock = async () => {
    if (window.api?.session?.dock) {
      await window.api.session.dock(sessionId);
    }
  };

  const handleMinimize = () => {
    window.api?.window?.minimize();
  };

  const handleMaximize = () => {
    window.api?.window?.maximize();
  };

  const handleClose = () => {
    window.api?.window?.close();
  };

  const handleRetry = () => {
    setRetryKey((k) => k + 1);
  };

  const term = terminalRef.current;

  return (
    <div className={styles.standaloneContainer} style={{ position: 'relative', overflow: 'hidden' }}>
      <header className={styles.titleBar}>
        <div className={styles.titleLeft}>
          <div className={styles.titleIcon}>
            <TerminalIcon size={14} />
          </div>
          <span className={styles.sessionTitle}>{sessionTitle}</span>
          {effectiveCwd && <span className={styles.sessionCwd}>{effectiveCwd}</span>}
        </div>

        <div className={styles.titleRight}>
          <button
            type="button"
            className={styles.dockBtn}
            onClick={handleDock}
            title="Dock back to main application window as a tab"
          >
            <ArrowDownToLine size={13} />
            <span>Dock to main window</span>
          </button>

          <div className={styles.windowControls}>
            <button
              type="button"
              className={styles.controlBtn}
              onClick={handleMinimize}
              title="Minimize"
            >
              <Minus size={13} />
            </button>
            <button
              type="button"
              className={styles.controlBtn}
              onClick={handleMaximize}
              title="Maximize"
            >
              <Square size={12} />
            </button>
            <button
              type="button"
              className={`${styles.controlBtn} ${styles.closeControlBtn}`}
              onClick={handleClose}
              title="Close"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      </header>

      {toastMessage && (
        <div
          style={{
            position: 'absolute',
            top: '42px',
            right: '16px',
            zIndex: 999,
            padding: '8px 14px',
            background: 'rgba(234, 179, 8, 0.15)',
            border: '1px solid rgba(234, 179, 8, 0.4)',
            borderRadius: '6px',
            color: '#FACC15',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Terminal Viewport */}
      {handshakeState === 'error' ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            padding: '24px',
            backgroundColor: '#0B0D10',
            color: '#F87171',
            textAlign: 'center',
          }}
        >
          <AlertTriangle size={36} />
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#E6E8EB' }}>
              Connection Error
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8', maxWidth: '420px' }}>
              {handshakeError || 'The terminal session did not respond in time.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={handleRetry}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                background: '#2563EB',
                border: 'none',
                borderRadius: '4px',
                color: '#FFFFFF',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              <RotateCcw size={12} />
              <span>Retry</span>
            </button>
            <button
              type="button"
              onClick={handleDock}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                background: '#334155',
                border: 'none',
                borderRadius: '4px',
                color: '#FFFFFF',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              <ArrowDownToLine size={12} />
              <span>Dock to Main Window</span>
            </button>
            <button
              type="button"
              onClick={handleClose}
              style={{
                padding: '6px 14px',
                background: '#1E293B',
                border: '1px solid #475569',
                borderRadius: '4px',
                color: '#E2E8F0',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Close
            </button>
          </div>
        </div>
      ) : (
        <main
          className={styles.terminalArea}
          ref={containerRef}
          style={{
            width: isActionsPanelOpen ? 'calc(100% - 360px)' : '100%',
            transition: 'width 0.15s ease',
          }}
        />
      )}

      {/* Project Runner Bar Strip */}
      <ProjectRunnerBar
        sessionId={sessionId}
        cwd={effectiveCwd || undefined}
        onRefitTerminal={() => {
          if (fitAddonRef.current) fitAddonRef.current.fit();
        }}
        onRunInNewTab={(tabCwd, commandText) => {
          if (window.api?.session?.createTab) {
            window.api.session.createTab(tabCwd, commandText);
          }
        }}
        onRunInSplit={(commandText) => {
          if (window.api?.session?.createTab) {
            window.api.session.createTab(effectiveCwd || undefined, commandText);
          }
        }}
      />

      {/* Custom Context Menu */}
      {contextMenuPos && term && (
        <TerminalContextMenu
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          sessionId={sessionId}
          terminal={term}
          isStandalone={true}
          isReadOnly={isReadOnly}
          onToggleReadOnly={() => setIsReadOnly((r) => !r)}
          onClose={() => {
            setContextMenuPos(null);
            term.focus();
          }}
          onOpenActionsPanel={(section) => {
            setActionsPanelSection(section);
            setIsActionsPanelOpen(true);
          }}
          onPromptSnippetVariables={(snippet, runImmediately) => {
            setVariableSnippet({ snippet, runImmediately });
          }}
          onPromptDangerousCommand={(command, reason) => {
            setDangerousCmd({ command, reason });
          }}
          onPasteWithConfirm={handlePasteWithConfirm}
        />
      )}

      {/* Docked Actions Panel Drawer */}
      {isActionsPanelOpen && term && (
        <ActionsPanel
          sessionId={sessionId}
          terminal={term}
          isStandalone={true}
          isReadOnly={isReadOnly}
          onToggleReadOnly={() => setIsReadOnly((r) => !r)}
          initialSection={actionsPanelSection}
          onClose={() => {
            setIsActionsPanelOpen(false);
            term.focus();
          }}
          onPromptSnippetVariables={(snippet, runImmediately) => {
            setVariableSnippet({ snippet, runImmediately });
          }}
          onPromptDangerousCommand={(command, reason) => {
            setDangerousCmd({ command, reason });
          }}
          onPasteWithConfirm={handlePasteWithConfirm}
        />
      )}

      {/* Dialogs */}
      {pendingPasteText && (
        <MultiLinePasteDialog
          text={pendingPasteText}
          onConfirmPaste={(singleLine: boolean) => {
            performPaste(pendingPasteText, singleLine);
            setPendingPasteText(null);
          }}
          onCancel={() => setPendingPasteText(null)}
          onDontAskAgain={() => {}}
        />
      )}

      {variableSnippet && (
        <SnippetVariableDialog
          snippet={variableSnippet.snippet}
          onConfirm={(resolved) => {
            if (window.api?.pty && !isReadOnly) {
              window.api.pty.write(sessionId, resolved + (variableSnippet.runImmediately ? '\r' : ''));
            }
            setVariableSnippet(null);
            term?.focus();
          }}
          onCancel={() => setVariableSnippet(null)}
        />
      )}

      {dangerousCmd && (
        <DangerousCommandDialog
          command={dangerousCmd.command}
          reason={dangerousCmd.reason}
          onConfirm={() => {
            if (window.api?.pty && !isReadOnly) {
              window.api.pty.write(sessionId, dangerousCmd.command + '\r');
            }
            setDangerousCmd(null);
            term?.focus();
          }}
          onCancel={() => setDangerousCmd(null)}
        />
      )}
    </div>
  );
};
