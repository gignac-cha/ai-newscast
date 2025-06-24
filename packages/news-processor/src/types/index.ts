// Re-export core types
export type { 
  NewsList, 
  NewsDetail, 
  ConsolidatedNews, 
  ProcessingConfig 
} from '@ai-newscast/core';

/**
 * 뉴스 처리 결과 인터페이스
 */
export interface ProcessingResult {
  outputPath: string;
  totalTime: number;
  metrics: ProcessingMetrics;
}

/**
 * 처리 메트릭 인터페이스
 */
export interface ProcessingMetrics {
  loadTime: number;
  aiTime: number;
  saveTime: number;
  totalArticles: number;
  consolidatedLength: number;
  sourcesCount: number;
}

/**
 * 뉴스 로더 결과 인터페이스
 */
export interface NewsLoadResult {
  newsListData: NewsList;
  newsItems: NewsDetail[];
  loadTime: number;
}

/**
 * AI 통합 결과 인터페이스
 */
export interface ConsolidationResult {
  consolidatedContent: string;
  processingTime: number;
  tokensUsed?: number;
}

/**
 * 파일 저장 결과 인터페이스
 */
export interface SaveResult {
  jsonPath: string;
  textPath: string;
  saveTime: number;
  fileSizes: {
    json: string;
    text: string;
  };
}

/**
 * 처리 단계 열거형
 */
export enum ProcessingStep {
  VALIDATION = 'validation',
  LOADING = 'loading',
  CONSOLIDATION = 'consolidation',
  SAVING = 'saving',
  COMPLETED = 'completed',
  ERROR = 'error'
}

/**
 * 처리 상태 인터페이스
 */
export interface ProcessingStatus {
  step: ProcessingStep;
  progress: number; // 0-100
  message: string;
  timestamp: string;
  error?: Error;
}

/**
 * 뉴스 프로세서 옵션 인터페이스
 */
export interface NewsProcessorOptions {
  enableRetry?: boolean;
  enableMetrics?: boolean;
  enableProgressTracking?: boolean;
  outputFilename?: string;
  verbose?: boolean;
}

/**
 * 처리 이벤트 콜백 타입
 */
export type ProcessingEventCallback = (status: ProcessingStatus) => void;

/**
 * 에러 핸들링 결과 인터페이스
 */
export interface ErrorHandlingResult {
  recovered: boolean;
  fallbackUsed: boolean;
  retryCount: number;
  finalError?: Error;
}