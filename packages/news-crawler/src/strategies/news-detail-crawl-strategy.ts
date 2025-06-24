import type { CrawlStrategy, CrawlContext, CrawlResult } from '../interfaces/crawl-strategy.ts';
import type { NewsList, NewsDetail } from '@ai-newscast/core';
import { BigKindsClient } from '../client.ts';
import { NewsDetailParser } from '../parsers.ts';
import { Logger, ValidationUtils } from '@ai-newscast/core';

/**
 * 뉴스 상세 크롤링 결과
 */
export interface NewsDetailCrawlResult {
  successCount: number;
  errorCount: number;
  newsDetails: NewsDetail[];
}

/**
 * 뉴스 상세 크롤링 전략
 */
export class NewsDetailCrawlStrategy implements CrawlStrategy<NewsList, NewsDetailCrawlResult> {
  readonly name = 'news-detail';
  readonly description = '뉴스 상세 크롤링';
  
  constructor(private client: BigKindsClient) {}
  
  async execute(
    context: CrawlContext, 
    newsList: NewsList
  ): Promise<CrawlResult<NewsDetailCrawlResult>> {
    const startTime = Date.now();
    
    try {
      Logger.info(`Starting news details crawling for ${newsList.news_list.length} items`);
      
      let successCount = 0;
      let errorCount = 0;
      const newsDetails: NewsDetail[] = [];
      
      for (const [index, newsItem] of newsList.news_list.entries()) {
        const itemStartTime = Date.now();
        
        try {
          Logger.debug(`Processing news item ${index + 1}/${newsList.news_list.length}: ${newsItem.news_id}`);
          
          // ID 유효성 검사 및 변환
          if (!ValidationUtils.isValidNewsId(newsItem.news_id)) {
            throw new Error(`Invalid news ID format: ${newsItem.news_id}`);
          }
          
          const apiNewsId = ValidationUtils.convertNewsIdForApi(newsItem.news_id);
          
          // 뉴스 상세 가져오기
          const responseData = await this.client.fetchNewsDetail(apiNewsId);
          
          // 뉴스 상세 파싱
          const newsDetailData = NewsDetailParser.parseNewsDetail(responseData);
          newsDetails.push(newsDetailData);
          
          // 컨텍스트에 개별 데이터 저장
          if (context.enableJson) {
            if (!context.data.newsDetails) {
              context.data.newsDetails = {};
            }
            context.data.newsDetails[newsItem.news_id] = newsDetailData;
          }
          
          successCount++;
          
          const itemDuration = Date.now() - itemStartTime;
          Logger.debug(`News detail processed in ${itemDuration}ms: ${newsItem.news_id}`);
          
        } catch (error) {
          errorCount++;
          Logger.warn(`Failed to process news item ${newsItem.news_id}: ${error}`);
        }
      }
      
      const duration = Date.now() - startTime;
      
      Logger.info(`News details crawling completed in ${duration}ms`);
      Logger.info(`Success: ${successCount}, Errors: ${errorCount}`);
      
      const result: NewsDetailCrawlResult = {
        successCount,
        errorCount,
        newsDetails
      };
      
      return {
        success: true,
        data: result,
        outputPath: context.outputPath,
        metrics: {
          duration,
          itemCount: newsList.news_list.length,
          successCount,
          errorCount
        }
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      Logger.error('Failed to crawl news details', error as Error);
      
      return {
        success: false,
        error: error as Error,
        metrics: { duration }
      };
    }
  }
  
  async validate(context: CrawlContext, newsList: NewsList): Promise<boolean> {
    return !!(context.outputPath && newsList?.news_list?.length > 0);
  }
}