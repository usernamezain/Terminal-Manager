import React, { useState, useRef, useEffect, useMemo, useCallback, Component, ErrorInfo, ReactNode } from 'react';
import { useLogStore } from '../../store/useLogStore';
import {
  Search,
  Trash2,
  Copy,
  ArrowDownCircle,
  WrapText,
  FileText,
  PanelBottom,
  PanelRight,
  X,
  ChevronRight,
  ChevronDown,
  Check,
  AlertCircle,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';
import styles from './LogDetectorPanel.module.css';
import { safeStringify } from '../../utils/safeSerialize';

// Error Boundary to ensure log renderer never crashes main application
interface ErrorBoundaryProps {
  children: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}
class LogPanelErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // Intentionally suppressed from standard console to avoid infinite intercept loops
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.emptyState} style={{ padding: 32, gap: 12 }}>
          <AlertCircle size={32} color="#ef4444" />
          <span style={{ fontWeight: 600, color: '#f87171' }}>Log Detector encountered a rendering issue.</span>
          <button
            type="button"
            className={styles.toolButton}
            onClick={() => {
              useLogStore.getState().clearLogs();
              this.setState({ hasError: false });
            }}
          >
            <RefreshCw size={12} />
            <span>Reset Log Buffer</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const LogDetectorPanelInner: React.FC = () => {
  const {
    logs,
    isOpen,
    dockPosition,
    splitRatio,
    searchQuery,
    selectedLevel,
    selectedSource,
    followTail,
    wrapLines,
    expandedDetailsId,
    setOpen,
    setDockPosition,
    setSplitRatio,
    setSearchQuery,
    setSelectedLevel,
    setSelectedSource,
    setFollowTail,
    setWrapLines,
    toggleDetails,
    clearLogs,
  } = useLogStore();

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [copied, setCopied] = useState(false);
  const isDraggingRef = useRef(false);
  const isAutoScrollingRef = useRef(false);

  // Maximum items rendered into DOM simultaneously to prevent thread freeze
  const MAX_VISIBLE_ROWS = 500;

  // Filter logs with safe string checks
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (!log) return false;
      const lvl = log.level || 'info';
      const src = log.source || 'renderer';

      if (selectedLevel !== 'all' && lvl !== selectedLevel) return false;
      if (selectedSource !== 'all' && src !== selectedSource) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const msg = (typeof log.message === 'string' ? log.message : String(log.message || '')).toLowerCase();
        const cat = (log.category || '').toLowerCase();
        const s = src.toLowerCase();
        let detailsStr = '';
        if (log.details !== undefined && log.details !== null) {
          try {
            detailsStr = safeStringify(log.details).toLowerCase();
          } catch (_) {}
        }
        if (!msg.includes(q) && !cat.includes(q) && !s.includes(q) && !detailsStr.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [logs, selectedLevel, selectedSource, searchQuery]);

  // Cap DOM rows to the most recent items
  const visibleLogs = useMemo(() => {
    if (filteredLogs.length <= MAX_VISIBLE_ROWS) {
      return filteredLogs;
    }
    return filteredLogs.slice(filteredLogs.length - MAX_VISIBLE_ROWS);
  }, [filteredLogs]);

  // Statistics
  const errorCount = useMemo(() => logs.filter((l) => l?.level === 'error').length, [logs]);
  const warnCount = useMemo(() => logs.filter((l) => l?.level === 'warn').length, [logs]);

  // Auto-scroll to bottom on new logs if followTail is true
  useEffect(() => {
    if (followTail && viewportRef.current) {
      isAutoScrollingRef.current = true;
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
      // Clear auto-scrolling flag on next animation frame
      requestAnimationFrame(() => {
        isAutoScrollingRef.current = false;
      });
    }
  }, [visibleLogs.length, followTail]);

  // Handle user scroll in viewport to detect if they manually scrolled up
  const handleScroll = () => {
    if (!viewportRef.current || isAutoScrollingRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = viewportRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
    if (!isAtBottom && followTail) {
      setFollowTail(false);
    }
  };

  // Drag resizer
  const handleResizerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      if (dockPosition === 'bottom') {
        const windowHeight = window.innerHeight;
        const newRatio = (windowHeight - moveEvent.clientY) / windowHeight;
        setSplitRatio(newRatio);
      } else {
        const windowWidth = window.innerWidth;
        const newRatio = (windowWidth - moveEvent.clientX) / windowWidth;
        setSplitRatio(newRatio);
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Copy all visible logs to clipboard
  const handleCopyLogs = useCallback(() => {
    try {
      const text = filteredLogs
        .map((l) => {
          const time = new Date(l.timestamp || Date.now()).toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3,
          });
          const lvl = (l.level || 'info').toUpperCase();
          const src = (l.source || 'renderer').toUpperCase();
          const details = l.details !== undefined && l.details !== null ? ' ' + safeStringify(l.details) : '';
          return `[${time}] [${lvl}] [${src}]${l.category ? ` [${l.category}]` : ''} ${l.message}${details}`;
        })
        .join('\n');

      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } catch (_) {}
  }, [filteredLogs]);

  // Close cleanly on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setOpen]);

  // If opened and no logs yet, fetch tail asynchronously
  useEffect(() => {
    if (isOpen && logs.length === 0 && window.api?.app?.getLogTail) {
      window.api.app
        .getLogTail(256 * 1024, 1000)
        .then((tail) => {
          if (Array.isArray(tail) && tail.length > 0) {
            useLogStore.getState().setLogs(tail);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, logs.length]);

  // Clear logs in store & in backend with confirmation
  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all buffered logs?')) {
      clearLogs();
      if (window.api?.app?.clearRecentLogs) {
        window.api.app.clearRecentLogs().catch(() => {});
      }
    }
  };

  // Open physical log file
  const handleOpenLogFile = () => {
    if (window.api?.app?.openLogFile) {
      window.api.app.openLogFile().catch(() => {});
    }
  };

  // Open physical log directory
  const handleOpenLogFolder = () => {
    if (window.api?.app?.openLogFolder) {
      window.api.app.openLogFolder().catch(() => {});
    }
  };

  if (!isOpen) return null;

  const dimensionStyle: React.CSSProperties =
    dockPosition === 'bottom'
      ? { height: `${Math.round(splitRatio * 100)}%` }
      : { width: `${Math.round(splitRatio * 100)}%` };

  return (
    <div
      className={`${styles.panelContainer} ${
        dockPosition === 'bottom' ? styles.dockBottom : styles.dockSide
      }`}
      style={dimensionStyle}
    >
      {/* Resizer Handle */}
      <div
        className={`${styles.resizer} ${
          dockPosition === 'bottom' ? styles.resizerHorizontal : styles.resizerVertical
        }`}
        onMouseDown={handleResizerMouseDown}
        title="Drag to resize Log Detector"
      />

      {/* Header Bar */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.liveIndicator}>
            <span className={styles.liveDot} />
            LIVE
          </div>
          <span className={styles.title}>LOG DETECTOR</span>
          <span className={styles.badge} title="Total buffered logs">
            {logs.length}
          </span>
          {errorCount > 0 && (
            <span className={`${styles.badge} ${styles.badgeError}`} title="Errors detected">
              {errorCount} ERR
            </span>
          )}
          {warnCount > 0 && (
            <span className={`${styles.badge} ${styles.badgeWarn}`} title="Warnings detected">
              {warnCount} WRN
            </span>
          )}
          {filteredLogs.length > MAX_VISIBLE_ROWS && (
            <span className={styles.badge} title="Latest 500 rows displayed for 60fps performance">
              Latest {MAX_VISIBLE_ROWS} shown
            </span>
          )}
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          {/* Search box */}
          <div className={styles.searchBox}>
            <Search size={12} color="var(--text-muted, #64748b)" />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Filter logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              spellCheck={false}
              autoComplete="off"
            />
            {searchQuery && (
              <X
                size={11}
                style={{ cursor: 'pointer', color: 'var(--text-muted)' }}
                onClick={() => setSearchQuery('')}
              />
            )}
          </div>

          {/* Level Filter Buttons */}
          <div className={styles.filterGroup}>
            {(['all', 'error', 'warn', 'info', 'debug'] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                className={`${styles.filterBtn} ${
                  selectedLevel === lvl ? styles.filterBtnActive : ''
                }`}
                onClick={() => setSelectedLevel(lvl)}
              >
                {lvl.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Source Filter Buttons */}
          <div className={styles.filterGroup}>
            {(['all', 'main', 'renderer', 'ipc', 'pty'] as const).map((src) => (
              <button
                key={src}
                type="button"
                className={`${styles.filterBtn} ${
                  selectedSource === src ? styles.filterBtnActive : ''
                }`}
                onClick={() => setSelectedSource(src)}
              >
                {src.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Follow toggle */}
          <button
            type="button"
            className={`${styles.toolButton} ${followTail ? styles.toolButtonActive : ''}`}
            onClick={() => setFollowTail(!followTail)}
            title={followTail ? 'Auto-scroll enabled (click to pause)' : 'Click to resume auto-scroll'}
          >
            <ArrowDownCircle size={12} />
            <span>Follow</span>
          </button>

          {/* Wrap toggle */}
          <button
            type="button"
            className={`${styles.toolButton} ${wrapLines ? styles.toolButtonActive : ''}`}
            onClick={() => setWrapLines(!wrapLines)}
            title="Toggle line wrapping"
          >
            <WrapText size={12} />
            <span>Wrap</span>
          </button>

          {/* Copy button */}
          <button
            type="button"
            className={styles.toolButton}
            onClick={handleCopyLogs}
            title="Copy visible logs to clipboard"
          >
            {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Clear button */}
          <button
            type="button"
            className={styles.toolButton}
            onClick={handleClear}
            title="Clear all buffered logs"
          >
            <Trash2 size={12} />
            <span>Clear</span>
          </button>

          {/* Open Log File button */}
          <button
            type="button"
            className={styles.toolButton}
            onClick={handleOpenLogFile}
            title="Open physical log file (terminal-manager.log)"
          >
            <FileText size={12} />
            <span>File</span>
          </button>

          {/* Open Log Folder button */}
          <button
            type="button"
            className={styles.toolButton}
            onClick={handleOpenLogFolder}
            title="Open folder containing log files"
          >
            <FolderOpen size={12} />
            <span>Folder</span>
          </button>

          {/* Dock toggle button */}
          <button
            type="button"
            className={styles.toolButton}
            onClick={() => setDockPosition(dockPosition === 'bottom' ? 'side' : 'bottom')}
            title={`Switch to ${dockPosition === 'bottom' ? 'Side Half' : 'Bottom Half'}`}
          >
            {dockPosition === 'bottom' ? <PanelRight size={12} /> : <PanelBottom size={12} />}
            <span>{dockPosition === 'bottom' ? 'Side' : 'Bottom'}</span>
          </button>

          {/* Close button */}
          <button
            type="button"
            className={styles.closeButton}
            onClick={() => setOpen(false)}
            title="Close Log Detector (Ctrl+Shift+L)"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Viewport */}
      <div className={styles.viewport} ref={viewportRef} onScroll={handleScroll}>
        {visibleLogs.length === 0 ? (
          <div className={styles.emptyState}>
            <AlertCircle size={28} />
            <span>No log entries match the current filter.</span>
          </div>
        ) : (
          visibleLogs.map((log) => {
            const time = new Date(log.timestamp || Date.now()).toLocaleTimeString('en-US', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              fractionalSecondDigits: 3,
            });
            const lvl = log.level || 'info';
            const src = log.source || 'renderer';
            const hasDetails = log.details !== undefined && log.details !== null;
            const isExpanded = expandedDetailsId === log.id;

            return (
              <React.Fragment key={log.id}>
                <div className={`${styles.logRow} ${wrapLines ? styles.logRowWrapped : ''}`}>
                  <span className={styles.timestamp}>{time}</span>
                  <span className={`${styles.levelTag} ${styles[`level_${lvl}`] || ''}`}>
                    {lvl.slice(0, 3)}
                  </span>
                  <span className={styles.sourceTag}>{src.toUpperCase()}</span>
                  {log.category && <span className={styles.categoryTag}>[{log.category}]</span>}
                  <span
                    className={`${styles.message} ${
                      lvl === 'error'
                        ? styles.messageError
                        : lvl === 'warn'
                        ? styles.messageWarn
                        : ''
                    }`}
                  >
                    {typeof log.message === 'string' ? log.message : safeStringify(log.message)}
                  </span>
                  {hasDetails && (
                    <button
                      type="button"
                      className={styles.detailsBtn}
                      onClick={() => toggleDetails(log.id)}
                      title="Inspect payload details"
                    >
                      {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                      <span>JSON</span>
                    </button>
                  )}
                </div>

                {hasDetails && isExpanded && (
                  <div className={styles.payloadBox}>
                    {safeStringify(log.details, 2)}
                  </div>
                )}
              </React.Fragment>
            );
          })
        )}
      </div>
    </div>
  );
};

export const LogDetectorPanel: React.FC = () => {
  return (
    <LogPanelErrorBoundary>
      <LogDetectorPanelInner />
    </LogPanelErrorBoundary>
  );
};
