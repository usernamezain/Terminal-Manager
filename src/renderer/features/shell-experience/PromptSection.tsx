import React, { useState, useEffect } from 'react';
import { ShellExperienceSettings, ThemeInfo } from '../../../shared/shellExperienceTypes';
import styles from './ShellExperience.module.css';
import { Palette, Copy, RotateCcw } from 'lucide-react';

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
    <div className={styles.sectionCard}>
      <div className={styles.sectionTitle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Palette size={18} color="#FACC15" />
          <span>Oh My Posh Prompt Gallery & Customizer</span>
        </div>
        <button className={styles.btnSecondary} onClick={handleResetCobalt2}>
          <RotateCcw size={14} /> Reset to cobalt2
        </button>
      </div>

      <div className={styles.formGroup}>
        <label>Active Theme</label>
        <select
          className={styles.select}
          value={selectedTheme}
          onChange={(e) => handleSelectTheme(e.target.value)}
        >
          {themes.map((t) => (
            <option key={t.name} value={t.name}>
              {t.name} {t.isCustom ? '(Custom)' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.formGroup}>
        <label>Real-Time Prompt Preview</label>
        <div className={styles.previewBox} dangerouslySetInnerHTML={{ __html: formatAnsiToHtml(ansiPreview) }} />
      </div>

      <div className={styles.sectionTitle} style={{ marginTop: 12 }}>
        <span>Theme JSON Editor</span>
      </div>

      <textarea
        className={styles.input}
        rows={8}
        style={{ fontFamily: 'monospace', fontSize: 12 }}
        value={rawJson}
        onChange={(e) => setRawJson(e.target.value)}
      />

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          className={styles.btnSecondary}
          onClick={() => {
            const newName = `${selectedTheme}-copy`;
            handleSelectTheme(newName);
            alert(`Duplicated theme as ${newName}`);
          }}
        >
          <Copy size={14} /> Duplicate Theme
        </button>
      </div>
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
