import type { CrawlStrategy, CrawlContext, CrawlResult } from '../interfaces/crawl-strategy.ts';
import type { TopicList } from '@ai-newscast/core';
import { BigKindsClient } from '../client.ts';
import { TopicParser } from '../parsers.ts';
import { Logger } from '@ai-newscast/core';

/**
 * 주제 목록 크롤링 전략
 */
export class TopicCrawlStrategy implements CrawlStrategy<void, TopicList> {
  readonly name = 'topic-list';
  readonly description = '주제 목록 크롤링';
  
  constructor(private client: BigKindsClient) {}
  
  async execute(context: CrawlContext): Promise<CrawlResult<TopicList>> {
    const startTime = Date.now();
    
    try {
      Logger.info('Starting topic list crawling...');
      
      // HTML 페이지 가져오기
      const html = await this.client.fetchTopicListPage();
      
      // HTML 저장
      if (context.enableHtml) {
        context.data.htmlContent = html;
      }
      
      // 주제 파싱
      const { metadata, topics } = TopicParser.parseTopicList(html);
      const topicListData: TopicList = { metadata, topics };
      
      // JSON 저장
      if (context.enableJson) {
        context.data.topicListData = topicListData;
      }
      
      const duration = Date.now() - startTime;
      
      Logger.info(`Topic list crawling completed in ${duration}ms`);
      Logger.info(`Found ${topics.length} topics`);
      
      return {
        success: true,
        data: topicListData,
        outputPath: context.outputPath,
        metrics: {
          duration,
          itemCount: topics.length
        }
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      Logger.error('Failed to crawl topic list', error as Error);
      
      return {
        success: false,
        error: error as Error,
        metrics: { duration }
      };
    }
  }
  
  async validate(context: CrawlContext): Promise<boolean> {
    return !!context.outputPath;
  }
}