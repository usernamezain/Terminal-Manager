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

  const { settings, updateSettings } = useSettingsStore();

  const [sessionTitle, setSessionTitle] = useState('Terminal');
  const [sessionCwd, setSessionCwd] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  useEffect(() => {
    // Fetch session details from session manager
    if (window.api?.session) {
      window.api.session.list().then((list) => {
        const found = list.find((s) => s.id === sessionId);
        if (found) {
          if (found.title) setSessionTitle(found.title);
          if (found.cwd) setSessionCwd(found.cwd);
        }
      });
    }
  }, [sessionId]);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontFamily: "'CaskaydiaCove Nerd Font Mono', 'Cascadia Code', Consolas, monospace",
      fontSize: 14,
      lineHeight: 1.2,
      theme: XTERM_THEMES[settings.theme] || XTERM_THEMES.midnight,
      allowTransparency: true,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());

    term.open(containerRef.current);
    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    // Shell Integration OSC handlers
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

    // Fit initial size
    setTimeout(() => {
      try {
        fitAddon.fit();
        if (window.api?.pty) {
          window.api.pty.resize(sessionId, term.cols, term.rows);
        }
      } catch (e) {}
    }, 50);

    // Terminal user input
    const onDataSub = term.onData((data) => {
      if (window.api?.pty) {
        window.api.pty.write(sessionId, data);
      }
    });

    // PTY data stream from main process
    let unsubPtyData: (() => void) | undefined;
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

    // Window resize handler
    const handleResize = () => {
      try {
        fitAddon.fit();
        if (window.api?.pty) {
          window.api.pty.resize(sessionId, term.cols, term.rows);
        }
      } catch (e) {}
    };
    window.addEventListener('resize', handleResize);

    // Focus terminal
    term.focus();

    return () => {
      window.removeEventListener('resize', handleResize);
      onDataSub.dispose();
      if (unsubPtyData) unsubPtyData();
      term.dispose();
    };
  }, [sessionId, settings.theme, settings.shellIntegration]);

  // Read-only keyboard interceptor
  useEffect(() => {
    const term = terminalRef.current;
    if (!term) return;
    term.attachCustomKeyEventHandler(() => {
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
    if (window.api?.session) {
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

  const term = terminalRef.current;

  return (
    <div className={styles.standaloneContainer} style={{ position: 'relative', overflow: 'hidden' }}>
      <header className={styles.titleBar}>
        <div className={styles.titleLeft}>
          <div className={styles.titleIcon}>
            <TerminalIcon size={14} />
          </div>
          <span className={styles.sessionTitle}>{sessionTitle}</span>
          {sessionCwd && <span className={styles.sessionCwd}>{sessionCwd}</span>}
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

      <main
        className={styles.terminalArea}
        ref={containerRef}
        style={{
          width: isActionsPanelOpen ? 'calc(100% - 360px)' : '100%',
          transition: 'width 0.15s ease',
        }}
      />

      <ProjectRunnerBar
        sessionId={sessionId}
        cwd={cwd}
        onRefitTerminal={() => {
          if (fitAddonRef.current) fitAddonRef.current.fit();
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

      {/* Multi-line Paste Confirmation Dialog */}
      <MultiLinePasteDialog
        isOpen={Boolean(pendingPasteText)}
        text={pendingPasteText || ''}
        onPaste={() => {
          if (pendingPasteText) performPaste(pendingPasteText, false);
          setPendingPasteText(null);
        }}
        onPasteSingleLine={() => {
          if (pendingPasteText) performPaste(pendingPasteText, true);
          setPendingPasteText(null);
        }}
        onCancel={() => setPendingPasteText(null)}
        onDontAskAgain={() => updateSettings({ confirmMultiLinePaste: false })}
      />

      {/* Snippet Variable Prompt Dialog */}
      <SnippetVariableDialog
        isOpen={Boolean(variableSnippet)}
        snippet={variableSnippet?.snippet || null}
        onInsert={(filled) => {
          if (window.api?.pty && !isReadOnly) {
            window.api.pty.write(sessionId, filled);
          }
          terminalRef.current?.focus();
          setVariableSnippet(null);
        }}
        onInsertAndRun={(filled) => {
          if (window.api?.pty && !isReadOnly) {
            window.api.pty.write(sessionId, filled + '\r');
          }
          terminalRef.current?.focus();
          setVariableSnippet(null);
        }}
        onCancel={() => setVariableSnippet(null)}
      />

      {/* Dangerous Command Warning Dialog */}
      <DangerousCommandDialog
        isOpen={Boolean(dangerousCmd)}
        command={dangerousCmd?.command || ''}
        reason={dangerousCmd?.reason || ''}
        onConfirm={() => {
          if (dangerousCmd && window.api?.pty && !isReadOnly) {
            window.api.pty.write(sessionId, dangerousCmd.command + '\r');
          }
          terminalRef.current?.focus();
          setDangerousCmd(null);
        }}
        onCancel={() => setDangerousCmd(null)}
      />
    </div>
  );
};
