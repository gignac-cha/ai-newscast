import type {
  ProcessingResult,
  ProcessingMetrics,
  NewsProcessorOptions,
  ProcessingEventCallback,
  ProcessingStep
} from './types/index.ts';
import type { ProcessingConfig } from '@ai-newscast/core';
import type { PipelineContext } from './interfaces/pipeline-step.ts';
import { ProcessorConfig } from './config/processor-config.ts';
import { ProcessingPipeline } from './pipeline/processing-pipeline.ts';
import { ValidationStep } from './pipeline/steps/validation-step.ts';
import { LoadingStep } from './pipeline/steps/loading-step.ts';
import { ConsolidationStep } from './pipeline/steps/consolidation-step.ts';
import { SavingStep } from './pipeline/steps/saving-step.ts';

/**
 * 리팩토링된 AI 뉴스 통합 클래스 - Pipeline 패턴 사용
 */
export class NewsConsolidator {
  private processorConfig: ProcessorConfig;
  private options: NewsProcessorOptions;
  private pipeline: ProcessingPipeline;
  private consolidationStep: ConsolidationStep;

  constructor(
    options: NewsProcessorOptions = {},
    customConfig?: Partial<ProcessingConfig>
  ) {
    // 구성 관리자 초기화
    this.processorConfig = ProcessorConfig.getInstance();
    if (customConfig) {
      this.processorConfig.updateConfig(customConfig);
    }
    this.processorConfig.validate();
    
    // 옵션 설정
    this.options = {
      enableRetry: true,
      enableMetrics: true,
      enableProgressTracking: false,
      outputFilename: 'news.json',
      verbose: false,
      ...options
    };

    // 파이프라인 초기화
    this.pipeline = new ProcessingPipeline();
    this.consolidationStep = new ConsolidationStep(this.options.enableRetry);
    
    // 파이프라인 단계 추가
    this.pipeline.addStep(new ValidationStep());
    this.pipeline.addStep(new LoadingStep());
    this.pipeline.addStep(this.consolidationStep);
    this.pipeline.addStep(new SavingStep());
    
    // 진행 상태 추적 설정
    if (this.options.enableProgressTracking) {
      this.pipeline.enableProgressTracking();
    }

    if (this.options.verbose) {
      this.processorConfig.displayConfig();
    }
  }

  /**
   * 진행 상태 이벤트 콜백을 설정합니다
   */
  setEventCallback(callback: ProcessingEventCallback): void {
    this.pipeline.onProgress((stepName, progress, message) => {
      callback({
        step: stepName as ProcessingStep,
        progress,
        message,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * 구성을 업데이트합니다
   */
  updateConfig(config: Partial<ProcessingConfig>): void {
    this.processorConfig.updateConfig(config);
    this.consolidationStep.updateConfig(config);
  }

  /**
   * 현재 구성을 반환합니다
   */
  getConfig(): ProcessingConfig {
    return this.processorConfig.config;
  }

  /**
   * 전체 뉴스 통합 프로세스를 실행합니다
   */
  async processTopicFolder(topicFolderPath: string): Promise<ProcessingResult> {
    const context: PipelineContext = {
      topicFolderPath,
      enableVerbose: this.options.verbose || false,
      enableMetrics: this.options.enableMetrics || false,
      outputFilename: this.options.outputFilename || 'news.json',
      metrics: {},
      data: {}
    };
    
    try {
      const result = await this.pipeline.execute(context);
      
      if (!result.success) {
        throw result.error || new Error(result.message || '처리 실패');
      }
      
      const metricsCollector = this.pipeline.getMetricsCollector();
      const metrics = metricsCollector.getMetrics();
      
      // 결과 출력
      if (context.enableVerbose) {
        const { newsItems, consolidatedContent } = context.data;
        
        console.log('\n✅ 뉴스 통합 완료!');
        console.log(`📊 총 ${newsItems?.length || 0}개 기사 → 1개 통합 내용`);
        
        if (context.enableMetrics) {
          metricsCollector.displayMetrics();
        }
        
        // 미리보기
        if (consolidatedContent) {
          console.log('\n📰 통합 내용 미리보기:');
          console.log('-'.repeat(40));
          const preview = consolidatedContent.length > 200 
            ? consolidatedContent.substring(0, 200) + '...'
            : consolidatedContent;
          console.log(preview);
        }
      }

      const processingMetrics: ProcessingMetrics = {
        loadTime: metrics.loadTime || 0,
        aiTime: metrics.aiTime || 0,
        saveTime: metrics.saveTime || 0,
        totalArticles: metrics.totalArticles || 0,
        consolidatedLength: metrics.consolidatedLength || 0,
        sourcesCount: metrics.sourcesCount || 0
      };

      return {
        outputPath: context.data.jsonPath || '',
        totalTime: metrics.totalTime || 0,
        metrics: processingMetrics
      };
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * 개발 모드로 설정합니다
   */
  setDevelopmentMode(): void {
    this.processorConfig.setDevelopmentMode();
    this.consolidationStep.updateConfig(this.processorConfig.config);
  }

  /**
   * 프로덕션 모드로 설정합니다
   */
  setProductionMode(): void {
    this.processorConfig.setProductionMode();
    this.consolidationStep.updateConfig(this.processorConfig.config);
  }
}

// 기본 내보내기
export { NewsConsolidator as default };