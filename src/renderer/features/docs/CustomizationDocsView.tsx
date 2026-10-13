import React, { useState, useEffect } from 'react';
import { Search, Copy, Check } from 'lucide-react';
import { SettingsHeader } from '../../components/settings/SettingsHeader';
import styles from '../../components/settings/SettingsLayout.module.css';

interface DocItem {
  id: string;
  title: string;
  summary: string;
  steps: string[];
  codeExample?: string;
  codeLanguage?: string;
}

interface DocTopic {
  id: string;
  title: string;
  description: string;
  items: DocItem[];
}

const DOC_TOPICS: DocTopic[] = [
  {
    id: 'appearance',
    title: 'Appearance & Themes',
    description: 'Customize themes, window materials, typography, and cursor settings.',
    items: [
      {
        id: 'themes',
        title: 'Color Palettes & Themes',
        summary:
          'Terminal Manager provides dark themes built on HSL color tokens. You can switch between Midnight and Graphite or define custom overrides.',
        steps: [
          'Open Settings (Ctrl+, or click the Settings icon in the sidebar).',
          'Under Preferences > General, locate Theme Palette.',
          'Select Midnight (default deep black) or Graphite (slate charcoal).',
          'The changes apply immediately across chrome, sidebar, and tab surfaces.',
        ],
        codeExample: ':root {\n  --bg-base: #0B0D10;\n  --bg-surface: rgba(20, 23, 28, 0.72);\n  --accent: #6C8CFF;\n}',
        codeLanguage: 'css',
      },
      {
        id: 'materials',
        title: 'Window Backdrop Materials',
        summary:
          'Configure native Windows 11 window backdrop blending for desktop integration.',
        steps: [
          'In General Settings, locate the Window Material dropdown.',
          'Choose Mica for native Windows 11 wallpaper tinting, Acrylic for translucent glass, or Solid for high contrast.',
          'The window frame automatically manages hardware acceleration.',
        ],
      },
      {
        id: 'typography',
        title: 'Typography & Cursor Settings',
        summary:
          'Configure font sizing, density spacing, cursor shapes, and blink behavior.',
        steps: [
          'Navigate to General Settings > Terminal & Typography.',
          'Adjust Font Size between 8px and 36px.',
          'Select UI Density (Compact, Normal, or Comfortable).',
          'Choose Cursor Style (Block, Underline, or Bar) and toggle Enable Cursor Blinking.',
        ],
      },
    ],
  },
  {
    id: 'shellexp',
    title: 'Shell Engine & Performance',
    description: 'Execution isolation boundaries, fast startup caching, and upstream synchronization.',
    items: [
      {
        id: 'isolation',
        title: 'Execution Mode & Isolation',
        summary:
          'Terminal Manager allows you to isolate customization scripts to app-launched sessions or synchronize them system-wide.',
        steps: [
          'Navigate to Settings > Shell Experience > Overview.',
          'Select App-scoped to keep your user $PROFILE completely untouched.',
          'Select System-wide if you want the customizations applied to standalone PowerShell consoles outside the app.',
        ],
        codeExample: '# In App-scoped mode, user profile remains untouched:\nGet-Content $PROFILE  # Original profile preserved',
        codeLanguage: 'powershell',
      },
      {
        id: 'faststart',
        title: 'Fast Start Optimization',
        summary:
          'Fast Start caches compiled script bytecode and defers secondary modules to background idle time, reducing cold terminal startup from ~3.2s to under 0.9s.',
        steps: [
          'Under Shell Experience > Overview, select Fast Start (Cached & Lazy).',
          'The engine automatically compiles cached profile stubs.',
          'Secondary plugins and aliases load non-blockingly after the initial prompt is ready.',
        ],
      },
      {
        id: 'updates',
        title: 'Engine Synchronization',
        summary:
          'Check for engine patches and profile core updates with one click.',
        steps: [
          'Open Shell Experience > Overview.',
          'Under Terminal Manager Profile Core, click Check Updates.',
          'The engine verifies git signatures and updates the profile runtime safely.',
        ],
      },
    ],
  },
  {
    id: 'syntax',
    title: 'Syntax Highlighting & Prompts',
    description: 'PSReadLine syntax color tokens, Oh My Posh themes, and predictive completions.',
    items: [
      {
        id: 'prompts',
        title: 'Oh My Posh Prompt Gallery',
        summary:
          'Preview, select, and duplicate prompt themes with live ANSI rendering.',
        steps: [
          'Navigate to Settings > Shell Experience > Prompt Gallery.',
          'Select a theme from the dropdown (such as cobalt2, agnoster, pure, or atomic) to see an instant live preview.',
          'Click Duplicate Theme to create an editable custom JSON file.',
          'Edit segment blocks and git indicators in the Theme JSON Editor.',
        ],
        codeExample: '{\n  "$schema": "https://raw.githubusercontent.com/JanDeDobbeleer/oh-my-posh/main/themes/schema.json",\n  "blocks": [\n    {\n      "type": "prompt",\n      "alignment": "left",\n      "segments": [\n        { "type": "path", "style": "powerline" }\n      ]\n    }\n  ]\n}',
        codeLanguage: 'json',
      },
      {
        id: 'colors',
        title: 'PSReadLine Syntax Colors',
        summary:
          'Customize syntax coloring across 17 distinct syntax token slots.',
        steps: [
          'Open Settings > Shell Experience > Syntax Colors.',
          'Pick any token slot (Command, Parameter, Operator, String, Variable, Number, etc.).',
          'Use the color picker or input a hex color value.',
          'Inspect the live syntax line to verify contrast and readability.',
        ],
      },
      {
        id: 'predictions',
        title: 'IntelliSense & Predictions',
        summary:
          'Configure history and plugin predictive completions and sensitive word filters.',
        steps: [
          'Open Settings > Shell Experience > Predictions.',
          'Set Prediction Source to History & Plugins.',
          'Select View Style: Inline View for ghost text or List View for popup menu.',
          'Add keywords (e.g. apikey, token, pass) to Sensitive Filters to prevent storing them in history.',
        ],
      },
      {
        id: 'icons',
        title: 'File & Folder Glyphs',
        summary:
          'Enable Nerd Font glyphs in folder directory outputs (dir, ls, Get-ChildItem).',
        steps: [
          'Go to Settings > Shell Experience > File Icons.',
          'Toggle Enable Glyphs.',
          'Select your Color Theme (Default, Vibrant, Minimal) and Icon Set.',
        ],
      },
    ],
  },
  {
    id: 'keys',
    title: 'Keybindings & Shortcuts',
    description: 'Global app shortcuts and PSReadLine command line chord handlers.',
    items: [
      {
        id: 'global-keys',
        title: 'Application Shortcuts',
        summary:
          'Default keyboard chords for workspace and window navigation.',
        steps: [
          'New Terminal Tab: Ctrl+Shift+T',
          'Split Pane Row: Ctrl+Shift+D',
          'Split Pane Column: Ctrl+Shift+E',
          'Close Focused Pane: Ctrl+Shift+W',
          'Toggle Maximize Pane: Ctrl+Shift+Enter',
          'Spatial Navigation: Alt+Up, Alt+Down, Alt+Left, Alt+Right',
          'Open Documentation: F1 or Ctrl+Shift+D',
          'Open Settings: Ctrl+,',
          'Close Panel / Dismiss: Escape',
        ],
      },
      {
        id: 'shell-keys',
        title: 'PSReadLine Keybinding Chords',
        summary:
          'Map custom editing keys to PSReadLine functions.',
        steps: [
          'Navigate to Settings > Shell Experience > Keybindings.',
          'View active bindings such as Ctrl+w (BackwardDeleteWord), Alt+d (DeleteWord), and Tab (MenuComplete).',
          'To add a binding, enter a shortcut chord, select the handler function, and click Add Binding.',
        ],
      },
    ],
  },
  {
    id: 'commands',
    title: 'Aliases & Custom Commands',
    description: 'Productivity command shortcuts, Git aliases, and custom PowerShell functions.',
    items: [
      {
        id: 'builtin-aliases',
        title: 'Built-in Productivity Aliases',
        summary:
          'Terminal Manager provides fast aliases for common Git and file tasks.',
        steps: [
          'Open Settings > Shell Experience > Commands & Aliases.',
          'Toggle any alias on or off (e.g. gs for git status, lazyg for add+commit+push, mkcd for create and cd, trash for safe Recycle Bin deletion).',
          'Disabled aliases are automatically excluded during profile generation.',
        ],
        codeExample: '# Built-in shortcuts ready to use:\ngs       # git status\nmkcd dev # mkdir dev; cd dev\ntrash tmp.log # Safely send to Recycle Bin',
        codeLanguage: 'powershell',
      },
      {
        id: 'custom-aliases',
        title: 'Creating Custom Functions',
        summary:
          'Write custom PowerShell functions with built-in syntax verification.',
        steps: [
          'In Commands & Aliases, scroll to Custom Aliases & Functions.',
          'Enter an Alias Name and choose Custom Function.',
          'Enter your PowerShell script body.',
          'Click Test PowerShell Syntax to validate script syntax before saving.',
        ],
        codeExample: 'function myDeploy($env) {\n  Write-Host "Deploying to $env..." -ForegroundColor Cyan\n  npm run build\n}',
        codeLanguage: 'powershell',
      },
    ],
  },
  {
    id: 'advanced',
    title: 'Advanced Scripting',
    description: 'User-managed PowerShell script regions, environment variables, and modules.',
    items: [
      {
        id: 'user-region',
        title: 'Custom User Code Region',
        summary:
          'Inject arbitrary PowerShell code that is preserved permanently at the end of the profile.',
        steps: [
          'Navigate to Settings > Shell Experience > Advanced Scripting.',
          'Enter custom environment variable definitions, path modifications, or custom module imports into the User Code Region.',
          'Click Save User Code.',
          'Terminal Manager guarantees this code block is appended and untouched across app updates.',
        ],
        codeExample: '# User Code Region Example:\n$env:EDITOR = "code"\n$env:PAGER = "cat"\nImport-Module -Name posh-git -ErrorAction SilentlyContinue',
        codeLanguage: 'powershell',
      },
    ],
  },
];

interface CustomizationDocsViewProps {
  onClose?: () => void;
}

export const CustomizationDocsView: React.FC<CustomizationDocsViewProps> = ({ onClose }) => {
  const [selectedTopicId, setSelectedTopicId] = useState<string>('appearance');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Esc key closes documentation if onClose is provided
  useEffect(() => {
    if (!onClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeId(id);
    setTimeout(() => {
      setCopiedCodeId(null);
    }, 2000);
  };

  const selectedTopic: DocTopic = DOC_TOPICS.find((t) => t.id === selectedTopicId) || DOC_TOPICS[0]!;

  // Search filtering
  const q = searchQuery.toLowerCase().trim();
  const searchResults = q
    ? DOC_TOPICS.flatMap((topic) =>
        topic.items
          .filter(
            (item) =>
              item.title.toLowerCase().includes(q) ||
              item.summary.toLowerCase().includes(q) ||
              item.steps.some((s) => s.toLowerCase().includes(q))
          )
          .map((item) => ({ ...item, topicTitle: topic.title }))
      )
    : null;

  return (
    <div className={styles.panelView}>
      <SettingsHeader
        title="Documentation"
        subtitle="Terminal Manager Customization Guide"
        onClose={onClose || (() => {})}
      />

      <div className={styles.layoutBody}>
        {/* Left Column: Search & Topic List */}
        <nav className={styles.navColumn} aria-label="Documentation table of contents">
          <div style={{ padding: '0 4px 8px 4px' }}>
            <div style={{ position: 'relative' }}>
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
                type="text"
                className={styles.controlInput}
                style={{
                  width: '100%',
                  paddingLeft: 30,
                  minWidth: 0,
                  boxSizing: 'border-box',
                }}
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.navGroupTitle}>Topics</div>
          {DOC_TOPICS.map((topic) => (
            <button
              key={topic.id}
              type="button"
              className={`${styles.navItem} ${
                !searchQuery && selectedTopicId === topic.id ? styles.navItemActive : ''
              }`}
              onClick={() => {
                setSelectedTopicId(topic.id);
                setSearchQuery('');
              }}
            >
              <div className={styles.navItemContent}>
                <span>{topic.title}</span>
              </div>
            </button>
          ))}
        </nav>

        {/* Right Column: Content */}
        <main className={styles.contentColumn}>
          <div className={styles.contentContainer}>
            {searchResults ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.sectionHeading}>
                      Search Results for &quot;{searchQuery}&quot;
                    </h2>
                    <p className={styles.sectionDescription}>
                      Found {searchResults.length} matching guide{searchResults.length === 1 ? '' : 's'}.
                    </p>
                  </div>
                </div>

                {searchResults.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    No documentation entries matched your query. Try a different search term.
                  </p>
                ) : (
                  searchResults.map((item) => (
                    <article
                      key={item.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        paddingBottom: 24,
                        borderBottom: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
                          {item.topicTitle}
                        </span>
                        <h3
                          style={{
                            margin: '4px 0 0 0',
                            fontSize: 16,
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                          }}
                        >
                          {item.title}
                        </h3>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {item.summary}
                      </p>

                      <ol
                        style={{
                          margin: '4px 0 0 0',
                          paddingLeft: 20,
                          fontSize: 13,
                          color: 'var(--text-secondary)',
                          lineHeight: 1.6,
                        }}
                      >
                        {item.steps.map((step, idx) => (
                          <li key={idx} style={{ marginBottom: 4 }}>
                            {step}
                          </li>
                        ))}
                      </ol>

                      {item.codeExample && (
                        <div style={{ position: 'relative', marginTop: 8 }}>
                          <pre
                            style={{
                              margin: 0,
                              padding: 12,
                              background: 'var(--bg-base)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: 6,
                              fontFamily: 'var(--font-terminal)',
                              fontSize: 12,
                              color: 'var(--text-primary)',
                              overflowX: 'auto',
                              lineHeight: 1.5,
                            }}
                          >
                            {item.codeExample}
                          </pre>
                          <button
                            type="button"
                            className={styles.btnSecondary}
                            style={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              height: 26,
                              padding: '0 8px',
                              fontSize: 12,
                            }}
                            onClick={() => copyToClipboard(item.id, item.codeExample!)}
                            title="Copy code"
                          >
                            {copiedCodeId === item.id ? <Check size={12} /> : <Copy size={12} />}
                            <span>{copiedCodeId === item.id ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      )}
                    </article>
                  ))
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.pageTitle} style={{ fontSize: 18 }}>
                      {selectedTopic.title}
                    </h2>
                    <p className={styles.sectionDescription}>{selectedTopic.description}</p>
                  </div>
                </div>

                {selectedTopic.items.map((item) => (
                  <article
                    key={item.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      paddingBottom: 24,
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                      }}
                    >
                      {item.title}
                    </h3>

                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {item.summary}
                    </p>

                    <ol
                      style={{
                        margin: '4px 0 0 0',
                        paddingLeft: 20,
                        fontSize: 13,
                        color: 'var(--text-secondary)',
                        lineHeight: 1.6,
                      }}
                    >
                      {item.steps.map((step, idx) => (
                        <li key={idx} style={{ marginBottom: 4 }}>
                          {step}
                        </li>
                      ))}
                    </ol>

                    {item.codeExample && (
                      <div style={{ position: 'relative', marginTop: 8 }}>
                        <pre
                          style={{
                            margin: 0,
                            padding: 12,
                            background: 'var(--bg-base)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 6,
                            fontFamily: 'var(--font-terminal)',
                            fontSize: 12,
                            color: 'var(--text-primary)',
                            overflowX: 'auto',
                            lineHeight: 1.5,
                          }}
                        >
                          {item.codeExample}
                        </pre>
                        <button
                          type="button"
                          className={styles.btnSecondary}
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            height: 26,
                            padding: '0 8px',
                            fontSize: 12,
                          }}
                          onClick={() => copyToClipboard(item.id, item.codeExample!)}
                          title="Copy code"
                        >
                          {copiedCodeId === item.id ? <Check size={12} /> : <Copy size={12} />}
                          <span>{copiedCodeId === item.id ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
