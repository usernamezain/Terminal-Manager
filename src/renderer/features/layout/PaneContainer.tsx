import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PaneNode } from './types';
import { useWorkspaceStore } from './useWorkspaceStore';
import { useWorkspaceStore as useUIWorkspaceStore } from '../../store/useWorkspaceStore';
import { terminalRegistry } from '../terminal/registry/TerminalRegistry';
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
import { PaneHeader } from './PaneHeader';
import { ProjectRunnerBar } from '../project-runner/ProjectRunnerBar';
import styles from './Layout.module.css';


interface PaneContainerProps {
  pane: PaneNode;
  isFocused: boolean;
  isMaximized: boolean;
}

export const PaneContainer: React.FC<PaneContainerProps> = ({ pane, isFocused, isMaximized }) => {
  const slotRef = useRef<HTMLDivElement>(null);
  const { settings, updateSettings } = useSettingsStore();
  const {
    setFocusedPane,
    closePane,
    splitPane,
    toggleMaximizePane,
    setDraggedPaneId,
    isBroadcastInput,
    toggleBroadcastInput,
  } = useWorkspaceStore();

  // Context menu and Actions Panel state
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [isActionsPanelOpen, setIsActionsPanelOpen] = useState(false);
  const [actionsPanelSection, setActionsPanelSection] = useState<string | undefined>(undefined);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const sessionMarkers = useShellIntegrationStore((state) => state.sessions[pane.sessionId || pane.id]);

  // Dialog states
  const [pendingPasteText, setPendingPasteText] = useState<string | null>(null);
  const [variableSnippet, setVariableSnippet] = useState<{ snippet: Snippet; runImmediately: boolean } | null>(null);
  const [dangerousCmd, setDangerousCmd] = useState<{ command: string; reason: string } | null>(null);

  useEffect(() => {
    if (!slotRef.current) return;
    let isCancelled = false;

    const setupPane = async () => {
      let ptyId = pane.sessionId;

      if (!ptyId || ptyId === 'pty-fresh') {
        const width = slotRef.current?.clientWidth || 800;
        const height = slotRef.current?.clientHeight || 450;
        const cols = Math.max(20, Math.floor(width / 9));
        const rows = Math.max(5, Math.floor(height / 18));
        ptyId = await useWorkspaceStore.getState().ensurePtyForPane(pane.id, cols, rows);
        if (isCancelled) return;
      }

      let entry = terminalRegistry.get(pane.id);
      if (!entry) {
        entry = terminalRegistry.register(pane.id, ptyId, settings);
      } else if (entry.ptyId !== ptyId) {
        terminalRegistry.updatePtyId(pane.id, ptyId);
      }

      if (slotRef.current) {
        terminalRegistry.attach(pane.id, slotRef.current);
        if (isFocused) {
          terminalRegistry.focus(pane.id);
        }
      }

      // If attaching an existing session (such as when docked), request session attach so scrollback is replayed
      if (window.api?.session?.attach && ptyId && ptyId !== 'pty-fresh') {
        window.api.session.attach(ptyId).catch(() => {});
      }
    };

    setupPane();

    return () => {
      isCancelled = true;
      terminalRegistry.detach(pane.id);
    };
  }, [pane.id, pane.sessionId, settings, isFocused]);

  useEffect(() => {
    const handleWindowFocus = () => {
      if (isFocused) {
        terminalRegistry.focus(pane.id);
      }
    };
    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [isFocused, pane.id]);

  // Read-only keyboard interceptor & Project Runner hotkey forwarder
  useEffect(() => {
    const entry = terminalRegistry.get(pane.id);
    if (!entry) return;
    entry.terminal.attachCustomKeyEventHandler((e) => {
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
  }, [pane.id, isReadOnly]);

  // Refit terminal whenever Actions Panel toggles
  useEffect(() => {
    const timer = setTimeout(() => {
      terminalRegistry.scheduleFit(pane.id, true);
    }, 40);
    return () => clearTimeout(timer);
  }, [pane.id, isActionsPanelOpen]);

  // Safe paste helper
  const performPaste = useCallback((text: string, asSingleLine = false) => {
    let clean = sanitizeClipboardText(text);
    if (asSingleLine) {
      clean = clean.replace(/[\r\n]+/g, ' ').trim();
    }
    const entry = terminalRegistry.get(pane.id);
    if (entry && entry.ptyId && window.api?.pty && !isReadOnly) {
      window.api.pty.write(entry.ptyId, clean);
    }
    entry?.terminal.focus();
  }, [pane.id, isReadOnly]);

  // Multi-line paste confirmation trigger
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

  // Context menu handler complying with settings & Shift-click override
  const handleContextMenu = useCallback(async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const entry = terminalRegistry.get(pane.id);
    if (!entry) return;
    const term = entry.terminal;

    // Shift + right-click always forces context menu whatever setting is
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
        // Selection remains intact (never cleared on right-click)
      } else {
        handlePasteClipboard();
      }
    } else if (action === 'paste') {
      handlePasteClipboard();
    }
  }, [pane.id, settings.rightClickAction, handlePasteClipboard]);

  // Keydown shortcuts (Ctrl+Shift+A for Actions Panel, Shift+F10 / Menu for Context Menu)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+A: Toggle Actions Panel
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        e.stopPropagation();
        setIsActionsPanelOpen((prev) => !prev);
        return;
      }

      // Shift+F10 or ContextMenu key: Open context menu at slot center
      if ((e.shiftKey && e.key === 'F10') || e.key === 'ContextMenu') {
        e.preventDefault();
        e.stopPropagation();
        if (slotRef.current) {
          const rect = slotRef.current.getBoundingClientRect();
          setContextMenuPos({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
        }
      }
    };

    const slotEl = slotRef.current;
    if (slotEl) {
      slotEl.addEventListener('keydown', handleKeyDown);
      slotEl.addEventListener('contextmenu', handleContextMenu);
    }
    return () => {
      if (slotEl) {
        slotEl.removeEventListener('keydown', handleKeyDown);
        slotEl.removeEventListener('contextmenu', handleContextMenu);
      }
    };
  }, [handleContextMenu]);

  const handlePointerDown = () => {
    setFocusedPane(pane.id);
    terminalRegistry.focus(pane.id);
  };

  const isAdmin = pane.isAdmin || pane.id.includes('admin') || pane.sessionId?.includes('admin');
  const entry = terminalRegistry.get(pane.id);

  return (
    <div
      className={`${styles.paneSlot} ${isFocused ? styles.paneFocused : ''} ${
        isMaximized ? styles.paneMaximized : ''
      }`}
      style={{
        position: 'relative',
        overflow: 'hidden',
        ...(isAdmin ? { borderTop: '2px solid #F59E0B' } : {}),
      }}
      onPointerDown={handlePointerDown}
    >
      <PaneHeader
        pane={pane}
        isFocused={isFocused}
        isMaximized={isMaximized}
        onSplitRight={() => splitPane('row')}
        onSplitDown={() => splitPane('column')}
        onMaximize={() => toggleMaximizePane(pane.id)}
        onClose={() => closePane(pane.id)}
        onDragStart={() => setDraggedPaneId(pane.id)}
      />

      <div
        ref={slotRef}
        className={styles.terminalSlot}
        style={{
          width: isActionsPanelOpen ? 'calc(100% - 360px)' : '100%',
          transition: 'width 0.15s ease',
        }}
      />

      <ProjectRunnerBar
        sessionId={entry?.ptyId || pane.sessionId || pane.id}
        cwd={sessionMarkers?.currentCwd || pane.cwd}
        onRefitTerminal={() => {
          terminalRegistry.scheduleFit(pane.id, true);
        }}
        onRunInNewTab={(tabCwd) => {
          useWorkspaceStore.getState().newTab(undefined, undefined, undefined, tabCwd);
        }}
        onRunInSplit={() => {
          splitPane('row');
        }}
      />


      {pane.exited && (
        <div className={styles.exitBanner}>
          <span>Process exited with code {pane.exited.code}</span>
          <button onClick={() => splitPane('row')}>Restart</button>
          <button onClick={() => closePane(pane.id)}>Close</button>
        </div>
      )}

      {/* Custom Context Menu */}
      {contextMenuPos && entry && (
        <TerminalContextMenu
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          sessionId={entry.ptyId || pane.sessionId || pane.id}
          paneId={pane.id}
          terminal={entry.terminal}
          isStandalone={false}
          isReadOnly={isReadOnly}
          isBroadcastOn={isBroadcastInput}
          onToggleReadOnly={() => setIsReadOnly((r) => !r)}
          onToggleBroadcast={toggleBroadcastInput}
          onClose={() => {
            setContextMenuPos(null);
            entry.terminal.focus();
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
      {isActionsPanelOpen && entry && (
        <ActionsPanel
          sessionId={entry.ptyId || pane.sessionId || pane.id}
          paneId={pane.id}
          terminal={entry.terminal}
          isStandalone={false}
          isReadOnly={isReadOnly}
          isBroadcastOn={isBroadcastInput}
          onToggleReadOnly={() => setIsReadOnly((r) => !r)}
          onToggleBroadcast={toggleBroadcastInput}
          initialSection={actionsPanelSection}
          onClose={() => {
            setIsActionsPanelOpen(false);
            entry.terminal.focus();
          }}
          onPromptSnippetVariables={(snippet, runImmediately) => {
            setVariableSnippet({ snippet, runImmediately });
          }}
          onPromptDangerousCommand={(command, reason) => {
            setDangerousCmd({ command, reason });
          }}
          onPasteWithConfirm={handlePasteWithConfirm}
          onOpenScriptRunner={() => useUIWorkspaceStore.getState().setActiveNavTab('scripts')}
          onOpenSettings={(_sec) => useUIWorkspaceStore.getState().setActiveNavTab('settings')}
          sessionEnded={Boolean(pane.exited)}
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
          if (entry && entry.ptyId && window.api?.pty && !isReadOnly) {
            window.api.pty.write(entry.ptyId, filled);
          }
          entry?.terminal.focus();
          setVariableSnippet(null);
        }}
        onInsertAndRun={(filled) => {
          if (entry && entry.ptyId && window.api?.pty && !isReadOnly) {
            window.api.pty.write(entry.ptyId, filled + '\r');
          }
          entry?.terminal.focus();
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
          if (dangerousCmd && entry && entry.ptyId && window.api?.pty && !isReadOnly) {
            window.api.pty.write(entry.ptyId, dangerousCmd.command + '\r');
          }
          entry?.terminal.focus();
          setDangerousCmd(null);
        }}
        onCancel={() => setDangerousCmd(null)}
      />
    </div>
  );
};
