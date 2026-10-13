import React from 'react';
import {
  Plus,
  Play,
  Upload,
  Download,
  ListPlus,
  Trash2,
  Cpu,
  Search,
  CheckSquare,
  Square,
  Zap,
} from 'lucide-react';
import { useScriptsStore } from './useScriptsStore';
import styles from './ScriptRunnerView.module.css';
import { ScriptType } from '../../../shared/scriptRunnerTypes';

interface ScriptLibraryProps {
  onOpenInterpreters: () => void;
}

const TYPE_ICONS: Record<ScriptType, string> = {
  powershell: 'PS',
  cmd: 'CMD',
  node: 'JS',
  typescript: 'TS',
  python: 'PY',
  bash: 'SH',
  vbs: 'VBS',
  command: 'CLI',
};

export const ScriptLibrary: React.FC<ScriptLibraryProps> = ({ onOpenInterpreters }) => {
  const {
    scripts,
    sequences,
    selectedScriptId,
    filterQuery,
    selectedScriptIds,
    setSelectedScriptId,
    setFilterQuery,
    toggleSelectScript,
    clearSelectedScripts,
    createNewScript,
    importScripts,
    exportScripts,
    runNow,
    addToQueue,
    runAllSelectedInOrder,
    loadSequence,
    deleteSequence,
  } = useScriptsStore();

  const filteredScripts = scripts.filter((s) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.type.toLowerCase().includes(q) ||
      (s.description && s.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className={styles.sidebar}>
      {/* 1. Header */}
      <div className={styles.sidebarHeader}>
        <div className={styles.sidebarTitleRow}>
          <h3 className={styles.sidebarTitle}>
            Scripts
            <span className={styles.countText}>({scripts.length})</span>
          </h3>
        </div>
        <div className={styles.sidebarActions}>
          <button
            type="button"
            className={styles.btnIconOnly}
            title="Import Scripts"
            onClick={importScripts}
          >
            <Upload size={14} />
          </button>
          <button
            type="button"
            className={styles.btnIconOnly}
            title="Export Selected"
            onClick={() => exportScripts()}
          >
            <Download size={14} />
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            style={{ height: '28px', padding: '0 8px' }}
            title="New Script"
            onClick={createNewScript}
          >
            <Plus size={14} />
            New
          </button>
        </div>
      </div>

      {/* 2. Filter Search Box */}
      <div className={styles.searchContainer}>
        <Search size={14} className={styles.searchIcon} />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Filter scripts..."
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
        />
      </div>

      {/* 3. Multi-Select Banner */}
      {selectedScriptIds.length > 0 && (
        <div className={styles.selectionBanner}>
          <span>{selectedScriptIds.length} selected</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className={styles.btnPrimary}
              style={{ height: '22px', fontSize: '11px', padding: '0 6px' }}
              onClick={runAllSelectedInOrder}
            >
              Run in Order
            </button>
            <button
              type="button"
              className={styles.btnSecondary}
              style={{ height: '22px', fontSize: '11px', padding: '0 6px' }}
              onClick={clearSelectedScripts}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* 4. Scrollable List of Scripts & Sequences */}
      <div className={styles.scriptList}>
        {/* Saved Sequences */}
        {sequences.length > 0 && (
          <>
            <div className={styles.sectionLabel}>Sequences</div>
            {sequences.map((seq) => (
              <div
                key={seq.id}
                className={styles.scriptItem}
                style={{ height: '38px', minHeight: '38px' }}
              >
                <div
                  className={styles.itemLeft}
                  onClick={() => loadSequence(seq.id, false)}
                >
                  <Zap size={14} style={{ color: 'var(--accent)' }} />
                  <div className={styles.itemMeta}>
                    <span className={styles.itemName}>{seq.name}</span>
                    <span className={styles.itemSub}>{seq.scriptIds.length} steps</span>
                  </div>
                </div>
                <div className={styles.itemQuickActions}>
                  <button
                    type="button"
                    className={styles.quickBtn}
                    title="Run Sequence Now"
                    onClick={() => loadSequence(seq.id, true)}
                  >
                    <Play size={12} />
                  </button>
                  <button
                    type="button"
                    className={styles.quickBtn}
                    title="Delete Sequence"
                    onClick={() => deleteSequence(seq.id)}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        <div className={styles.sectionLabel}>Library</div>

        {filteredScripts.length === 0 ? (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
            No scripts found
          </div>
        ) : (
          filteredScripts.map((script) => {
            const isSelected = selectedScriptId === script.id;
            const isChecked = selectedScriptIds.includes(script.id);
            const typeBadge = TYPE_ICONS[script.type] || 'SH';

            return (
              <div
                key={script.id}
                className={`${styles.scriptItem} ${isSelected ? styles.scriptItemActive : ''}`}
                onClick={() => setSelectedScriptId(script.id)}
              >
                <div className={styles.itemLeft}>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelectScript(script.id);
                    }}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    {isChecked ? (
                      <CheckSquare size={14} style={{ color: 'var(--accent)' }} />
                    ) : (
                      <Square size={14} style={{ color: 'var(--text-muted)' }} />
                    )}
                  </div>
                  <div className={styles.itemMeta}>
                    <span className={styles.itemName}>{script.name}</span>
                    <span className={styles.itemSub}>
                      <span style={{ fontWeight: 600 }}>{typeBadge}</span>
                      <span>·</span>
                      <span>{script.source === 'file' ? 'File' : 'Saved'}</span>
                      {script.timeoutSeconds > 0 && (
                        <>
                          <span>·</span>
                          <span>{script.timeoutSeconds}s</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <div className={styles.itemQuickActions}>
                  <button
                    type="button"
                    className={styles.quickBtn}
                    title="Add to Queue"
                    onClick={(e) => {
                      e.stopPropagation();
                      addToQueue(script.id);
                    }}
                  >
                    <ListPlus size={13} />
                  </button>
                  <button
                    type="button"
                    className={styles.quickBtn}
                    title="Run Now"
                    onClick={(e) => {
                      e.stopPropagation();
                      runNow(script.id);
                    }}
                  >
                    <Play size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. Footer: Interpreters Health Trigger */}
      <div className={styles.sidebarFooter}>
        <button
          type="button"
          className={styles.btnSecondary}
          style={{ width: '100%', height: '28px', fontSize: '12px', justifyContent: 'center' }}
          onClick={onOpenInterpreters}
        >
          <Cpu size={13} />
          Interpreter Status
        </button>
      </div>
    </div>
  );
};
