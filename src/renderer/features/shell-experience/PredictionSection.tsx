import React, { useState } from 'react';
import { ShellExperienceSettings } from '../../../shared/shellExperienceTypes';
import { SettingsSection } from '../../components/settings/SettingsSection';
import { SettingsRow } from '../../components/settings/SettingsRow';
import layoutStyles from '../../components/settings/SettingsLayout.module.css';
import { Plus, Trash2 } from 'lucide-react';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SettingsSection
        title="Predictive Autocomplete & History"
        description="Configure PSReadLine suggestion sources, view layout, and history limits."
      >
        <SettingsRow
          label="Prediction Source"
          description="Suggest completions from previous history and installed modules."
        >
          <select
            className={layoutStyles.controlSelect}
            value={pred.predictionSource}
            onChange={(e) => updatePred({ predictionSource: e.target.value as any })}
          >
            <option value="HistoryAndPlugin">History & Plugins (Recommended)</option>
            <option value="History">History Only</option>
            <option value="Plugin">Plugin Only</option>
            <option value="None">Disabled</option>
          </select>
        </SettingsRow>

        <SettingsRow
          label="View Style"
          description="Display suggestions inline as ghost text or in a popup list."
        >
          <select
            className={layoutStyles.controlSelect}
            value={pred.viewStyle}
            onChange={(e) => updatePred({ viewStyle: e.target.value as any })}
          >
            <option value="ListView">List View (Menu below cursor)</option>
            <option value="InlineView">Inline View (Ghost text)</option>
          </select>
        </SettingsRow>

        <SettingsRow
          label="Maximum History Count"
          description="Maximum lines retained in persistent history file."
        >
          <input
            type="number"
            className={`${layoutStyles.controlInput} ${layoutStyles.controlNumber}`}
            value={pred.maximumHistoryCount}
            min={500}
            max={100000}
            onChange={(e) => updatePred({ maximumHistoryCount: parseInt(e.target.value) || 10000 })}
          />
        </SettingsRow>

        <SettingsRow
          label="Terminal Bell Style"
          description="Feedback behavior on invalid chords or errors."
        >
          <select
            className={layoutStyles.controlSelect}
            value={pred.bellStyle}
            onChange={(e) => updatePred({ bellStyle: e.target.value as any })}
          >
            <option value="None">None (Silent)</option>
            <option value="Audible">Audible</option>
            <option value="Visual">Visual</option>
          </select>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        title="Sensitive Keyword Exclusion Filters"
        description="Commands containing these tokens will never be persisted to shell history."
      >
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            className={layoutStyles.controlInput}
            style={{ flex: 1 }}
            placeholder="Add keyword (e.g. password, apikey, secret)..."
            value={newFilter}
            onChange={(e) => setNewFilter(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addFilter()}
          />
          <button className={layoutStyles.btnSecondary} onClick={addFilter}>
            <Plus size={13} />
            <span>Add Filter</span>
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {pred.sensitiveFilters.map((keyword, idx) => (
            <div
              key={idx}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 4,
                fontSize: 12,
                color: 'var(--text-primary)',
              }}
            >
              <span>{keyword}</span>
              <button
                type="button"
                onClick={() => removeFilter(idx)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Remove keyword"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </SettingsSection>
    </div>
  );
};
