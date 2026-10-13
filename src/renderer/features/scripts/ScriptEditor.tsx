import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  ListPlus,
  Save,
  Copy,
  Trash2,
  Download,
  AlertTriangle,
  Plus,
  X,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';
import { ScriptDefinition, ScriptType, ScriptSource, OnFailurePolicy, ScriptVisibility } from '../../../shared/scriptRunnerTypes';
import { useScriptsStore } from './useScriptsStore';
import styles from './ScriptRunnerView.module.css';

interface ScriptEditorProps {
  script: ScriptDefinition;
}

function parseArgsString(raw: string): string[] {
  const matches: string[] = [];
  const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
  let match;
  while ((match = regex.exec(raw)) !== null) {
    if (match[1] !== undefined) {
      matches.push(match[1]);
    } else if (match[2] !== undefined) {
      matches.push(match[2]);
    } else {
      matches.push(match[0]);
    }
  }
  return matches;
}

function formatArgsArray(args: string[]): string {
  return (args || [])
    .map((arg) => (arg.includes(' ') ? `"${arg}"` : arg))
    .join(' ');
}

const SENSITIVE_KEY_REGEX = /(?:password|secret|token|api_?key|auth|credential|private_?key)/i;

export const ScriptEditor: React.FC<ScriptEditorProps> = ({ script }) => {
  const {
    saveScript,
    deleteScript,
    duplicateScript,
    exportScripts,
    runNow,
    addToQueue,
  } = useScriptsStore();

  const [form, setForm] = useState<ScriptDefinition>(script);
  const [argsRaw, setArgsRaw] = useState<string>(formatArgsArray(script.args));
  const [envPairs, setEnvPairs] = useState<Array<{ key: string; value: string }>>([]);
  const [showSecretMap, setShowSecretMap] = useState<Record<string, boolean>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showApprovalPrompt, setShowApprovalPrompt] = useState(
    Boolean(script.isImported && !script.hasApprovedRun)
  );

  useEffect(() => {
    setForm(script);
    setArgsRaw(formatArgsArray(script.args));
    const pairs = Object.entries(script.env || {}).map(([key, value]) => ({ key, value }));
    setEnvPairs(pairs);
    setShowApprovalPrompt(Boolean(script.isImported && !script.hasApprovedRun));
    setValidationErrors({});
  }, [script]);

  const handleChange = <K extends keyof ScriptDefinition>(key: K, value: ScriptDefinition[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleArgsChange = (raw: string) => {
    setArgsRaw(raw);
    handleChange('args', parseArgsString(raw));
  };

  const handleEnvChange = (index: number, key: string, value: string) => {
    const nextPairs = [...envPairs];
    nextPairs[index] = { key, value };
    setEnvPairs(nextPairs);

    const envMap: Record<string, string> = {};
    for (const p of nextPairs) {
      if (p.key.trim()) {
        envMap[p.key.trim()] = p.value;
      }
    }
    handleChange('env', envMap);
  };

  const addEnvPair = () => {
    setEnvPairs([...envPairs, { key: '', value: '' }]);
  };

  const removeEnvPair = (index: number) => {
    const nextPairs = envPairs.filter((_, i) => i !== index);
    setEnvPairs(nextPairs);
    const envMap: Record<string, string> = {};
    for (const p of nextPairs) {
      if (p.key.trim()) envMap[p.key.trim()] = p.value;
    }
    handleChange('env', envMap);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) {
      errs.name = 'Script name is required.';
    }
    if (form.source === 'file' && !form.filePath?.trim()) {
      errs.filePath = 'File path is required for file-based scripts.';
    }
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    await saveScript(form);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleRunNow = async () => {
    if (!validate()) return;
    await saveScript(form);
    await runNow(form.id);
  };

  const handleAddToQueue = async () => {
    if (!validate()) return;
    await saveScript(form);
    await addToQueue(form.id);
  };

  const handleApproveRun = async () => {
    const approved = { ...form, hasApprovedRun: true };
    setForm(approved);
    setShowApprovalPrompt(false);
    await saveScript(approved);
  };

  // Line numbers calculation for inline editor
  const lineNumbers = useMemo(() => {
    const linesCount = (form.content || '').split('\n').length;
    return Array.from({ length: linesCount }, (_, i) => i + 1);
  }, [form.content]);

  return (
    <div className={styles.scrollContent}>
      {/* Imported Script First-Run Safety Notice */}
      {showApprovalPrompt && (
        <div className={styles.warningBanner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} />
            <span>
              This script was imported from an external path (<strong>{form.filePath || 'disk'}</strong>). Please inspect before execution.
            </span>
          </div>
          <button
            type="button"
            className={styles.btnPrimary}
            style={{ height: '26px', fontSize: '12px' }}
            onClick={handleApproveRun}
          >
            Approve for Execution
          </button>
        </div>
      )}

      {/* Top Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handleRunNow}
            title="Execute script immediately"
          >
            <Play size={14} />
            Run Now
          </button>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={handleAddToQueue}
            title="Line up script in execution queue"
          >
            <ListPlus size={14} />
            Add to Queue
          </button>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={handleSave}
            title="Save changes"
          >
            {saveSuccess ? <Check size={14} style={{ color: '#22c55e' }} /> : <Save size={14} />}
            {saveSuccess ? 'Saved' : 'Save'}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => duplicateScript(form.id)}
            title="Duplicate Script"
          >
            <Copy size={14} />
            Duplicate
          </button>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => exportScripts([form.id])}
            title="Export Script as JSON"
          >
            <Download size={14} />
            Export
          </button>
          <button
            type="button"
            className={styles.btnDanger}
            onClick={() => deleteScript(form.id)}
            title="Delete Script"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>

      {/* Section 1: General Definition */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h4 className={styles.sectionTitle}>General Definition</h4>
          <p className={styles.sectionDescription}>Script name, type, and execution source</p>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Script Name</label>
            <input
              type="text"
              className={styles.input}
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g. Build Production Artifacts"
            />
            {validationErrors.name && <span className={styles.errorHint}>{validationErrors.name}</span>}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Description</label>
            <input
              type="text"
              className={styles.input}
              value={form.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Optional summary of script purpose"
            />
          </div>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Script Type</label>
            <select
              className={styles.select}
              value={form.type}
              onChange={(e) => handleChange('type', e.target.value as ScriptType)}
            >
              <option value="powershell">PowerShell (.ps1)</option>
              <option value="cmd">Command Prompt (.bat, .cmd)</option>
              <option value="node">Node.js (.js, .mjs, .cjs)</option>
              <option value="typescript">TypeScript (.ts via tsx)</option>
              <option value="python">Python (.py)</option>
              <option value="bash">Bash / Shell (.sh via WSL/Git Bash)</option>
              <option value="vbs">VBScript (.vbs via cscript)</option>
              <option value="command">Inline Command / Snippet</option>
            </select>
            <span className={styles.fieldHint}>PowerShell runs with -NoProfile -ExecutionPolicy Bypass</span>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Source</label>
            <select
              className={styles.select}
              value={form.source}
              onChange={(e) => handleChange('source', e.target.value as ScriptSource)}
            >
              <option value="inline">Saved in app (Embedded content)</option>
              <option value="file">File on disk (Path reference, re-read at run time)</option>
            </select>
          </div>
        </div>

        {/* Source: File Path */}
        {form.source === 'file' ? (
          <div className={styles.formGroupFull}>
            <label className={styles.label}>File Path</label>
            <input
              type="text"
              className={`${styles.input} ${styles.inputMono}`}
              value={form.filePath || ''}
              onChange={(e) => handleChange('filePath', e.target.value)}
              placeholder="e.g. C:\projects\scripts\deploy.ps1"
            />
            {validationErrors.filePath && (
              <span className={styles.errorHint}>{validationErrors.filePath}</span>
            )}
            <span className={styles.fieldHint}>File will be read freshly at execution time</span>
          </div>
        ) : (
          /* Source: Inline Monospace Editor with Line Numbers */
          <div className={styles.formGroupFull}>
            <label className={styles.label}>Script Content</label>
            <div className={styles.editorWrapper}>
              <div className={styles.editorToolbar}>
                <span>{form.type.toUpperCase()} Snippet</span>
                <span>{lineNumbers.length} lines</span>
              </div>
              <div className={styles.editorBody}>
                <div className={styles.lineNumbers}>
                  {lineNumbers.map((num) => (
                    <div key={num}>{num}</div>
                  ))}
                </div>
                <textarea
                  className={styles.codeTextarea}
                  value={form.content || ''}
                  onChange={(e) => handleChange('content', e.target.value)}
                  placeholder="Enter script instructions or command snippet..."
                  rows={10}
                  spellCheck={false}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Arguments & Environment */}
      <div className={`${styles.section} ${styles.sectionDivider}`}>
        <div className={styles.sectionHeader}>
          <h4 className={styles.sectionTitle}>Arguments & Working Directory</h4>
          <p className={styles.sectionDescription}>Command line parameters and execution directory</p>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Arguments</label>
            <input
              type="text"
              className={`${styles.input} ${styles.inputMono}`}
              value={argsRaw}
              onChange={(e) => handleArgsChange(e.target.value)}
              placeholder='e.g. --verbose --mode "release build"'
            />
            <span className={styles.fieldHint}>Passed safely as array arguments (quotes respected)</span>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Working Directory (CWD)</label>
            <input
              type="text"
              className={`${styles.input} ${styles.inputMono}`}
              value={form.cwd || ''}
              onChange={(e) => handleChange('cwd', e.target.value)}
              placeholder="e.g. ~ or C:\Projects\MyRepo"
            />
            <span className={styles.fieldHint}>Supports ~ and explicit folder paths</span>
          </div>
        </div>

        {/* Environment Variables */}
        <div className={styles.formGroupFull}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label className={styles.label}>Environment Variables</label>
            <button
              type="button"
              className={styles.btnSecondary}
              style={{ height: '24px', fontSize: '11px', padding: '0 8px' }}
              onClick={addEnvPair}
            >
              <Plus size={12} />
              Add Variable
            </button>
          </div>

          {envPairs.length === 0 ? (
            <span className={styles.fieldHint}>No custom environment variables specified.</span>
          ) : (
            envPairs.map((pair, idx) => {
              const isSensitive = SENSITIVE_KEY_REGEX.test(pair.key);
              const isRevealed = !!showSecretMap[idx];

              return (
                <div key={idx} className={styles.envRow}>
                  <input
                    type="text"
                    className={`${styles.input} ${styles.inputMono}`}
                    style={{ width: '220px' }}
                    placeholder="KEY"
                    value={pair.key}
                    onChange={(e) => handleEnvChange(idx, e.target.value, pair.value)}
                  />
                  <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                    <input
                      type={isSensitive && !isRevealed ? 'password' : 'text'}
                      className={`${styles.input} ${styles.inputMono}`}
                      style={{ width: '100%', paddingRight: isSensitive ? '32px' : '12px' }}
                      placeholder="VALUE"
                      value={pair.value}
                      onChange={(e) => handleEnvChange(idx, pair.key, e.target.value)}
                    />
                    {isSensitive && (
                      <button
                        type="button"
                        className={styles.btnIconOnly}
                        style={{ position: 'absolute', right: '4px', width: '24px', height: '24px', border: 'none' }}
                        onClick={() =>
                          setShowSecretMap((prev) => ({ ...prev, [idx]: !prev[idx] }))
                        }
                        title={isRevealed ? 'Hide secret' : 'Reveal secret'}
                      >
                        {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    className={styles.btnIconOnly}
                    style={{ width: '32px', height: '32px' }}
                    onClick={() => removeEnvPair(idx)}
                    title="Remove variable"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Section 3: Execution Policies & Runtime */}
      <div className={`${styles.section} ${styles.sectionDivider}`}>
        <div className={styles.sectionHeader}>
          <h4 className={styles.sectionTitle}>Execution Policies & Visibility</h4>
          <p className={styles.sectionDescription}>Timeout limits, retry attempts, and terminal presentation</p>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.label}>On Failure Policy</label>
            <select
              className={styles.select}
              value={form.onFailure}
              onChange={(e) => handleChange('onFailure', e.target.value as OnFailurePolicy)}
            >
              <option value="stop">Stop queue (Halts queue execution)</option>
              <option value="continue">Continue (Proceed to next item)</option>
              <option value="retry">Retry N times with delay</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Run Visibility</label>
            <select
              className={styles.select}
              value={form.visibility}
              onChange={(e) => handleChange('visibility', e.target.value as ScriptVisibility)}
            >
              <option value="hidden">Hidden with logs (Background process)</option>
              <option value="terminal">In a terminal tab (Interactive tab session)</option>
            </select>
          </div>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Timeout (Seconds)</label>
            <input
              type="number"
              min={0}
              max={3600}
              className={styles.input}
              value={form.timeoutSeconds}
              onChange={(e) => handleChange('timeoutSeconds', Math.max(0, parseInt(e.target.value, 10) || 0))}
              placeholder="0 (Unlimited)"
            />
            <span className={styles.fieldHint}>0 = no timeout limit</span>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Interpreter Override (Optional)</label>
            <input
              type="text"
              className={`${styles.input} ${styles.inputMono}`}
              value={form.interpreterOverride || ''}
              onChange={(e) => handleChange('interpreterOverride', e.target.value || undefined)}
              placeholder="e.g. C:\Python312\python.exe"
            />
            <span className={styles.fieldHint}>Leave empty for auto-detected interpreter</span>
          </div>
        </div>

        {form.onFailure === 'retry' && (
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Retry Attempts</label>
              <input
                type="number"
                min={1}
                max={10}
                className={styles.input}
                value={form.retryCount ?? 2}
                onChange={(e) => handleChange('retryCount', Math.max(1, parseInt(e.target.value, 10) || 1))}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Retry Delay (Seconds)</label>
              <input
                type="number"
                min={1}
                max={60}
                className={styles.input}
                value={form.retryDelaySeconds ?? 3}
                onChange={(e) => handleChange('retryDelaySeconds', Math.max(1, parseInt(e.target.value, 10) || 1))}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
