import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Terminal } from '@xterm/xterm';
import {
  Search,
  X,
  Pin,
  PinOff,
  ChevronDown,
  ChevronRight,
  Play,
  Copy,
  Plus,
  Trash2,
  FileCode,
  List,
  Terminal as TerminalIcon,
  RotateCcw,
  Sliders,
  ArrowUp,
  ArrowDown,
  Shield,
  Eye,
  EyeOff,
  Download,
  Upload,
} from 'lucide-react';
import { useSettingsStore } from '@renderer/store/useSettingsStore';
import { useClipboardHistoryStore } from './clipboardHistoryStore';
import { useShellIntegrationStore } from './shellIntegrationStore';
import { useSnippetsStore } from './useSnippetsStore';
import { useScriptsStore } from '@renderer/features/scripts/useScriptsStore';
import { useProjectRunnerStore } from '@renderer/features/project-runner/useProjectRunnerStore';
import { ProjectCommand, EcosystemType } from '@shared/projectRunnerTypes';
import { Snippet } from '@shared/snippetTypes';
import { SessionDetails, ProcessInfo } from '@shared/types';
import {
  quoteForShell,
  identifyShellType,
  analyzePastedText,
  sanitizeClipboardText,
} from '@shared/terminalUtils';
import styles from './ActionsPanel.module.css';

interface ActionsPanelProps {
  sessionId: string;
  paneId?: string;
  terminal: Terminal;
  isStandalone?: boolean;
  isReadOnly?: boolean;
  isBroadcastOn?: boolean;
  onToggleReadOnly?: () => void;
  onToggleBroadcast?: () => void;
  initialSection?: string;
  onClose: () => void;
  onPromptSnippetVariables: (snippet: Snippet, runImmediately: boolean) => void;
  onPromptDangerousCommand: (command: string, reason: string) => void;
  onPasteWithConfirm: (text: string, asSingleLine?: boolean) => void;
  onOpenScriptRunner?: () => void;
  onOpenSettings?: (section?: string) => void;
  sessionEnded?: boolean;
}

export const ActionsPanel: React.FC<ActionsPanelProps> = ({
  sessionId,
  terminal,
  isReadOnly = false,
  isBroadcastOn = false,
  onToggleReadOnly,
  onToggleBroadcast,
  initialSection,
  onClose,
  onPromptSnippetVariables,
  onPromptDangerousCommand,
  onPasteWithConfirm,
  onOpenScriptRunner,
  sessionEnded = false,
}) => {
  const { settings, updateSettings } = useSettingsStore();
  const { snippets, saveSnippet, deleteSnippet, importSnippets } = useSnippetsStore();
  const { scripts, addToQueue } = useScriptsStore();
  const { history: clipboardHistory, clearHistory: clearClipboardHistory } = useClipboardHistoryStore();
  const shellStore = useShellIntegrationStore();
  const project = useProjectRunnerStore((state) => state.projects[sessionId]);
  const runProjectCommand = useProjectRunnerStore((state) => state.runCommand);
  const openAddPackage = useProjectRunnerStore((state) => state.openAddPackage);

  const [historyScope, setHistoryScope] = useState<'session' | 'all'>('session');

  const sessionData = shellStore.getSessionData(sessionId);
  const commandHistory = historyScope === 'session' ? sessionData.commandHistory : shellStore.getAllHistory();
  const shellIntegrationAvailable = shellStore.hasMarkers(sessionId);

  // Width management with drag resizer (280 to 560px)
  const [panelWidth, setPanelWidth] = useState<number>(() => {
    const saved = localStorage.getItem('terminal-actions-panel-width');
    return saved ? Math.min(560, Math.max(280, parseInt(saved, 10))) : 360;
  });
  const [isResizing, setIsResizing] = useState(false);

  // Pin state
  const [isPinned, setIsPinned] = useState<boolean>(settings.actionsPanelPinned ?? false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Collapsed sections
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    project: false,
    quickActions: false,
    snippets: initialSection === 'snippets' ? false : false,
    scripts: false,
    commandHistory: false,
    sessionInfo: false,
    clipboard: false,
    environment: true,
    processes: true,
  });

  // Session details & processes state
  const [sessionDetails, setSessionDetails] = useState<SessionDetails | null>(null);
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [envFilter, setEnvFilter] = useState('');
  const [revealedEnvKeys, setRevealedEnvKeys] = useState<Set<string>>(new Set());

  // New snippet modal state
  const [showNewSnippetModal, setShowNewSnippetModal] = useState(false);
  const [newSnippetName, setNewSnippetName] = useState('');
  const [newSnippetContent, setNewSnippetContent] = useState('');
  const [newSnippetFolder, setNewSnippetFolder] = useState('General');

  // Set env modal state
  const [showSetEnvModal, setShowSetEnvModal] = useState(false);
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvVal, setNewEnvVal] = useState('');

  // Fetch session details and processes
  useEffect(() => {
    let isMounted = true;
    const fetchInfo = async () => {
      if (window.api?.session?.getDetails) {
        try {
          const details = await window.api.session.getDetails(sessionId);
          if (isMounted) setSessionDetails(details);
        } catch {}
      }
      if (window.api?.session?.getProcesses) {
        try {
          const procs = await window.api.session.getProcesses(sessionId);
          if (isMounted) setProcesses(procs);
        } catch {}
      }
    };
    fetchInfo();
    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  // Focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Handle panel resize drag
  const handleMouseDownResizer = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = panelWidth;

    const handleMouseMove = (moveEv: MouseEvent) => {
      const delta = startX - moveEv.clientX;
      const newWidth = Math.min(560, Math.max(280, startWidth + delta));
      setPanelWidth(newWidth);
      localStorage.setItem('terminal-actions-panel-width', String(newWidth));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const toggleSection = (id: string) => {
    setCollapsedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleActionTriggered = () => {
    if (!isPinned) {
      onClose();
    }
  };

  const sendToTerminal = (text: string) => {
    if (sessionEnded) return;
    if (window.api?.pty) {
      window.api.pty.write(sessionId, text);
    } else {
      terminal.write(text);
    }
    terminal.focus();
    handleActionTriggered();
  };

  // Safe check before executing
  const safeExecuteCommand = (command: string) => {
    if (sessionEnded) return;
    const analysis = analyzePastedText(command);
    if (analysis.isDangerous) {
      onPromptDangerousCommand(command, analysis.dangerousReason || 'Destructive command detected');
      return;
    }
    sendToTerminal(command + '\r');
  };

  // Run Snippet
  const handleRunSnippet = (snippet: Snippet, runImmediately: boolean) => {
    if (sessionEnded) return;
    if (snippet.content.includes('{{') && snippet.content.includes('}}')) {
      onPromptSnippetVariables(snippet, runImmediately);
      handleActionTriggered();
      return;
    }
    if (runImmediately) {
      safeExecuteCommand(snippet.content);
    } else {
      sendToTerminal(snippet.content);
    }
  };

  // Export snippets
  const handleExportSnippets = () => {
    const json = JSON.stringify(snippets, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'terminal-snippets.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import snippets
  const handleImportSnippets = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (Array.isArray(parsed)) {
          await importSnippets(parsed);
        }
      } catch (err) {
        console.error('Failed to parse snippets JSON', err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Set environment variable
  const handleSetEnvironment = () => {
    if (!newEnvKey.trim()) return;
    const shell = identifyShellType(sessionDetails?.shell || sessionDetails?.shellPath || '');
    let cmd = '';
    if (shell === 'powershell') {
      cmd = `$env:${newEnvKey.trim()} = ${quoteForShell('powershell', newEnvVal)}\r`;
    } else if (shell === 'cmd') {
      cmd = `set ${newEnvKey.trim()}=${newEnvVal}\r`;
    } else {
      cmd = `export ${newEnvKey.trim()}=${quoteForShell('bash', newEnvVal)}\r`;
    }
    sendToTerminal(cmd);
    setShowSetEnvModal(false);
    setNewEnvKey('');
    setNewEnvVal('');
  };

  // Copy session info
  const handleCopySessionInfo = () => {
    if (!sessionDetails) return;
    const text = [
      `Session ID: ${sessionDetails.id}`,
      `PID: ${sessionDetails.pid}`,
      `Shell: ${sessionDetails.shell || sessionDetails.shellPath || 'Standard'}`,
      `Profile: ${sessionDetails.profileName || sessionDetails.title || 'Default'}`,
      `CWD: ${sessionDetails.cwd}`,
      `Dimensions: ${sessionDetails.cols}x${sessionDetails.rows}`,
      `Uptime: ${sessionDetails.uptime ? `${Math.floor(sessionDetails.uptime)}s` : 'Active'}`,
      `Encoding: ${sessionDetails.encoding || 'UTF-8'}`,
    ].join('\n');
    navigator.clipboard.writeText(text);
  };

  // Kill Process
  const handleKillProcess = async (pid: number) => {
    if (window.confirm(`Are you sure you want to terminate process ${pid}?`)) {
      if (window.api?.session?.killProcessTree) {
        await window.api.session.killProcessTree(pid);
        // Refresh process list
        if (window.api.session.getProcesses) {
          const procs = await window.api.session.getProcesses(sessionId);
          setProcesses(procs);
        }
      }
    }
  };

  // Filter queries with prefix check
  const rawQuery = searchQuery.trim();
  const isActionsOnly = rawQuery.startsWith('>');
  const isSnippetsOnly = rawQuery.startsWith('@');
  const isScriptsOnly = rawQuery.startsWith('#');
  const isProjectOnly = rawQuery.startsWith('%');
  const cleanQuery = isActionsOnly || isSnippetsOnly || isScriptsOnly || isProjectOnly
    ? rawQuery.slice(1).trim().toLowerCase()
    : rawQuery.toLowerCase();

  // Quick actions definition
  const quickActions = useMemo(() => [
    {
      id: 'clear-screen',
      title: 'Clear Screen',
      subtitle: 'Preserves scrollback buffer',
      shortcut: 'Ctrl+L',
      icon: RotateCcw,
      run: () => {
        terminal.clear();
        terminal.focus();
        handleActionTriggered();
      },
    },
    {
      id: 'clear-scrollback',
      title: 'Clear Scrollback',
      subtitle: 'Purges scrollback memory',
      shortcut: '',
      icon: Trash2,
      run: () => {
        terminal.reset();
        terminal.focus();
        handleActionTriggered();
      },
    },
    {
      id: 'scroll-top',
      title: 'Scroll to Top',
      subtitle: 'Jump to beginning of buffer',
      shortcut: 'Shift+PageUp',
      icon: ArrowUp,
      run: () => {
        terminal.scrollToTop();
        terminal.focus();
        handleActionTriggered();
      },
    },
    {
      id: 'scroll-bottom',
      title: 'Scroll to Bottom',
      subtitle: 'Jump to active cursor line',
      shortcut: 'Shift+PageDown',
      icon: ArrowDown,
      run: () => {
        terminal.scrollToBottom();
        terminal.focus();
        handleActionTriggered();
      },
    },
    {
      id: 'copy-selection',
      title: 'Copy Selection',
      subtitle: 'Copy selected terminal text',
      shortcut: 'Ctrl+Shift+C',
      icon: Copy,
      run: () => {
        if (terminal.hasSelection()) {
          navigator.clipboard.writeText(terminal.getSelection());
        }
        terminal.focus();
        handleActionTriggered();
      },
    },
    {
      id: 'search-browser',
      title: 'Search in Browser',
      subtitle: terminal.hasSelection()
        ? `Search default engine for "${terminal.getSelection().slice(0, 25)}..."`
        : 'Open default web search engine in browser',
      shortcut: '',
      icon: Search,
      run: () => {
        const query = terminal.hasSelection() ? encodeURIComponent(terminal.getSelection().trim()) : '';
        const engine = settings?.defaultSearchEngine || 'google';
        const targetUrl =
          engine === 'duckduckgo'
            ? `https://duckduckgo.com/${query ? '?q=' + query : ''}`
            : engine === 'bing'
            ? `https://www.bing.com/search${query ? '?q=' + query : ''}`
            : `https://www.google.com/search${query ? '?q=' + query : ''}`;
        window.api?.system?.openExternal?.(targetUrl);
        handleActionTriggered();
      },
    },
    {
      id: 'paste-clipboard',
      title: 'Paste',
      subtitle: 'Paste clipboard contents',
      shortcut: 'Ctrl+Shift+V',
      icon: FileCode,
      run: async () => {
        const text = await navigator.clipboard.readText();
        if (text) {
          onPasteWithConfirm(text);
        }
        terminal.focus();
        handleActionTriggered();
      },
    },
    {
      id: 'paste-plain-text',
      title: 'Paste as Plain Text',
      subtitle: 'Strip formatting and special escapes',
      shortcut: '',
      icon: FileCode,
      run: async () => {
        const text = await navigator.clipboard.readText();
        if (text) {
          const sanitized = sanitizeClipboardText(text);
          sendToTerminal(sanitized);
        }
        handleActionTriggered();
      },
    },
    {
      id: 'select-all',
      title: 'Select All',
      subtitle: 'Select entire terminal buffer',
      shortcut: '',
      icon: List,
      run: () => {
        terminal.selectAll();
        terminal.focus();
        handleActionTriggered();
      },
    },
    {
      id: 'interrupt-ctrl-c',
      title: 'Interrupt Process',
      subtitle: 'Send SIGINT (Ctrl+C)',
      shortcut: 'Ctrl+C',
      icon: X,
      run: () => {
        sendToTerminal('\x03');
      },
    },
    {
      id: 'send-eof',
      title: 'Send EOF',
      subtitle: 'Send End of File (Ctrl+D)',
      shortcut: 'Ctrl+D',
      icon: ArrowDown,
      run: () => {
        sendToTerminal('\x04');
      },
    },
    {
      id: 'toggle-readonly',
      title: isReadOnly ? 'Disable Read-Only Mode' : 'Enable Read-Only Mode',
      subtitle: isReadOnly ? 'Allow keyboard typing' : 'Lock terminal against keyboard typing',
      shortcut: '',
      icon: Shield,
      run: () => {
        onToggleReadOnly?.();
        handleActionTriggered();
      },
    },
    {
      id: 'toggle-broadcast',
      title: isBroadcastOn ? 'Turn Off Broadcast Input' : 'Broadcast Input to All Tabs',
      subtitle: 'Mirror typing simultaneously across tabs',
      shortcut: '',
      icon: TerminalIcon,
      run: () => {
        onToggleBroadcast?.();
        handleActionTriggered();
      },
    },
  ], [terminal, isReadOnly, isBroadcastOn]);

  // Filtered lists based on search query
  const filteredQuickActions = useMemo(() => {
    if (isSnippetsOnly || isScriptsOnly) return [];
    if (!cleanQuery) return quickActions;
    return quickActions.filter(
      (a) => a.title.toLowerCase().includes(cleanQuery) || a.subtitle.toLowerCase().includes(cleanQuery)
    );
  }, [quickActions, cleanQuery, isSnippetsOnly, isScriptsOnly]);

  const filteredSnippets = useMemo(() => {
    if (isActionsOnly || isScriptsOnly) return [];
    if (!cleanQuery) return snippets;
    return snippets.filter(
      (s) =>
        s.name.toLowerCase().includes(cleanQuery) ||
        s.content.toLowerCase().includes(cleanQuery) ||
        (s.tags && s.tags.some((t) => t.toLowerCase().includes(cleanQuery)))
    );
  }, [snippets, cleanQuery, isActionsOnly, isScriptsOnly]);

  const filteredScripts = useMemo(() => {
    if (isActionsOnly || isSnippetsOnly) return [];
    if (!cleanQuery) return scripts;
    return scripts.filter((s) => {
      const cmd = s.content || s.filePath || '';
      return s.name.toLowerCase().includes(cleanQuery) || cmd.toLowerCase().includes(cleanQuery);
    });
  }, [scripts, cleanQuery, isActionsOnly, isSnippetsOnly]);

  const filteredHistory = useMemo(() => {
    if (isActionsOnly || isSnippetsOnly || isScriptsOnly || isProjectOnly) return [];
    const list = commandHistory;
    if (!cleanQuery) return list;
    return list.filter((c) => c.command.toLowerCase().includes(cleanQuery));
  }, [commandHistory, cleanQuery, isActionsOnly, isSnippetsOnly, isScriptsOnly, isProjectOnly]);

  const projectCommands = useMemo(() => {
    if (!project) return [];
    const list: (ProjectCommand & { ecoType: EcosystemType })[] = [];
    for (const eco of project.ecosystems) {
      for (const grp of eco.groups) {
        for (const cmd of grp.commands) {
          list.push({ ...cmd, ecoType: eco.type });
        }
        if (grp.subgroups) {
          for (const sub of grp.subgroups) {
            for (const cmd of sub.commands) {
              list.push({ ...cmd, ecoType: eco.type });
            }
          }
        }
      }
    }
    return list;
  }, [project]);

  const filteredProjectCommands = useMemo(() => {
    if (isActionsOnly || isSnippetsOnly || isScriptsOnly) return [];
    if (!cleanQuery) return projectCommands;
    return projectCommands.filter(
      (c) =>
        c.label.toLowerCase().includes(cleanQuery) ||
        c.commandText.toLowerCase().includes(cleanQuery)
    );
  }, [projectCommands, cleanQuery, isActionsOnly, isSnippetsOnly, isScriptsOnly]);

  const filteredEnv = useMemo(() => {
    if (!sessionDetails?.env) return [];
    const entries = Object.entries(sessionDetails.env);
    const filter = envFilter.trim().toLowerCase();
    if (!filter) return entries;
    return entries.filter(([k, v]) => k.toLowerCase().includes(filter) || v.toLowerCase().includes(filter));
  }, [sessionDetails, envFilter]);

  // Handle keyboard navigation inside panel
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (searchQuery) {
        setSearchQuery('');
      } else if (!isPinned) {
        onClose();
      }
    }
  };

  const isSecretKey = (key: string) => {
    const k = key.toUpperCase();
    return (
      k.includes('TOKEN') ||
      k.includes('SECRET') ||
      k.includes('KEY') ||
      k.includes('PASSWORD') ||
      k.includes('AUTH') ||
      k.includes('PRIVATE') ||
      k.includes('CREDENTIAL')
    );
  };

  const toggleRevealKey = (key: string) => {
    setRevealedEnvKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div
      className={styles.drawer}
      style={{ width: `${panelWidth}px` }}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* Resizer handle on left border */}
      <div
        className={`${styles.resizer} ${isResizing ? styles.resizerActive : ''}`}
        onMouseDown={handleMouseDownResizer}
        title="Drag to resize panel"
      />

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Sliders size={16} color="var(--accent-primary, #89b4fa)" />
          <span className={styles.headerTitle}>Actions Panel</span>
          {sessionEnded && <span className={styles.sessionEndedBadge}>Session ended</span>}
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={`${styles.headerBtn} ${isPinned ? styles.headerBtnActive : ''}`}
            onClick={() => {
              const next = !isPinned;
              setIsPinned(next);
              updateSettings({ actionsPanelPinned: next });
            }}
            title={isPinned ? 'Unpin panel (closes on action or Esc)' : 'Pin panel (stays open beside terminal)'}
          >
            {isPinned ? <Pin size={14} /> : <PinOff size={14} />}
          </button>

          <button
            type="button"
            className={styles.headerBtn}
            onClick={onClose}
            title="Close Actions Panel (Esc)"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Search Bar with filter prefixes */}
      <div className={styles.searchContainer}>
        <div className={styles.searchInputWrapper}>
          <Search size={14} className={styles.searchIcon} />
          <input
            ref={searchInputRef}
            type="text"
            className={styles.searchInput}
            placeholder="Search actions, snippets (@), scripts (#)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className={styles.clearSearchBtn}
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Quick Prefix Hints */}
      <div className={styles.searchHints}>
        <span>Filters:</span>
        <span className={styles.searchHintTag} onClick={() => setSearchQuery('> ')}>
          &gt; Actions
        </span>
        <span className={styles.searchHintTag} onClick={() => setSearchQuery('@ ')}>
          @ Snippets
        </span>
        <span className={styles.searchHintTag} onClick={() => setSearchQuery('# ')}>
          # Scripts
        </span>
        {project && (
          <span className={styles.searchHintTag} onClick={() => setSearchQuery('% ')}>
            % Project
          </span>
        )}
      </div>

      {/* Scrollable Container */}
      <div className={styles.contentScroll}>
        {/* Project Runner Section (if detected for this session's folder) */}
        {project && (!isActionsOnly && !isSnippetsOnly && !isScriptsOnly) && (
          <div className={styles.section}>
            <button
              type="button"
              className={styles.sectionHeader}
              onClick={() => toggleSection('project')}
            >
              <div className={styles.sectionHeaderLeft}>
                {collapsedSections.project ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                <span>Project ({project.name})</span>
              </div>
              <div className={styles.sectionHeaderRight}>
                {project.ecosystems[0] && (
                  <span className={styles.sectionBadge}>{project.ecosystems[0].tool}</span>
                )}
                <span className={styles.sectionCount}>{filteredProjectCommands.length}</span>
              </div>
            </button>

            {!collapsedSections.project && (
              <div className={styles.sectionBody}>
                {filteredProjectCommands.length === 0 ? (
                  <div className={styles.emptyState}>No project commands matching search.</div>
                ) : (
                  filteredProjectCommands.map((cmd) => (
                    <div
                      key={cmd.id}
                      className={`${styles.listRow} ${cmd.disabled || sessionEnded ? styles.listRowDisabled : ''}`}
                    >
                      <div className={styles.listRowLeft}>
                        <Play size={14} className={styles.rowIcon} />
                        <div className={styles.rowTextGroup}>
                          <span className={styles.rowTitle}>{cmd.label}</span>
                          <span className={styles.rowSubtitle}>{cmd.commandText}</span>
                        </div>
                      </div>
                      <div className={styles.listRowRight}>
                        {cmd.disabledReason ? (
                          <span className={styles.disabledReason} title={cmd.disabledReason}>
                            {cmd.disabledReason}
                          </span>
                        ) : cmd.category === 'package' && (cmd.id.includes('add-package') || cmd.id.includes('add-dev-package')) ? (
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => {
                              const isDev = cmd.id.includes('dev');
                              openAddPackage(sessionId, project.rootPath, cmd.ecoType, isDev);
                              handleActionTriggered();
                            }}
                            title="Add package"
                          >
                            <span>Add...</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => {
                              runProjectCommand(sessionId, cmd, 'terminal', project.cwd);
                              handleActionTriggered();
                            }}
                            title={`Run: ${cmd.commandText}`}
                          >
                            <Play size={10} />
                            <span>Run</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* 1. Quick Actions */}
        {(!isSnippetsOnly && !isScriptsOnly && !isProjectOnly) && (
          <div className={styles.section}>
            <button
              type="button"
              className={styles.sectionHeader}
              onClick={() => toggleSection('quickActions')}
            >
              <div className={styles.sectionHeaderLeft}>
                {collapsedSections.quickActions ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                <span>Quick Actions</span>
              </div>
              <span className={styles.sectionCount}>{filteredQuickActions.length}</span>
            </button>

            {!collapsedSections.quickActions && (
              <div className={styles.sectionBody}>
                {filteredQuickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <div
                      key={action.id}
                      className={`${styles.listRow} ${sessionEnded ? styles.listRowDisabled : ''}`}
                      onClick={action.run}
                    >
                      <div className={styles.listRowLeft}>
                        <Icon size={14} className={styles.rowIcon} />
                        <div className={styles.rowTextGroup}>
                          <span className={styles.rowTitle}>{action.title}</span>
                          <span className={styles.rowSubtitle}>{action.subtitle}</span>
                        </div>
                      </div>
                      <div className={styles.listRowRight}>
                        {action.shortcut && <span className={styles.rowShortcut}>{action.shortcut}</span>}
                        <div className={styles.rowActions}>
                          <span className={styles.actionBtn}>Run</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 2. Snippets */}
        {(!isActionsOnly && !isScriptsOnly && !isProjectOnly) && (
          <div className={styles.section}>
            <button
              type="button"
              className={styles.sectionHeader}
              onClick={() => toggleSection('snippets')}
            >
              <div className={styles.sectionHeaderLeft}>
                {collapsedSections.snippets ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                <span>Snippets</span>
              </div>
              <div className={styles.sectionHeaderRight}>
                <span className={styles.sectionCount}>{filteredSnippets.length}</span>
              </div>
            </button>

            {!collapsedSections.snippets && (
              <div className={styles.sectionBody}>
                <div className={styles.sectionToolbar}>
                  <button
                    type="button"
                    className={styles.toolbarBtn}
                    onClick={() => setShowNewSnippetModal(true)}
                  >
                    <Plus size={12} />
                    <span>New</span>
                  </button>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <label className={styles.toolbarBtn} style={{ cursor: 'pointer', margin: 0 }}>
                      <Upload size={12} />
                      <span>Import</span>
                      <input
                        type="file"
                        accept=".json"
                        style={{ display: 'none' }}
                        onChange={handleImportSnippets}
                      />
                    </label>
                    <button
                      type="button"
                      className={styles.toolbarBtn}
                      onClick={handleExportSnippets}
                    >
                      <Download size={12} />
                      <span>Export</span>
                    </button>
                  </div>
                </div>

                {filteredSnippets.length === 0 ? (
                  <div className={styles.emptyState}>No snippets found.</div>
                ) : (
                  filteredSnippets.map((snippet) => (
                    <div
                      key={snippet.id}
                      className={`${styles.listRow} ${sessionEnded ? styles.listRowDisabled : ''}`}
                    >
                      <div className={styles.listRowLeft}>
                        <FileCode size={14} className={styles.rowIcon} />
                        <div className={styles.rowTextGroup}>
                          <span className={styles.rowTitle}>{snippet.name}</span>
                          <span className={styles.rowSubtitle}>{snippet.content}</span>
                        </div>
                      </div>
                      <div className={styles.listRowRight}>
                        <div className={styles.rowActions}>
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => handleRunSnippet(snippet, false)}
                            title="Insert snippet text into terminal prompt"
                          >
                            Insert
                          </button>
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => handleRunSnippet(snippet, true)}
                            title="Insert and run command immediately"
                          >
                            <Play size={10} />
                            <span>Run</span>
                          </button>
                          <button
                            type="button"
                            className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                            onClick={() => deleteSnippet(snippet.id)}
                            title="Delete snippet"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* 3. Scripts and Sequences */}
        {(!isActionsOnly && !isSnippetsOnly && !isProjectOnly) && (
          <div className={styles.section}>
            <button
              type="button"
              className={styles.sectionHeader}
              onClick={() => toggleSection('scripts')}
            >
              <div className={styles.sectionHeaderLeft}>
                {collapsedSections.scripts ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                <span>Scripts & Sequences</span>
              </div>
              <span className={styles.sectionCount}>{filteredScripts.length}</span>
            </button>

            {!collapsedSections.scripts && (
              <div className={styles.sectionBody}>
                {filteredScripts.length === 0 ? (
                  <div className={styles.emptyState}>No scripts found in Script Runner.</div>
                ) : (
                  filteredScripts.map((script) => {
                    const cmd = script.content || script.filePath || '';
                    return (
                      <div
                        key={script.id}
                        className={`${styles.listRow} ${sessionEnded ? styles.listRowDisabled : ''}`}
                      >
                        <div className={styles.listRowLeft}>
                          <Play size={14} className={styles.rowIcon} />
                          <div className={styles.rowTextGroup}>
                            <span className={styles.rowTitle}>{script.name}</span>
                            <span className={styles.rowSubtitle}>{cmd}</span>
                          </div>
                        </div>
                        <div className={styles.listRowRight}>
                          <div className={styles.rowActions}>
                            <button
                              type="button"
                              className={styles.actionBtn}
                              onClick={() => safeExecuteCommand(cmd)}
                              title="Run command in this terminal session"
                            >
                              Run here
                            </button>
                            <button
                              type="button"
                              className={styles.actionBtn}
                              onClick={async () => {
                                await addToQueue(script.id);
                                alert(`Added "${script.name}" to Script Runner queue.`);
                              }}
                              title="Queue script execution in Script Runner"
                            >
                              Queue
                            </button>
                            {onOpenScriptRunner && (
                              <button
                                type="button"
                                className={styles.actionBtn}
                                onClick={onOpenScriptRunner}
                                title="Open in Script Runner view"
                              >
                                View
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* 4. Command History */}
        {!isActionsOnly && !isSnippetsOnly && !isScriptsOnly && (
          <div className={styles.section}>
            <button
              type="button"
              className={styles.sectionHeader}
              onClick={() => toggleSection('commandHistory')}
            >
              <div className={styles.sectionHeaderLeft}>
                {collapsedSections.commandHistory ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                <span>Command History</span>
              </div>
              <span className={styles.sectionCount}>{filteredHistory.length}</span>
            </button>

            {!collapsedSections.commandHistory && (
              <div className={styles.sectionBody}>
                <div className={styles.sectionToolbar}>
                  <div className={styles.scopeSelector}>
                    <button
                      type="button"
                      className={`${styles.scopeBtn} ${historyScope === 'session' ? styles.scopeBtnActive : ''}`}
                      onClick={() => setHistoryScope('session')}
                    >
                      This Session
                    </button>
                    <button
                      type="button"
                      className={`${styles.scopeBtn} ${historyScope === 'all' ? styles.scopeBtnActive : ''}`}
                      onClick={() => setHistoryScope('all')}
                    >
                      All Sessions
                    </button>
                  </div>
                </div>

                {!shellIntegrationAvailable && filteredHistory.length === 0 ? (
                  <div className={styles.emptyState}>
                    Shell integration markers (OSC 133) are required to capture command history.
                    Enable Shell Integration in Settings &gt; General &gt; Terminal and verify your shell profile.
                  </div>
                ) : filteredHistory.length === 0 ? (
                  <div className={styles.emptyState}>No command history recorded for this session.</div>
                ) : (
                  filteredHistory.map((cmdRecord, i) => (
                    <div
                      key={`${cmdRecord.timestamp}-${i}`}
                      className={`${styles.listRow} ${sessionEnded ? styles.listRowDisabled : ''}`}
                    >
                      <div className={styles.listRowLeft}>
                        <TerminalIcon size={14} className={styles.rowIcon} />
                        <div className={styles.rowTextGroup}>
                          <span className={styles.rowTitle}>{cmdRecord.command}</span>
                          <span className={styles.rowSubtitle}>
                            {new Date(cmdRecord.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      <div className={styles.listRowRight}>
                        <div className={styles.rowActions}>
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => sendToTerminal(cmdRecord.command)}
                            title="Insert command into prompt"
                          >
                            Insert
                          </button>
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => safeExecuteCommand(cmdRecord.command)}
                            title="Re-run command"
                          >
                            Re-run
                          </button>
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => navigator.clipboard.writeText(cmdRecord.command)}
                            title="Copy command"
                          >
                            <Copy size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* 5. Session Info */}
        {!isActionsOnly && !isSnippetsOnly && !isScriptsOnly && (
          <div className={styles.section}>
            <button
              type="button"
              className={styles.sectionHeader}
              onClick={() => toggleSection('sessionInfo')}
            >
              <div className={styles.sectionHeaderLeft}>
                {collapsedSections.sessionInfo ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                <span>Session Info</span>
              </div>
            </button>

            {!collapsedSections.sessionInfo && (
              <div className={styles.sectionBody}>
                {sessionDetails ? (
                  <>
                    <div className={styles.infoGrid}>
                      <span className={styles.infoKey}>Session ID</span>
                      <span className={styles.infoVal}>{sessionDetails.id}</span>

                      <span className={styles.infoKey}>PID</span>
                      <span className={styles.infoVal}>{sessionDetails.pid}</span>

                      <span className={styles.infoKey}>Shell</span>
                      <span className={styles.infoVal}>{sessionDetails.shell || sessionDetails.shellPath || 'Standard'}</span>

                      <span className={styles.infoKey}>Profile</span>
                      <span className={styles.infoVal}>{sessionDetails.title || sessionDetails.profileName || 'Default'}</span>

                      <span className={styles.infoKey}>Directory</span>
                      <span className={styles.infoVal}>{sessionDetails.cwd}</span>

                      <span className={styles.infoKey}>Dimensions</span>
                      <span className={styles.infoVal}>
                        {sessionDetails.cols} cols × {sessionDetails.rows} rows
                      </span>

                      <span className={styles.infoKey}>Uptime</span>
                      <span className={styles.infoVal}>{sessionDetails.uptime ? `${Math.floor(sessionDetails.uptime)}s` : 'Active'}</span>

                      <span className={styles.infoKey}>Encoding</span>
                      <span className={styles.infoVal}>{sessionDetails.encoding || 'UTF-8'}</span>
                    </div>

                    <div className={styles.sectionToolbar}>
                      <button
                        type="button"
                        className={styles.toolbarBtn}
                        onClick={handleCopySessionInfo}
                      >
                        <Copy size={12} />
                        <span>Copy Info</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className={styles.emptyState}>Session details not available.</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 6. Clipboard History */}
        {!isActionsOnly && !isSnippetsOnly && !isScriptsOnly && (
          <div className={styles.section}>
            <button
              type="button"
              className={styles.sectionHeader}
              onClick={() => toggleSection('clipboard')}
            >
              <div className={styles.sectionHeaderLeft}>
                {collapsedSections.clipboard ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                <span>Clipboard History</span>
              </div>
              <span className={styles.sectionCount}>{clipboardHistory.length}</span>
            </button>

            {!collapsedSections.clipboard && (
              <div className={styles.sectionBody}>
                <div className={styles.sectionToolbar}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    In-memory only (cleared on quit)
                  </span>
                  {clipboardHistory.length > 0 && (
                    <button
                      type="button"
                      className={styles.toolbarBtn}
                      onClick={clearClipboardHistory}
                    >
                      <Trash2 size={11} />
                      <span>Clear</span>
                    </button>
                  )}
                </div>

                {clipboardHistory.length === 0 ? (
                  <div className={styles.emptyState}>No items copied from terminal yet.</div>
                ) : (
                  clipboardHistory.map((item, i) => (
                    <div
                      key={i}
                      className={`${styles.listRow} ${sessionEnded ? styles.listRowDisabled : ''}`}
                    >
                      <div className={styles.listRowLeft}>
                        <Copy size={14} className={styles.rowIcon} />
                        <div className={styles.rowTextGroup}>
                          <span className={styles.rowTitle}>{item.replace(/\s+/g, ' ')}</span>
                          <span className={styles.rowSubtitle}>{item.length} characters</span>
                        </div>
                      </div>
                      <div className={styles.listRowRight}>
                        <div className={styles.rowActions}>
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => onPasteWithConfirm(item)}
                            title="Paste into terminal"
                          >
                            Paste
                          </button>
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => navigator.clipboard.writeText(item)}
                            title="Copy to clipboard"
                          >
                            <Copy size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* 7. Environment Variables */}
        {!isActionsOnly && !isSnippetsOnly && !isScriptsOnly && (
          <div className={styles.section}>
            <button
              type="button"
              className={styles.sectionHeader}
              onClick={() => toggleSection('environment')}
            >
              <div className={styles.sectionHeaderLeft}>
                {collapsedSections.environment ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                <span>Environment</span>
              </div>
              <span className={styles.sectionCount}>{filteredEnv.length}</span>
            </button>

            {!collapsedSections.environment && (
              <div className={styles.sectionBody}>
                <div className={styles.sectionToolbar}>
                  <input
                    type="text"
                    className={styles.toolbarInput}
                    placeholder="Filter variables..."
                    value={envFilter}
                    onChange={(e) => setEnvFilter(e.target.value)}
                  />
                  <button
                    type="button"
                    className={styles.toolbarBtn}
                    onClick={() => setShowSetEnvModal(true)}
                  >
                    <Plus size={12} />
                    <span>Set Var</span>
                  </button>
                </div>

                {filteredEnv.length === 0 ? (
                  <div className={styles.emptyState}>No environment variables loaded.</div>
                ) : (
                  filteredEnv.slice(0, 100).map(([k, v]) => {
                    const isSecret = isSecretKey(k);
                    const isRevealed = revealedEnvKeys.has(k);
                    const displayVal = isSecret && !isRevealed ? '••••••••••••' : v;
                    return (
                      <div key={k} className={styles.envRow}>
                        <span className={styles.envKey} title={k}>
                          {k}
                        </span>
                        <span
                          className={styles.envVal}
                          title={isSecret && !isRevealed ? 'Click to reveal' : v}
                          onClick={() => {
                            if (isSecret) toggleRevealKey(k);
                          }}
                        >
                          {displayVal}
                        </span>
                        <div className={styles.envActions}>
                          {isSecret && (
                            <button
                              type="button"
                              className={styles.actionBtn}
                              onClick={() => toggleRevealKey(k)}
                              title={isRevealed ? 'Hide secret' : 'Reveal secret'}
                            >
                              {isRevealed ? <EyeOff size={11} /> : <Eye size={11} />}
                            </button>
                          )}
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => navigator.clipboard.writeText(v)}
                            title="Copy value"
                          >
                            <Copy size={11} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* 8. Processes */}
        {!isActionsOnly && !isSnippetsOnly && !isScriptsOnly && (
          <div className={styles.section}>
            <button
              type="button"
              className={styles.sectionHeader}
              onClick={() => toggleSection('processes')}
            >
              <div className={styles.sectionHeaderLeft}>
                {collapsedSections.processes ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                <span>Processes</span>
              </div>
              <span className={styles.sectionCount}>{processes.length}</span>
            </button>

            {!collapsedSections.processes && (
              <div className={styles.sectionBody}>
                {processes.length === 0 ? (
                  <div className={styles.emptyState}>No active subprocesses reported for this session.</div>
                ) : (
                  processes.map((proc) => (
                    <div key={proc.pid} className={styles.listRow}>
                      <div className={styles.listRowLeft}>
                        <TerminalIcon size={14} className={styles.rowIcon} />
                        <div className={styles.rowTextGroup}>
                          <span className={styles.rowTitle}>
                            {proc.name} (PID: {proc.pid})
                          </span>
                          <span className={styles.rowSubtitle}>
                            {proc.memory ? `${Math.round(proc.memory / 1024 / 1024)} MB` : ''}
                          </span>
                        </div>
                      </div>
                      <div className={styles.listRowRight}>
                        <div className={styles.rowActions}>
                          <button
                            type="button"
                            className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                            onClick={() => handleKillProcess(proc.pid)}
                            title="Kill process tree"
                          >
                            Kill
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Snippet Modal */}
      {showNewSnippetModal && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 150,
            padding: '16px',
          }}
        >
          <div
            style={{
              width: '100%',
              backgroundColor: 'var(--bg-surface, #181825)',
              border: '1px solid var(--border-subtle, #313244)',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>Create New Snippet</span>
              <button
                type="button"
                className={styles.headerBtn}
                onClick={() => setShowNewSnippetModal(false)}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Name</label>
              <input
                type="text"
                className={styles.toolbarInput}
                placeholder="e.g., Git Status"
                value={newSnippetName}
                onChange={(e) => setNewSnippetName(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Folder</label>
              <input
                type="text"
                className={styles.toolbarInput}
                placeholder="e.g., Git or Docker"
                value={newSnippetFolder}
                onChange={(e) => setNewSnippetFolder(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Command Content</label>
              <textarea
                style={{
                  width: '100%',
                  height: '70px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-subtle, #313244)',
                  backgroundColor: 'var(--bg-base, #11111b)',
                  color: 'var(--text-primary, #cdd6f4)',
                  fontSize: '12px',
                  padding: '8px',
                  fontFamily: 'monospace',
                  outline: 'none',
                }}
                placeholder="e.g., git commit -m &quot;{{message}}&quot;"
                value={newSnippetContent}
                onChange={(e) => setNewSnippetContent(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                className={styles.toolbarBtn}
                onClick={() => setShowNewSnippetModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.toolbarBtn}
                style={{
                  backgroundColor: 'var(--accent-primary, #89b4fa)',
                  color: '#11111b',
                  fontWeight: 600,
                }}
                onClick={async () => {
                  if (!newSnippetName.trim() || !newSnippetContent.trim()) return;
                  await saveSnippet({
                    id: `snip-${Date.now()}`,
                    name: newSnippetName.trim(),
                    content: newSnippetContent.trim(),
                    folder: newSnippetFolder.trim() || 'General',
                    updatedAt: Date.now(),
                  });
                  setShowNewSnippetModal(false);
                  setNewSnippetName('');
                  setNewSnippetContent('');
                  setNewSnippetFolder('General');
                }}
              >
                Save Snippet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set Env Modal */}
      {showSetEnvModal && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 150,
            padding: '16px',
          }}
        >
          <div
            style={{
              width: '100%',
              backgroundColor: 'var(--bg-surface, #181825)',
              border: '1px solid var(--border-subtle, #313244)',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>Set Environment Variable</span>
              <button
                type="button"
                className={styles.headerBtn}
                onClick={() => setShowSetEnvModal(false)}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Variable Name</label>
              <input
                type="text"
                className={styles.toolbarInput}
                placeholder="e.g., NODE_ENV"
                value={newEnvKey}
                onChange={(e) => setNewEnvKey(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Variable Value</label>
              <input
                type="text"
                className={styles.toolbarInput}
                placeholder="e.g., development"
                value={newEnvVal}
                onChange={(e) => setNewEnvVal(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                className={styles.toolbarBtn}
                onClick={() => setShowSetEnvModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.toolbarBtn}
                style={{
                  backgroundColor: 'var(--accent-primary, #89b4fa)',
                  color: '#11111b',
                  fontWeight: 600,
                }}
                onClick={handleSetEnvironment}
              >
                Set Variable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
