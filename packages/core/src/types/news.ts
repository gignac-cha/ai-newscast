/**
 * News-related types for AI Newscast project
 */

export interface NewsSource {
  title: string;
  url: string;
}

export interface NewsSources {
  [provider: string]: NewsSource[];
}

export interface GeneratedNews {
  title: string;
  summary: string;
  content: string;
  sources_count: number;
  sources: NewsSources;
  generation_timestamp: string;
  input_articles_count: number;
}

export interface NewsArticle {
  id: string;
  title: string;
  content: string;
  provider: string;
  url: string;
  published_at: string;
}

export interface TopicInfo {
  id: string;
  title: string;
  rank: number;
  newsCount: number;
  keywords: string[];
}