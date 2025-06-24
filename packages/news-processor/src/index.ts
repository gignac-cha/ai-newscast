/**
 * AI News Cast - News Processor Package
 * 
 * AI를 활용한 뉴스 데이터 통합 및 처리 패키지
 * 
 * @version 2.0.0
 */

// 메인 통합 클래스
export { NewsConsolidator, NewsConsolidator as default } from './consolidator.ts';

// 모듈화된 구성 요소들
export { NewsLoader } from './loaders/news-loader.ts';
export { AIConsolidator } from './ai/consolidator.ts';
export { FileManager } from './managers/file-manager.ts';
export { ProcessorConfig } from './config/processor-config.ts';

// Pipeline 구성 요소들
export { ProcessingPipeline } from './pipeline/processing-pipeline.ts';
export { ValidationStep } from './pipeline/steps/validation-step.ts';
export { LoadingStep } from './pipeline/steps/loading-step.ts';
export { ConsolidationStep } from './pipeline/steps/consolidation-step.ts';
export { SavingStep } from './pipeline/steps/saving-step.ts';

// 모니터링 구성 요소들
export { ProgressTracker } from './monitoring/progress-tracker.ts';
export { ProcessingMetricsCollector } from './monitoring/metrics-collector.ts';

// 서비스 레이어
export { NewsService } from './services/news-service.ts';

// 팩토리
export { PipelineFactory } from './factories/pipeline-factory.ts';

// 유틸리티
export { ErrorHandler, ProcessingError, ErrorType } from './utils/error-handler.ts';
export { PerformanceUtils } from './utils/performance-utils.ts';

// 인터페이스 exports
export type * from './interfaces/pipeline-step.ts';
export type * from './interfaces/progress-reporter.ts';

// 타입 exports
export type * from './types/index.ts';

// 코어 타입 re-export
export type { 
  NewsList, 
  NewsDetail, 
  ConsolidatedNews, 
  ProcessingConfig 
} from '@ai-newscast/core';