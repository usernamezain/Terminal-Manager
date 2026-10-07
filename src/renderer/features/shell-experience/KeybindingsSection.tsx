import React, { useState } from 'react';
import { ShellExperienceSettings, KeybindingItem } from '../../../shared/shellExperienceTypes';
import styles from './ShellExperience.module.css';
import { Keyboard, Plus, Trash2, RotateCcw } from 'lucide-react';

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
    <div className={styles.sectionCard}>
      <div className={styles.sectionTitle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Keyboard size={18} color="#4ADE80" />
          <span>PSReadLine Keybindings & Handlers</span>
        </div>
        <button className={styles.btnSecondary} onClick={handleReset}>
          <RotateCcw size={14} /> Reset Defaults
        </button>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Shortcut Chord</th>
            <th>Handler Function</th>
            <th>Description</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {bindings.map((item, idx) => (
            <tr key={idx}>
              <td style={{ fontWeight: 600, color: '#6C8CFF' }}>{item.chord}</td>
              <td style={{ fontFamily: 'monospace' }}>{item.function}</td>
              <td style={{ fontSize: 12, color: '#8A99AD' }}>{item.description || 'Custom handler'}</td>
              <td>
                <button
                  className={styles.btnSecondary}
                  style={{ padding: '2px 6px', color: '#F87171' }}
                  onClick={() => handleRemove(idx)}
                >
                  <Trash2 size={12} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={styles.sectionTitle} style={{ marginTop: 12 }}>
        <span>Add Keybinding</span>
      </div>

      <div className={styles.gridTwo}>
        <input
          className={styles.input}
          placeholder="Shortcut (e.g. Ctrl+z)"
          value={newChord}
          onChange={(e) => setNewChord(e.target.value)}
        />
        <select className={styles.select} value={newFunc} onChange={(e) => setNewFunc(e.target.value)}>
          <option value="HistorySearchBackward">HistorySearchBackward</option>
          <option value="HistorySearchForward">HistorySearchForward</option>
          <option value="MenuComplete">MenuComplete</option>
          <option value="Undo">Undo</option>
          <option value="Redo">Redo</option>
          <option value="BackwardDeleteWord">BackwardDeleteWord</option>
          <option value="DeleteWord">DeleteWord</option>
        </select>
      </div>

      <button className={styles.btnPrimary} style={{ width: 'fit-content' }} onClick={handleAdd}>
        <Plus size={14} /> Add Binding
      </button>
    </div>
  );
};
