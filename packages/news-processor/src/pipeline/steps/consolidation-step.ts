import type { PipelineStep, PipelineContext, StepResult } from '../../interfaces/pipeline-step.ts';
import type { ConsolidationResult } from '../../types/index.ts';
import { AIConsolidator } from '../../ai/consolidator.ts';
import { NewsLoader } from '../../loaders/news-loader.ts';
import { ProcessorConfig } from '../../config/processor-config.ts';

/**
 * AI 뉴스 통합 단계
 */
export class ConsolidationStep implements PipelineStep<void, ConsolidationResult> {
  readonly name = 'consolidation';
  readonly description = 'AI 뉴스 통합';
  
  private aiConsolidator: AIConsolidator;
  private newsLoader: NewsLoader;
  private enableRetry: boolean;
  
  constructor(enableRetry: boolean = true) {
    const config = ProcessorConfig.getInstance();
    this.aiConsolidator = new AIConsolidator(config.apiKey, config.config);
    this.newsLoader = new NewsLoader();
    this.enableRetry = enableRetry;
  }
  
  async execute(context: PipelineContext): Promise<StepResult<ConsolidationResult>> {
    const startTime = Date.now();
    
    try {
      const { newsListData, newsItems } = context.data;
      
      if (!newsListData || !newsItems) {
        throw new Error('뉴스 데이터가 로딩되지 않았습니다.');
      }
      
      if (context.enableVerbose) {
        console.log('\n🤖 AI를 사용한 뉴스 통합 중...');
      }
      
      const formattedNews = this.newsLoader.formatNewsForAI(newsItems);
      
      const consolidatedContent = this.enableRetry 
        ? await this.aiConsolidator.consolidateNewsWithRetry(newsListData, formattedNews)
        : await this.aiConsolidator.consolidateNews(newsListData, formattedNews);
      
      const aiTime = Date.now() - startTime;
      
      const result: ConsolidationResult = {
        consolidatedContent,
        processingTime: aiTime
      };
      
      // 컨텍스트에 데이터 저장
      context.data.consolidatedContent = consolidatedContent;
      
      return {
        success: true,
        data: result,
        message: 'AI 뉴스 통합 완료',
        metrics: { aiTime }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        message: 'AI 뉴스 통합 실패'
      };
    }
  }
  
  async validate(context: PipelineContext): Promise<boolean> {
    return !!(context.data.newsListData && context.data.newsItems);
  }
  
  /**
   * AI 구성을 업데이트합니다
   */
  updateConfig(config: any): void {
    this.aiConsolidator.updateConfig(config);
  }
}