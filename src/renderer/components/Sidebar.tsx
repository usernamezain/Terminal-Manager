import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Terminal, Layers, PlaySquare, Bot, BookOpen, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { useWorkspaceStore } from '@renderer/store/useWorkspaceStore';
import { useSettingsStore } from '@renderer/store/useSettingsStore';
import styles from './Sidebar.module.css';

interface SidebarProps {
  onOpenSettings: (initialTab?: 'general' | 'shellexp' | 'docs' | 'perf') => void;
}

interface NavItemDef {
  id: 'terminals' | 'profiles' | 'scripts' | 'agents' | 'docs' | 'settings';
  label: string;
  icon: React.ElementType;
  badge?: string;
  winOnly?: boolean;
  shortcut?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenSettings }) => {
  const { sidebarExpanded, toggleSidebar, activeNavTab, setActiveNavTab } = useWorkspaceStore();
  const animationLevel = useSettingsStore((state) => state.settings.animationLevel);
  const [tooltipTimeout, setTooltipTimeout] = useState<NodeJS.Timeout | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const isWindows = window.api?.platform === 'win32';

  const navItems: NavItemDef[] = [
    { id: 'terminals', label: 'Terminals', icon: Terminal },
    { id: 'profiles', label: 'Profiles', icon: Layers },
    { id: 'scripts', label: 'Script Runner', icon: PlaySquare, shortcut: 'Ctrl+Shift+R' },
    { id: 'agents', label: 'AI Agents', icon: Bot, shortcut: 'Ctrl+Shift+G' },
    { id: 'docs', label: 'Documentation', icon: BookOpen },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const filteredNavItems = navItems.filter((item) => !item.winOnly || isWindows);

  const handleMouseEnter = (id: string) => {
    if (!sidebarExpanded) {
      const timer = setTimeout(() => {
        setActiveTooltip(id);
      }, 400); // 400ms delay tooltips
      setTooltipTimeout(timer);
    }
  };

  const handleMouseLeave = () => {
    if (tooltipTimeout) clearTimeout(tooltipTimeout);
    setActiveTooltip(null);
  };

  const handleClick = (id: 'terminals' | 'profiles' | 'scripts' | 'agents' | 'docs' | 'settings') => {
    setActiveNavTab(id);
    if (id === 'settings' && onOpenSettings) {
      onOpenSettings('general');
    }
  };

  // Animation settings
  const animateDuration = animationLevel === 'off' ? 0 : animationLevel === 'reduced' ? 0.1 : 0.26;

  return (
    <motion.aside
      className={styles.sidebar}
      initial={false}
      animate={{ width: sidebarExpanded ? 240 : 56 }}
      transition={{ duration: animateDuration, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={styles.navSection}>
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeNavTab === item.id;
          return (
            <button
              key={item.id}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              title={item.label}
              onClick={() => handleClick(item.id)}
              onMouseEnter={() => handleMouseEnter(item.id)}
              onMouseLeave={handleMouseLeave}
            >
              <Icon className={styles.icon} />
              {sidebarExpanded && (
                <>
                  <span className={styles.label}>{item.label}</span>
                  {item.badge && <span className={styles.badge}>{item.badge}</span>}
                </>
              )}

              {!sidebarExpanded && activeTooltip === item.id && (
                <div className={styles.tooltip}>
                  {item.label} {item.shortcut ? `(${item.shortcut})` : item.badge ? `(${item.badge})` : ''}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className={styles.bottomSection}>
        <button
          className={styles.collapseButton}
          onClick={toggleSidebar}
          title={sidebarExpanded ? 'Collapse Sidebar' : 'Expand Sidebar'}
        >
          {sidebarExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          {sidebarExpanded && <span className={styles.collapseLabel}>Collapse</span>}
        </button>
      </div>
    </motion.aside>
  );
};
