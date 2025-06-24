import {
  CrawlerConfig,
  OutputConfig,
  OutputConfigSchema,
  TopicList,
  NewsList,
  DateUtils,
} from '@ai-newscast/core';
import type { CrawlContext, ProgressCallback } from './interfaces/crawl-strategy.ts';
import type { NewsListCrawlInput } from './strategies/news-list-crawl-strategy.ts';
import type { NewsDetailCrawlResult } from './strategies/news-detail-crawl-strategy.ts';
import type { PipelineCrawlInput, PipelineCrawlResult } from './strategies/pipeline-crawl-strategy.ts';
import { BigKindsClient } from './client.ts';
import { TopicCrawlStrategy } from './strategies/topic-crawl-strategy.ts';
import { NewsListCrawlStrategy } from './strategies/news-list-crawl-strategy.ts';
import { NewsDetailCrawlStrategy } from './strategies/news-detail-crawl-strategy.ts';
import { PipelineCrawlStrategy } from './strategies/pipeline-crawl-strategy.ts';
import { FileOutputManager } from './managers/output-manager.ts';

/**
 * 리팩토링된 BigKinds 크롤러 - Strategy 패턴 사용
 */
export class BigKindsCrawler {
  private client: BigKindsClient;
  private outputConfig: OutputConfig;
  private outputManager: FileOutputManager;
  
  // Strategy 인스턴스들
  private topicStrategy: TopicCrawlStrategy;
  private newsListStrategy: NewsListCrawlStrategy;
  private newsDetailStrategy: NewsDetailCrawlStrategy;
  private pipelineStrategy: PipelineCrawlStrategy;

  constructor(
    crawlerConfig: Partial<CrawlerConfig> = {},
    outputConfig: Partial<OutputConfig> = {}
  ) {
    this.client = new BigKindsClient(crawlerConfig);
    this.outputConfig = OutputConfigSchema.parse({
      outputDir: './data',
      saveHtml: true,
      saveJson: true,
      createTimestampFolder: true,
      ...outputConfig,
    });
    
    // Strategy 인스턴스 초기화
    this.topicStrategy = new TopicCrawlStrategy(this.client);
    this.newsListStrategy = new NewsListCrawlStrategy(this.client);
    this.newsDetailStrategy = new NewsDetailCrawlStrategy(this.client);
    this.pipelineStrategy = new PipelineCrawlStrategy(this.client);
    
    // 출력 매니저 초기화
    const outputPath = this.createOutputPath();
    this.outputManager = new FileOutputManager(outputPath);
  }

  async initialize(): Promise<void> {
    await this.client.initialize();
    await this.outputManager.ensureOutputDir();
  }

  async close(): Promise<void> {
    await this.client.close();
  }

  /**
   * 진행상황 콜백을 설정합니다
   */
  setProgressCallback(callback: ProgressCallback): void {
    this.pipelineStrategy.setProgressCallback(callback);
  }

  async crawlTopicList(): Promise<{ data: TopicList; outputPath: string }> {
    const context = this.createContext();
    const result = await this.topicStrategy.execute(context);
    
    if (!result.success || !result.data) {
      throw result.error || new Error('주제 목록 크롤링 실패');
    }
    
    // 파일 저장
    if (this.outputConfig.saveJson) {
      await this.outputManager.saveJson('topic-list.json', result.data);
    }
    if (this.outputConfig.saveHtml && context.data.htmlContent) {
      await this.outputManager.saveHtml('topic-list.html', context.data.htmlContent);
    }
    
    return { 
      data: result.data, 
      outputPath: result.outputPath || this.outputManager.getOutputPath()
    };
  }

  async crawlNewsListForTopic(
    topic: string,
    newsIds: string[],
    outputPath: string,
    topicRank: number,
    dateRange?: { startDate: string; endDate: string }
  ): Promise<{ data: NewsList; outputPath: string }> {
    const topicOutputPath = await this.outputManager.createSubDir(
      `topic-${topicRank.toString().padStart(2, '0')}`
    );
    
    const context: CrawlContext = {
      outputPath: topicOutputPath,
      enableHtml: this.outputConfig.saveHtml,
      enableJson: this.outputConfig.saveJson,
      enableMetrics: true,
      data: {}
    };
    
    const input: NewsListCrawlInput = {
      topic,
      newsIds,
      topicRank,
      dateRange
    };
    
    const result = await this.newsListStrategy.execute(context, input);
    
    if (!result.success || !result.data) {
      throw result.error || new Error(`뉴스 목록 크롤링 실패: ${topic}`);
    }
    
    // 파일 저장
    if (this.outputConfig.saveJson) {
      const outputManager = new FileOutputManager(topicOutputPath);
      await outputManager.saveJson('news-list.json', result.data);
    }
    
    return { 
      data: result.data, 
      outputPath: topicOutputPath
    };
  }

  async crawlNewsDetails(
    newsList: NewsList,
    outputPath: string
  ): Promise<{ successCount: number; errorCount: number; outputPath: string }> {
    const newsOutputPath = await this.outputManager.createSubDir('news');
    
    const context: CrawlContext = {
      outputPath: newsOutputPath,
      enableHtml: this.outputConfig.saveHtml,
      enableJson: this.outputConfig.saveJson,
      enableMetrics: true,
      data: {}
    };
    
    const result = await this.newsDetailStrategy.execute(context, newsList);
    
    if (!result.success || !result.data) {
      throw result.error || new Error('뉴스 상세 크롤링 실패');
    }
    
    // 개별 뉴스 상세 파일 저장
    if (this.outputConfig.saveJson && context.data.newsDetails) {
      const newsOutputManager = new FileOutputManager(newsOutputPath);
      for (const [newsId, newsDetail] of Object.entries(context.data.newsDetails)) {
        await newsOutputManager.saveJson(`${newsId}.json`, newsDetail);
      }
    }
    
    return { 
      successCount: result.data.successCount,
      errorCount: result.data.errorCount,
      outputPath: newsOutputPath
    };
  }

  async crawlFullPipeline(
    maxTopics: number = 10
  ): Promise<{ topicList: TopicList; outputPath: string }> {
    const context = this.createContext();
    const input: PipelineCrawlInput = { maxTopics };
    
    const result = await this.pipelineStrategy.execute(context, input);
    
    if (!result.success || !result.data) {
      throw result.error || new Error('전체 파이프라인 실행 실패');
    }
    
    return { 
      topicList: result.data.topicList, 
      outputPath: result.outputPath || this.outputManager.getOutputPath()
    };
  }

  private createOutputPath(): string {
    if (this.outputConfig.createTimestampFolder) {
      const timestamp = DateUtils.formatTimestampForFolder();
      const path = require('path');
      return path.join(this.outputConfig.outputDir, timestamp);
    }
    return this.outputConfig.outputDir;
  }
  
  private createContext(): CrawlContext {
    return {
      outputPath: this.outputManager.getOutputPath(),
      enableHtml: this.outputConfig.saveHtml,
      enableJson: this.outputConfig.saveJson,
      enableMetrics: true,
      data: {}
    };
  }

  getOutputConfig(): OutputConfig {
    return { ...this.outputConfig };
  }

  getClient(): BigKindsClient {
    return this.client;
  }
  
  /**
   * 파이프라인 통계를 반환합니다
   */
  getPipelineStats(): Record<string, any> {
    return this.pipelineStrategy.getStats();
  }
}