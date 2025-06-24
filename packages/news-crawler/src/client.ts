import { chromium, type Browser, type Page } from 'playwright';
import {
  CrawlerConfig,
  CrawlerConfigSchema,
  DEFAULT_USER_AGENT,
  BIGKINDS_BASE_URL,
  Logger,
  RetryUtils,
} from '@ai-newscast/core';

export class BigKindsClient {
  private config: CrawlerConfig;
  private browser?: Browser;
  private page?: Page;

  constructor(config: Partial<CrawlerConfig> = {}) {
    this.config = CrawlerConfigSchema.parse({
      baseUrl: BIGKINDS_BASE_URL,
      userAgent: DEFAULT_USER_AGENT,
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      maxConcurrentRequests: 5,
      ...config,
    });
  }

  async initialize(): Promise<void> {
    Logger.info('Initializing BigKinds client...');
    
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    this.page = await this.browser.newPage({
      userAgent: this.config.userAgent,
    });

    await this.page.setDefaultTimeout(this.config.timeout);
    Logger.info('BigKinds client initialized successfully');
  }

  async close(): Promise<void> {
    if (this.page) {
      await this.page.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
    Logger.info('BigKinds client closed');
  }

  async fetchTopicListPage(): Promise<string> {
    if (!this.page) {
      throw new Error('Client not initialized. Call initialize() first.');
    }

    return RetryUtils.withRetry(async () => {
      Logger.info('Fetching topic list page...');
      
      await this.page!.goto(this.config.baseUrl, {
        waitUntil: 'networkidle',
        timeout: this.config.timeout,
      });

      // Wait for topic buttons to load
      await this.page!.waitForSelector('.issupop-btn', { timeout: 10000 });
      
      const content = await this.page!.content();
      Logger.info('Topic list page fetched successfully');
      
      return content;
    }, this.config.retryAttempts, this.config.retryDelay);
  }

  async fetchNewsListForTopic(
    topic: string,
    newsIds: string[],
    startDate: string,
    endDate: string
  ): Promise<any> {
    if (!this.page) {
      throw new Error('Client not initialized. Call initialize() first.');
    }

    return RetryUtils.withRetry(async () => {
      Logger.info(`Fetching news list for topic: ${topic}`);
      
      const url = `${this.config.baseUrl}/news/getNetworkDataAnalysis.do`;
      const newsIdsStr = newsIds.join(',');

      const response = await this.page!.evaluate(
        async ({ url, topic, newsIdsStr, startDate, endDate }) => {
          const formData = new URLSearchParams({
            pageInfo: 'newsResult',
            keyword: topic,
            startDate,
            endDate,
            newsCluster: newsIdsStr,
            resultNo: '100',
          });

          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'X-Requested-With': 'XMLHttpRequest',
            },
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          return response.json();
        },
        { url, topic, newsIdsStr, startDate, endDate }
      );

      Logger.info(`Fetched ${response.newsList?.length || 0} news items for topic: ${topic}`);
      return response;
    }, this.config.retryAttempts, this.config.retryDelay);
  }

  async fetchNewsDetail(newsId: string): Promise<any> {
    if (!this.page) {
      throw new Error('Client not initialized. Call initialize() first.');
    }

    return RetryUtils.withRetry(async () => {
      Logger.debug(`Fetching news detail for ID: ${newsId}`);
      
      const url = `${this.config.baseUrl}/news/detailView.do`;
      
      const response = await this.page!.evaluate(
        async ({ url, newsId }) => {
          const params = new URLSearchParams({
            docId: newsId,
            returnCnt: '1',
            sectionDiv: '1000',
          });

          const response = await fetch(`${url}?${params}`, {
            method: 'GET',
            headers: {
              'X-Requested-With': 'XMLHttpRequest',
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          return response.json();
        },
        { url, newsId }
      );

      Logger.debug(`Fetched news detail for ID: ${newsId}`);
      return response;
    }, this.config.retryAttempts, this.config.retryDelay);
  }

  getConfig(): CrawlerConfig {
    return { ...this.config };
  }
}