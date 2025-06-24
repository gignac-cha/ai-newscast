import { join } from 'path';
import type { CrawlStrategy, CrawlContext, CrawlResult } from '../interfaces/crawl-strategy.ts';
import type { TopicList } from '@ai-newscast/core';
import { TopicCrawlStrategy } from './topic-crawl-strategy.ts';
import { NewsListCrawlStrategy, type NewsListCrawlInput } from './news-list-crawl-strategy.ts';
import { BigKindsClient } from '../client.ts';
import { FileOutputManager } from '../managers/output-manager.ts';
import { CrawlProgressManager } from '../managers/progress-manager.ts';
import { Logger } from '@ai-newscast/core';

/**
 * 전체 파이프라인 크롤링 입력 파라미터
 */
export interface PipelineCrawlInput {
  maxTopics?: number;
  includeNewsDetails?: boolean;
}

/**
 * 전체 파이프라인 크롤링 결과
 */
export interface PipelineCrawlResult {
  topicList: TopicList;
  processedTopics: number;
  totalNewsItems: number;
  outputPath: string;
}

/**
 * 전체 파이프라인 크롤링 전략
 */
export class PipelineCrawlStrategy implements CrawlStrategy<PipelineCrawlInput, PipelineCrawlResult> {
  readonly name = 'full-pipeline';
  readonly description = '전체 파이프라인 크롤링';
  
  private topicStrategy: TopicCrawlStrategy;
  private newsListStrategy: NewsListCrawlStrategy;
  private progressManager: CrawlProgressManager;
  
  constructor(private client: BigKindsClient) {
    this.topicStrategy = new TopicCrawlStrategy(client);
    this.newsListStrategy = new NewsListCrawlStrategy(client);
    this.progressManager = new CrawlProgressManager();
  }
  
  async execute(
    context: CrawlContext, 
    input: PipelineCrawlInput = {}
  ): Promise<CrawlResult<PipelineCrawlResult>> {
    const startTime = Date.now();
    const { maxTopics = 10, includeNewsDetails = false } = input;
    
    try {
      Logger.info(`Starting full crawling pipeline for top ${maxTopics} topics`);
      
      // 진행상황 보고
      this.progressManager.report(this.name, 0, '파이프라인 시작');
      
      // 1단계: 주제 목록 크롤링
      this.progressManager.report(this.name, 10, '주제 목록 크롤링 중...');
      
      const topicResult = await this.topicStrategy.execute(context);
      if (!topicResult.success || !topicResult.data) {
        throw topicResult.error || new Error('주제 목록 크롤링 실패');
      }
      
      const topicList = topicResult.data;
      const outputManager = new FileOutputManager(context.outputPath);
      
      // 주제 목록 저장
      if (context.enableJson) {
        await outputManager.saveJson('topic-list.json', topicList);
      }
      if (context.enableHtml && context.data.htmlContent) {
        await outputManager.saveHtml('topic-list.html', context.data.htmlContent);
      }
      
      this.progressManager.report(this.name, 20, `${topicList.topics.length}개 주제 발견`);
      
      // 2단계: 각 주제별 뉴스 목록 크롤링
      const topicsToProcess = topicList.topics.slice(0, maxTopics);
      let totalNewsItems = 0;
      let processedTopics = 0;
      
      for (const [index, topic] of topicsToProcess.entries()) {
        try {
          const progress = 20 + Math.round((index / topicsToProcess.length) * 70);
          this.progressManager.report(this.name, progress, `주제 처리 중: ${topic.topic}`);
          
          // 주제별 출력 디렉토리 생성
          const topicOutputPath = await outputManager.createSubDir(
            `topic-${topic.rank.toString().padStart(2, '0')}`
          );
          
          // 주제별 컨텍스트 생성
          const topicContext: CrawlContext = {
            ...context,
            outputPath: topicOutputPath
          };
          
          // 뉴스 목록 크롤링 입력 준비
          const newsListInput: NewsListCrawlInput = {
            topic: topic.topic,
            newsIds: topic.news_ids,
            topicRank: topic.rank
          };
          
          // 뉴스 목록 크롤링 실행
          const newsListResult = await this.newsListStrategy.execute(topicContext, newsListInput);
          
          if (newsListResult.success && newsListResult.data) {
            // 뉴스 목록 저장
            if (context.enableJson) {
              await outputManager.saveJson(
                join(`topic-${topic.rank.toString().padStart(2, '0')}`, 'news-list.json'),
                newsListResult.data
              );
            }
            
            totalNewsItems += newsListResult.data.news_list.length;
            processedTopics++;
            
            Logger.info(`Completed topic ${topic.rank}: ${topic.topic} (${newsListResult.data.news_list.length} news items)`);
          } else {
            Logger.error(`Failed to process topic ${topic.rank}: ${topic.topic}`, newsListResult.error);
            this.progressManager.recordError(this.name, newsListResult.error || new Error('Unknown error'));
          }
          
        } catch (error) {
          Logger.error(`Failed to process topic ${topic.rank}: ${topic.topic}`, error as Error);
          this.progressManager.recordError(this.name, error as Error);
        }
      }
      
      const duration = Date.now() - startTime;
      this.progressManager.report(this.name, 100, '파이프라인 완료');
      
      Logger.info(`Full pipeline completed in ${duration}ms`);
      Logger.info(`Processed ${processedTopics}/${maxTopics} topics, ${totalNewsItems} total news items`);
      
      const result: PipelineCrawlResult = {
        topicList,
        processedTopics,
        totalNewsItems,
        outputPath: context.outputPath
      };
      
      return {
        success: true,
        data: result,
        outputPath: context.outputPath,
        metrics: {
          duration,
          itemCount: totalNewsItems,
          successCount: processedTopics
        }
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      Logger.error('Full pipeline failed', error as Error);
      this.progressManager.recordError(this.name, error as Error);
      
      return {
        success: false,
        error: error as Error,
        metrics: { duration }
      };
    }
  }
  
  async validate(context: CrawlContext, input: PipelineCrawlInput): Promise<boolean> {
    return !!context.outputPath && (input.maxTopics || 0) > 0;
  }
  
  /**
   * 진행상황 콜백을 설정합니다
   */
  setProgressCallback(callback: (strategy: string, progress: number, message: string) => void): void {
    this.progressManager.setCallback(callback);
  }
  
  /**
   * 통계를 반환합니다
   */
  getStats(): Record<string, any> {
    return this.progressManager.getStats();
  }
}