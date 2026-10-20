import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, X, ChevronRight, ChevronDown } from 'lucide-react';
import { loadAllDocTopics } from './docsLoader';
import { DocsSearchIndex } from './docsSearch';
import { SearchResultItem } from './docsTypes';
import { useWorkspaceStore as useUIWorkspaceStore } from '../../store/useWorkspaceStore';
import styles from './CustomizationDocsView.module.css';

interface CustomizationDocsViewProps {
  onClose: () => void;
  initialTopicId?: string;
  initialSectionId?: string;
}

export const CustomizationDocsView: React.FC<CustomizationDocsViewProps> = ({
  onClose,
  initialTopicId,
  initialSectionId,
}) => {
  // Load topics at build time via docsLoader (Vite import.meta.glob)
  const topics = useMemo(() => loadAllDocTopics(), []);

  // Initialize search indexer
  const searchIndex = useMemo(() => {
    const idx = new DocsSearchIndex();
    idx.indexTopics(topics);
    return idx;
  }, [topics]);

  // Deep linking state from UI store
  const docsTargetTopic = useUIWorkspaceStore((s) => (s as any).docsTargetTopic);
  const docsTargetSection = useUIWorkspaceStore((s) => (s as any).docsTargetSection);
  const clearDocsTarget = useUIWorkspaceStore((s) => (s as any).clearDocsTarget);

  // Active topic ID
  const [selectedTopicId, setSelectedTopicId] = useState<string>(() => {
    return docsTargetTopic || initialTopicId || (topics[0] ? topics[0].id : 'getting-started');
  });

  // Expanded tree topics in left sidebar
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const t of topics) {
      initial[t.id] = t.id === selectedTopicId;
    }
    return initial;
  });

  // Active section currently in view
  const [activeSectionId, setActiveSectionId] = useState<string>('');

  // Search query & results
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(0);

  // Scroll positions remembered per topic during session
  const topicScrollPositions = useRef<Map<string, number>>(new Map());

  // Refs for scroll and DOM containers
  const articleScrollRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Active topic object
  const activeTopic = useMemo(() => {
    return topics.find((t) => t.id === selectedTopicId) || topics[0] || null;
  }, [topics, selectedTopicId]);

  // Index of active topic for Prev/Next navigation
  const activeTopicIndex = useMemo(() => {
    return topics.findIndex((t) => t.id === selectedTopicId);
  }, [topics, selectedTopicId]);

  const prevTopic = activeTopicIndex > 0 ? topics[activeTopicIndex - 1] : null;
  const nextTopic = activeTopicIndex < topics.length - 1 ? topics[activeTopicIndex + 1] : null;

  // Handle deep link target changes
  useEffect(() => {
    if (docsTargetTopic) {
      setSelectedTopicId(docsTargetTopic);
      setExpandedTopics((prev) => ({ ...prev, [docsTargetTopic]: true }));

      if (docsTargetSection) {
        setTimeout(() => {
          scrollToSection(docsTargetSection);
        }, 100);
      }
      if (clearDocsTarget) clearDocsTarget();
    }
  }, [docsTargetTopic, docsTargetSection, clearDocsTarget]);

  // Initial section scroll on mount if provided
  useEffect(() => {
    if (initialSectionId) {
      setTimeout(() => {
        scrollToSection(initialSectionId);
      }, 150);
    }
  }, [initialSectionId]);

  // Search input change handler
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      setSelectedSearchIndex(0);
      return;
    }
    const results = searchIndex.search(q);
    setSearchResults(results);
    setSelectedSearchIndex(0);
  };

  // Keyboard navigation for search input
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSearchIndex((prev) => Math.min(searchResults.length - 1, prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSearchIndex((prev) => Math.max(0, prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults.length > 0) {
        const target = searchResults[selectedSearchIndex] || searchResults[0];
        if (target) {
          selectTopic(target.topicId, target.sectionId);
          setIsSearchFocused(false);
          searchInputRef.current?.blur();
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (searchQuery) {
        setSearchQuery('');
        setSearchResults([]);
      } else {
        onClose();
      }
    }
  };

  // Switch topic and restore / reset scroll
  const selectTopic = useCallback(
    (topicId: string, sectionId?: string) => {
      // Save current scroll position
      if (articleScrollRef.current && activeTopic) {
        topicScrollPositions.current.set(activeTopic.id, articleScrollRef.current.scrollTop);
      }

      setSelectedTopicId(topicId);
      setExpandedTopics((prev) => ({ ...prev, [topicId]: true }));
      setSearchQuery('');
      setSearchResults([]);

      setTimeout(() => {
        if (sectionId) {
          scrollToSection(sectionId);
        } else if (articleScrollRef.current) {
          const savedY = topicScrollPositions.current.get(topicId) || 0;
          articleScrollRef.current.scrollTop = savedY;
        }
      }, 50);
    },
    [activeTopic]
  );

  // Smooth scroll to target section anchor
  const scrollToSection = useCallback((sectionId: string) => {
    const cleanId = sectionId.replace(/^#/, '');
    const el = document.getElementById(cleanId);
    if (el && articleScrollRef.current) {
      const containerRect = articleScrollRef.current.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const offsetTop = elRect.top - containerRect.top + articleScrollRef.current.scrollTop - 20;

      articleScrollRef.current.scrollTo({
        top: Math.max(0, offsetTop),
        behavior: 'smooth',
      });
      setActiveSectionId(cleanId);
    }
  }, []);

  // Toggle tree topic expansion
  const toggleTopicExpand = (topicId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTopics((prev) => ({
      ...prev,
      [topicId]: !prev[topicId],
    }));
  };

  // Scroll listener to update active section in outline and tree
  useEffect(() => {
    const container = articleScrollRef.current;
    if (!container || !activeTopic) return;

    const handleScroll = () => {
      const headings = container.querySelectorAll<HTMLElement>('h2[id], h3[id]');
      const containerTop = container.getBoundingClientRect().top;
      let currentActive = '';

      for (let i = 0; i < headings.length; i++) {
        const h = headings[i];
        if (!h) continue;
        const rect = h.getBoundingClientRect();
        if (rect.top - containerTop <= 80) {
          currentActive = h.id;
        } else {
          break;
        }
      }

      if (currentActive) {
        setActiveSectionId(currentActive);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeTopic]);

  // Code block copy button click delegation
  useEffect(() => {
    const container = articleScrollRef.current;
    if (!container) return;

    const handleClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const copyBtn = target?.closest<HTMLButtonElement>('.doc-copy-code-btn');
      if (copyBtn) {
        e.preventDefault();
        const encoded = copyBtn.getAttribute('data-code');
        if (encoded) {
          const text = decodeURIComponent(encoded);
          await navigator.clipboard.writeText(text);
          const originalText = copyBtn.innerText;
          copyBtn.innerText = 'Copied!';
          copyBtn.style.color = 'var(--success)';
          setTimeout(() => {
            copyBtn.innerText = originalText;
            copyBtn.style.color = '';
          }, 1800);
        }
      }

      // Internal doc links click handler e.g. href="#doc:profiles"
      const internalLink = target?.closest<HTMLAnchorElement>('a.doc-internal-link');
      if (internalLink) {
        e.preventDefault();
        const href = internalLink.getAttribute('href') || '';
        const match = href.match(/^#doc:([^#]+)(?:#(.+))?$/);
        if (match && match[1]) {
          selectTopic(match[1], match[2]);
        }
      }
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [selectTopic]);

  // Keyboard shortcut listener (Esc to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (searchQuery) {
          setSearchQuery('');
          setSearchResults([]);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, searchQuery]);

  return (
    <div className={styles.container}>
      {/* 1. Header Bar */}
      <header className={styles.header}>
        <div className={styles.headerTextGroup}>
          <h1 className={styles.headerTitle}>Documentation</h1>
          <p className={styles.headerSubtitle}>
            {activeTopic ? activeTopic.summary : 'Terminal Manager User Guide and Technical Reference'}
          </p>
        </div>

        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          title="Close Documentation (Esc)"
          aria-label="Close Documentation"
        >
          <X size={16} />
        </button>
      </header>

      {/* 2. Workspace Body: 3 Columns */}
      <div className={styles.workspaceLayout}>
        {/* Left Column: 280px Navigation & Topic Tree */}
        <aside className={styles.navColumn} aria-label="Documentation Topics">
          {/* Search Box */}
          <div className={styles.searchContainer}>
            <div className={styles.searchBox}>
              <Search size={14} color="var(--text-muted)" />
              <input
                ref={searchInputRef}
                type="text"
                className={styles.searchInput}
                placeholder="Search topics (Enter to open)..."
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => setIsSearchFocused(true)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className={styles.clearSearchBtn}
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  title="Clear search (Esc)"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Live Search Results Dropdown */}
            {searchQuery && isSearchFocused && (
              <div className={styles.searchResultsDropdown}>
                {searchResults.length > 0 ? (
                  searchResults.map((res, sIdx) => (
                    <button
                      key={res.id}
                      type="button"
                      className={`${styles.searchResultRow} ${
                        sIdx === selectedSearchIndex ? styles.searchResultRowSelected : ''
                      }`}
                      onClick={() => {
                        selectTopic(res.topicId, res.sectionId);
                        setIsSearchFocused(false);
                      }}
                    >
                      <div className={styles.searchResultTopic}>
                        {res.topicTitle} {res.sectionTitle ? `› ${res.sectionTitle}` : ''}
                      </div>
                      <div
                        className={styles.searchResultSnippet}
                        dangerouslySetInnerHTML={{ __html: res.snippet }}
                      />
                    </button>
                  ))
                ) : (
                  <div className={styles.searchEmptyText}>No matching documents found.</div>
                )}
              </div>
            )}
          </div>

          {/* Topic Tree */}
          <nav className={styles.topicTreeList}>
            {topics.map((t) => {
              const isSelected = t.id === selectedTopicId;
              const isExpanded = Boolean(expandedTopics[t.id]);
              const h2Sections = t.sections.filter((s) => s.level === 2);

              return (
                <div key={t.id} className={styles.topicItem}>
                  <button
                    type="button"
                    className={`${styles.topicRow} ${isSelected ? styles.topicRowActive : ''}`}
                    onClick={() => selectTopic(t.id)}
                    title={t.title}
                  >
                    <div className={styles.topicRowLeft}>
                      {h2Sections.length > 0 && (
                        <span
                          onClick={(e) => toggleTopicExpand(t.id, e)}
                          style={{ display: 'inline-flex', cursor: 'pointer', color: 'var(--text-muted)' }}
                        >
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </span>
                      )}
                      <span className={styles.topicRowTitle}>{t.title}</span>
                    </div>
                  </button>

                  {/* Expandable Section Tree */}
                  {isExpanded && h2Sections.length > 0 && (
                    <div className={styles.topicSectionList}>
                      {h2Sections.map((sec) => {
                        const isSectionActive = isSelected && activeSectionId === sec.id;
                        return (
                          <button
                            key={sec.id}
                            type="button"
                            className={`${styles.topicSectionRow} ${
                              isSectionActive ? styles.topicSectionRowActive : ''
                            }`}
                            onClick={() => {
                              if (!isSelected) selectTopic(t.id, sec.id);
                              else scrollToSection(sec.id);
                            }}
                            title={sec.title}
                          >
                            {sec.title}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Center Column: Article Container (Max Width 820px) */}
        <main
          ref={articleScrollRef}
          className={styles.articleScrollContainer}
          tabIndex={0}
          aria-label="Documentation Article Content"
        >
          {activeTopic ? (
            <article className={styles.articleWrapper}>
              {/* Meta Bar */}
              <div className={styles.articleMetaBar}>
                <span className={styles.articleMetaItem}>
                  Since: v{activeTopic.since}
                </span>
                <span>•</span>
                <span className={styles.articleMetaItem}>
                  Updated: {activeTopic.updated}
                </span>
              </div>

              {/* Parsed Article HTML Body */}
              <div
                className={styles.articleBody}
                dangerouslySetInnerHTML={{ __html: activeTopic.htmlContent }}
              />

              {/* Prev / Next Navigation Footer */}
              <div className={styles.bottomNav}>
                {prevTopic ? (
                  <button
                    type="button"
                    className={styles.navPrevBtn}
                    onClick={() => selectTopic(prevTopic.id)}
                  >
                    <span className={styles.navLabel}>Previous Topic</span>
                    <span className={styles.navTitle}>← {prevTopic.title}</span>
                  </button>
                ) : (
                  <div />
                )}

                {nextTopic && (
                  <button
                    type="button"
                    className={styles.navNextBtn}
                    onClick={() => selectTopic(nextTopic.id)}
                  >
                    <span className={styles.navLabel}>Next Topic</span>
                    <span className={styles.navTitle}>{nextTopic.title} →</span>
                  </button>
                )}
              </div>
            </article>
          ) : (
            <div className={styles.articleWrapper}>
              <p>No documentation topic selected.</p>
            </div>
          )}
        </main>

        {/* Right Column: "On this page" Outline (h2 and h3) */}
        {activeTopic && activeTopic.sections.length > 0 && (
          <aside className={styles.outlineColumn} aria-label="On this page outline">
            <div className={styles.outlineTitle}>On This Page</div>
            <div className={styles.outlineList}>
              {activeTopic.sections.map((sec) => {
                const isActive = activeSectionId === sec.id;
                const isH3 = sec.level === 3;
                return (
                  <a
                    key={sec.id}
                    href={sec.anchor}
                    className={`${styles.outlineLink} ${isH3 ? styles.outlineLinkH3 : ''} ${
                      isActive ? styles.outlineLinkActive : ''
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSection(sec.id);
                    }}
                    title={sec.title}
                  >
                    {sec.title}
                  </a>
                );
              })}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
