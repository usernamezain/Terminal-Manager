import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useWorkspaceStore, Pane } from '@renderer/store/useWorkspaceStore';
import { useSettingsStore } from '@renderer/store/useSettingsStore';
import { TerminalInstance } from './TerminalInstance';
import { PaneHeader } from './PaneHeader';
import { ExitBanner } from './ExitBanner';
import { SpawnErrorCard } from './SpawnErrorCard';
import { Toast } from './Toast';
import styles from './TerminalView.module.css';

interface TerminalViewProps {
  pane: Pane;
}

export const TerminalView: React.FC<TerminalViewProps> = ({ pane }) => {
  const settings = useSettingsStore((state) => state.settings);
  const { setPaneTitle, setPaneStatus, setPanePtyId } = useWorkspaceStore();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const terminalInstRef = useRef<TerminalInstance | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const spawnTerminal = useCallback(
    async (overrideShellPath?: string, overrideShellArgs?: string[]) => {
      if (!containerRef.current) return;

      setPaneStatus(pane.id, 'spawning');

      // Clean up existing instance if any
      if (terminalInstRef.current) {
        terminalInstRef.current.dispose();
        terminalInstRef.current = null;
      }

      // Instantiate xterm
      const inst = new TerminalInstance({
        container: containerRef.current,
        settings,
        onFallbackToast: (msg) => setToastMessage(msg),
      });
      terminalInstRef.current = inst;

      try {
        if (window.api?.pty) {
          const { id: ptyId } = await window.api.pty.create({
            cols: inst.terminal.cols || 80,
            rows: inst.terminal.rows || 24,
            cwd: pane.cwd === '~' ? undefined : pane.cwd,
            shellPath: overrideShellPath || settings.defaultShell || undefined,
            shellArgs: overrideShellArgs,
          });

          setPanePtyId(pane.id, ptyId);
          setPaneStatus(pane.id, 'running');
          inst.attachPty(ptyId);
        } else {
          setPaneStatus(pane.id, 'running');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setPaneStatus(pane.id, 'error', undefined, msg);
      }
    },
    [pane.id, pane.cwd, settings, setPanePtyId, setPaneStatus]
  );

  // Initial Spawn
  useEffect(() => {
    spawnTerminal();

    return () => {
      if (terminalInstRef.current) {
        terminalInstRef.current.dispose();
        terminalInstRef.current = null;
      }
    };
  }, []);

  // Listen for PTY exit and Fallback events
  useEffect(() => {
    if (!window.api?.pty) return;

    const unsubExit = window.api.pty.onExit((event) => {
      if (pane.ptyId && event.id === pane.ptyId) {
        setPaneStatus(pane.id, 'exited', event.exitCode);
      }
    });

    const unsubFallback = window.api.pty.onFallback((fallback) => {
      setToastMessage(fallback.message);
    });

    return () => {
      unsubExit();
      unsubFallback();
    };
  }, [pane.id, pane.ptyId, setPaneStatus]);

  // Handle ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      if (terminalInstRef.current) {
        terminalInstRef.current.fit();
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Update Settings
  useEffect(() => {
    if (terminalInstRef.current) {
      terminalInstRef.current.updateSettings(settings);
    }
  }, [settings]);

  const handleRestart = () => {
    if (pane.ptyId && window.api?.pty) {
      window.api.pty.kill(pane.ptyId);
    }
    spawnTerminal();
  };

  const handleClose = () => {
    if (pane.ptyId && window.api?.pty) {
      window.api.pty.kill(pane.ptyId);
    }
    setPaneStatus(pane.id, 'exited', 0);
  };

  return (
    <div className={styles.paneContainer}>
      <PaneHeader
        title={pane.title}
        cwd={pane.cwd}
        status={pane.status}
        onTitleChange={(newTitle) => setPaneTitle(pane.id, newTitle)}
        onRestart={handleRestart}
        onClose={handleClose}
      />

      {pane.status === 'error' ? (
        <SpawnErrorCard
          errorMessage={pane.errorMessage}
          onRetry={spawnTerminal}
          onSelectShell={(selectedShell) =>
            spawnTerminal(selectedShell.path, selectedShell.args)
          }
        />
      ) : (
        <div className={styles.terminalWrapper}>
          <div ref={containerRef} className={styles.terminalContainer} />
        </div>
      )}

      {pane.status === 'exited' && pane.exitCode !== undefined && (
        <ExitBanner
          exitCode={pane.exitCode}
          onRestart={handleRestart}
          onClose={handleClose}
        />
      )}

      {toastMessage && (
        <Toast
          message={toastMessage}
          onDismiss={() => setToastMessage(null)}
        />
      )}
    </div>
  );
};
