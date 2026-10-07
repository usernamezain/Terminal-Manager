import React from 'react';
import { ShellExperienceSettings, PsReadLineColors } from '../../../shared/shellExperienceTypes';
import styles from './ShellExperience.module.css';
import { Palette, RotateCcw } from 'lucide-react';

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
    <div className={styles.sectionCard}>
      <div className={styles.sectionTitle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Palette size={18} color="#38BDF8" />
          <span>PSReadLine Syntax Highlighting Colors (17 Slots)</span>
        </div>
        <button className={styles.btnSecondary} onClick={handleResetDefaults}>
          <RotateCcw size={14} /> Reset Defaults
        </button>
      </div>

      <div className={styles.formGroup}>
        <label>Live Syntax Sample Line</label>
        <div className={styles.previewBox}>
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

      <div className={styles.gridTwo} style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        {(Object.keys(UPSTREAM_DEFAULTS) as Array<keyof PsReadLineColors>).map((slot) => (
          <div key={slot} className={styles.formGroup} style={{ background: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 6 }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{slot}</span>
              <span style={{ fontSize: 11, color: currentColors[slot] }}>{currentColors[slot]}</span>
            </label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="color"
                value={currentColors[slot] || '#FFFFFF'}
                onChange={(e) => handleColorChange(slot, e.target.value)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', width: 28, height: 28 }}
              />
              <input
                className={styles.input}
                style={{ flex: 1, padding: '4px 6px', fontSize: 12 }}
                value={currentColors[slot]}
                onChange={(e) => handleColorChange(slot, e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
