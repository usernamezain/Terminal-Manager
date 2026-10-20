export interface DocSection {
  id: string;
  title: string;
  level: 2 | 3;
  anchor: string;
}

export interface DocTopic {
  id: string;
  title: string;
  order: number;
  summary: string;
  tags: string[];
  since: string;
  updated: string;
  rawContent: string;
  htmlContent: string;
  sections: DocSection[];
}

export interface SearchResultItem {
  id: string;
  topicId: string;
  topicTitle: string;
  sectionId?: string;
  sectionTitle?: string;
  snippet: string;
  score: number;
}
