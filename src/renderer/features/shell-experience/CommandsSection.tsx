import React, { useState } from 'react';
import { ShellExperienceSettings, UpstreamCommandInfo, CustomAliasItem } from '../../../shared/shellExperienceTypes';
import styles from './ShellExperience.module.css';
import { Terminal, Search, Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

interface CommandsSectionProps {
  settings: ShellExperienceSettings;
  onUpdateSettings: (newSettings: Partial<ShellExperienceSettings>) => void;
}

const UPSTREAM_COMMANDS: UpstreamCommandInfo[] = [
  { name: 'gs', alias: 'git status', description: 'Show working tree status', category: 'Git', defaultEnabled: true },
  { name: 'ga', alias: 'git add .', description: 'Stage all modified files', category: 'Git', defaultEnabled: true },
  { name: 'gc', alias: 'git commit -m ...', description: 'Commit staged changes', category: 'Git', defaultEnabled: true },
  { name: 'gp', alias: 'git push', description: 'Push commits to remote', category: 'Git', defaultEnabled: true },
  { name: 'gpull', alias: 'git pull', description: 'Fetch and integrate remote changes', category: 'Git', defaultEnabled: true },
  { name: 'gcl', alias: 'git clone', description: 'Clone a remote repository', category: 'Git', defaultEnabled: true },
  { name: 'gcom', alias: 'git add .; git commit', description: 'Stage and commit', category: 'Git', defaultEnabled: true },
  { name: 'lazyg', alias: 'git add .; commit; push', description: 'Stage, commit and push in one step', category: 'Git', defaultEnabled: true },
  { name: 'touch', description: 'Create or update file timestamp', category: 'File', defaultEnabled: true },
  { name: 'mkcd', description: 'Create directory and change into it', category: 'Navigation', defaultEnabled: true },
  { name: 'nf', description: 'Create new empty file', category: 'File', defaultEnabled: true },
  { name: 'ff', description: 'Find files recursively by name', category: 'File', defaultEnabled: true },
  { name: 'trash', description: 'Move file to Recycle Bin safely', category: 'File', defaultEnabled: true },
  { name: 'head', description: 'Display first lines of a file', category: 'File', defaultEnabled: true },
  { name: 'tail', description: 'Display last lines of a file', category: 'File', defaultEnabled: true },
  { name: 'grep', description: 'Search text patterns in files or pipe', category: 'File', defaultEnabled: true },
  { name: 'sed', description: 'Search and replace string in file', category: 'File', defaultEnabled: true },
  { name: 'which', description: 'Locate executable command in PATH', category: 'System', defaultEnabled: true },
  { name: 'unzip', description: 'Extract zip archive to current dir', category: 'File', defaultEnabled: true },
  { name: 'df', description: 'Display volume storage information', category: 'System', defaultEnabled: true },
  { name: 'pgrep', description: 'Find process by name', category: 'Process', defaultEnabled: true },
  { name: 'pkill', description: 'Terminate process by name', category: 'Process', defaultEnabled: true },
  { name: 'k9', description: 'Force kill process by name', category: 'Process', defaultEnabled: true },
  { name: 'la', description: 'List directory files', category: 'File', defaultEnabled: true },
  { name: 'll', description: 'List directory files with details', category: 'File', defaultEnabled: true },
  { name: 'docs', description: 'Change directory to Documents', category: 'Navigation', defaultEnabled: true },
  { name: 'dtop', description: 'Change directory to Desktop', category: 'Navigation', defaultEnabled: true },
  { name: 'cpy', description: 'Copy text to system clipboard', category: 'System', defaultEnabled: true },
  { name: 'pst', description: 'Get text from system clipboard', category: 'System', defaultEnabled: true },
  { name: 'uptime', description: 'Display system boot time & uptime', category: 'System', defaultEnabled: true },
  { name: 'sysinfo', description: 'Get full computer information', category: 'System', defaultEnabled: true },
  { name: 'flushdns', description: 'Flush system DNS client cache', category: 'System', defaultEnabled: true },
  { name: 'pubip', description: 'Get public IP address from ifconfig.me', category: 'System', defaultEnabled: true },
  { name: 'admin/su', description: 'Elevate new shell session with RunAs', category: 'System', defaultEnabled: true },
  { name: 'winutil', description: 'Run Chris Titus Tech WinUtil script', category: 'WinUtil', defaultEnabled: true },
  { name: 'winutildev', description: 'Run WinUtil prerelease script', category: 'WinUtil', defaultEnabled: true },
  { name: 'windev', description: 'Compile and run local WinUtil checkout', category: 'WinUtil', defaultEnabled: true },
  { name: 'ep', description: 'Edit current user profile in editor', category: 'Profile', defaultEnabled: true },
  { name: 'Show-Help', description: 'Display profile help reference', category: 'Profile', defaultEnabled: true },
];

export const CommandsSection: React.FC<CommandsSectionProps> = ({ settings, onUpdateSettings }) => {
  const [search, setSearch] = useState('');
  const [aliasName, setAliasName] = useState('');
  const [aliasValue, setAliasValue] = useState('');
  const [aliasBody, setAliasBody] = useState('');
  const [isFunc, setIsFunc] = useState(false);
  const [syntaxResult, setSyntaxResult] = useState<{ valid: boolean; error?: string } | null>(null);

  const disabledSet = new Set(settings.disabledCommands);

  const toggleCommand = (name: string) => {
    const next = new Set(disabledSet);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    onUpdateSettings({ disabledCommands: Array.from(next) });
  };

  const probeSyntax = async () => {
    if (!isFunc || !aliasBody || !window.api?.shellexp) return;
    const res = await window.api.shellexp.probeSyntax(aliasBody);
    setSyntaxResult(res);
  };

  const addCustomAlias = () => {
    if (!aliasName.trim()) return;
    const item: CustomAliasItem = {
      name: aliasName.trim(),
      value: aliasValue.trim(),
      isFunction: isFunc,
      body: isFunc ? aliasBody : undefined,
    };
    onUpdateSettings({
      customAliases: [...settings.customAliases, item],
    });
    setAliasName('');
    setAliasValue('');
    setAliasBody('');
    setSyntaxResult(null);
  };

  const removeCustomAlias = (idx: number) => {
    const next = [...settings.customAliases];
    next.splice(idx, 1);
    onUpdateSettings({ customAliases: next });
  };

  const filtered = UPSTREAM_COMMANDS.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionTitle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Terminal size={18} color="#F87171" />
          <span>Upstream Profile Commands & Custom Aliases ({UPSTREAM_COMMANDS.length})</span>
        </div>
      </div>

      <div className={styles.formGroup} style={{ position: 'relative' }}>
        <input
          className={styles.input}
          style={{ paddingLeft: 30 }}
          placeholder="Search commands by name, description, or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Search size={14} color="#8A99AD" style={{ position: 'absolute', left: 10, top: 11 }} />
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Command / Alias</th>
            <th>Category</th>
            <th>Description</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((cmd) => {
            const isDisabled = disabledSet.has(cmd.name);
            return (
              <tr key={cmd.name} style={{ opacity: isDisabled ? 0.5 : 1 }}>
                <td style={{ fontWeight: 600, color: '#FFFFFF' }}>{cmd.name}</td>
                <td>
                  <span className={styles.chip} style={{ background: 'rgba(255,255,255,0.06)' }}>
                    {cmd.category}
                  </span>
                </td>
                <td style={{ fontSize: 12, color: '#8A99AD' }}>{cmd.description}</td>
                <td>
                  <input
                    type="checkbox"
                    checked={!isDisabled}
                    onChange={() => toggleCommand(cmd.name)}
                    style={{ cursor: 'pointer' }}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className={styles.sectionTitle} style={{ marginTop: 16 }}>
        <span>Create Custom Alias / Function</span>
      </div>

      <div className={styles.gridTwo}>
        <div className={styles.formGroup}>
          <label>Alias / Function Name</label>
          <input
            className={styles.input}
            placeholder="e.g. ll2 or myfunc"
            value={aliasName}
            onChange={(e) => setAliasName(e.target.value)}
          />
        </div>

        <div className={styles.formGroup}>
          <label>Type</label>
          <select
            className={styles.select}
            value={isFunc ? 'function' : 'alias'}
            onChange={(e) => setIsFunc(e.target.value === 'function')}
          >
            <option value="alias">Set-Alias</option>
            <option value="function">Function Body</option>
          </select>
        </div>
      </div>

      {!isFunc ? (
        <div className={styles.formGroup}>
          <label>Target Value</label>
          <input
            className={styles.input}
            placeholder="e.g. Get-ChildItem -Force"
            value={aliasValue}
            onChange={(e) => setAliasValue(e.target.value)}
          />
        </div>
      ) : (
        <div className={styles.formGroup}>
          <label>Function Script Body</label>
          <textarea
            className={styles.input}
            rows={4}
            style={{ fontFamily: 'monospace' }}
            placeholder="Get-Process | Where-Object CPU -gt 10"
            value={aliasBody}
            onChange={(e) => setAliasBody(e.target.value)}
          />
          <button className={styles.btnSecondary} style={{ width: 'fit-content' }} onClick={probeSyntax}>
            Probe Syntax
          </button>
          {syntaxResult && (
            <div className={styles.chip} style={{ background: syntaxResult.valid ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)' }}>
              {syntaxResult.valid ? <CheckCircle size={12} color="#4ADE80" /> : <AlertCircle size={12} color="#F87171" />}
              {syntaxResult.valid ? 'PowerShell syntax valid' : `Syntax Error: ${syntaxResult.error}`}
            </div>
          )}
        </div>
      )}

      <button className={styles.btnPrimary} style={{ width: 'fit-content' }} onClick={addCustomAlias}>
        <Plus size={14} /> Add Custom Entry
      </button>

      {settings.customAliases.length > 0 && (
        <table className={styles.table} style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Value / Body</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {settings.customAliases.map((a, idx) => (
              <tr key={idx}>
                <td style={{ fontWeight: 600 }}>{a.name}</td>
                <td>{a.isFunction ? 'Function' : 'Alias'}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{a.isFunction ? a.body : a.value}</td>
                <td>
                  <button className={styles.btnSecondary} style={{ padding: '2px 6px', color: '#F87171' }} onClick={() => removeCustomAlias(idx)}>
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
