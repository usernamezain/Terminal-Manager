import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Terminal } from '@xterm/xterm';
import {
  Copy,
  Clipboard,
  ExternalLink,
  Folder,
  Code,
  Search,
  RotateCcw,
  Trash2,
  Sliders,
  Columns,
  Rows,
  X,
  FileText,
  Play,
  Layers,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Terminal as TerminalIcon,
  Shield,
  Palette,
  Compass,
  Check,
  Bot,
  HelpCircle,
} from 'lucide-react';
import { useSettingsStore } from '@renderer/store/useSettingsStore';
import { useProfilesStore } from '@renderer/store/useProfilesStore';
import { useWorkspaceStore } from '@renderer/features/layout/useWorkspaceStore';
import { useWorkspaceStore as useUIWorkspaceStore } from '@renderer/store/useWorkspaceStore';
import { useClipboardHistoryStore } from './clipboardHistoryStore';
import { useShellIntegrationStore } from './shellIntegrationStore';
import { useSnippetsStore } from './useSnippetsStore';
import { useScriptsStore } from '@renderer/features/scripts/useScriptsStore';
import { useProjectRunnerStore } from '@renderer/features/project-runner/useProjectRunnerStore';
import { useAgentsStore } from '@renderer/features/ai-agents/useAgentsStore';
import { AgentLaunchMode } from '@shared/agentTypes';
import {
  detectPath,
  detectUrl,
  detectFileLineCol,
  detectNetworkOrId,
  quoteForShell,
  identifyShellType,
  analyzePastedText,
  sanitizeClipboardText,
} from '@shared/terminalUtils';
import { Snippet } from '@shared/snippetTypes';
import styles from './TerminalContextMenu.module.css';

export interface MenuItemDef {
  id: string;
  label: string;
  shortcut?: string;
  icon?: React.ElementType;
  disabled?: boolean;
  hidden?: boolean;
  isDivider?: boolean;
  checked?: boolean;
  action?: (e?: React.MouseEvent) => void;
  submenu?: MenuItemDef[];
}

interface TerminalContextMenuProps {
  x: number;
  y: number;
  sessionId: string;
  paneId?: string;
  terminal: Terminal;
  isStandalone?: boolean;
  isReadOnly?: boolean;
  isBroadcastOn?: boolean;
  onToggleReadOnly?: () => void;
  onToggleBroadcast?: () => void;
  onClose: () => void;
  onOpenActionsPanel: (initialSection?: string) => void;
  onPromptSnippetVariables: (snippet: Snippet, runImmediately: boolean) => void;
  onPromptDangerousCommand: (command: string, reason: string) => void;
  onPasteWithConfirm: (text: string, asSingleLine?: boolean) => void;
}

interface SubmenuPortalProps {
  level: number;
  parentId: string;
  parentRect: DOMRect | null;
  itemRefs: React.MutableRefObject<Record<string, HTMLElement | null>>;
  items: MenuItemDef[];
  activeChildId: string | null;
  onHoverItem: (item: MenuItemDef, currentLevel: number) => void;
  onLeavePanel: () => void;
  onEnterPanel: () => void;
  focusedIndex: number;
  onTriggerItem: (item: MenuItemDef, e?: React.MouseEvent) => void;
  onRegisterItemRef: (id: string, el: HTMLElement | null) => void;
  onPanelScroll?: () => void;
  renderChildPortal?: React.ReactNode;
}

const SubmenuPortal: React.FC<SubmenuPortalProps> = ({
  level,
  parentId,
  parentRect,
  itemRefs,
  items,
  activeChildId,
  onHoverItem,
  onLeavePanel,
  onEnterPanel,
  focusedIndex,
  onTriggerItem,
  onRegisterItemRef,
  onPanelScroll,
  renderChildPortal,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [filterQuery, setFilterQuery] = useState('');

  const computePosition = useCallback(() => {
    const pEl = itemRefs.current[parentId];
    const pRect = parentRect || pEl?.getBoundingClientRect();
    if (!pRect) {
      return { top: 0, left: 0, maxHeight: 360, ready: false };
    }

    const panelRect = panelRef.current ? panelRef.current.getBoundingClientRect() : null;
    const panelW = panelRect?.width || 240;
    const panelH = panelRect?.height || 200;

    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;

    let left = pRect.right + 2;
    if (left + panelW > winWidth - 8) {
      left = Math.max(8, pRect.left - panelW - 2);
    }

    let top = pRect.top - 4;
    const maxH = Math.min(360, winHeight - 16);
    if (top + panelH > winHeight - 8) {
      top = Math.max(8, winHeight - panelH - 8);
    }

    return { top, left, maxHeight: maxH, ready: true };
  }, [parentId, parentRect, itemRefs]);

  const [pos, setPos] = useState(computePosition);

  useLayoutEffect(() => {
    const updated = computePosition();
    if (updated.ready) {
      setPos(updated);
    }
  }, [computePosition, items.length, filterQuery]);

  const nonDividerCount = items.filter((i) => !i.isDivider).length;
  const hasFilter = nonDividerCount > 12;

  const filteredItems = useMemo(() => {
    if (!filterQuery.trim()) return items;
    const q = filterQuery.toLowerCase();
    return items.filter((item) => item.isDivider || item.label.toLowerCase().includes(q));
  }, [items, filterQuery]);

  return createPortal(
    <>
      <div
        ref={panelRef}
        className={styles.submenuPanel}
        data-terminal-menu="true"
        style={{
          top: pos.top,
          left: pos.left,
          maxHeight: pos.maxHeight,
          visibility: pos.ready ? 'visible' : 'hidden',
        }}
        onMouseEnter={onEnterPanel}
        onMouseLeave={onLeavePanel}
        onWheel={(e) => e.stopPropagation()}
        onScroll={() => onPanelScroll?.()}
        onClick={(e) => e.stopPropagation()}
      >
        {hasFilter && (
          <div className={styles.filterContainer}>
            <input
              type="text"
              className={styles.filterInput}
              placeholder="Filter items..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {filteredItems.length === 0 && <div className={styles.emptyHint}>No matching items</div>}

        {filteredItems.map((item, idx) => {
          if (item.isDivider) {
            return <div key={`div-${idx}`} className={styles.divider} />;
          }

          const Icon = item.icon;
          const hasSubmenu = Boolean(item.submenu && item.submenu.length > 0);
          const isSubmenuOpen = activeChildId === item.id;
          const isFocused = focusedIndex === idx;

          return (
            <div
              key={item.id}
              ref={(el) => onRegisterItemRef(item.id, el)}
              className={`${styles.menuItem} ${item.disabled ? styles.disabled : ''} ${
                isSubmenuOpen ? styles.active : ''
              } ${isFocused ? styles.focused : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                if (item.disabled) return;
                onTriggerItem(item, e);
              }}
              onMouseEnter={() => onHoverItem(item, level)}
            >
              <span className={styles.itemIconSlot}>
                {item.checked ? (
                  <Check size={14} style={{ color: 'var(--accent-primary, #89b4fa)' }} />
                ) : Icon ? (
                  <Icon size={14} />
                ) : null}
              </span>

              <span className={styles.itemLabel}>{item.label}</span>

              <span className={styles.itemTrailingSlot}>
                {item.shortcut && <span>{item.shortcut}</span>}
                {hasSubmenu && <ChevronRight size={12} />}
              </span>
            </div>
          );
        })}
      </div>
      {renderChildPortal}
    </>,
    document.body
  );
};

export const TerminalContextMenu: React.FC<TerminalContextMenuProps> = ({
  x,
  y,
  sessionId,
  paneId,
  terminal,
  isStandalone = false,
  isReadOnly = false,
  isBroadcastOn = false,
  onToggleReadOnly,
  onToggleBroadcast,
  onClose,
  onOpenActionsPanel,
  onPromptSnippetVariables,
  onPromptDangerousCommand,
  onPasteWithConfirm,
}) => {
  const { settings } = useSettingsStore();
  const { profiles } = useProfilesStore();
  const { splitPane, closePane, duplicatePane, renameTab, setTabColor, tabs, activeTabId } = useWorkspaceStore();
  const clipboardHistory = useClipboardHistoryStore((state) => state.items);
  const addItemToClipboard = useClipboardHistoryStore((state) => state.addItem);
  const sessionMarkers = useShellIntegrationStore((state) => state.sessions[sessionId]);
  const recordCommand = useShellIntegrationStore((state) => state.recordCommand);
  const { snippets } = useSnippetsStore();
  const { scripts } = useScriptsStore();
  const project = useProjectRunnerStore((state) => state.projects[sessionId]);
  const runProjectCommand = useProjectRunnerStore((state) => state.runCommand);
  const openAddPackage = useProjectRunnerStore((state) => state.openAddPackage);
  const agents = useAgentsStore((state) => state.agents);
  const loadAgents = useAgentsStore((state) => state.loadAgents);

  useEffect(() => {
    if (agents.length === 0) {
      loadAgents();
    }
  }, [agents.length, loadAgents]);

  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLElement | null>>({});

  // Active path of open submenus, e.g. ['snippets-menu', 'folder-Git']
  const [activePath, setActivePath] = useState<string[]>([]);
  const [focusedIndices, setFocusedIndices] = useState<Record<number, number>>({ 0: 0 });

  // Timers for hover-reveal delay (120ms) and safe diagonal movement corridor (200ms)
  const openTimerRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Position adjustment for window boundary collision on root menu
  const [position, setPosition] = useState({ top: y, left: x });

  const selection = terminal.getSelection();
  const hasSelection = Boolean(selection && selection.length > 0);

  // Analyze selection for contextual actions
  const pathMatch = useMemo(() => detectPath(selection), [selection]);
  const urlMatch = useMemo(() => detectUrl(selection), [selection]);
  const fileLineMatch = useMemo(() => detectFileLineCol(selection), [selection]);
  const networkMatch = useMemo(() => detectNetworkOrId(selection), [selection]);

  const shellType = identifyShellType(settings.defaultShell);
  const currentCwd = sessionMarkers?.currentCwd || '~';

  // Adjust root menu position to stay completely inside window
  useLayoutEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;

    let adjustedLeft = x;
    let adjustedTop = y;

    if (x + rect.width > winWidth - 8) {
      adjustedLeft = Math.max(8, x - rect.width);
    }
    if (y + rect.height > winHeight - 8) {
      adjustedTop = Math.max(8, y - rect.height);
    }

    setPosition({ left: adjustedLeft, top: adjustedTop });
  }, [x, y]);

  // Outside click, window blur, and scroll listeners
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('[data-terminal-menu]')) {
        return;
      }
      onClose();
      terminal.focus();
    };

    const handleBlur = () => {
      onClose();
      terminal.focus();
    };

    // Scroll listener: Only close if scroll event originated OUTSIDE the context menu and submenus
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('[data-terminal-menu]')) {
        return;
      }
      onClose();
      terminal.focus();
    };

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('scroll', handleScroll, true);
      if (openTimerRef.current) clearTimeout(openTimerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, [onClose, terminal]);

  // Safe shell write helper
  const writeToPty = useCallback(
    (data: string) => {
      if (isReadOnly) return;
      if (window.api?.pty && sessionId) {
        window.api.pty.write(sessionId, data);
      }
    },
    [isReadOnly, sessionId]
  );

  // Safe run command helper with safety check
  const runCommandSafely = useCallback(
    (cmd: string) => {
      const analysis = analyzePastedText(cmd);
      if (analysis.isDangerous) {
        onPromptDangerousCommand(cmd, analysis.dangerousReason || 'Destructive pattern detected');
        return;
      }
      recordCommand(sessionId, cmd, currentCwd);
      writeToPty(`${cmd}\r`);
    },
    [currentCwd, onPromptDangerousCommand, recordCommand, sessionId, writeToPty]
  );

  // Clipboard handlers
  const handleCopy = useCallback(() => {
    if (!hasSelection) return;
    const text = terminal.getSelection();
    navigator.clipboard.writeText(text);
    addItemToClipboard(text);
    onClose();
    terminal.focus();
  }, [addItemToClipboard, hasSelection, onClose, terminal]);

  const handleCopyPlainText = useCallback(() => {
    if (!hasSelection) return;
    const text = sanitizeClipboardText(terminal.getSelection());
    navigator.clipboard.writeText(text);
    addItemToClipboard(text);
    onClose();
    terminal.focus();
  }, [addItemToClipboard, hasSelection, onClose, terminal]);

  const handleCopyFormatted = useCallback(async () => {
    if (!hasSelection) return;
    const text = terminal.getSelection();
    try {
      const htmlContent = `<pre style="background:#0D0F13;color:#EDEDF0;font-family:monospace;padding:8px;border-radius:4px;">${text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')}</pre>`;
      const blobHtml = new Blob([htmlContent], { type: 'text/html' });
      const blobText = new Blob([text], { type: 'text/plain' });
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': blobHtml,
          'text/plain': blobText,
        }),
      ]);
    } catch {
      await navigator.clipboard.writeText(text);
    }
    addItemToClipboard(text);
    onClose();
    terminal.focus();
  }, [addItemToClipboard, hasSelection, onClose, terminal]);

  const handleCopyOneLine = useCallback(() => {
    if (!hasSelection) return;
    const text = terminal.getSelection().replace(/[\r\n]+/g, ' ').trim();
    navigator.clipboard.writeText(text);
    addItemToClipboard(text);
    onClose();
    terminal.focus();
  }, [addItemToClipboard, hasSelection, onClose, terminal]);

  const handlePaste = useCallback(
    async (asPlainText = false) => {
      try {
        const text = await navigator.clipboard.readText();
        if (!text) return;
        const clean = asPlainText ? sanitizeClipboardText(text) : text;
        onPasteWithConfirm(clean);
        onClose();
        terminal.focus();
      } catch {}
    },
    [onClose, onPasteWithConfirm, terminal]
  );

  const handlePasteAndRun = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      const analysis = analyzePastedText(text);
      if (analysis.isMultiLine || analysis.isDangerous) {
        onPasteWithConfirm(text);
      } else {
        runCommandSafely(text.trim());
      }
      onClose();
      terminal.focus();
    } catch {}
  }, [onClose, onPasteWithConfirm, runCommandSafely, terminal]);

  // Snippet Insertion
  const handleInsertSnippet = useCallback(
    (snip: Snippet, runImmediately: boolean) => {
      const vars = Array.from(snip.content.matchAll(/\{\{([a-zA-Z0-9_-]+)\}\}/g)).map((m) => m[1]);
      if (vars.length > 0) {
        onPromptSnippetVariables(snip, runImmediately);
        onClose();
        return;
      }
      if (runImmediately) {
        runCommandSafely(snip.content);
      } else {
        writeToPty(snip.content);
      }
      onClose();
      terminal.focus();
    },
    [onClose, onPromptSnippetVariables, runCommandSafely, terminal, writeToPty]
  );

  // Group snippets by folder
  const snippetsByFolder = useMemo(() => {
    const map: Record<string, Snippet[]> = {};
    for (const snip of snippets) {
      const f = snip.folder || 'General';
      if (!map[f]) map[f] = [];
      map[f].push(snip);
    }
    return map;
  }, [snippets]);

  // Build the complete hierarchical menu definitions
  const allGroups = useMemo(() => {
    const vis = settings.contextMenuVisibility || {};

    // 1. Selection-Aware Group (only displayed at top when text is selected)
    const selectionItems: MenuItemDef[] = [];
    if (hasSelection && vis['group-selection'] !== false) {
      if (pathMatch.isPath && pathMatch.path) {
        const p = pathMatch.path;
        selectionItems.push(
          {
            id: 'path-open',
            label: 'Open Path',
            icon: ExternalLink,
            action: () => {
              window.api?.system?.openPath?.(p);
              onClose();
              terminal.focus();
            },
          },
          {
            id: 'path-show-folder',
            label: 'Open containing folder',
            icon: Folder,
            action: () => {
              window.api?.system?.showItemInFolder?.(p);
              onClose();
              terminal.focus();
            },
          },
          {
            id: 'path-editor',
            label: 'Open in editor',
            icon: Code,
            action: () => {
              window.api?.system?.openInEditor?.(p);
              onClose();
              terminal.focus();
            },
          },
          {
            id: 'path-copy',
            label: 'Copy path',
            icon: Copy,
            action: () => {
              navigator.clipboard.writeText(p);
              addItemToClipboard(p);
              onClose();
              terminal.focus();
            },
          },
          {
            id: 'path-cd',
            label: 'cd here',
            icon: TerminalIcon,
            action: () => {
              const quoted = quoteForShell(shellType, p);
              writeToPty(`cd ${quoted}\r`);
              onClose();
              terminal.focus();
            },
          },
          {
            id: 'path-new-term',
            label: 'Open new terminal here',
            icon: TerminalIcon,
            action: () => {
              useWorkspaceStore.getState().newTab(undefined, undefined, undefined, p);
              onClose();
              terminal.focus();
            },
          }
        );
      }

      if (urlMatch.isUrl && urlMatch.url) {
        const u = urlMatch.url;
        selectionItems.push(
          {
            id: 'url-open',
            label: 'Open in browser',
            icon: ExternalLink,
            action: () => {
              window.api?.system?.openExternal?.(u);
              onClose();
              terminal.focus();
            },
          },
          {
            id: 'url-copy',
            label: 'Copy link',
            icon: Copy,
            action: () => {
              navigator.clipboard.writeText(u);
              addItemToClipboard(u);
              onClose();
              terminal.focus();
            },
          }
        );
      }

      if (fileLineMatch.isMatch && fileLineMatch.file) {
        selectionItems.push({
          id: 'file-line-open',
          label: `Open in editor at line ${fileLineMatch.line}`,
          icon: Code,
          action: () => {
            window.api?.system?.openInEditor?.(fileLineMatch.file!, fileLineMatch.line, fileLineMatch.col);
            onClose();
            terminal.focus();
          },
        });
      }

      if (networkMatch.type !== 'none') {
        selectionItems.push({
          id: 'net-copy',
          label: `Copy ${networkMatch.type.toUpperCase()}`,
          icon: Copy,
          action: () => {
            navigator.clipboard.writeText(networkMatch.value);
            addItemToClipboard(networkMatch.value);
            onClose();
            terminal.focus();
          },
        });

        if (networkMatch.type === 'port') {
          selectionItems.push({
            id: 'net-port-check',
            label: `Show what's using port ${networkMatch.value}`,
            icon: Compass,
            action: () => {
              const portCmd =
                shellType === 'powershell'
                  ? `Get-NetTCPConnection -LocalPort ${networkMatch.value} -ErrorAction SilentlyContinue | Select-Object LocalAddress, LocalPort, State, OwningProcess`
                  : `netstat -ano | findstr :${networkMatch.value}`;
              runCommandSafely(portCmd);
              onClose();
              terminal.focus();
            },
          });
        }
      }

      if (settings.showSearchTheWeb !== false) {
        const engine = settings.defaultSearchEngine || 'google';
        const query = encodeURIComponent(selection.trim());
        const engineName = engine === 'duckduckgo' ? 'DuckDuckGo' : engine === 'bing' ? 'Bing' : 'Google';
        const trimmed = selection.trim();
        const displayQuery = trimmed.length > 25 ? trimmed.slice(0, 25) + '...' : trimmed;
        selectionItems.push({
          id: 'search-web',
          label: `Search ${engineName} for "${displayQuery}"`,
          icon: Search,
          action: () => {
            const targetUrl =
              engine === 'duckduckgo'
                ? `https://duckduckgo.com/?q=${query}`
                : engine === 'bing'
                ? `https://www.bing.com/search?q=${query}`
                : `https://www.google.com/search?q=${query}`;
            window.api?.system?.openExternal?.(targetUrl);
            onClose();
            terminal.focus();
          },
        });
      }

      selectionItems.push(
        {
          id: 'run-selection',
          label: 'Run selection as command',
          icon: Play,
          action: () => {
            runCommandSafely(selection.trim());
            onClose();
            terminal.focus();
          },
        },
        {
          id: 'save-snippet',
          label: 'Save as snippet',
          icon: FileText,
          action: () => {
            const newSnip: Snippet = {
              id: `snip-${Date.now()}`,
              name: selection.slice(0, 24),
              content: selection.trim(),
              folder: 'Custom',
              updatedAt: Date.now(),
            };
            useSnippetsStore.getState().saveSnippet(newSnip);
            onOpenActionsPanel('snippets');
            onClose();
            terminal.focus();
          },
        },
        {
          id: 'save-script',
          label: 'Save as Script Runner script',
          icon: Play,
          action: async () => {
            try {
              const newScript = useScriptsStore.getState().createNewScript();
              await useScriptsStore.getState().saveScript({
                ...newScript,
                name: selection.slice(0, 24).trim() || 'New Script',
                content: selection.trim(),
              });
              useUIWorkspaceStore.getState().setActiveNavTab('scripts');
            } catch {}
            onClose();
            terminal.focus();
          },
        },
        {
          id: 'wrap-quotes',
          label: 'Wrap selection in quotes',
          action: () => {
            const quoted = quoteForShell(shellType, selection);
            navigator.clipboard.writeText(quoted);
            addItemToClipboard(quoted);
            onClose();
            terminal.focus();
          },
        }
      );
    }

    // 2. Clipboard Items
    const clipboardGroup: MenuItemDef[] = [];
    if (vis['group-clipboard'] !== false) {
      clipboardGroup.push(
        {
          id: 'copy',
          label: 'Copy',
          shortcut: 'Ctrl+Shift+C',
          icon: Copy,
          disabled: !hasSelection,
          action: handleCopy,
        },
        {
          id: 'paste',
          label: 'Paste',
          shortcut: 'Ctrl+Shift+V',
          icon: Clipboard,
          action: () => handlePaste(false),
        },
        {
          id: 'copy-paste-as',
          label: 'Copy / Paste as',
          icon: FileText,
          submenu: [
            {
              id: 'copy-plain',
              label: 'Copy as plain text',
              icon: Copy,
              disabled: !hasSelection,
              action: handleCopyPlainText,
            },
            {
              id: 'copy-formatted',
              label: 'Copy with formatting',
              icon: Code,
              disabled: !hasSelection,
              action: handleCopyFormatted,
            },
            {
              id: 'copy-one-line',
              label: 'Copy as one line',
              icon: Copy,
              disabled: !hasSelection,
              action: handleCopyOneLine,
            },
            { id: 'div-cp', label: '', isDivider: true },
            {
              id: 'paste-plain',
              label: 'Paste as plain text',
              icon: Clipboard,
              action: () => handlePaste(true),
            },
            {
              id: 'paste-run',
              label: 'Paste and run',
              icon: Play,
              action: handlePasteAndRun,
            },
            ...(clipboardHistory.length > 0
              ? [
                  {
                    id: 'paste-history',
                    label: 'Paste from history',
                    icon: RotateCcw,
                    submenu: clipboardHistory.map((item, idx) => ({
                      id: `clip-${idx}`,
                      label: item.length > 32 ? `${item.slice(0, 32)}...` : item,
                      action: () => {
                        onPasteWithConfirm(item);
                        onClose();
                        terminal.focus();
                      },
                    })),
                  },
                ]
              : []),
          ],
        },
        {
          id: 'select-menu',
          label: 'Select',
          icon: Search,
          submenu: [
            {
              id: 'select-all',
              label: 'Select All',
              action: () => {
                terminal.selectAll();
                onClose();
                terminal.focus();
              },
            },
            {
              id: 'select-line',
              label: 'Select Line',
              action: () => {
                const buffer = terminal.buffer.active;
                const line = buffer.getLine(buffer.cursorY + buffer.baseY);
                if (line) {
                  terminal.select(0, buffer.cursorY + buffer.baseY, line.length);
                }
                onClose();
                terminal.focus();
              },
            },
            ...(sessionMarkers?.hasMarkers && sessionMarkers.lastCommandOutputStartLine !== undefined
              ? [
                  {
                    id: 'select-last-output',
                    label: 'Select Output of Last Command',
                    action: () => {
                      if (sessionMarkers?.lastCommandOutputStartLine !== undefined) {
                        const startY = sessionMarkers.lastCommandOutputStartLine;
                        const endY = sessionMarkers.lastCommandOutputEndLine || terminal.buffer.active.cursorY;
                        terminal.select(0, startY, (endY - startY + 1) * terminal.cols);
                      }
                      onClose();
                      terminal.focus();
                    },
                  },
                ]
              : []),
          ],
        }
      );
    }

    // Project Runner Group (Appears when project is detected in this terminal's folder)
    const projectGroup: MenuItemDef[] = [];
    if (project && project.ecosystems.length > 0 && vis['group-project'] !== false) {
      const projectSubmenu: MenuItemDef[] = [];

      // Header row showing project name and detected tool
      projectSubmenu.push({
        id: 'proj-header',
        label: `${project.name} (${project.ecosystems[0]?.tool || 'project'})`,
        disabled: true,
      });
      projectSubmenu.push({ id: 'proj-div-head', label: '', isDivider: true });

      // Primary command if detected
      if (project.primaryCommand) {
        const pCmd = project.primaryCommand;
        projectSubmenu.push({
          id: `proj-primary-${pCmd.id}`,
          label: `Run ${pCmd.label}`,
          icon: Play,
          action: () => {
            runProjectCommand(sessionId, pCmd, 'terminal', project.cwd || currentCwd);
            onClose();
            terminal.focus();
          },
        });
        projectSubmenu.push({ id: 'proj-div-prim', label: '', isDivider: true });
      }

      // Ecosystems and command groups
      for (const eco of project.ecosystems) {
        if (!eco.toolAvailable) {
          projectSubmenu.push({
            id: `proj-${eco.type}-missing`,
            label: `${eco.tool} not found`,
            disabled: true,
          });
        }

        for (const grp of eco.groups) {
          const commandsSubmenu: MenuItemDef[] = grp.commands.map((cmd) => {
            if (cmd.category === 'package' && (cmd.id.includes('add-package') || cmd.id.includes('add-dev-package'))) {
              const isDev = cmd.id.includes('dev');
              return {
                id: `proj-cmd-${cmd.id}`,
                label: cmd.label,
                action: () => {
                  openAddPackage(sessionId, project.rootPath, eco.type, isDev);
                  onClose();
                  terminal.focus();
                },
              };
            }
            return {
              id: `proj-cmd-${cmd.id}`,
              label: cmd.label,
              disabled: cmd.disabled,
              action: () => {
                runProjectCommand(sessionId, cmd, 'terminal', project.cwd || currentCwd);
                onClose();
                terminal.focus();
              },
            };
          });

          if (grp.subgroups) {
            for (const sub of grp.subgroups) {
              commandsSubmenu.push({
                id: `proj-subgrp-${sub.id}`,
                label: sub.title,
                submenu: sub.commands.map((subCmd) => ({
                  id: `proj-cmd-${subCmd.id}`,
                  label: subCmd.label,
                  disabled: subCmd.disabled,
                  action: () => {
                    runProjectCommand(sessionId, subCmd, 'terminal', project.cwd || currentCwd);
                    onClose();
                    terminal.focus();
                  },
                })),
              });
            }
          }

          projectSubmenu.push({
            id: `proj-grp-${eco.type}-${grp.id}`,
            label: grp.title,
            submenu: commandsSubmenu,
          });
        }
      }

      // Workspaces if monorepo
      if (project.workspaces && project.workspaces.length > 0) {
        projectSubmenu.push({
          id: 'proj-workspaces',
          label: 'Workspaces',
          submenu: project.workspaces.map((ws) => ({
            id: `proj-ws-${ws.name}`,
            label: ws.name,
            submenu: ws.scripts.map((s) => ({
              id: `proj-ws-cmd-${s.id}`,
              label: s.label,
              action: () => {
                runProjectCommand(sessionId, s, 'terminal', ws.path);
                onClose();
                terminal.focus();
              },
            })),
          })),
        });
      }

      projectGroup.push({
        id: 'project-menu',
        label: 'Project',
        icon: Play,
        submenu: projectSubmenu,
      });
    }

    // AI Agents Group
    const aiAgentsGroup: MenuItemDef[] = [];
    if (vis['group-ai-agents'] !== false) {
      const installedAgents = agents.filter((a) => a.state.status === 'installed');
      const aiAgentsSubmenu: MenuItemDef[] = [];

      if (installedAgents.length > 0) {
        for (const ag of installedAgents) {
          aiAgentsSubmenu.push({
            id: `ai-agent-${ag.entry.id}`,
            label: ag.entry.name,
            icon: Bot,
            action: (e?: React.MouseEvent) => {
              let launchMode: AgentLaunchMode = settings.aiAgents?.defaultLaunchMode || 'terminal';
              if (e?.ctrlKey || e?.metaKey) {
                launchMode = 'window';
              } else if (e?.shiftKey) {
                launchMode = 'tab';
              }
              window.api?.aiAgents?.launch({
                agentId: ag.entry.id,
                cwd: currentCwd,
                mode: launchMode,
                sessionId,
              });
              onClose();
              terminal.focus();
            },
          });
        }

        aiAgentsSubmenu.push({ id: 'div-ai-actions', label: '', isDivider: true });

        aiAgentsSubmenu.push({
          id: 'ai-launch-in-folder',
          label: 'Launch in folder...',
          icon: Folder,
          submenu: installedAgents.map((ag) => ({
            id: `ai-folder-${ag.entry.id}`,
            label: ag.entry.name,
            action: async () => {
              const selected = await window.api?.system?.openFolderPicker?.();
              if (selected) {
                window.api?.aiAgents?.launch({
                  agentId: ag.entry.id,
                  cwd: selected,
                  mode: 'tab',
                });
              }
              onClose();
              terminal.focus();
            },
          })),
        });

        aiAgentsSubmenu.push({
          id: 'ai-install-more',
          label: 'Install more agents...',
          action: () => {
            useUIWorkspaceStore.getState().setActiveNavTab('agents');
            onClose();
            terminal.focus();
          },
        });

        aiAgentsSubmenu.push({
          id: 'ai-manage-agents',
          label: 'Manage agents...',
          action: () => {
            useUIWorkspaceStore.getState().setActiveNavTab('agents');
            onClose();
            terminal.focus();
          },
        });
      } else {
        aiAgentsSubmenu.push({
          id: 'ai-install-first',
          label: 'Install an AI agent...',
          action: () => {
            useUIWorkspaceStore.getState().setActiveNavTab('agents');
            onClose();
            terminal.focus();
          },
        });
      }

      aiAgentsGroup.push({
        id: 'ai-agents-top',
        label: 'AI Agents',
        icon: Bot,
        submenu: aiAgentsSubmenu,
      });
    }

    // 3. Quick Commands: Terminal & Directory Groups
    const quickGroup: MenuItemDef[] = [];
    if (vis['group-quick'] !== false) {
      quickGroup.push(
        {
          id: 'terminal-menu',
          label: 'Terminal',
          icon: TerminalIcon,
          submenu: [
            {
              id: 'clear-screen',
              label: 'Clear screen',
              shortcut: 'Ctrl+L',
              action: () => {
                writeToPty('\x0c');
                onClose();
                terminal.focus();
              },
            },
            {
              id: 'clear-scrollback',
              label: 'Clear scrollback',
              icon: Trash2,
              action: () => {
                terminal.clear();
                onClose();
                terminal.focus();
              },
            },
            {
              id: 'reset-term',
              label: 'Reset terminal',
              icon: RotateCcw,
              action: () => {
                terminal.reset();
                onClose();
                terminal.focus();
              },
            },
            { id: 'div-term-nav', label: '', isDivider: true },
            {
              id: 'scroll-top',
              label: 'Scroll to top',
              icon: ArrowUp,
              action: () => {
                terminal.scrollToTop();
                onClose();
                terminal.focus();
              },
            },
            {
              id: 'scroll-bottom',
              label: 'Scroll to bottom',
              icon: ArrowDown,
              action: () => {
                terminal.scrollToBottom();
                onClose();
                terminal.focus();
              },
            },
            ...(sessionMarkers?.hasMarkers && sessionMarkers.commandStartLine !== undefined
              ? [
                  {
                    id: 'prev-cmd',
                    label: 'Previous command',
                    action: () => {
                      if (sessionMarkers.commandStartLine !== undefined) {
                        terminal.scrollToLine(sessionMarkers.commandStartLine);
                      }
                      onClose();
                      terminal.focus();
                    },
                  },
                  {
                    id: 'next-cmd',
                    label: 'Next command',
                    action: () => {
                      if (sessionMarkers.commandEndLine !== undefined) {
                        terminal.scrollToLine(sessionMarkers.commandEndLine);
                      }
                      onClose();
                      terminal.focus();
                    },
                  },
                ]
              : []),
            {
              id: 'find-term',
              label: 'Find...',
              shortcut: 'Ctrl+F',
              icon: Search,
              action: () => {
                window.dispatchEvent(new CustomEvent('terminal:find', { detail: { sessionId } }));
                onClose();
                terminal.focus();
              },
            },
            { id: 'div-term-proc', label: '', isDivider: true },
            {
              id: 'interrupt',
              label: 'Interrupt (Ctrl+C)',
              shortcut: 'Ctrl+C',
              action: () => {
                writeToPty('\x03');
                onClose();
                terminal.focus();
              },
            },
            {
              id: 'send-eof',
              label: 'Send EOF (Ctrl+D)',
              shortcut: 'Ctrl+D',
              action: () => {
                writeToPty('\x04');
                onClose();
                terminal.focus();
              },
            },
            {
              id: 'kill-proc',
              label: 'Kill process',
              icon: X,
              action: async () => {
                try {
                  const procs = await window.api?.session?.getProcesses?.(sessionId);
                  if (procs && procs.length > 0) {
                    const target = procs.length > 1 ? procs[procs.length - 1] : procs[0];
                    if (target?.pid) {
                      await window.api?.session?.killProcessTree?.(target.pid);
                    }
                  }
                } catch {}
                onClose();
                terminal.focus();
              },
            },
          ],
        },
        {
          id: 'directory-menu',
          label: 'Directory',
          icon: Folder,
          submenu: [
            {
              id: 'cd-menu',
              label: 'Change directory',
              icon: Folder,
              submenu: [
                ...(sessionMarkers?.recentFolders?.map((f) => ({
                  id: `recent-${f}`,
                  label: f,
                  action: () => {
                    const quoted = quoteForShell(shellType, f);
                    writeToPty(`cd ${quoted}\r`);
                    onClose();
                    terminal.focus();
                  },
                })) || []),
                {
                  id: 'cd-home',
                  label: 'Home (~)',
                  action: () => {
                    writeToPty('cd ~\r');
                    onClose();
                    terminal.focus();
                  },
                },
                {
                  id: 'cd-parent',
                  label: 'Parent (..)',
                  action: () => {
                    writeToPty('cd ..\r');
                    onClose();
                    terminal.focus();
                  },
                },
                {
                  id: 'cd-picker',
                  label: 'Open folder picker...',
                  action: async () => {
                    const folder = await window.api?.system?.openFolderPicker?.();
                    if (folder) {
                      const quoted = quoteForShell(shellType, folder);
                      writeToPty(`cd ${quoted}\r`);
                    }
                    onClose();
                    terminal.focus();
                  },
                },
              ],
            },
            {
              id: 'open-explorer',
              label: 'Open Explorer here',
              icon: Folder,
              action: () => {
                if (currentCwd && currentCwd !== '~') {
                  window.api?.system?.openPath?.(currentCwd);
                }
                onClose();
                terminal.focus();
              },
            },
            {
              id: 'copy-cwd',
              label: 'Copy current directory',
              icon: Copy,
              action: () => {
                if (currentCwd) {
                  navigator.clipboard.writeText(currentCwd);
                  addItemToClipboard(currentCwd);
                }
                onClose();
                terminal.focus();
              },
            },
            {
              id: 'open-editor-here',
              label: 'Open in editor here',
              icon: Code,
              action: () => {
                if (currentCwd) {
                  window.api?.system?.openInEditor?.(currentCwd);
                }
                onClose();
                terminal.focus();
              },
            },
          ],
        }
      );
    }

    // 4. Saved Commands and Scripts
    const savedGroup: MenuItemDef[] = [];
    if (vis['group-saved'] !== false) {
      savedGroup.push(
        {
          id: 'snippets-scripts-menu',
          label: 'Snippets & Scripts',
          icon: FileText,
          submenu: [
            ...(snippets.length > 0
              ? [
                  {
                    id: 'snippets-sub',
                    label: 'Snippets',
                    icon: FileText,
                    submenu: Object.entries(snippetsByFolder).map(([folder, items]) => ({
                      id: `folder-${folder}`,
                      label: folder,
                      submenu: items.map((snip) => ({
                        id: `snip-${snip.id}`,
                        label: snip.name,
                        action: () => handleInsertSnippet(snip, false),
                      })),
                    })),
                  },
                ]
              : []),
            ...(scripts.length > 0
              ? [
                  {
                    id: 'scripts-sub',
                    label: 'Script Runner',
                    icon: Play,
                    submenu: scripts.slice(0, 15).map((scr) => ({
                      id: `scr-${scr.id}`,
                      label: scr.name,
                      submenu: [
                        {
                          id: `run-here-${scr.id}`,
                          label: 'Run in this terminal',
                          action: () => {
                            if (scr.content) runCommandSafely(scr.content);
                            onClose();
                            terminal.focus();
                          },
                        },
                        {
                          id: `queue-${scr.id}`,
                          label: 'Run in Script Runner',
                          action: () => {
                            window.api?.scripts?.enqueue?.([{ scriptId: scr.id }], true);
                            onClose();
                            terminal.focus();
                          },
                        },
                        {
                          id: `newtab-${scr.id}`,
                          label: 'Run here as new tab',
                          action: () => {
                            useWorkspaceStore.getState().newTab(undefined, undefined, undefined);
                            onClose();
                            terminal.focus();
                          },
                        },
                      ],
                    })),
                  },
                ]
              : []),
            {
              id: 'manage-snippets',
              label: 'Manage snippets...',
              action: () => {
                onOpenActionsPanel('snippets');
                onClose();
                terminal.focus();
              },
            },
          ],
        },
        {
          id: 'profiles-menu',
          label: 'Profiles',
          icon: Layers,
          submenu: [
            {
              id: 'prof-new-tab',
              label: 'Open new tab with profile',
              submenu: profiles.map((p) => ({
                id: `prof-tab-${p.id}`,
                label: p.name,
                action: () => {
                  useWorkspaceStore.getState().newTab(p.shellPath, p.shellArgs, p.id);
                  onClose();
                  terminal.focus();
                },
              })),
            },
            {
              id: 'prof-new-folder',
              label: 'Open here in folder with profile',
              submenu: profiles.map((p) => ({
                id: `prof-fld-${p.id}`,
                label: p.name,
                action: () => {
                  useWorkspaceStore.getState().newTab(p.shellPath, p.shellArgs, p.id, currentCwd);
                  onClose();
                  terminal.focus();
                },
              })),
            },
          ],
        }
      );
    }

    // 5. Window & Session Group
    const windowGroup: MenuItemDef[] = [];
    if (vis['group-window'] !== false) {
      const paneTabSubmenu: MenuItemDef[] = [];

      if (!isStandalone) {
        paneTabSubmenu.push(
          {
            id: 'split-right',
            label: 'Split Right',
            shortcut: 'Ctrl+Shift+E',
            icon: Columns,
            action: () => {
              splitPane('row');
              onClose();
              terminal.focus();
            },
          },
          {
            id: 'split-down',
            label: 'Split Down',
            shortcut: 'Ctrl+Shift+D',
            icon: Rows,
            action: () => {
              splitPane('column');
              onClose();
              terminal.focus();
            },
          },
          {
            id: 'close-pane',
            label: 'Close Pane',
            shortcut: 'Ctrl+Shift+W',
            icon: X,
            action: () => {
              if (paneId) closePane(paneId);
              onClose();
              terminal.focus();
            },
          },
          { id: 'div-pt-1', label: '', isDivider: true },
          {
            id: 'dup-tab',
            label: 'Duplicate Tab',
            action: () => {
              if (paneId) duplicatePane(paneId);
              onClose();
              terminal.focus();
            },
          },
          {
            id: 'rename-tab',
            label: 'Rename Tab',
            action: () => {
              const currentTitle = tabs.find((t) => t.id === activeTabId)?.title || 'Terminal';
              const name = prompt('New tab title:', currentTitle);
              if (name) renameTab(activeTabId, name);
              onClose();
              terminal.focus();
            },
          },
          {
            id: 'tab-color',
            label: 'Tab Color',
            icon: Palette,
            submenu: [
              { id: 'col-none', label: 'Default', action: () => { setTabColor(activeTabId, undefined); onClose(); terminal.focus(); } },
              { id: 'col-blue', label: 'Blue', action: () => { setTabColor(activeTabId, '#6C8CFF'); onClose(); terminal.focus(); } },
              { id: 'col-green', label: 'Green', action: () => { setTabColor(activeTabId, '#4ADE80'); onClose(); terminal.focus(); } },
              { id: 'col-purple', label: 'Purple', action: () => { setTabColor(activeTabId, '#C084FC'); onClose(); terminal.focus(); } },
              { id: 'col-red', label: 'Red', action: () => { setTabColor(activeTabId, '#F87171'); onClose(); terminal.focus(); } },
              { id: 'col-yellow', label: 'Yellow', action: () => { setTabColor(activeTabId, '#FACC15'); onClose(); terminal.focus(); } },
            ],
          },
          {
            id: 'pop-out',
            label: 'Pop out to Window',
            icon: ExternalLink,
            action: () => {
              window.api?.session?.popOut?.(sessionId);
              onClose();
              terminal.focus();
            },
          },
          { id: 'div-pt-2', label: '', isDivider: true }
        );
      } else {
        paneTabSubmenu.push(
          {
            id: 'dock-main',
            label: 'Dock to Main Window',
            icon: Columns,
            action: () => {
              window.api?.session?.dock?.(sessionId);
              onClose();
              terminal.focus();
            },
          },
          { id: 'div-pt-dock', label: '', isDivider: true }
        );
      }

      paneTabSubmenu.push(
        {
          id: 'toggle-broadcast',
          label: 'Broadcast input to all tabs',
          checked: isBroadcastOn,
          action: () => {
            onToggleBroadcast?.();
            onClose();
            terminal.focus();
          },
        },
        {
          id: 'toggle-readonly',
          label: 'Read-only mode',
          icon: Shield,
          checked: isReadOnly,
          action: () => {
            onToggleReadOnly?.();
            onClose();
            terminal.focus();
          },
        }
      );

      windowGroup.push(
        {
          id: 'pane-tab-menu',
          label: 'Pane & Tab',
          icon: Columns,
          submenu: paneTabSubmenu,
        },
        {
          id: 'export-menu',
          label: 'Export',
          icon: ExternalLink,
          submenu: [
            {
              id: 'export-visible',
              label: 'Save visible output (.txt)',
              action: async () => {
                const buffer = terminal.buffer.active;
                let text = '';
                for (let i = 0; i < terminal.rows; i++) {
                  const line = buffer.getLine(buffer.baseY + i);
                  if (line) text += line.translateToString(true) + '\n';
                }
                await window.api?.system?.saveFile?.('terminal-visible.txt', text);
                onClose();
                terminal.focus();
              },
            },
            {
              id: 'export-full-txt',
              label: 'Save full scrollback (.txt)',
              action: async () => {
                const buffer = terminal.buffer.active;
                let text = '';
                for (let i = 0; i < buffer.length; i++) {
                  const line = buffer.getLine(i);
                  if (line) text += line.translateToString(true) + '\n';
                }
                await window.api?.system?.saveFile?.('terminal-scrollback.txt', text);
                onClose();
                terminal.focus();
              },
            },
            {
              id: 'copy-full',
              label: 'Copy full scrollback',
              icon: Copy,
              action: () => {
                const buffer = terminal.buffer.active;
                let text = '';
                for (let i = 0; i < buffer.length; i++) {
                  const line = buffer.getLine(i);
                  if (line) text += line.translateToString(true) + '\n';
                }
                navigator.clipboard.writeText(text);
                addItemToClipboard(text);
                onClose();
                terminal.focus();
              },
            },
          ],
        }
      );
    }

    // 6. Actions Panel & Settings Group
    const actionPanelGroup: MenuItemDef[] = [];
    if (vis['group-actions-panel'] !== false) {
      actionPanelGroup.push(
        {
          id: 'term-settings',
          label: 'Terminal Settings...',
          icon: Sliders,
          action: () => {
            useUIWorkspaceStore.getState().setActiveNavTab('settings');
            onClose();
            terminal.focus();
          },
        },
        {
          id: 'open-actions-panel',
          label: 'Open Actions Panel...',
          shortcut: 'Ctrl+Shift+A',
          icon: Sliders,
          action: () => {
            onOpenActionsPanel('quick');
            onClose();
            terminal.focus();
          },
        },
        {
          id: 'term-help-docs',
          label: 'Documentation & Help...',
          shortcut: 'F1',
          icon: HelpCircle,
          action: () => {
            useUIWorkspaceStore.getState().openDocs('getting-started');
            onClose();
            terminal.focus();
          },
        }
      );
    }

    const groups: MenuItemDef[][] = [];
    if (selectionItems.length > 0) groups.push(selectionItems);
    if (clipboardGroup.length > 0) groups.push(clipboardGroup);
    if (projectGroup.length > 0) groups.push(projectGroup);
    if (aiAgentsGroup.length > 0) groups.push(aiAgentsGroup);
    if (quickGroup.length > 0) groups.push(quickGroup);
    if (savedGroup.length > 0) groups.push(savedGroup);
    if (windowGroup.length > 0) groups.push(windowGroup);
    if (actionPanelGroup.length > 0) groups.push(actionPanelGroup);

    return groups;
  }, [
    activeTabId,
    agents,
    addItemToClipboard,
    clipboardHistory,
    closePane,
    currentCwd,
    duplicatePane,
    fileLineMatch,
    handleCopy,
    handleCopyFormatted,
    handleCopyOneLine,
    handleCopyPlainText,
    handleInsertSnippet,
    handlePaste,
    handlePasteAndRun,
    hasSelection,
    isBroadcastOn,
    isReadOnly,
    isStandalone,
    networkMatch,
    onClose,
    onOpenActionsPanel,
    onPasteWithConfirm,
    onToggleBroadcast,
    onToggleReadOnly,
    openAddPackage,
    paneId,
    pathMatch,
    profiles,
    project,
    renameTab,
    runCommandSafely,
    runProjectCommand,
    scripts,
    selection,
    sessionMarkers,
    sessionId,
    setTabColor,
    settings,
    shellType,
    snippets,
    snippetsByFolder,
    splitPane,
    tabs,
    terminal,
    urlMatch,
    writeToPty,
  ]);

  // Flatten the top level items with dividers between groups
  const rootItems = useMemo(() => {
    const flattened: MenuItemDef[] = [];
    allGroups.forEach((group, gIdx) => {
      if (gIdx > 0 && group.length > 0) {
        flattened.push({ id: `div-root-${gIdx}`, label: '', isDivider: true });
      }
      flattened.push(...group);
    });
    return flattened;
  }, [allGroups]);

  // Helper to retrieve items array at level n along activePath
  const getItemsForPath = useCallback(
    (path: string[]): MenuItemDef[] => {
      let currentList = rootItems;
      for (const seg of path) {
        const found = currentList.find((i) => i.id === seg);
        if (!found || !found.submenu) return [];
        currentList = found.submenu;
      }
      return currentList;
    },
    [rootItems]
  );

  // Hover management: 120ms open delay & 200ms close corridor
  const handleItemHover = useCallback((item: MenuItemDef, currentLevel: number) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (item.submenu && item.submenu.length > 0) {
      if (openTimerRef.current) clearTimeout(openTimerRef.current);
      openTimerRef.current = setTimeout(() => {
        setActivePath((prev) => [...prev.slice(0, currentLevel), item.id]);
        setFocusedIndices((prev) => ({ ...prev, [currentLevel + 1]: 0 }));
      }, 120);
    } else {
      if (openTimerRef.current) clearTimeout(openTimerRef.current);
      openTimerRef.current = setTimeout(() => {
        setActivePath((prev) => prev.slice(0, currentLevel));
      }, 120);
    }
  }, []);

  const handlePanelMouseLeave = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setActivePath([]);
    }, 200);
  }, []);

  const handlePanelMouseEnter = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  // Trigger item action or toggle submenu
  const handleTriggerItem = useCallback(
    (item: MenuItemDef, e?: React.MouseEvent) => {
      if (item.disabled) return;
      if (item.submenu && item.submenu.length > 0) {
        // Toggle or open submenu immediately
        setActivePath((prev) => [...prev, item.id]);
      } else if (item.action) {
        item.action(e);
      }
    },
    []
  );

  // Keyboard navigation across levels
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentLevel = activePath.length;
      const currentItems = getItemsForPath(activePath);
      const nonDividerIndices = currentItems
        .map((it, idx) => (it.isDivider || it.disabled ? -1 : idx))
        .filter((i) => i !== -1);

      if (nonDividerIndices.length === 0) return;

      const currentFocused = focusedIndices[currentLevel] ?? 0;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIdx =
          nonDividerIndices.find((i) => i > currentFocused) ?? nonDividerIndices[0] ?? 0;
        setFocusedIndices((prev) => ({ ...prev, [currentLevel]: nextIdx }));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIdx =
          [...nonDividerIndices].reverse().find((i) => i < currentFocused) ??
          nonDividerIndices[nonDividerIndices.length - 1] ??
          0;
        setFocusedIndices((prev) => ({ ...prev, [currentLevel]: prevIdx }));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const target = currentItems[currentFocused];
        if (target && target.submenu && target.submenu.length > 0) {
          setActivePath((prev) => [...prev, target.id]);
          setFocusedIndices((prev) => ({ ...prev, [currentLevel + 1]: 0 }));
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentLevel > 0) {
          setActivePath((prev) => prev.slice(0, -1));
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const target = currentItems[currentFocused];
        if (target) {
          handleTriggerItem(target);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (currentLevel > 0) {
          setActivePath((prev) => prev.slice(0, -1));
        } else {
          onClose();
          terminal.focus();
        }
      } else if (e.key === 'Home') {
        e.preventDefault();
        setFocusedIndices((prev) => ({ ...prev, [currentLevel]: nonDividerIndices[0] ?? 0 }));
      } else if (e.key === 'End') {
        e.preventDefault();
        setFocusedIndices((prev) => ({
          ...prev,
          [currentLevel]: nonDividerIndices[nonDividerIndices.length - 1] ?? 0,
        }));
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Type-to-jump
        const ch = e.key.toLowerCase();
        const match = currentItems.findIndex(
          (it) => !it.isDivider && !it.disabled && it.label.toLowerCase().startsWith(ch)
        );
        if (match !== -1) {
          setFocusedIndices((prev) => ({ ...prev, [currentLevel]: match }));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePath, focusedIndices, getItemsForPath, handleTriggerItem, onClose, terminal]);

  const registerItemRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) {
      itemRefs.current[id] = el;
    } else {
      delete itemRefs.current[id];
    }
  }, []);

  const [, setScrollVersion] = useState(0);
  const handleSubmenuScroll = useCallback(() => {
    setScrollVersion((v) => v + 1);
  }, []);

  // Recursively render active submenu portals
  const renderPortals = useCallback(
    (depth: number): React.ReactNode => {
      if (depth >= activePath.length) return null;
      const parentId = activePath[depth];
      if (!parentId) return null;
      const parentItems = getItemsForPath(activePath.slice(0, depth));
      const parentItem = parentItems.find((i) => i.id === parentId);
      if (!parentItem || !parentItem.submenu) return null;

      const parentEl = itemRefs.current[parentId];
      const parentRect = parentEl ? parentEl.getBoundingClientRect() : null;
      const activeChild = activePath[depth + 1] || null;

      return (
        <SubmenuPortal
          key={`sub-${depth}-${parentId}`}
          level={depth + 1}
          parentId={parentId}
          parentRect={parentRect}
          itemRefs={itemRefs}
          items={parentItem.submenu}
          activeChildId={activeChild}
          onHoverItem={handleItemHover}
          onLeavePanel={handlePanelMouseLeave}
          onEnterPanel={handlePanelMouseEnter}
          focusedIndex={focusedIndices[depth + 1] ?? -1}
          onTriggerItem={handleTriggerItem}
          onRegisterItemRef={registerItemRef}
          onPanelScroll={handleSubmenuScroll}
          renderChildPortal={renderPortals(depth + 1)}
        />
      );
    },
    [
      activePath,
      focusedIndices,
      getItemsForPath,
      handleItemHover,
      handlePanelMouseEnter,
      handlePanelMouseLeave,
      handleSubmenuScroll,
      handleTriggerItem,
      registerItemRef,
    ]
  );

  return (
    <>
      <div className={styles.contextMenuBackdrop} onClick={onClose} />
      <div
        ref={menuRef}
        className={styles.contextMenu}
        data-terminal-menu="true"
        style={{ top: position.top, left: position.left }}
        onMouseEnter={handlePanelMouseEnter}
        onMouseLeave={handlePanelMouseLeave}
        onWheel={(e) => e.stopPropagation()}
        onScroll={handleSubmenuScroll}
        onClick={(e) => e.stopPropagation()}
      >
        {rootItems.map((item, idx) => {
          if (item.isDivider) {
            return <div key={`div-root-${idx}`} className={styles.divider} />;
          }

          const Icon = item.icon;
          const hasSubmenu = Boolean(item.submenu && item.submenu.length > 0);
          const isSubmenuOpen = activePath[0] === item.id;
          const isFocused = (focusedIndices[0] ?? -1) === idx;

          return (
            <div
              key={item.id}
              ref={(el) => {
                registerItemRef(item.id, el);
              }}
              className={`${styles.menuItem} ${item.disabled ? styles.disabled : ''} ${
                isSubmenuOpen ? styles.active : ''
              } ${isFocused ? styles.focused : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                if (item.disabled) return;
                handleTriggerItem(item, e);
              }}
              onMouseEnter={() => handleItemHover(item, 0)}
            >
              <span className={styles.itemIconSlot}>
                {item.checked ? (
                  <Check size={14} style={{ color: 'var(--accent-primary, #89b4fa)' }} />
                ) : Icon ? (
                  <Icon size={14} />
                ) : null}
              </span>

              <span className={styles.itemLabel}>{item.label}</span>

              <span className={styles.itemTrailingSlot}>
                {item.shortcut && <span>{item.shortcut}</span>}
                {hasSubmenu && <ChevronRight size={12} />}
              </span>
            </div>
          );
        })}
      </div>

      {/* Render Portal Cascade for Active Submenus */}
      {renderPortals(0)}
    </>
  );
};
