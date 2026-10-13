import React, { useState } from 'react';
import { Play, Code, CornerDownLeft } from 'lucide-react';
import { Snippet } from '@shared/snippetTypes';
import styles from './Dialogs.module.css';

export interface SnippetVariableDialogProps {
  isOpen?: boolean;
  snippet?: Snippet | null;
  snippetName?: string;
  snippetContent?: string;
  variables?: string[];
  onConfirm?: (finalContent: string, runImmediately: boolean) => void;
  onInsert?: (finalContent: string) => void;
  onInsertAndRun?: (finalContent: string) => void;
  onCancel: () => void;
}

export const SnippetVariableDialog: React.FC<SnippetVariableDialogProps> = ({
  isOpen = true,
  snippet,
  snippetName: propName,
  snippetContent: propContent,
  variables: propVars,
  onConfirm,
  onInsert,
  onInsertAndRun,
  onCancel,
}) => {
  if (!isOpen && !snippet && !propContent) return null;

  const resolvedName = snippet?.name || propName || 'Snippet Variables';
  const resolvedContent = snippet?.content || propContent || '';

  const detectedVars = propVars || (
    (resolvedContent.match(/\{\{([a-zA-Z0-9_-]+)\}\}/g) || []).map((m: string) =>
      m.replace(/[\{\}]/g, '')
    )
  );
  // Deduplicate
  const variables = Array.from(new Set(detectedVars));

  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const v of variables) {
      initial[v] = '';
    }
    return initial;
  });

  const generateFinalContent = (): string => {
    let result = resolvedContent;
    for (const v of variables) {
      const val = values[v] ?? '';
      result = result.replace(new RegExp(`\\{\\{${v}\\}\\}`, 'g'), val);
    }
    return result;
  };

  const handleInsert = () => {
    const finalStr = generateFinalContent();
    if (onInsert) onInsert(finalStr);
    else if (onConfirm) onConfirm(finalStr, false);
  };

  const handleInsertAndRun = () => {
    const finalStr = generateFinalContent();
    if (onInsertAndRun) onInsertAndRun(finalStr);
    else if (onConfirm) onConfirm(finalStr, true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleInsert();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div
        className={styles.modalCard}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.modalHeader}>
          <div className={styles.iconAccent}>
            <Code size={18} />
          </div>
          <h3>Fill Snippet Variables: {resolvedName}</h3>
        </div>

        <p className={styles.modalSubtitle}>
          Enter parameters for each template variable before inserting into the terminal.
        </p>

        <div className={styles.variableForm}>
          {variables.map((variable) => (
            <div key={variable} className={styles.formRow}>
              <label>
                <code>{`{{${variable}}}`}</code>
              </label>
              <input
                type="text"
                className={styles.inputControl}
                placeholder={`Value for ${variable}...`}
                value={values[variable] ?? ''}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [variable]: e.target.value }))
                }
                autoFocus={variable === variables[0]}
              />
            </div>
          ))}
        </div>

        <div className={styles.previewBox}>
          <div className={styles.previewHeader}>Rendered Command Preview:</div>
          <code>{generateFinalContent()}</code>
        </div>

        <div className={styles.modalActions}>
          <button className={styles.btnSecondary} onClick={onCancel}>
            Cancel
          </button>
          <button
            className={styles.btnSecondary}
            onClick={handleInsert}
            title="Insert text at prompt (do not execute)"
          >
            <CornerDownLeft size={13} style={{ marginRight: 4 }} />
            Insert
          </button>
          <button
            className={styles.btnPrimary}
            onClick={handleInsertAndRun}
            title="Insert and execute immediately (Enter)"
          >
            <Play size={13} style={{ marginRight: 4 }} />
            Insert &amp; Run
          </button>
        </div>
      </div>
    </div>
  );
};
