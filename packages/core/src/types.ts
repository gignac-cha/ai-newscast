import { z } from 'zod';

// API Server types
export type NewscastTimestamp = string; // ISO format: 2025-06-23T10-30-45-123456

export const BatchInfoSchema = z.object({
  timestamp: z.string(),
  output_folder: z.string(),
  created_at: z.string(),
});

export type BatchInfo = z.infer<typeof BatchInfoSchema>;

// Base types
export const DateRangeSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
});

export const MetadataSchema = z.object({
  extraction_date: z.string(),
  extraction_timestamp: z.string(),
  total_topics: z.number(),
});

// Topic types
export const TopicSchema = z.object({
  rank: z.number(),
  topic: z.string(),
  summary: z.string(),
  keywords: z.array(z.string()),
  news_count: z.number(),
  news_ids: z.array(z.string()),
  issue_name: z.string(),
});

export const TopicListSchema = z.object({
  metadata: MetadataSchema,
  topics: z.array(TopicSchema),
});

// News types
export const NewsItemSchema = z.object({
  news_id: z.string(),
  title: z.string(),
  provider_name: z.string(),
  byline: z.string(),
  published_date: z.string(),
  summary: z.string(),
  keywords: z.array(z.string()),
  category: z.string(),
  url: z.string(),
});

export const NewsListSchema = z.object({
  topic: z.string(),
  extraction_timestamp: z.string(),
  total_news: z.number(),
  news_list: z.array(NewsItemSchema),
  news_ids: z.array(z.string()).optional(),
});

export const NewsDetailSchema = z.object({
  extraction_timestamp: z.string(),
  news_detail: z.record(z.any()).optional(),
  content: z.string().optional(),
  metadata: z.object({
    title: z.string(),
    provider: z.string(),
    byline: z.string(),
    published_date: z.string(),
    category: z.string(),
    keywords: z.string(),
    summary: z.string(),
    url: z.string(),
  }),
});

// News processing types (for consolidation)
export const ConsolidatedNewsSchema = z.object({
  topic: z.string(),
  total_articles: z.number(),
  sources: z.array(z.string()),
  consolidated_content: z.string(),
  original_timestamp: z.string(),
  consolidation_timestamp: z.string(),
});

export const ProcessingConfigSchema = z.object({
  aiModel: z.string().default('gemini-2.5-pro-preview-03-25'),
  maxTokens: z.number().default(8192),
  temperature: z.number().default(0.7),
  retryAttempts: z.number().default(3),
});

// Configuration types
export const CrawlerConfigSchema = z.object({
  baseUrl: z.string().default('https://bigkinds.or.kr'),
  userAgent: z.string().default('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
  timeout: z.number().default(30000),
  retryAttempts: z.number().default(3),
  retryDelay: z.number().default(1000),
  maxConcurrentRequests: z.number().default(5),
});

export const OutputConfigSchema = z.object({
  outputDir: z.string().default('./output'),
  saveHtml: z.boolean().default(true),
  saveJson: z.boolean().default(true),
  createTimestampFolder: z.boolean().default(true),
});

// Error types
export const CrawlerErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.any()).optional(),
  timestamp: z.string(),
});

// Export TypeScript types
export type DateRange = z.infer<typeof DateRangeSchema>;
export type Metadata = z.infer<typeof MetadataSchema>;
export type Topic = z.infer<typeof TopicSchema>;
export type TopicList = z.infer<typeof TopicListSchema>;
export type NewsItem = z.infer<typeof NewsItemSchema>;
export type NewsList = z.infer<typeof NewsListSchema>;
export type NewsDetail = z.infer<typeof NewsDetailSchema>;
export type ConsolidatedNews = z.infer<typeof ConsolidatedNewsSchema>;
export type ProcessingConfig = z.infer<typeof ProcessingConfigSchema>;
export type CrawlerConfig = z.infer<typeof CrawlerConfigSchema>;
export type OutputConfig = z.infer<typeof OutputConfigSchema>;
export type CrawlerError = z.infer<typeof CrawlerErrorSchema>;

// Constants
export const DEFAULT_DATE_RANGE_DAYS = 1;
export const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
export const BIGKINDS_BASE_URL = 'https://bigkinds.or.kr';
export const MAX_NEWS_PER_TOPIC = 100;
export const DEFAULT_TIMEOUT = 30000;