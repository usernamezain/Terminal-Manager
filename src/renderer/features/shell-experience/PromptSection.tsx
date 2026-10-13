import React, { useState, useEffect } from 'react';
import { ShellExperienceSettings, ThemeInfo } from '../../../shared/shellExperienceTypes';
import { SettingsSection } from '../../components/settings/SettingsSection';
import { SettingsRow } from '../../components/settings/SettingsRow';
import layoutStyles from '../../components/settings/SettingsLayout.module.css';
import { RotateCcw, Copy } from 'lucide-react';

interface PromptSectionProps {
  settings: ShellExperienceSettings;
  onUpdateSettings: (newSettings: Partial<ShellExperienceSettings>) => void;
}

export const PromptSection: React.FC<PromptSectionProps> = ({ settings, onUpdateSettings }) => {
  const [themes, setThemes] = useState<ThemeInfo[]>([]);
  const [selectedTheme, setSelectedTheme] = useState(settings.activeTheme);
  const [ansiPreview, setAnsiPreview] = useState<string>('');
  const [rawJson, setRawJson] = useState<string>('{\n  "version": 3,\n  "blocks": []\n}');

  useEffect(() => {
    if (window.api?.shellexp) {
      window.api.shellexp.listThemes().then((list) => {
        setThemes(list);
      });
    }
  }, []);

  useEffect(() => {
    if (window.api?.shellexp) {
      window.api.shellexp.previewTheme(selectedTheme).then((preview) => {
        setAnsiPreview(preview);
      });
    }
  }, [selectedTheme]);

  const handleSelectTheme = (name: string) => {
    setSelectedTheme(name);
    onUpdateSettings({ activeTheme: name });
  };

  const handleResetCobalt2 = () => {
    handleSelectTheme('cobalt2');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SettingsSection
        title="Prompt Theme Selection"
        description="Choose or duplicate an Oh My Posh shell prompt theme."
        action={
          <button className={layoutStyles.btnSecondary} onClick={handleResetCobalt2}>
            <RotateCcw size={13} />
            <span>Reset to cobalt2</span>
          </button>
        }
      >
        <SettingsRow
          label="Active Prompt Theme"
          description="Select an installed preset or custom configuration."
        >
          <select
            className={layoutStyles.controlSelect}
            value={selectedTheme}
            onChange={(e) => handleSelectTheme(e.target.value)}
          >
            {themes.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name} {t.isCustom ? '(Custom)' : ''}
              </option>
            ))}
          </select>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        title="Live ANSI Prompt Preview"
        description="Rendered output of the current prompt layout."
      >
        <div
          style={{
            padding: 16,
            background: 'var(--bg-base)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
            fontFamily: 'var(--font-terminal)',
            fontSize: 13,
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            overflowX: 'auto',
          }}
          dangerouslySetInnerHTML={{ __html: formatAnsiToHtml(ansiPreview) }}
        />
      </SettingsSection>

      <SettingsSection
        title="Theme JSON Editor"
        description="Inspect or customize segment blocks, glyphs, and ANSI colors."
        action={
          <button
            className={layoutStyles.btnSecondary}
            onClick={() => {
              const newName = `${selectedTheme}-copy`;
              handleSelectTheme(newName);
              alert(`Duplicated theme as ${newName}`);
            }}
          >
            <Copy size={13} />
            <span>Duplicate Theme</span>
          </button>
        }
      >
        <textarea
          style={{
            width: '100%',
            height: 180,
            padding: 12,
            background: 'var(--bg-base)',
            border: '1px solid var(--border-strong)',
            borderRadius: 6,
            fontFamily: 'var(--font-terminal)',
            fontSize: 12,
            color: 'var(--text-primary)',
            outline: 'none',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
          value={rawJson}
          onChange={(e) => setRawJson(e.target.value)}
        />
      </SettingsSection>
    </div>
  );
};

function formatAnsiToHtml(ansi: string): string {
  if (!ansi) return '<span style="color:#8A99AD;">No preview generated</span>';
  return ansi
    .replace(/\x1b\[48;2;(\d+);(\d+);(\d+)m/g, (_m, r, g, b) => `<span style="background: rgb(${r},${g},${b});">`)
    .replace(/\x1b\[38;2;(\d+);(\d+);(\d+)m/g, (_m, r, g, b) => `<span style="color: rgb(${r},${g},${b});">`)
    .replace(/\x1b\[33m/g, '<span style="color: #FACC15;">')
    .replace(/\x1b\[0m/g, '</span>');
}
