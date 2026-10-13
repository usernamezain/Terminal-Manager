import React from 'react';
import { ShellExperienceSettings, PsReadLineColors } from '../../../shared/shellExperienceTypes';
import { SettingsSection } from '../../components/settings/SettingsSection';
import layoutStyles from '../../components/settings/SettingsLayout.module.css';
import { RotateCcw } from 'lucide-react';

interface ColorsSectionProps {
  settings: ShellExperienceSettings;
  onUpdateSettings: (newSettings: Partial<ShellExperienceSettings>) => void;
}

const UPSTREAM_DEFAULTS: PsReadLineColors = {
  Command: '#87CEEB',
  Parameter: '#98FB98',
  Operator: '#FFB6C1',
  Variable: '#DDA0DD',
  String: '#FFDAB9',
  Number: '#B0E0E6',
  Type: '#F0E68C',
  Comment: '#D3D3D3',
  Keyword: '#8367c7',
  Error: '#FF6347',
  Member: '#B5CEA8',
  Default: '#CCCCCC',
  Emphasis: '#4EC9B0',
  InlinePrediction: '#666666',
  ListPrediction: '#999999',
  ListPredictionSelected: '#007ACC',
  Selection: '#264F78',
};

export const ColorsSection: React.FC<ColorsSectionProps> = ({ settings, onUpdateSettings }) => {
  const currentColors = { ...UPSTREAM_DEFAULTS, ...settings.colors };

  const handleColorChange = (key: keyof PsReadLineColors, value: string) => {
    onUpdateSettings({
      colors: {
        ...currentColors,
        [key]: value,
      },
    });
  };

  const handleResetDefaults = () => {
    onUpdateSettings({ colors: UPSTREAM_DEFAULTS });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SettingsSection
        title="PSReadLine Syntax Highlighting Colors"
        description="Configure terminal syntax color tokens for PowerShell commands and expressions."
        action={
          <button className={layoutStyles.btnSecondary} onClick={handleResetDefaults}>
            <RotateCcw size={13} />
            <span>Reset Defaults</span>
          </button>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              padding: 12,
              background: 'var(--bg-base)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 6,
              fontFamily: 'var(--font-terminal)',
              fontSize: 13,
            }}
          >
            <span style={{ color: currentColors.Command }}>Get-ChildItem</span>{' '}
            <span style={{ color: currentColors.Parameter }}>-Path</span>{' '}
            <span style={{ color: currentColors.String }}>&quot;C:\Users&quot;</span>{' '}
            <span style={{ color: currentColors.Operator }}>|</span>{' '}
            <span style={{ color: currentColors.Command }}>Where-Object</span>{' '}
            <span style={{ color: currentColors.Variable }}>$_.Length</span>{' '}
            <span style={{ color: currentColors.Operator }}>-gt</span>{' '}
            <span style={{ color: currentColors.Number }}>100</span>{' '}
            <span style={{ color: currentColors.Comment }}># Sample filter</span>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 12,
          }}
        >
          {(Object.keys(UPSTREAM_DEFAULTS) as Array<keyof PsReadLineColors>).map((slot) => (
            <div
              key={slot}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 6,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                {slot}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="color"
                  value={currentColors[slot] || '#FFFFFF'}
                  onChange={(e) => handleColorChange(slot, e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    width: 24,
                    height: 24,
                    padding: 0,
                  }}
                />
                <input
                  type="text"
                  value={currentColors[slot]}
                  onChange={(e) => handleColorChange(slot, e.target.value)}
                  style={{
                    width: 72,
                    height: 28,
                    background: 'var(--bg-base)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 4,
                    padding: '0 6px',
                    fontSize: 12,
                    color: 'var(--text-primary)',
                    fontFamily: 'monospace',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </SettingsSection>
    </div>
  );
};
