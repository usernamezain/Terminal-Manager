import React, { useState, useEffect, useMemo } from 'react';
import { useProjectRunnerStore } from './useProjectRunnerStore';
import { CURATED_PACKAGES } from '../../../main/project-runner/curatedPackages';
import { ProjectCommand } from '../../../shared/projectRunnerTypes';
import styles from './AddPackageModal.module.css';

interface AddPackageModalProps {
  onToast?: (message: string) => void;
}

export const AddPackageModal: React.FC<AddPackageModalProps> = ({ onToast }) => {
  const { addPackageModal, closeAddPackage, projects, runCommand, detect } = useProjectRunnerStore();

  const [packageName, setPackageName] = useState('');
  const [version, setVersion] = useState('');
  const [isDev, setIsDev] = useState(false);
  const [allowAdvanced, setAllowAdvanced] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (addPackageModal) {
      setIsDev(Boolean(addPackageModal.isDev));
      setPackageName('');
      setVersion('');
      setValidationError(null);
    }
  }, [addPackageModal]);

  if (!addPackageModal) return null;

  const { sessionId, projectPath, ecosystem } = addPackageModal;
  const project = projects[sessionId];
  const detectedTool = project?.ecosystems.find((e) => e.type === ecosystem)?.tool || 'npm';

  const curatedList = CURATED_PACKAGES[ecosystem] || [];

  // Autocomplete search debounced
  useEffect(() => {
    if (!packageName.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        if (window.api?.projectRunner) {
          const results = await window.api.projectRunner.searchPackages({
            ecosystem,
            query: packageName,
          });
          setSuggestions(results.map((r) => r.name));
        }
      } catch {
        setSuggestions([]);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [packageName, ecosystem]);

  // Live preview command text
  const previewCommandText = useMemo(() => {
    const rawPkgs = packageName.trim() || '<package>';
    const ver = version.trim();

    if (ecosystem === 'node') {
      const pm = detectedTool;
      const devFlag = isDev ? (pm === 'npm' ? ' -D' : ' -D') : '';
      const action = pm === 'npm' ? 'install' : 'add';
      const spec = ver ? `${rawPkgs}@${ver}` : rawPkgs;
      return `${pm} ${action}${devFlag} ${spec}`;
    }

    if (ecosystem === 'python') {
      const pm = detectedTool;
      const spec = ver ? `${rawPkgs}${ver.startsWith('=') || ver.startsWith('>') || ver.startsWith('<') ? '' : '=='}${ver}` : rawPkgs;
      if (pm === 'poetry') {
        const devFlag = isDev ? ' --group dev' : '';
        return `poetry add${devFlag} ${spec}`;
      } else if (pm === 'uv') {
        const devFlag = isDev ? ' --dev' : '';
        return `uv add${devFlag} ${spec}`;
      }
      return `pip install ${spec}`;
    }

    if (ecosystem === 'rust') {
      const devFlag = isDev ? ' --dev' : '';
      return `cargo add${devFlag} ${rawPkgs}`;
    }

    if (ecosystem === 'go') {
      return `go get ${rawPkgs}`;
    }

    if (ecosystem === 'dotnet') {
      return `dotnet add package ${rawPkgs}`;
    }

    if (ecosystem === 'php') {
      const devFlag = isDev ? ' --dev' : '';
      return `composer require${devFlag} ${rawPkgs}`;
    }

    return `${detectedTool} install ${rawPkgs}`;
  }, [packageName, version, isDev, ecosystem, detectedTool]);

  const handleInstall = async () => {
    if (!packageName.trim() || !window.api?.projectRunner) return;

    // Validate in main process first
    const valRes = await window.api.projectRunner.validatePackage({
      ecosystem,
      input: packageName.trim(),
      version: version.trim() || undefined,
      allowAdvanced,
    });

    if (!valRes.valid) {
      setValidationError(valRes.error || 'Invalid package name');
      return;
    }

    setValidationError(null);

    // Build ProjectCommand
    const cmd: ProjectCommand = {
      id: `add-pkg-${Date.now()}`,
      label: `Install ${valRes.packages.join(', ')}`,
      commandText: previewCommandText,
      tool: detectedTool,
      args: previewCommandText.split(' ').slice(1),
      cwd: projectPath,
      category: 'package',
    };

    closeAddPackage();

    await runCommand(sessionId, cmd, 'terminal', projectPath);

    if (onToast) {
      onToast(`Installed ${valRes.packages.join(', ')}`);
    }

    // Re-detect project after install
    setTimeout(() => {
      detect(sessionId, projectPath, undefined, true);
    }, 1500);
  };

  const handleChipClick = (pkg: string) => {
    setPackageName(pkg);
    setValidationError(null);
  };

  return (
    <div className={styles.backdrop} onClick={closeAddPackage}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.title}>
            Add Package ({ecosystem.toUpperCase()})
          </div>
          <button className={styles.closeButton} onClick={closeAddPackage} title="Close">
            ✕
          </button>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Package name (space or comma separated for multi):</label>
          <div className={styles.inputRow}>
            <input
              className={styles.input}
              placeholder="e.g. react, axios"
              value={packageName}
              autoFocus
              onChange={(e) => {
                setPackageName(e.target.value);
                setValidationError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleInstall();
                if (e.key === 'Escape') closeAddPackage();
              }}
            />
            <input
              className={styles.versionInput}
              placeholder="version (opt)"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleInstall();
                if (e.key === 'Escape') closeAddPackage();
              }}
            />
          </div>
        </div>

        {(ecosystem === 'node' || ecosystem === 'python' || ecosystem === 'rust' || ecosystem === 'php') && (
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={isDev}
              onChange={(e) => setIsDev(e.target.checked)}
            />
            <span>Install as development dependency / extra group</span>
          </label>
        )}

        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={allowAdvanced}
            onChange={(e) => setAllowAdvanced(e.target.checked)}
          />
          <span>Advanced mode (allow explicit versions, git URLs, or paths)</span>
        </label>

        {/* Quick Picks / Suggestions */}
        <div className={styles.fieldGroup}>
          <div className={styles.label}>
            {suggestions.length > 0 ? 'Search Suggestions:' : 'Quick Picks:'}
          </div>
          <div className={styles.chipsContainer}>
            {(suggestions.length > 0 ? suggestions : curatedList).slice(0, 16).map((item) => (
              <button
                key={item}
                type="button"
                className={styles.chip}
                onClick={() => handleChipClick(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Live Command Preview */}
        <div className={styles.fieldGroup}>
          <div className={styles.label}>Command Preview:</div>
          <div className={styles.previewBox}>{previewCommandText}</div>
        </div>

        {validationError && (
          <div className={styles.errorBanner}>{validationError}</div>
        )}

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={closeAddPackage}>
            Cancel
          </button>
          <button
            className={styles.installBtn}
            onClick={handleInstall}
            disabled={!packageName.trim()}
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
};
