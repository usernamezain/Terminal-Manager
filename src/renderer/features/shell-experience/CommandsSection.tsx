import React, { useState } from 'react';
import { ShellExperienceSettings, UpstreamCommandInfo, CustomAliasItem } from '../../../shared/shellExperienceTypes';
import { SettingsSection } from '../../components/settings/SettingsSection';
import layoutStyles from '../../components/settings/SettingsLayout.module.css';
import { Search, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SettingsSection
        title="Built-in Productivity Aliases"
        description="Toggle shell command aliases and quick utilities provided by Terminal Manager."
        action={
          <div style={{ position: 'relative', width: 220 }}>
            <Search
              size={13}
              style={{
                position: 'absolute',
                left: 10,
                top: 10,
                color: 'var(--text-muted)',
              }}
            />
            <input
              className={layoutStyles.controlInput}
              style={{ paddingLeft: 30, width: '100%', boxSizing: 'border-box' }}
              placeholder="Filter aliases..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        }
      >
        <table className={layoutStyles.cleanTable}>
          <thead>
            <tr>
              <th style={{ width: '15%' }}>Alias</th>
              <th style={{ width: '25%' }}>Command</th>
              <th style={{ width: '15%' }}>Category</th>
              <th style={{ width: '35%' }}>Description</th>
              <th style={{ width: '10%', textAlign: 'right' }}>Enabled</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((cmd) => {
              const isEnabled = !disabledSet.has(cmd.name);
              return (
                <tr key={cmd.name}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cmd.name}</td>
                  <td style={{ fontFamily: 'var(--font-terminal)', fontSize: 12 }}>
                    {cmd.alias || cmd.name}
                  </td>
                  <td>{cmd.category}</td>
                  <td>{cmd.description}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className={`${layoutStyles.controlToggle} ${
                        isEnabled ? layoutStyles.controlToggleActive : ''
                      }`}
                      onClick={() => toggleCommand(cmd.name)}
                    >
                      <span className={layoutStyles.controlToggleThumb} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </SettingsSection>

      {/* Custom User Aliases */}
      <SettingsSection
        title="Custom Aliases & Functions"
        description="Add your own PowerShell alias shortcuts or custom function blocks."
      >
        {settings.customAliases.length > 0 && (
          <table className={layoutStyles.cleanTable} style={{ marginBottom: 16 }}>
            <thead>
              <tr>
                <th style={{ width: '20%' }}>Name</th>
                <th style={{ width: '20%' }}>Type</th>
                <th style={{ width: '50%' }}>Definition</th>
                <th style={{ width: '10%', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {settings.customAliases.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</td>
                  <td>{item.isFunction ? 'Function' : 'Alias'}</td>
                  <td style={{ fontFamily: 'var(--font-terminal)', fontSize: 12 }}>
                    {item.isFunction ? item.body : item.value}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => removeCustomAlias(idx)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: 4,
                      }}
                      title="Remove alias"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <input
              className={layoutStyles.controlInput}
              style={{ width: 160 }}
              placeholder="Alias Name (e.g. gco)"
              value={aliasName}
              onChange={(e) => setAliasName(e.target.value)}
            />
            <select
              className={layoutStyles.controlSelect}
              style={{ width: 140 }}
              value={isFunc ? 'function' : 'alias'}
              onChange={(e) => setIsFunc(e.target.value === 'function')}
            >
              <option value="alias">Standard Alias</option>
              <option value="function">Custom Function</option>
            </select>
            {!isFunc ? (
              <input
                className={layoutStyles.controlInput}
                style={{ flex: 1 }}
                placeholder="Target Command (e.g. git checkout)"
                value={aliasValue}
                onChange={(e) => setAliasValue(e.target.value)}
              />
            ) : null}
          </div>

          {isFunc && (
            <div>
              <textarea
                style={{
                  width: '100%',
                  height: 100,
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
                placeholder="function myFunc($arg) { Write-Host $arg }"
                value={aliasBody}
                onChange={(e) => setAliasBody(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'center' }}>
                <button className={layoutStyles.btnSecondary} onClick={probeSyntax}>
                  Test PowerShell Syntax
                </button>
                {syntaxResult && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      color: syntaxResult.valid ? 'var(--success)' : 'var(--danger)',
                    }}
                  >
                    {syntaxResult.valid ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                    <span>{syntaxResult.valid ? 'Syntax Valid' : syntaxResult.error}</span>
                  </span>
                )}
              </div>
            </div>
          )}

          <div>
            <button className={layoutStyles.btnSecondary} onClick={addCustomAlias}>
              <Plus size={13} />
              <span>Add Custom Alias</span>
            </button>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
};
