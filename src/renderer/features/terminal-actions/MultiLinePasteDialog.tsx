import React, { useState } from 'react';
import { Clipboard } from 'lucide-react';
import { analyzePastedText } from '@shared/terminalUtils';
import styles from './Dialogs.module.css';

export interface MultiLinePasteDialogProps {
  isOpen?: boolean;
  text?: string;
  previewLines?: string[];
  lineCount?: number;
  totalLength?: number;
  onConfirmPaste?: (asSingleLine: boolean) => void;
  onPaste?: () => void;
  onPasteSingleLine?: () => void;
  onCancel: () => void;
  onDontAskAgain: (dontAsk?: boolean) => void;
}

export const MultiLinePasteDialog: React.FC<MultiLinePasteDialogProps> = ({
  isOpen = true,
  text,
  previewLines: inputPreviewLines,
  lineCount: inputLineCount,
  totalLength: inputTotalLength,
  onConfirmPaste,
  onPaste,
  onPasteSingleLine,
  onCancel,
  onDontAskAgain,
}) => {
  const [dontAsk, setDontAsk] = useState(false);

  if (!isOpen) return null;

  let previewLines = inputPreviewLines || [];
  let lineCount = inputLineCount || 0;
  let totalLength = inputTotalLength || 0;

  if (text) {
    const analysis = analyzePastedText(text);
    previewLines = analysis.previewLines;
    lineCount = analysis.lineCount;
    totalLength = text.length;
  }

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDontAsk(e.target.checked);
    onDontAskAgain(e.target.checked);
  };

  const handlePasteRegular = () => {
    if (onPaste) onPaste();
    else if (onConfirmPaste) onConfirmPaste(false);
  };

  const handlePasteSingle = () => {
    if (onPasteSingleLine) onPasteSingleLine();
    else if (onConfirmPaste) onConfirmPaste(true);
  };

  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.iconWarning}>
            <Clipboard size={18} />
          </div>
          <h3>Confirm Multi-Line Paste</h3>
        </div>

        <p className={styles.modalSubtitle}>
          You are pasting <strong>{lineCount} lines</strong> ({totalLength.toLocaleString()} characters) into the terminal. Pasting multi-line commands can execute them immediately.
        </p>

        <div className={styles.previewBox}>
          {previewLines.map((line, idx) => (
            <div key={idx} className={styles.previewLine}>
              <span className={styles.lineNumber}>{idx + 1}</span>
              <code>{line}</code>
            </div>
          ))}
          {lineCount > previewLines.length && (
            <div className={styles.previewMore}>
              ... and {lineCount - previewLines.length} more lines
            </div>
          )}
        </div>

        <div className={styles.checkboxRow}>
          <label>
            <input
              type="checkbox"
              checked={dontAsk}
              onChange={handleCheckboxChange}
            />
            Don't ask again (can be changed in Settings)
          </label>
        </div>

        <div className={styles.modalActions}>
          <button className={styles.btnSecondary} onClick={onCancel}>
            Cancel
          </button>
          <button
            className={styles.btnSecondary}
            onClick={handlePasteSingle}
            title="Join lines with space into a single command line"
          >
            Paste as Single Line
          </button>
          <button
            className={styles.btnPrimary}
            onClick={handlePasteRegular}
          >
            Paste
          </button>
        </div>
      </div>
    </div>
  );
};
