import React, { useState } from 'react';
import { ShellExperienceSettings, KeybindingItem } from '../../../shared/shellExperienceTypes';
import { SettingsSection } from '../../components/settings/SettingsSection';
import layoutStyles from '../../components/settings/SettingsLayout.module.css';
import { Plus, Trash2, RotateCcw } from 'lucide-react';

interface KeybindingsSectionProps {
  settings: ShellExperienceSettings;
  onUpdateSettings: (newSettings: Partial<ShellExperienceSettings>) => void;
}

const DEFAULT_KEYBINDINGS: KeybindingItem[] = [
  { chord: 'UpArrow', function: 'HistorySearchBackward', description: 'Search backward in history' },
  { chord: 'DownArrow', function: 'HistorySearchForward', description: 'Search forward in history' },
  { chord: 'Tab', function: 'MenuComplete', description: 'Tab menu completion' },
  { chord: 'Ctrl+d', function: 'DeleteChar', description: 'Delete character' },
  { chord: 'Ctrl+w', function: 'BackwardDeleteWord', description: 'Delete previous word' },
  { chord: 'Alt+d', function: 'DeleteWord', description: 'Delete word' },
  { chord: 'Ctrl+LeftArrow', function: 'BackwardWord', description: 'Move backward word' },
  { chord: 'Ctrl+RightArrow', function: 'ForwardWord', description: 'Move forward word' },
  { chord: 'Ctrl+z', function: 'Undo', description: 'Undo edit' },
  { chord: 'Ctrl+y', function: 'Redo', description: 'Redo edit' },
];

export const KeybindingsSection: React.FC<KeybindingsSectionProps> = ({ settings, onUpdateSettings }) => {
  const bindings = settings.keybindings;
  const [newChord, setNewChord] = useState('');
  const [newFunc, setNewFunc] = useState('HistorySearchBackward');

  const handleReset = () => {
    onUpdateSettings({ keybindings: DEFAULT_KEYBINDINGS });
  };

  const handleAdd = () => {
    if (!newChord.trim()) return;
    onUpdateSettings({
      keybindings: [...bindings, { chord: newChord.trim(), function: newFunc }],
    });
    setNewChord('');
  };

  const handleRemove = (idx: number) => {
    const next = [...bindings];
    next.splice(idx, 1);
    onUpdateSettings({ keybindings: next });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SettingsSection
        title="PSReadLine Keybindings & Handlers"
        description="Keyboard shortcuts for command line editing and interactive completion."
        action={
          <button className={layoutStyles.btnSecondary} onClick={handleReset}>
            <RotateCcw size={13} />
            <span>Reset Defaults</span>
          </button>
        }
      >
        <table className={layoutStyles.cleanTable}>
          <thead>
            <tr>
              <th style={{ width: '25%' }}>Shortcut Chord</th>
              <th style={{ width: '30%' }}>Handler Function</th>
              <th style={{ width: '35%' }}>Description</th>
              <th style={{ width: '10%', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {bindings.map((item, idx) => (
              <tr key={idx}>
                <td style={{ fontWeight: 500, color: 'var(--accent)' }}>{item.chord}</td>
                <td style={{ fontFamily: 'var(--font-terminal)', fontSize: 12 }}>{item.function}</td>
                <td>{item.description || 'Custom handler'}</td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: 4,
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                    title="Delete keybinding"
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SettingsSection>

      <SettingsSection
        title="Add Custom Keybinding"
        description="Bind a shortcut combination to a PSReadLine handler function."
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input
            className={layoutStyles.controlInput}
            style={{ width: 180 }}
            placeholder="Chord (e.g. Ctrl+k)"
            value={newChord}
            onChange={(e) => setNewChord(e.target.value)}
          />
          <select
            className={layoutStyles.controlSelect}
            style={{ flex: 1 }}
            value={newFunc}
            onChange={(e) => setNewFunc(e.target.value)}
          >
            <option value="HistorySearchBackward">HistorySearchBackward</option>
            <option value="HistorySearchForward">HistorySearchForward</option>
            <option value="MenuComplete">MenuComplete</option>
            <option value="Complete">Complete</option>
            <option value="BackwardDeleteWord">BackwardDeleteWord</option>
            <option value="DeleteWord">DeleteWord</option>
            <option value="BeginningOfLine">BeginningOfLine</option>
            <option value="EndOfLine">EndOfLine</option>
            <option value="ClearScreen">ClearScreen</option>
            <option value="Undo">Undo</option>
            <option value="Redo">Redo</option>
          </select>
          <button className={layoutStyles.btnSecondary} onClick={handleAdd}>
            <Plus size={13} />
            <span>Add Binding</span>
          </button>
        </div>
      </SettingsSection>
    </div>
  );
};
