import React from 'react';
import { ShellExperienceSettings } from '../../../shared/shellExperienceTypes';
import { SettingsSection } from '../../components/settings/SettingsSection';
import { SettingsRow } from '../../components/settings/SettingsRow';
import layoutStyles from '../../components/settings/SettingsLayout.module.css';
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SettingsSection
        title="Terminal-Icons Configuration"
        description="Display file and directory glyphs in directory listings and output."
      >
        <SettingsRow
          label="Enable Glyphs"
          description="Load Terminal-Icons module for Get-ChildItem, dir, and ls."
        >
          <button
            type="button"
            className={`${layoutStyles.controlToggle} ${
              icons.enabled ? layoutStyles.controlToggleActive : ''
            }`}
            onClick={() => handleToggleIcons(!icons.enabled)}
          >
            <span className={layoutStyles.controlToggleThumb} />
          </button>
        </SettingsRow>

        <SettingsRow
          label="Color Theme"
          description="Color palette applied to file extensions and folders."
        >
          <select
            className={layoutStyles.controlSelect}
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
        </SettingsRow>

        <SettingsRow
          label="Icon Set"
          description="Glyph set encoding for your terminal font."
        >
          <select
            className={layoutStyles.controlSelect}
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
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        title="Directory Output Preview"
        description="Simulated Get-ChildItem listing with selected glyphs."
      >
        <div
          style={{
            padding: 16,
            background: 'var(--bg-base)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
            fontFamily: 'var(--font-terminal)',
            fontSize: 13,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Folder size={14} color="#6C8CFF" />
            <span>src/</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileCode size={14} color="#38BDF8" />
            <span>package.json</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={14} color="#4ADE80" />
            <span>README.md</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ImageIcon size={14} color="#FACC15" />
            <span>logo.png</span>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
};
