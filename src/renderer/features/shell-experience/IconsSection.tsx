import React from 'react';
import { ShellExperienceSettings } from '../../../shared/shellExperienceTypes';
import styles from './ShellExperience.module.css';
import { Folder, FileText, FileCode, Image as ImageIcon } from 'lucide-react';

interface IconsSectionProps {
  settings: ShellExperienceSettings;
  onUpdateSettings: (newSettings: Partial<ShellExperienceSettings>) => void;
}

export const IconsSection: React.FC<IconsSectionProps> = ({ settings, onUpdateSettings }) => {
  const icons = settings.icons;

  const handleToggleIcons = (enabled: boolean) => {
    onUpdateSettings({
      icons: {
        ...icons,
        enabled,
      },
    });
  };

  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionTitle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Folder size={18} color="#C084FC" />
          <span>Terminal-Icons Module Settings</span>
        </div>
      </div>

      <div className={styles.formGroup} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <input
          type="checkbox"
          id="icons-enabled"
          checked={icons.enabled}
          onChange={(e) => handleToggleIcons(e.target.checked)}
        />
        <label htmlFor="icons-enabled" style={{ cursor: 'pointer', fontSize: 13, color: '#FFFFFF' }}>
          Enable Terminal-Icons File & Folder Glyphs
        </label>
      </div>

      <div className={styles.gridTwo}>
        <div className={styles.formGroup}>
          <label>Color Theme</label>
          <select
            className={styles.select}
            value={icons.colorTheme}
            onChange={(e) =>
              onUpdateSettings({
                icons: { ...icons, colorTheme: e.target.value },
              })
            }
          >
            <option value="Default">Default</option>
            <option value="Vibrant">Vibrant</option>
            <option value="Minimal">Minimal</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label>Icon Theme</label>
          <select
            className={styles.select}
            value={icons.iconTheme}
            onChange={(e) =>
              onUpdateSettings({
                icons: { ...icons, iconTheme: e.target.value },
              })
            }
          >
            <option value="Default">Default (Nerd Fonts)</option>
            <option value="Devicons">Devicons</option>
            <option value="Unicode">Unicode Fallback</option>
          </select>
        </div>
      </div>

      <div className={styles.formGroup}>
        <label>Get-ChildItem Sample Output Preview</label>
        <div className={styles.previewBox}>
          <div><Folder size={14} color="#6C8CFF" /> 📁 src/</div>
          <div><FileCode size={14} color="#38BDF8" />  package.json</div>
          <div><FileText size={14} color="#4ADE80" />  README.md</div>
          <div><ImageIcon size={14} color="#FACC15" />  logo.png</div>
        </div>
      </div>
    </div>
  );
};
