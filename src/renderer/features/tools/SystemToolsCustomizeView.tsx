import React, { useEffect, useState } from 'react';
import {
  Sliders,
  Save,
  RotateCcw,
  ArrowLeft,
  Plus,
  Trash2,
  Download,
} from 'lucide-react';
import { CustomizationConfig, CustomizationSchema } from '../../../shared/toolsTypes';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import styles from './SystemTools.module.css';

export const SystemToolsCustomizeView: React.FC = () => {
  const { setActiveNavTab } = useWorkspaceStore();
  const [config, setConfig] = useState<CustomizationConfig>(CustomizationSchema.parse({}));
  const [isSaving, setIsSaving] = useState(false);

  // New string replacement input state
  const [newSearch, setNewSearch] = useState('');
  const [newReplace, setNewReplace] = useState('');

  // Custom tweak input state
  const [tweakName, setTweakName] = useState('');
  const [tweakDesc, setTweakDesc] = useState('');
  const [tweakScript, setTweakScript] = useState('');

  const loadConfig = async () => {
    try {
      if (window.api?.tools) {
        await window.api.tools.getStatus();
      }
    } catch (e) {
      console.error('Failed to load customization config:', e);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (window.api?.tools) {
        await window.api.tools.customize(config);
        await window.api.tools.rebuild();
      }
    } catch (e) {
      console.error('Save customization failed:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddStringReplacement = () => {
    if (!newSearch.trim() || !newReplace.trim()) return;
    const current = config.branding.stringReplacements || [];
    setConfig({
      ...config,
      branding: {
        ...config.branding,
        stringReplacements: [...current, { search: newSearch, replace: newReplace }],
      },
    });
    setNewSearch('');
    setNewReplace('');
  };

  const handleRemoveStringReplacement = (idx: number) => {
    const current = [...(config.branding.stringReplacements || [])];
    current.splice(idx, 1);
    setConfig({
      ...config,
      branding: {
        ...config.branding,
        stringReplacements: current,
      },
    });
  };

  const handleAddCustomTweak = () => {
    if (!tweakName.trim() || !tweakScript.trim()) return;
    const id = `custom-tweak-${Date.now()}`;
    const newTweak = {
      id,
      name: tweakName,
      description: tweakDesc,
      category: 'Custom',
      script: tweakScript,
    };
    setConfig({
      ...config,
      add: {
        ...config.add,
        tweaks: [...(config.add.tweaks || []), newTweak],
      },
    });
    setTweakName('');
    setTweakDesc('');
    setTweakScript('');
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(config, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'customization.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleReset = () => {
    setConfig(CustomizationSchema.parse({}));
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerCard}>
        <div className={styles.headerTitle}>
          <button className={styles.actionButton} onClick={() => setActiveNavTab('tools')}>
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
          <h2>Customize System Tools</h2>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className={styles.actionButton} onClick={handleExportJSON}>
            <Download size={16} />
            <span>Export JSON</span>
          </button>
          <button className={styles.actionButton} onClick={handleReset}>
            <RotateCcw size={16} />
            <span>Reset Defaults</span>
          </button>
          <button className={styles.launchButton} onClick={handleSave} disabled={isSaving}>
            <Save size={16} />
            <span>{isSaving ? 'Rebuilding...' : 'Save & Rebuild'}</span>
          </button>
        </div>
      </div>

      {/* Branding Section */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span>Branding & Visual Customization</span>
          <Sliders size={16} color="#6C8CFF" />
        </div>

        <div className={styles.detailsGrid}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Product Name</span>
            <input
              type="text"
              value={config.branding.productName}
              onChange={(e) =>
                setConfig({
                  ...config,
                  branding: { ...config.branding, productName: e.target.value },
                })
              }
              style={{ background: '#12151C', border: '1px solid #2B303C', color: '#FFF', padding: '4px 8px', borderRadius: 4 }}
            />
          </div>

          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Window Title</span>
            <input
              type="text"
              value={config.branding.windowTitle}
              onChange={(e) =>
                setConfig({
                  ...config,
                  branding: { ...config.branding, windowTitle: e.target.value },
                })
              }
              style={{ background: '#12151C', border: '1px solid #2B303C', color: '#FFF', padding: '4px 8px', borderRadius: 4 }}
            />
          </div>

          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Accent Color</span>
            <input
              type="color"
              value={config.branding.colors?.accent || '#6C8CFF'}
              onChange={(e) =>
                setConfig({
                  ...config,
                  branding: {
                    ...config.branding,
                    colors: { ...config.branding.colors, accent: e.target.value },
                  },
                })
              }
              style={{ border: 'none', background: 'none', cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* String replacements table */}
        <h4 style={{ margin: '12px 0 6px 0', fontSize: 13, color: '#D1D9E6' }}>String Search & Replace Table</h4>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            type="text"
            placeholder="Search text (e.g. Chris Titus Tech)"
            value={newSearch}
            onChange={(e) => setNewSearch(e.target.value)}
            style={{ flex: 1, background: '#0B0D10', border: '1px solid #2B303C', color: '#FFF', padding: '6px 10px', borderRadius: 4, fontSize: 12 }}
          />
          <input
            type="text"
            placeholder="Replacement text"
            value={newReplace}
            onChange={(e) => setNewReplace(e.target.value)}
            style={{ flex: 1, background: '#0B0D10', border: '1px solid #2B303C', color: '#FFF', padding: '6px 10px', borderRadius: 4, fontSize: 12 }}
          />
          <button className={styles.actionButton} onClick={handleAddStringReplacement}>
            <Plus size={14} />
            <span>Add Rule</span>
          </button>
        </div>

        {config.branding.stringReplacements?.map((rep, idx) => (
          <div key={idx} className={styles.cardRow} style={{ padding: '4px 0' }}>
            <span className={styles.label}>
              Replace "<strong>{rep.search}</strong>" with "<strong>{rep.replace}</strong>"
            </span>
            <button className={styles.actionButton} onClick={() => handleRemoveStringReplacement(idx)}>
              <Trash2 size={12} color="#F87171" />
            </button>
          </div>
        ))}
      </div>

      {/* Add Custom Tweaks Section */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span>Add Custom Tweaks</span>
          <Plus size={16} color="#4ADE80" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            type="text"
            placeholder="Tweak Name (e.g. Disable Telemetry)"
            value={tweakName}
            onChange={(e) => setTweakName(e.target.value)}
            style={{ background: '#0B0D10', border: '1px solid #2B303C', color: '#FFF', padding: '6px 10px', borderRadius: 4, fontSize: 12 }}
          />
          <input
            type="text"
            placeholder="Description"
            value={tweakDesc}
            onChange={(e) => setTweakDesc(e.target.value)}
            style={{ background: '#0B0D10', border: '1px solid #2B303C', color: '#FFF', padding: '6px 10px', borderRadius: 4, fontSize: 12 }}
          />
          <textarea
            placeholder="PowerShell Script (e.g. Set-ItemProperty -Path 'HKLM:\...' -Name 'Value' -Value 0)"
            value={tweakScript}
            onChange={(e) => setTweakScript(e.target.value)}
            style={{ background: '#0B0D10', border: '1px solid #2B303C', color: '#FFF', padding: '6px 10px', borderRadius: 4, fontSize: 12, height: 60 }}
          />
          <button className={styles.actionButton} onClick={handleAddCustomTweak} style={{ alignSelf: 'flex-start' }}>
            <Plus size={14} />
            <span>Add Custom Tweak</span>
          </button>
        </div>

        {config.add.tweaks?.map((tweak) => (
          <div key={tweak.id} className={styles.cardRow} style={{ padding: '6px 0', borderTop: '1px solid #1E222B' }}>
            <div>
              <strong style={{ color: '#E2E8F0' }}>{tweak.name}</strong> - <span style={{ color: '#7A899B' }}>{tweak.description}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
