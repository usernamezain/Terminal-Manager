import { marked, Renderer } from 'marked';
import { DocTopic, DocSection } from './docsTypes';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export function parseFrontMatter(raw: string): {
  data: Partial<Omit<DocTopic, 'sections' | 'rawContent' | 'htmlContent'>>;
  body: string;
} {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { data: {}, body: raw };
  }

  const yamlLines = (match[1] || '').split(/\r?\n/);
  const data: any = {};

  for (const line of yamlLines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let val: any = line.slice(colonIdx + 1).trim();

    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    } else if (val.startsWith("'") && val.endsWith("'")) {
      val = val.slice(1, -1);
    } else if (val.startsWith('[') && val.endsWith(']')) {
      try {
        val = JSON.parse(val);
      } catch {
        val = val
          .slice(1, -1)
          .split(',')
          .map((s: string) => s.trim().replace(/^['"]|['"]$/g, ''));
      }
    } else if (/^\d+$/.test(val)) {
      val = parseInt(val, 10);
    }

    data[key] = val;
  }

  return { data, body: match[2] || '' };
}

export function extractSections(body: string): DocSection[] {
  const sections: DocSection[] = [];
  const lines = body.split(/\r?\n/);
  const slugCounts = new Map<string, number>();

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)$/);
    const h3Match = line.match(/^###\s+(.+)$/);

    if (h2Match && h2Match[1]) {
      const title = h2Match[1].trim();
      let slug = slugify(title);
      const count = slugCounts.get(slug) || 0;
      slugCounts.set(slug, count + 1);
      if (count > 0) slug = `${slug}-${count}`;

      sections.push({
        id: slug,
        title,
        level: 2,
        anchor: `#${slug}`,
      });
    } else if (h3Match && h3Match[1]) {
      const title = h3Match[1].trim();
      let slug = slugify(title);
      const count = slugCounts.get(slug) || 0;
      slugCounts.set(slug, count + 1);
      if (count > 0) slug = `${slug}-${count}`;

      sections.push({
        id: slug,
        title,
        level: 3,
        anchor: `#${slug}`,
      });
    }
  }

  return sections;
}

export function renderMarkdown(body: string): string {
  const renderer = new Renderer();
  const slugCounts = new Map<string, number>();

  // Custom headings with anchor link targets
  renderer.heading = ({ tokens, depth }) => {
    const text = renderer.parser.parseInline(tokens);
    const plainText = text.replace(/<[^>]+>/g, '');
    let slug = slugify(plainText);
    const count = slugCounts.get(slug) || 0;
    slugCounts.set(slug, count + 1);
    if (count > 0) slug = `${slug}-${count}`;

    if (depth === 1) {
      return `<h1 id="${slug}" class="doc-h1">${text}</h1>`;
    }
    if (depth === 2) {
      return `<h2 id="${slug}" class="doc-h2"><a href="#${slug}" class="doc-heading-anchor" aria-hidden="true">#</a>${text}</h2>`;
    }
    if (depth === 3) {
      return `<h3 id="${slug}" class="doc-h3"><a href="#${slug}" class="doc-heading-anchor" aria-hidden="true">#</a>${text}</h3>`;
    }
    return `<h${depth} id="${slug}">${text}</h${depth}>`;
  };

  // Safe links
  renderer.link = ({ href, title, tokens }) => {
    const text = renderer.parser.parseInline(tokens);
    const titleAttr = title ? ` title="${title}"` : '';

    if (href.startsWith('#') || href.startsWith('https://') || href.startsWith('mailto:')) {
      const isExternal = href.startsWith('https://');
      const targetAttr = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `<a href="${href}"${titleAttr}${targetAttr} class="doc-link">${text}</a>`;
    }

    // Convert relative markdown links e.g. ./02-profiles.md -> #profiles
    if (href.endsWith('.md')) {
      const target = href.replace(/\.md$/, '').replace(/^\.\//, '').replace(/^\d+-/, '');
      return `<a href="#doc:${target}"${titleAttr} class="doc-internal-link">${text}</a>`;
    }

    return `<span class="doc-link-safe">${text}</span>`;
  };

  // Code blocks with syntax highlighting and copy container
  renderer.code = ({ text, lang }) => {
    const language = lang || 'text';
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return `<div class="doc-code-block" data-language="${language}">
      <div class="doc-code-header">
        <span class="doc-code-lang">${language}</span>
        <button type="button" class="doc-copy-code-btn" data-code="${encodeURIComponent(text)}" title="Copy code">
          Copy
        </button>
      </div>
      <pre class="doc-pre"><code class="doc-code language-${language}">${escaped}</code></pre>
    </div>`;
  };

  // Tables with horizontal scroll wrapper
  renderer.table = (token) => {
    let headerHtml = '';
    for (const cell of token.header) {
      headerHtml += `<th>${renderer.parser.parseInline(cell.tokens)}</th>`;
    }
    let bodyHtml = '';
    for (const row of token.rows) {
      bodyHtml += '<tr>';
      for (const cell of row) {
        bodyHtml += `<td>${renderer.parser.parseInline(cell.tokens)}</td>`;
      }
      bodyHtml += '</tr>';
    }

    return `<div class="doc-table-wrapper">
      <table class="doc-table">
        <thead><tr>${headerHtml}</tr></thead>
        <tbody>${bodyHtml}</tbody>
      </table>
    </div>`;
  };

  // Blockquotes rendered as callouts
  renderer.blockquote = ({ tokens }) => {
    const innerHtml = renderer.parser.parse(tokens);
    let calloutClass = 'doc-callout';

    if (innerHtml.includes('<strong>Note:</strong>') || innerHtml.includes('<strong>Note</strong>:')) {
      calloutClass += ' doc-callout-note';
    } else if (innerHtml.includes('<strong>Warning:</strong>') || innerHtml.includes('<strong>Warning</strong>:')) {
      calloutClass += ' doc-callout-warning';
    } else if (innerHtml.includes('<strong>Tip:</strong>') || innerHtml.includes('<strong>Tip</strong>:')) {
      calloutClass += ' doc-callout-tip';
    }

    return `<blockquote class="${calloutClass}">${innerHtml}</blockquote>`;
  };

  return marked.parse(body, { renderer }) as string;
}

export function parseMarkdownTopic(raw: string, filename = ''): DocTopic {
  const { data, body } = parseFrontMatter(raw);
  const sections = extractSections(body);
  const htmlContent = renderMarkdown(body);

  const fallbackId = filename.replace(/\.md$/, '').replace(/^\d+-/, '');

  return {
    id: data.id || fallbackId,
    title: data.title || fallbackId,
    order: typeof data.order === 'number' ? data.order : 99,
    summary: data.summary || '',
    tags: Array.isArray(data.tags) ? data.tags : [],
    since: data.since || '0.1.0',
    updated: data.updated || '2026-10-13',
    rawContent: body,
    htmlContent,
    sections,
  };
}
