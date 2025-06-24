/**
 * 크롤링 컨텍스트
 */
export interface CrawlContext {
  outputPath: string;
  enableHtml: boolean;
  enableJson: boolean;
  enableMetrics: boolean;
  data: Record<string, any>;
}

/**
 * 크롤링 결과
 */
export interface CrawlResult<T = any> {
  success: boolean;
  data?: T;
  outputPath?: string;
  error?: Error;
  metrics?: {
    duration: number;
    itemCount?: number;
    successCount?: number;
    errorCount?: number;
  };
}

/**
 * 크롤링 전략 인터페이스
 */
export interface CrawlStrategy<TInput = any, TOutput = any> {
  readonly name: string;
  readonly description: string;
  
  /**
   * 크롤링을 실행합니다
   */
  execute(context: CrawlContext, input?: TInput): Promise<CrawlResult<TOutput>>;
  
  /**
   * 실행 전 검증을 수행합니다
   */
  validate?(context: CrawlContext, input?: TInput): Promise<boolean>;
  
  /**
   * 정리 작업을 수행합니다
   */
  cleanup?(context: CrawlContext): Promise<void>;
}

/**
 * 진행상황 콜백 타입
 */
export type ProgressCallback = (strategy: string, progress: number, message: string) => void;