import React from 'react';
import { ShellExperienceSettings } from '../../../shared/shellExperienceTypes';
import styles from './ShellExperience.module.css';
import { Wrench, AlertTriangle } from 'lucide-react';

interface ToolsSectionProps {
  settings: ShellExperienceSettings;
  onUpdateSettings: (newSettings: Partial<ShellExperienceSettings>) => void;
}

export const ToolsSection: React.FC<ToolsSectionProps> = ({ settings, onUpdateSettings }) => {
  const tools = settings.tools;

  const updateTools = (partial: Partial<typeof tools>) => {
    onUpdateSettings({
      tools: {
        ...tools,
        ...partial,
      },
    });
  };

  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionTitle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Wrench size={18} color="#FACC15" />
          <span>Tools & Integration Helpers</span>
        </div>
      </div>

      <div className={styles.formGroup} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <input
          type="checkbox"
          id="zoxide-enabled"
          checked={tools.zoxideEnabled}
          onChange={(e) => updateTools({ zoxideEnabled: e.target.checked })}
        />
        <label htmlFor="zoxide-enabled" style={{ cursor: 'pointer', fontSize: 13, color: '#FFFFFF' }}>
          Enable zoxide directory navigation init (z command)
        </label>
      </div>

      <div className={styles.formGroup}>
        <label>zoxide Command Name</label>
        <input
          className={styles.input}
          value={tools.zoxideCmd}
          onChange={(e) => updateTools({ zoxideCmd: e.target.value })}
        />
      </div>

      <div className={styles.formGroup} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <input
          type="checkbox"
          id="choco-import"
          checked={tools.importChocolatey}
          onChange={(e) => updateTools({ importChocolatey: e.target.checked })}
        />
        <label htmlFor="choco-import" style={{ cursor: 'pointer', fontSize: 13, color: '#FFFFFF' }}>
          Import Chocolatey profile helpers if present
        </label>
      </div>

      <div className={styles.sectionTitle} style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={16} color="#FACC15" />
          <span>WinUtil / WinUtilDev Remote Script Note</span>
        </div>
      </div>
      <p style={{ fontSize: 12, color: '#8A99AD', margin: 0 }}>
        Upstream <code>winutil</code> and <code>winutildev</code> commands execute remote scripts from christitus.com when typed into the terminal by the user. Terminal Manager does not auto-run remote scripts.
      </p>
    </div>
  );
};
