import React, { useState, useEffect } from 'react';
import { ShellExperienceSettings, ShellExperienceStatus } from '../../../shared/shellExperienceTypes';
import styles from './ShellExperience.module.css';
import { OverviewSection } from './OverviewSection';
import { PromptSection } from './PromptSection';
import { ColorsSection } from './ColorsSection';
import { IconsSection } from './IconsSection';
import { PredictionSection } from './PredictionSection';
import { KeybindingsSection } from './KeybindingsSection';
import { CommandsSection } from './CommandsSection';
import { ToolsSection } from './ToolsSection';
import { AdvancedSection } from './AdvancedSection';
import { Terminal, Shield, Palette, Folder, Sparkles, Keyboard, Wrench, Code } from 'lucide-react';

interface ShellExperienceSettingsViewProps {
  onGlyphTest?: () => void;
}

export const ShellExperienceSettingsView: React.FC<ShellExperienceSettingsViewProps> = ({ onGlyphTest }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'prompt' | 'colors' | 'icons' | 'prediction' | 'keybindings' | 'commands' | 'tools' | 'advanced'>('overview');
  const [settings, setSettings] = useState<ShellExperienceSettings | null>(null);
  const [status, setStatus] = useState<ShellExperienceStatus | null>(null);

  const fetchStatusAndSettings = async () => {
    if (!window.api?.shellexp) return;
    try {
      const [s, st] = await Promise.all([
        window.api.shellexp.getSettings(),
        window.api.shellexp.getStatus(),
      ]);
      setSettings(s);
      setStatus(st);
    } catch (err) {
      console.error('Failed to fetch shell experience settings:', err);
    }
  };

  useEffect(() => {
    fetchStatusAndSettings();
  }, []);

  const handleUpdateSettings = async (partial: Partial<ShellExperienceSettings>) => {
    if (!settings || !window.api?.shellexp) return;
    const updated = { ...settings, ...partial };
    setSettings(updated);
    await window.api.shellexp.setSettings(updated);
  };

  if (!settings) {
    return <div className={styles.container}>Loading Shell Experience...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <Terminal size={22} color="#6C8CFF" />
          <div>
            <h2>Shell Experience (ChrisTitusTech PowerShell Profile)</h2>
            <p className={styles.subTitle}>
              Customize Oh My Posh themes, PSReadLine colors, prediction options, keybindings, and custom aliases.
            </p>
          </div>
        </div>
      </div>

      <div className={styles.navTabs}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Shield size={14} /> Overview
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'prompt' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('prompt')}
        >
          <Palette size={14} /> Prompt
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'colors' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('colors')}
        >
          <Palette size={14} /> Colors
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'icons' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('icons')}
        >
          <Folder size={14} /> Icons
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'prediction' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('prediction')}
        >
          <Sparkles size={14} /> Prediction
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'keybindings' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('keybindings')}
        >
          <Keyboard size={14} /> Keybindings
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'commands' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('commands')}
        >
          <Terminal size={14} /> Commands
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'tools' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('tools')}
        >
          <Wrench size={14} /> Tools
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'advanced' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('advanced')}
        >
          <Code size={14} /> Advanced
        </button>
      </div>

      {activeTab === 'overview' && (
        <OverviewSection
          settings={settings}
          status={status}
          onUpdateSettings={handleUpdateSettings}
          onRefreshStatus={fetchStatusAndSettings}
          onGlyphTest={onGlyphTest}
        />
      )}
      {activeTab === 'prompt' && <PromptSection settings={settings} onUpdateSettings={handleUpdateSettings} />}
      {activeTab === 'colors' && <ColorsSection settings={settings} onUpdateSettings={handleUpdateSettings} />}
      {activeTab === 'icons' && <IconsSection settings={settings} onUpdateSettings={handleUpdateSettings} />}
      {activeTab === 'prediction' && <PredictionSection settings={settings} onUpdateSettings={handleUpdateSettings} />}
      {activeTab === 'keybindings' && <KeybindingsSection settings={settings} onUpdateSettings={handleUpdateSettings} />}
      {activeTab === 'commands' && <CommandsSection settings={settings} onUpdateSettings={handleUpdateSettings} />}
      {activeTab === 'tools' && <ToolsSection settings={settings} onUpdateSettings={handleUpdateSettings} />}
      {activeTab === 'advanced' && <AdvancedSection settings={settings} onUpdateSettings={handleUpdateSettings} />}
    </div>
  );
};
