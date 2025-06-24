import type { ProcessingMetrics } from '../types/index.ts';

/**
 * 파이프라인 단계별 처리 컨텍스트
 */
export interface PipelineContext {
  topicFolderPath: string;
  enableVerbose: boolean;
  enableMetrics: boolean;
  outputFilename: string;
  metrics: Partial<ProcessingMetrics>;
  data: Record<string, any>;
}

/**
 * 파이프라인 단계별 처리 결과
 */
export interface StepResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
  metrics?: Partial<ProcessingMetrics>;
  message?: string;
}

/**
 * 파이프라인 단계 인터페이스
 */
export interface PipelineStep<TInput = any, TOutput = any> {
  readonly name: string;
  readonly description: string;
  
  /**
   * 단계를 실행합니다
   */
  execute(context: PipelineContext): Promise<StepResult<TOutput>>;
  
  /**
   * 단계 실행 전 검증을 수행합니다
   */
  validate?(context: PipelineContext): Promise<boolean>;
  
  /**
   * 단계 정리 작업을 수행합니다
   */
  cleanup?(context: PipelineContext): Promise<void>;
}

/**
 * 파이프라인 실행기 인터페이스
 */
export interface PipelineExecutor {
  /**
   * 단계를 추가합니다
   */
  addStep(step: PipelineStep): void;
  
  /**
   * 파이프라인을 실행합니다
   */
  execute(context: PipelineContext): Promise<StepResult>;
  
  /**
   * 진행 상황 콜백을 설정합니다
   */
  onProgress?(callback: (stepName: string, progress: number, message: string) => void): void;
}