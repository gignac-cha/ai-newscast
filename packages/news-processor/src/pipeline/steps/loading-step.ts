import type { PipelineStep, PipelineContext, StepResult } from '../../interfaces/pipeline-step.ts';
import type { NewsLoadResult } from '../../types/index.ts';
import { NewsLoader } from '../../loaders/news-loader.ts';

/**
 * 뉴스 데이터 로딩 단계
 */
export class LoadingStep implements PipelineStep<void, NewsLoadResult> {
  readonly name = 'loading';
  readonly description = '뉴스 데이터 로딩';
  
  private newsLoader: NewsLoader;
  
  constructor() {
    this.newsLoader = new NewsLoader();
  }
  
  async execute(context: PipelineContext): Promise<StepResult<NewsLoadResult>> {
    const startTime = Date.now();
    
    try {
      const { newsListData, newsItems } = await this.newsLoader.loadAllNewsData(context.topicFolderPath);
      const loadTime = Date.now() - startTime;
      
      if (newsItems.length === 0) {
        throw new Error('통합할 뉴스 데이터가 없습니다.');
      }
      
      if (context.enableVerbose) {
        console.log(`📋 주제: ${newsListData.topic}`);
        console.log(`📊 뉴스 개수: ${newsItems.length}개`);
        console.log(`⏱️  데이터 로딩 시간: ${loadTime}ms`);
      }
      
      const result: NewsLoadResult = {
        newsListData,
        newsItems,
        loadTime
      };
      
      // 컨텍스트에 데이터 저장
      context.data.newsListData = newsListData;
      context.data.newsItems = newsItems;
      
      return {
        success: true,
        data: result,
        message: `${newsItems.length}개 뉴스 로딩 완료`,
        metrics: { loadTime }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        message: '뉴스 데이터 로딩 실패'
      };
    }
  }
  
  async validate(context: PipelineContext): Promise<boolean> {
    return !!context.topicFolderPath;
  }
}