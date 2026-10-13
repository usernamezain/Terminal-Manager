import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  ProjectInfo,
  ProjectCommand,
  CommandGroup,
  RunTarget,
  EcosystemType,
} from '../../../shared/projectRunnerTypes';
import { useProjectRunnerStore } from './useProjectRunnerStore';
import styles from './ProjectRunnerMenu.module.css';

interface ProjectRunnerMenuProps {
  sessionId: string;
  anchorRect: DOMRect | null;
  onClose: () => void;
  onOpenAddPackage: (ecosystem: EcosystemType, isDev?: boolean) => void;
  onOpenOrderRun: (commands: ProjectCommand[]) => void;
  onRunInNewTab?: (cwd: string, commandText: string) => void;
  onRunInSplit?: (commandText: string) => void;
}

interface HoverSubmenuState {
  id: string;
  title: string;
  commands: ProjectCommand[];
  parentRect: DOMRect | null;
}

export const ProjectRunnerMenu: React.FC<ProjectRunnerMenuProps> = ({
  sessionId,
  anchorRect,
  onClose,
  onOpenAddPackage,
  onOpenOrderRun,
  onRunInNewTab,
  onRunInSplit,
}) => {
  const { projects, storedData, runCommand, togglePin } = useProjectRunnerStore();
  const project: ProjectInfo | null = projects[sessionId] || null;
  const projectStore = project?.rootPath ? storedData[project.rootPath] : null;

  const menuRef = useRef<HTMLDivElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [activeSubmenu, setActiveSubmenu] = useState<HoverSubmenuState | null>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Position calculation for drop-up menu
  const menuPos = useMemo(() => {
    if (!anchorRect) return { top: 0, left: 0, maxHeight: 360 };

    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const menuW = 280;
    const estHeight = 360;

    let left = anchorRect.left;
    if (left + menuW > winW - 8) {
      left = Math.max(8, winW - menuW - 8);
    }

    // Default: Drop-UP anchored above button
    let top = anchorRect.top - estHeight - 4;
    let maxH = Math.max(180, anchorRect.top - 16);

    // If not enough room above button, flip downward
    if (top < 8) {
      top = anchorRect.bottom + 4;
      maxH = Math.max(180, winH - anchorRect.bottom - 16);
    }

    return { top, left, maxHeight: maxH };
  }, [anchorRect]);

  // Position calculation for hover submenu
  const submenuPos = useMemo(() => {
    if (!activeSubmenu?.parentRect) return { top: 0, left: 0, maxHeight: 300 };

    const pRect = activeSubmenu.parentRect;
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const subW = 260;
    const subH = 240;

    let left = pRect.right + 2;
    if (left + subW > winW - 8) {
      left = Math.max(8, pRect.left - subW - 2);
    }

    let top = pRect.top - 4;
    const maxH = Math.min(360, winH - 16);
    if (top + subH > winH - 8) {
      top = Math.max(8, winH - subH - 8);
    }

    return { top, left, maxHeight: maxH };
  }, [activeSubmenu]);

  // Handle outside click & escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleCommandClick = useCallback(
    async (cmd: ProjectCommand, e: React.MouseEvent) => {
      e.stopPropagation();

      if (cmd.category === 'package' && (cmd.id.includes('add-package') || cmd.id.includes('add-dev-package'))) {
        const ecoType = cmd.id.startsWith('node') ? 'node' : 'python';
        const isDev = cmd.id.includes('dev');
        onClose();
        onOpenAddPackage(ecoType, isDev);
        return;
      }

      let target: RunTarget = 'terminal';
      if (e.ctrlKey || e.metaKey) {
        target = 'new-tab';
      } else if (e.shiftKey) {
        target = 'split';
      } else if (e.altKey) {
        target = 'copy';
      }

      onClose();

      if (target === 'new-tab' && onRunInNewTab) {
        onRunInNewTab(cmd.cwd || project?.cwd || '', cmd.commandText);
        return;
      }
      if (target === 'split' && onRunInSplit) {
        onRunInSplit(cmd.commandText);
        return;
      }

      await runCommand(sessionId, cmd, target, project?.cwd);
    },
    [sessionId, project, onClose, onOpenAddPackage, onRunInNewTab, onRunInSplit, runCommand]
  );

  const handleMouseEnterGroup = (
    grp: CommandGroup,
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    hoverTimerRef.current = setTimeout(() => {
      setActiveSubmenu({
        id: grp.id,
        title: grp.title,
        commands: grp.commands,
        parentRect: rect,
      });
    }, 120);
  };

  const handleMouseLeaveRow = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  const handlePin = async (cmdId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (project?.rootPath) {
      await togglePin(project.rootPath, cmdId);
    }
  };

  if (!project) return null;

  // Flatten all commands for count check
  const allCommands: ProjectCommand[] = [];
  for (const eco of project.ecosystems) {
    for (const grp of eco.groups) {
      allCommands.push(...grp.commands);
      if (grp.subgroups) {
        for (const sub of grp.subgroups) {
          allCommands.push(...sub.commands);
        }
      }
    }
  }

  const showFilter = allCommands.length > 12;

  // Recent commands from storage
  const recentCommands: ProjectCommand[] = [];
  if (projectStore?.lastRunCommandIds) {
    for (const rId of projectStore.lastRunCommandIds) {
      const found = allCommands.find((c) => c.id === rId);
      if (found) recentCommands.push(found);
    }
  }

  // Pinned commands
  const pinnedCommands: ProjectCommand[] = [];
  if (projectStore?.pinnedCommandIds) {
    for (const pId of projectStore.pinnedCommandIds) {
      const found = allCommands.find((c) => c.id === pId);
      if (found) pinnedCommands.push(found);
    }
  }

  return createPortal(
    <>
      <div className={styles.backdrop} onClick={onClose} />

      <div
        ref={menuRef}
        className={styles.menuPanel}
        style={{
          top: menuPos.top,
          left: menuPos.left,
          maxHeight: menuPos.maxHeight,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Row */}
        <div className={styles.headerRow}>
          <div className={styles.headerTitle}>
            <span>{project.name}</span>
            {project.ecosystems[0] && (
              <span className={styles.headerTool}>
                {project.ecosystems[0].tool}
              </span>
            )}
          </div>
          <div className={styles.headerPath} title={project.rootPath}>
            {project.rootPath}
          </div>
        </div>

        {/* Optional Filter Input */}
        {showFilter && (
          <div className={styles.filterBox}>
            <input
              className={styles.filterInput}
              placeholder="Type to filter..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              autoFocus
            />
          </div>
        )}

        {/* Errors if any */}
        {project.errors && project.errors.map((err, i) => (
          <div key={i} className={styles.errorRow}>
            ⚠️ {err}
          </div>
        ))}

        {/* Pinned Commands */}
        {pinnedCommands.length > 0 && !filterQuery && (
          <>
            <div className={styles.groupLabel}>Pinned</div>
            {pinnedCommands.map((cmd) => (
              <button
                key={`pin-${cmd.id}`}
                className={styles.row}
                onClick={(e) => handleCommandClick(cmd, e)}
                onContextMenu={(e) => handlePin(cmd.id, e)}
                title={`${cmd.commandText}\nClick: Run | Ctrl+Click: Tab | Shift+Click: Split | Alt+Click: Copy`}
              >
                <div className={styles.rowLeft}>
                  <span className={styles.pinnedStar}>★</span>
                  <span className={styles.rowLabel}>{cmd.label}</span>
                </div>
                <span className={styles.rowCommand}>{cmd.commandText}</span>
              </button>
            ))}
            <div className={styles.divider} />
          </>
        )}

        {/* Recent Commands */}
        {recentCommands.length > 0 && !filterQuery && (
          <>
            <div className={styles.groupLabel}>Recent</div>
            {recentCommands.slice(0, 5).map((cmd) => (
              <button
                key={`recent-${cmd.id}`}
                className={styles.row}
                onClick={(e) => handleCommandClick(cmd, e)}
                onContextMenu={(e) => handlePin(cmd.id, e)}
                title={`${cmd.commandText}\nClick: Run | Ctrl+Click: Tab | Shift+Click: Split | Alt+Click: Copy`}
              >
                <div className={styles.rowLeft}>
                  <span className={styles.rowIcon}>⏱</span>
                  <span className={styles.rowLabel}>{cmd.label}</span>
                </div>
                <span className={styles.rowCommand}>{cmd.commandText}</span>
              </button>
            ))}
            <div className={styles.divider} />
          </>
        )}

        {/* Ecosystem Groups */}
        {project.ecosystems.map((eco) => {
          return (
            <div key={eco.type}>
              {!eco.toolAvailable && (
                <div className={styles.errorRow}>
                  {eco.tool} not found. Commands disabled.
                </div>
              )}

              {eco.groups.map((grp) => {
                const hasSubgroups = grp.subgroups && grp.subgroups.length > 0;
                const isExpandable = hasSubgroups || grp.commands.length > 1;

                // If filter is active, filter commands
                let displayCommands = grp.commands;
                if (filterQuery.trim()) {
                  const q = filterQuery.toLowerCase();
                  displayCommands = grp.commands.filter(
                    (c) =>
                      c.label.toLowerCase().includes(q) ||
                      c.commandText.toLowerCase().includes(q)
                  );
                  if (displayCommands.length === 0 && !hasSubgroups) return null;
                }

                return (
                  <div key={grp.id}>
                    {/* Top Level Group Item with Chevron */}
                    {isExpandable ? (
                      <button
                        className={styles.row}
                        onMouseEnter={(e) => handleMouseEnterGroup(grp, e)}
                        onMouseLeave={handleMouseLeaveRow}
                        onClick={(e) => {
                          if (grp.commands[0]) {
                            handleCommandClick(grp.commands[0], e);
                          }
                        }}
                      >
                        <div className={styles.rowLeft}>
                          <span className={styles.rowIcon}>📁</span>
                          <span className={styles.rowLabel}>{grp.title}</span>
                        </div>
                        <span className={styles.chevronIcon}>›</span>
                      </button>
                    ) : (
                      grp.commands.map((cmd) => (
                        <button
                          key={cmd.id}
                          className={`${styles.row} ${cmd.disabled ? styles.rowDisabled : ''}`}
                          onClick={(e) => handleCommandClick(cmd, e)}
                          onContextMenu={(e) => handlePin(cmd.id, e)}
                          title={`${cmd.commandText}\nClick: Run | Ctrl+Click: Tab | Shift+Click: Split | Alt+Click: Copy`}
                        >
                          <div className={styles.rowLeft}>
                            <span className={styles.rowIcon}>▶</span>
                            <span className={styles.rowLabel}>{cmd.label}</span>
                          </div>
                          <span className={styles.rowCommand}>{cmd.commandText}</span>
                        </button>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        <div className={styles.divider} />

        {/* Run in Order / Queue Action */}
        <button
          className={styles.row}
          onClick={() => {
            onClose();
            onOpenOrderRun(allCommands);
          }}
        >
          <div className={styles.rowLeft}>
            <span className={styles.rowIcon}>⚡</span>
            <span className={styles.rowLabel}>Run in order...</span>
          </div>
        </button>
      </div>

      {/* Submenu Portal */}
      {activeSubmenu && (
        <div
          ref={submenuRef}
          className={styles.submenuPanel}
          style={{
            top: submenuPos.top,
            left: submenuPos.left,
            maxHeight: submenuPos.maxHeight,
          }}
          onMouseEnter={() => {
            if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
          }}
          onMouseLeave={() => setActiveSubmenu(null)}
        >
          <div className={styles.groupLabel}>{activeSubmenu.title}</div>
          {activeSubmenu.commands.map((cmd) => (
            <button
              key={cmd.id}
              className={`${styles.row} ${cmd.disabled ? styles.rowDisabled : ''}`}
              onClick={(e) => handleCommandClick(cmd, e)}
              onContextMenu={(e) => handlePin(cmd.id, e)}
              title={`${cmd.commandText}\nClick: Run | Ctrl+Click: Tab | Shift+Click: Split | Alt+Click: Copy`}
            >
              <div className={styles.rowLeft}>
                <span className={styles.rowIcon}>▶</span>
                <span className={styles.rowLabel}>{cmd.label}</span>
              </div>
              <span className={styles.rowCommand}>{cmd.commandText}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
};
