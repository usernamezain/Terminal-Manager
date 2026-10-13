import React, { useState, useEffect } from 'react';
import { ShellExperienceSettings, ShellExperienceStatus } from '../../../shared/shellExperienceTypes';
import { OverviewSection } from './OverviewSection';
import { PromptSection } from './PromptSection';
import { ColorsSection } from './ColorsSection';
import { IconsSection } from './IconsSection';
import { PredictionSection } from './PredictionSection';
import { KeybindingsSection } from './KeybindingsSection';
import { CommandsSection } from './CommandsSection';
import { AdvancedSection } from './AdvancedSection';

export type ShellExperienceSubTab =
  | 'overview'
  | 'prompt'
  | 'colors'
  | 'icons'
  | 'prediction'
  | 'keybindings'
  | 'commands'
  | 'advanced';

interface ShellExperienceSettingsViewProps {
  subSection?: ShellExperienceSubTab;
  onGlyphTest?: () => void;
}

export const ShellExperienceSettingsView: React.FC<ShellExperienceSettingsViewProps> = ({
  subSection = 'overview',
  onGlyphTest,
}) => {
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
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--text-secondary)' }}>
        Loading Shell Experience Engine...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {subSection === 'overview' && (
        <OverviewSection
          settings={settings}
          status={status}
          onUpdateSettings={handleUpdateSettings}
          onRefreshStatus={fetchStatusAndSettings}
          onGlyphTest={onGlyphTest}
        />
      )}
      {subSection === 'prompt' && <PromptSection settings={settings} onUpdateSettings={handleUpdateSettings} />}
      {subSection === 'colors' && <ColorsSection settings={settings} onUpdateSettings={handleUpdateSettings} />}
      {subSection === 'icons' && <IconsSection settings={settings} onUpdateSettings={handleUpdateSettings} />}
      {subSection === 'prediction' && <PredictionSection settings={settings} onUpdateSettings={handleUpdateSettings} />}
      {subSection === 'keybindings' && <KeybindingsSection settings={settings} onUpdateSettings={handleUpdateSettings} />}
      {subSection === 'commands' && <CommandsSection settings={settings} onUpdateSettings={handleUpdateSettings} />}
      {subSection === 'advanced' && <AdvancedSection settings={settings} onUpdateSettings={handleUpdateSettings} />}
    </div>
  );
};
