import { parseMarkdownTopic } from './markdownParser';
import { DocTopic } from './docsTypes';

export function loadAllDocTopics(): DocTopic[] {
  // Vite import.meta.glob loading raw markdown at build time
  const modules = import.meta.glob('../../../../docs/content/**/*.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;

  const topics: DocTopic[] = [];

  for (const [filePath, content] of Object.entries(modules)) {
    if (typeof content !== 'string') continue;
    const filename = filePath.split('/').pop() || '';
    if (filename.startsWith('_') && !filePath.includes('_generated')) continue;

    const topic = parseMarkdownTopic(content, filename);
    topics.push(topic);
  }

  // Sort strictly by order then id
  topics.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

  return topics;
}
