// Export main crawler class
export { BigKindsCrawler } from './crawler.ts';

// Export client for advanced usage
export { BigKindsClient } from './client.ts';

// Export parsers for custom implementations
export { TopicParser, NewsParser, NewsDetailParser } from './parsers.ts';

// Export strategy components
export { TopicCrawlStrategy } from './strategies/topic-crawl-strategy.ts';
export { NewsListCrawlStrategy } from './strategies/news-list-crawl-strategy.ts';
export { NewsDetailCrawlStrategy } from './strategies/news-detail-crawl-strategy.ts';
export { PipelineCrawlStrategy } from './strategies/pipeline-crawl-strategy.ts';

// Export managers
export { FileOutputManager } from './managers/output-manager.ts';
export { CrawlProgressManager } from './managers/progress-manager.ts';

// Export interfaces
export type * from './interfaces/crawl-strategy.ts';
export type * from './interfaces/output-manager.ts';