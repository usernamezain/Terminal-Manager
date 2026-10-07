import React, { useState, useEffect } from 'react';
import { ShellExperienceSettings } from '../../../shared/shellExperienceTypes';
import styles from './ShellExperience.module.css';
import { Code } from 'lucide-react';

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
    <div className={styles.sectionCard}>
      <div className={styles.sectionTitle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Code size={18} color="#C084FC" />
          <span>Advanced CTTcustom.ps1 User Region & Debug Options</span>
        </div>
      </div>

      <div className={styles.formGroup} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <input
          type="checkbox"
          id="debug-override"
          checked={settings.advanced.debugOverride}
          onChange={(e) =>
            onUpdateSettings({
              advanced: { ...settings.advanced, debugOverride: e.target.checked },
            })
          }
        />
        <label htmlFor="debug-override" style={{ cursor: 'pointer', fontSize: 13, color: '#FFFFFF' }}>
          Enable <code>$debug_Override</code> Development Mode
        </label>
      </div>

      <div className={styles.formGroup}>
        <label>Custom User Code Region (Preserved below managed block)</label>
        <textarea
          className={styles.input}
          rows={10}
          style={{ fontFamily: 'monospace', fontSize: 12 }}
          value={rawUserCode}
          onChange={(e) => setRawUserCode(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button className={styles.btnPrimary} onClick={handleSaveUserCode}>
          Save User Code
        </button>
      </div>
    </div>
  );
};
