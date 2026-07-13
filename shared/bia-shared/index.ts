// Stub for @biboyang425/bia-shared

export interface Article {
  slug: string;
  title: string;
  description?: string;
  date?: string;
  content?: string;
  [key: string]: unknown;
}

export function ArticleRenderer({ article: _article }: { article: Article }) {
  return null;
}
