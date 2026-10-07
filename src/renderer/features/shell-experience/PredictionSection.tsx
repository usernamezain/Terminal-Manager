import React, { useState } from 'react';
import { ShellExperienceSettings } from '../../../shared/shellExperienceTypes';
import styles from './ShellExperience.module.css';
import { Sparkles, Plus, Trash2 } from 'lucide-react';

interface PredictionSectionProps {
  settings: ShellExperienceSettings;
  onUpdateSettings: (newSettings: Partial<ShellExperienceSettings>) => void;
}

export const PredictionSection: React.FC<PredictionSectionProps> = ({ settings, onUpdateSettings }) => {
  const pred = settings.prediction;
  const [newFilter, setNewFilter] = useState('');

  const updatePred = (partial: Partial<typeof pred>) => {
    onUpdateSettings({
      prediction: {
        ...pred,
        ...partial,
      },
    });
  };

  const addFilter = () => {
    if (!newFilter.trim()) return;
    updatePred({
      sensitiveFilters: [...pred.sensitiveFilters, newFilter.trim().toLowerCase()],
    });
    setNewFilter('');
  };

  const removeFilter = (idx: number) => {
    const next = [...pred.sensitiveFilters];
    next.splice(idx, 1);
    updatePred({ sensitiveFilters: next });
  };

  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionTitle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={18} color="#A78BFA" />
          <span>PSReadLine Prediction & History Options</span>
        </div>
      </div>

      <div className={styles.gridTwo}>
        <div className={styles.formGroup}>
          <label>Prediction Source</label>
          <select
            className={styles.select}
            value={pred.predictionSource}
            onChange={(e) => updatePred({ predictionSource: e.target.value as any })}
          >
            <option value="HistoryAndPlugin">HistoryAndPlugin (Recommended)</option>
            <option value="History">History Only</option>
            <option value="Plugin">Plugin Only</option>
            <option value="None">Disabled</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label>Prediction View Style</label>
          <select
            className={styles.select}
            value={pred.viewStyle}
            onChange={(e) => updatePred({ viewStyle: e.target.value as any })}
          >
            <option value="ListView">ListView (Dropdown list)</option>
            <option value="InlineView">InlineView (Inline ghost text)</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label>Maximum History Count</label>
          <input
            type="number"
            className={styles.input}
            value={pred.maximumHistoryCount}
            onChange={(e) => updatePred({ maximumHistoryCount: parseInt(e.target.value) || 10000 })}
          />
        </div>

        <div className={styles.formGroup}>
          <label>Bell Style</label>
          <select
            className={styles.select}
            value={pred.bellStyle}
            onChange={(e) => updatePred({ bellStyle: e.target.value as any })}
          >
            <option value="None">None</option>
            <option value="Audible">Audible</option>
            <option value="Visual">Visual</option>
          </select>
        </div>
      </div>

      <div className={styles.sectionTitle} style={{ marginTop: 12 }}>
        <span>Sensitive Line Filters (Do not save matching lines to history)</span>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className={styles.input}
          style={{ flex: 1 }}
          placeholder="e.g. token, apikey, secret"
          value={newFilter}
          onChange={(e) => setNewFilter(e.target.value)}
        />
        <button className={styles.btnSecondary} onClick={addFilter}>
          <Plus size={14} /> Add Filter
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
        {pred.sensitiveFilters.map((filter, idx) => (
          <span key={idx} className={`${styles.chip} ${styles.chipWarning}`} style={{ gap: 8 }}>
            {filter}
            <Trash2 size={12} style={{ cursor: 'pointer' }} onClick={() => removeFilter(idx)} />
          </span>
        ))}
      </div>
    </div>
  );
};
