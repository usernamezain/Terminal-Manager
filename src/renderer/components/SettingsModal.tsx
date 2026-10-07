import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useSettingsStore } from '@renderer/store/useSettingsStore';
import { ShellExperienceSettingsView } from '../features/shell-experience/ShellExperienceSettingsView';
import { ThemeName, WindowMaterial, AnimationLevel, UiDensity, CursorStyle } from '@shared/types';
import styles from './SettingsModal.module.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings } = useSettingsStore();
  const [modalTab, setModalTab] = React.useState<'general' | 'shellexp'>('general');

  if (!isOpen) return null;

  const animationLevel = settings.animationLevel;
  const isInstant = animationLevel === 'off';

  return (
    <AnimatePresence>
      <motion.div
        className={styles.backdrop}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: isInstant ? 0 : 0.16 }}
        onClick={onClose}
      >
        <motion.div
          className={styles.modal}
          style={{ maxWidth: modalTab === 'shellexp' ? 850 : 540, width: '90%', height: modalTab === 'shellexp' ? '85vh' : 'auto' }}
          initial={isInstant ? undefined : { scale: 0.95, opacity: 0 }}
          animate={isInstant ? undefined : { scale: 1, opacity: 1 }}
          exit={isInstant ? undefined : { scale: 0.95, opacity: 0 }}
          transition={{ duration: isInstant ? 0 : 0.16, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.header}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <h2 className={styles.title} style={{ cursor: 'pointer', color: modalTab === 'general' ? '#FFFFFF' : '#8A99AD' }} onClick={() => setModalTab('general')}>
                General Settings
              </h2>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
              <h2 className={styles.title} style={{ cursor: 'pointer', color: modalTab === 'shellexp' ? '#FFFFFF' : '#8A99AD' }} onClick={() => setModalTab('shellexp')}>
                Shell Experience
              </h2>
            </div>
            <button className={styles.closeButton} onClick={onClose} title="Close Settings">
              <X size={16} />
            </button>
          </div>

          <div className={styles.body} style={{ overflowY: 'auto' }}>
            {modalTab === 'shellexp' ? (
              <ShellExperienceSettingsView />
            ) : (
              <>
            {/* Theme */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Theme</label>
              <select
                className={styles.select}
                value={settings.theme}
                onChange={(e) => updateSettings({ theme: e.target.value as ThemeName })}
              >
                <option value="midnight">Midnight (Default Dark)</option>
                <option value="graphite">Graphite (Proof of Swappable System)</option>
              </select>
            </div>

            {/* Window Material & Animation Level */}
            <div className={styles.row}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Window Material</label>
                <select
                  className={styles.select}
                  value={settings.windowMaterial}
                  onChange={(e) =>
                    updateSettings({ windowMaterial: e.target.value as WindowMaterial })
                  }
                >
                  <option value="mica">Mica (Windows 11)</option>
                  <option value="acrylic">Acrylic</option>
                  <option value="solid">Solid (Dark Surface)</option>
                </select>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Animation Level</label>
                <select
                  className={styles.select}
                  value={settings.animationLevel}
                  onChange={(e) =>
                    updateSettings({ animationLevel: e.target.value as AnimationLevel })
                  }
                >
                  <option value="full">Full (Springs & Motion)</option>
                  <option value="reduced">Reduced (Fades only)</option>
                  <option value="off">Off (Instant UI)</option>
                </select>
              </div>
            </div>

            {/* UI Density & Font Family */}
            <div className={styles.row}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>UI Density</label>
                <select
                  className={styles.select}
                  value={settings.uiDensity}
                  onChange={(e) => updateSettings({ uiDensity: e.target.value as UiDensity })}
                >
                  <option value="compact">Compact</option>
                  <option value="normal">Normal</option>
                  <option value="comfortable">Comfortable</option>
                </select>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Font Size</label>
                <input
                  type="number"
                  className={styles.input}
                  value={settings.fontSize}
                  min={8}
                  max={36}
                  onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
                />
              </div>
            </div>

            {/* Cursor Style & Scrollback */}
            <div className={styles.row}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Cursor Style</label>
                <select
                  className={styles.select}
                  value={settings.cursorStyle}
                  onChange={(e) =>
                    updateSettings({ cursorStyle: e.target.value as CursorStyle })
                  }
                >
                  <option value="block">Block</option>
                  <option value="underline">Underline</option>
                  <option value="bar">Bar</option>
                </select>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Scrollback Lines</label>
                <input
                  type="number"
                  className={styles.input}
                  value={settings.scrollback}
                  min={100}
                  max={50000}
                  onChange={(e) => updateSettings({ scrollback: Number(e.target.value) })}
                />
              </div>
            </div>

            {/* Cursor Blink */}
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={settings.cursorBlink}
                onChange={(e) => updateSettings({ cursorBlink: e.target.checked })}
              />
              <span>Cursor Blink</span>
            </label>
            </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
