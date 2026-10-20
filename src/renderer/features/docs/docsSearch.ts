import MiniSearch from 'minisearch';
import { DocTopic, SearchResultItem } from './docsTypes';

interface SearchDoc {
  id: string;
  topicId: string;
  topicTitle: string;
  sectionId?: string;
  sectionTitle?: string;
  text: string;
}

export class DocsSearchIndex {
  private miniSearch: MiniSearch<SearchDoc>;
  private rawDocs: Map<string, SearchDoc> = new Map();

  constructor() {
    this.miniSearch = new MiniSearch<SearchDoc>({
      fields: ['topicTitle', 'sectionTitle', 'text'],
      storeFields: ['id', 'topicId', 'topicTitle', 'sectionId', 'sectionTitle', 'text'],
      searchOptions: {
        boost: { topicTitle: 3, sectionTitle: 2 },
        fuzzy: 0.2,
        prefix: true,
      },
    });
  }

  public indexTopics(topics: DocTopic[]): void {
    const docs: SearchDoc[] = [];

    for (const topic of topics) {
      // 1. Index topic root summary
      const rootDocId = `${topic.id}-summary`;
      const rootDoc: SearchDoc = {
        id: rootDocId,
        topicId: topic.id,
        topicTitle: topic.title,
        text: `${topic.title}. ${topic.summary}. ${topic.tags.join(' ')}`,
      };
      docs.push(rootDoc);
      this.rawDocs.set(rootDocId, rootDoc);

      // 2. Index by sections and paragraphs
      const lines = topic.rawContent.split(/\r?\n/);
      let currentSectionId = '';
      let currentSectionTitle = '';
      let currentParagraph: string[] = [];
      let pIdx = 0;

      const flushParagraph = () => {
        if (currentParagraph.length > 0) {
          const paraText = currentParagraph.join(' ').trim();
          if (paraText.length > 15) {
            const docId = `${topic.id}-${currentSectionId || 'intro'}-${pIdx++}`;
            const sDoc: SearchDoc = {
              id: docId,
              topicId: topic.id,
              topicTitle: topic.title,
              sectionId: currentSectionId || undefined,
              sectionTitle: currentSectionTitle || undefined,
              text: paraText,
            };
            docs.push(sDoc);
            this.rawDocs.set(docId, sDoc);
          }
          currentParagraph = [];
        }
      };

      for (const line of lines) {
        const hMatch = line.match(/^##\s+(.+)$/);
        const h3Match = line.match(/^###\s+(.+)$/);

        if (hMatch || h3Match) {
          flushParagraph();
          const title = (hMatch ? hMatch[1] : h3Match![1])!.trim();
          currentSectionTitle = title;
          currentSectionId = title
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-');
        } else if (line.trim() === '') {
          flushParagraph();
        } else if (!line.startsWith('```') && !line.startsWith('---')) {
          currentParagraph.push(line.trim());
        }
      }
      flushParagraph();
    }

    this.miniSearch.removeAll();
    this.miniSearch.addAll(docs);
  }

  public search(query: string): SearchResultItem[] {
    if (!query.trim()) return [];

    const results = this.miniSearch.search(query);
    const output: SearchResultItem[] = [];
    const seenTopicSections = new Set<string>();

    for (const res of results.slice(0, 20)) {
      const doc = this.rawDocs.get(res.id);
      if (!doc) continue;

      const dedupeKey = `${doc.topicId}::${doc.sectionId || ''}`;
      if (seenTopicSections.has(dedupeKey)) continue;
      seenTopicSections.add(dedupeKey);

      // Generate highlighted snippet
      const snippet = this.createSnippet(doc.text, query);

      output.push({
        id: doc.id,
        topicId: doc.topicId,
        topicTitle: doc.topicTitle,
        sectionId: doc.sectionId,
        sectionTitle: doc.sectionTitle,
        snippet,
        score: res.score,
      });
    }

    return output;
  }

  private createSnippet(text: string, query: string): string {
    const cleanText = text.replace(/<[^>]+>/g, '').replace(/[*_#`[\]]/g, '');
    const words = query.trim().split(/\s+/).filter(Boolean);
    const firstWord = words[0] || '';
    const regex = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');

    let matchIdx = cleanText.toLowerCase().indexOf(firstWord.toLowerCase());
    if (matchIdx === -1) matchIdx = 0;

    const start = Math.max(0, matchIdx - 40);
    const end = Math.min(cleanText.length, matchIdx + 120);
    let snippet = cleanText.slice(start, end).trim();

    if (start > 0) snippet = '...' + snippet;
    if (end < cleanText.length) snippet = snippet + '...';

    // Highlight matches using <mark>
    return snippet.replace(regex, '<mark>$1</mark>');
  }
}
