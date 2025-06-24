import type { CrawlStrategy, CrawlContext, CrawlResult } from '../interfaces/crawl-strategy.ts';
import type { NewsList } from '@ai-newscast/core';
import { BigKindsClient } from '../client.ts';
import { NewsParser } from '../parsers.ts';
import { Logger, DateUtils, DEFAULT_DATE_RANGE_DAYS } from '@ai-newscast/core';

/**
 * 뉴스 목록 크롤링 입력 파라미터
 */
export interface NewsListCrawlInput {
  topic: string;
  newsIds: string[];
  topicRank: number;
  dateRange?: { startDate: string; endDate: string };
}

/**
 * 뉴스 목록 크롤링 전략
 */
export class NewsListCrawlStrategy implements CrawlStrategy<NewsListCrawlInput, NewsList> {
  readonly name = 'news-list';
  readonly description = '뉴스 목록 크롤링';
  
  constructor(private client: BigKindsClient) {}
  
  async execute(
    context: CrawlContext, 
    input: NewsListCrawlInput
  ): Promise<CrawlResult<NewsList>> {
    const startTime = Date.now();
    
    try {
      const { topic, newsIds, dateRange } = input;
      
      Logger.info(`Starting news list crawling for topic: ${topic}`);
      
      // 날짜 범위 설정
      const { startDate, endDate } = dateRange || DateUtils.getDateRange(DEFAULT_DATE_RANGE_DAYS);
      
      // 뉴스 목록 가져오기
      const responseData = await this.client.fetchNewsListForTopic(
        topic,
        newsIds,
        startDate,
        endDate
      );
      
      // 뉴스 목록 파싱
      const newsListData = NewsParser.parseNewsList(responseData, topic);
      
      // 컨텍스트에 데이터 저장
      if (context.enableJson) {
        context.data.newsListData = newsListData;
      }
      
      const duration = Date.now() - startTime;
      
      Logger.info(`News list crawling completed in ${duration}ms`);
      Logger.info(`Found ${newsListData.news_list.length} news items for topic: ${topic}`);
      
      return {
        success: true,
        data: newsListData,
        outputPath: context.outputPath,
        metrics: {
          duration,
          itemCount: newsListData.news_list.length
        }
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      Logger.error(`Failed to crawl news list for topic: ${input.topic}`, error as Error);
      
      return {
        success: false,
        error: error as Error,
        metrics: { duration }
      };
    }
  }
  
  async validate(context: CrawlContext, input: NewsListCrawlInput): Promise<boolean> {
    return !!(context.outputPath && input.topic && input.newsIds?.length > 0);
  }
}