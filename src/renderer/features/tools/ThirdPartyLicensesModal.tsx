import React from 'react';
import { X, FileText } from 'lucide-react';
import styles from './SystemTools.module.css';

interface ThirdPartyLicensesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThirdPartyLicensesModal: React.FC<ThirdPartyLicensesModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.licenseModalCard}>
        <div className={styles.modalHeader}>
          <div className={styles.headerTitle}>
            <FileText size={20} color="#6C8CFF" />
            <span>Third-Party Open Source Licenses</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.licenseBody}>
          <h4>WinUtil (Chris Titus Tech's Windows Utility)</h4>
          <p><strong>License:</strong> MIT License</p>
          <p><strong>Copyright:</strong> Copyright (c) 2022 CT Tech Group LLC</p>
          <hr style={{ borderColor: '#2B303C', margin: '12px 0' }} />

          <pre className={styles.licenseText}>
{`MIT License

Copyright (c) 2022 CT Tech Group LLC

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction privileges, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`}
          </pre>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
