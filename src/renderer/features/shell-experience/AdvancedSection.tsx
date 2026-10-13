import React, { useState, useEffect } from 'react';
import { ShellExperienceSettings } from '../../../shared/shellExperienceTypes';
import { SettingsSection } from '../../components/settings/SettingsSection';
import { SettingsRow } from '../../components/settings/SettingsRow';
import layoutStyles from '../../components/settings/SettingsLayout.module.css';

interface AdvancedSectionProps {
  settings: ShellExperienceSettings;
  onUpdateSettings: (newSettings: Partial<ShellExperienceSettings>) => void;
}

export const AdvancedSection: React.FC<AdvancedSectionProps> = ({ settings, onUpdateSettings }) => {
  const [rawUserCode, setRawUserCode] = useState(settings.advanced.rawUserCode);

  useEffect(() => {
    if (window.api?.shellexp) {
      window.api.shellexp.readUserRegion().then((code) => {
        setRawUserCode(code);
      });
    }
  }, []);

  const handleSaveUserCode = () => {
    onUpdateSettings({
      advanced: {
        ...settings.advanced,
        rawUserCode,
      },
    });
    if (window.api?.shellexp) {
      window.api.shellexp.writeUserRegion(rawUserCode);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SettingsSection
        title="Development & Diagnostic Options"
        description="Low-level options for profile evaluation and debugging."
      >
        <SettingsRow
          label="Debug Override Mode"
          description="Enables $debug_Override environment flag during profile compilation."
        >
          <button
            type="button"
            className={`${layoutStyles.controlToggle} ${
              settings.advanced.debugOverride ? layoutStyles.controlToggleActive : ''
            }`}
            onClick={() =>
              onUpdateSettings({
                advanced: { ...settings.advanced, debugOverride: !settings.advanced.debugOverride },
              })
            }
          >
            <span className={layoutStyles.controlToggleThumb} />
          </button>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        title="Custom User Code Region"
        description="Raw PowerShell script block injected and preserved permanently at the end of the profile."
        action={
          <button className={layoutStyles.btnPrimary} onClick={handleSaveUserCode}>
            <span>Save User Code</span>
          </button>
        }
      >
        <textarea
          style={{
            width: '100%',
            height: 220,
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
          value={rawUserCode}
          onChange={(e) => setRawUserCode(e.target.value)}
          placeholder="# Enter custom exports, environment variables, or PowerShell scripts here..."
        />
      </SettingsSection>
    </div>
  );
};
