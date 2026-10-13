import React, { useEffect, useRef, useState } from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useProjectRunnerStore } from './useProjectRunnerStore';
import { ProjectRunnerMenu } from './ProjectRunnerMenu';
import { AddPackageModal } from './AddPackageModal';
import { TerminalBusyModal } from './TerminalBusyModal';
import { OrderRunModal } from './OrderRunModal';
import { EcosystemType, ProjectCommand } from '../../../shared/projectRunnerTypes';
import styles from './ProjectRunnerBar.module.css';

interface ProjectRunnerBarProps {
  sessionId: string;
  cwd?: string;
  onRefitTerminal?: () => void;
  onRunInNewTab?: (cwd: string, commandText: string) => void;
  onRunInSplit?: (commandText: string) => void;
  onToast?: (message: string) => void;
}

export const ProjectRunnerBar: React.FC<ProjectRunnerBarProps> = ({
  sessionId,
  cwd,
  onRefitTerminal,
  onRunInNewTab,
  onRunInSplit,
  onToast,
}) => {
  const settings = useSettingsStore((state) => state.settings);
  const showPlayButtonSetting = settings.projectRunner?.showPlayButton ?? true;

  const {
    projects,
    runningCommands,
    statusFeedback,
    detect,
    runCommand,
    stopCommand,
    openAddPackage,
  } = useProjectRunnerStore();

  const project = projects[sessionId];
  const runningCmd = runningCommands[sessionId];
  const feedback = statusFeedback[sessionId];

  const buttonRef = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [orderRunCommands, setOrderRunCommands] = useState<ProjectCommand[] | null>(null);

  // Initial detection & cwd change detection
  useEffect(() => {
    if (!cwd) return;
    detect(sessionId, cwd);
  }, [sessionId, cwd, detect]);

  // Listen for file changes on manifests
  useEffect(() => {
    if (!window.api?.projectRunner) return;
    const unsub = window.api.projectRunner.onChanged(({ folder }: { folder: string }) => {
      if (project?.rootPath && folder.toLowerCase() === project.rootPath.toLowerCase()) {
        detect(sessionId, project.rootPath, undefined, true);
      }
    });
    return () => unsub();
  }, [sessionId, project?.rootPath, detect]);

  // Refit terminal after showing or hiding strip
  const wasVisibleRef = useRef(false);
  const isVisible = Boolean(project && showPlayButtonSetting);

  useEffect(() => {
    if (wasVisibleRef.current !== isVisible) {
      wasVisibleRef.current = isVisible;
      setTimeout(() => {
        if (onRefitTerminal) onRefitTerminal();
      }, 50);
    }
  }, [isVisible, onRefitTerminal]);

  // Keyboard shortcut Ctrl+Alt+R to open menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'r') {
        if (project && showPlayButtonSetting) {
          e.preventDefault();
          setIsMenuOpen((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [project, showPlayButtonSetting]);

  if (!project || !showPlayButtonSetting) {
    return null;
  }

  const primary = project.primaryCommand;

  const handleMainActionClick = async () => {
    if (runningCmd) {
      // Long running command is active: clicking stops it
      await stopCommand(sessionId);
      if (onToast) onToast(`Stopped ${runningCmd.label}`);
    } else if (primary) {
      await runCommand(sessionId, primary, 'terminal', project.cwd);
    } else {
      setIsMenuOpen(true);
    }
  };

  const anchorRect = buttonRef.current ? buttonRef.current.getBoundingClientRect() : null;

  return (
    <div className={styles.stripContainer} data-project-runner="true">
      <div className={styles.leftGroup}>
        {/* Split Button */}
        <div ref={buttonRef} className={styles.splitButton}>
          <button
            className={`${styles.mainAction} ${runningCmd ? styles.runningAction : ''}`}
            onClick={handleMainActionClick}
            title={
              runningCmd
                ? `Running: ${runningCmd.label} (Click to Stop Ctrl+C)`
                : primary
                ? `Run: ${primary.commandText} [${primary.label}]`
                : project.name
            }
          >
            {runningCmd ? (
              <>
                <span className={styles.stopIcon}>■</span>
                <span className={styles.pulseDot} />
                <span>{runningCmd.label}</span>
              </>
            ) : (
              <>
                <span className={styles.playIcon}>▶</span>
                <span>{project.name}</span>
                {primary && (
                  <span className={styles.primaryLabel}>({primary.label})</span>
                )}
              </>
            )}
          </button>

          <button
            className={styles.chevronAction}
            onClick={() => setIsMenuOpen((prev) => !prev)}
            title="Open Project Menu (Ctrl+Alt+R)"
          >
            ▲
          </button>
        </div>

        {/* OSC 133 Feedback */}
        {feedback && (
          <div className={styles.statusFeedback}>
            <span
              className={
                feedback.success ? styles.statusDotSuccess : styles.statusDotFail
              }
            />
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Node version note or info */}
        {project.nodeVersionNote && !feedback && (
          <span className={styles.noteText}>{project.nodeVersionNote}</span>
        )}
      </div>

      {/* Drop-up Menu */}
      {isMenuOpen && (
        <ProjectRunnerMenu
          sessionId={sessionId}
          anchorRect={anchorRect}
          onClose={() => setIsMenuOpen(false)}
          onOpenAddPackage={(ecosystem: EcosystemType, isDev?: boolean) => {
            openAddPackage(sessionId, project.rootPath, ecosystem, isDev);
          }}
          onOpenOrderRun={(commands: ProjectCommand[]) => {
            setOrderRunCommands(commands);
          }}
          onRunInNewTab={onRunInNewTab}
          onRunInSplit={onRunInSplit}
        />
      )}

      {/* Add Package Modal */}
      <AddPackageModal onToast={onToast} />

      {/* Terminal Busy Modal */}
      <TerminalBusyModal
        onRunInNewTab={onRunInNewTab}
        onRunInSplit={onRunInSplit}
      />

      {/* Order Run Queue Modal */}
      {orderRunCommands && (
        <OrderRunModal
          commands={orderRunCommands}
          cwd={project.rootPath}
          onClose={() => setOrderRunCommands(null)}
          onToast={onToast}
        />
      )}
    </div>
  );
};
