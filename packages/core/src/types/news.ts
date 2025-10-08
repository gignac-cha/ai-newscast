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

export interface NewsGeneratorMetrics {
  newscastID: string;
  topicIndex: number;
  timing: {
    startedAt: string;
    completedAt: string;
    duration: number;
    aiGenerationTime: number;
  };
  input: {
    totalArticles: number;
    totalProviders: number;
    inputDataSize: number;
  };
  output: {
    titleLength: number;
    summaryLength: number;
    contentLength: number;
    totalOutputSize: number;
  };
  performance: {
    articlesPerSecond: number;
  };
}

export interface GeneratedNews {
  timestamp: string;
  title: string;
  summary: string;
  content: string;
  sourcesCount: number;
  sources: NewsSources;
  inputArticlesCount: number;
  metrics: NewsGeneratorMetrics;
}

export interface NewsArticle {
  id: string;
  title: string;
  content: string;
  provider: string;
  url: string;
  publishedAt: string;
}

export interface TopicInfo {
  id: string;
  title: string;
  rank: number;
  newsCount: number;
  keywords: string[];
}