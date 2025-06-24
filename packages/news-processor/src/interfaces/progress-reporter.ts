import type { ProcessingStep, ProcessingStatus } from '../types/index.ts';

/**
 * 진행 상태 리포터 인터페이스
 */
export interface ProgressReporter {
  /**
   * 진행 상태를 보고합니다
   */
  report(step: ProcessingStep, progress: number, message: string, error?: Error): void;
  
  /**
   * 진행 상태 콜백을 설정합니다
   */
  setCallback(callback: (status: ProcessingStatus) => void): void;
  
  /**
   * 진행 상태 추적을 활성화/비활성화합니다
   */
  setEnabled(enabled: boolean): void;
}

/**
 * 메트릭 수집기 인터페이스
 */
export interface MetricsCollector {
  /**
   * 메트릭을 시작합니다
   */
  startTimer(key: string): void;
  
  /**
   * 메트릭을 종료하고 시간을 기록합니다
   */
  endTimer(key: string): number;
  
  /**
   * 카운터를 증가시킵니다
   */
  incrementCounter(key: string, value?: number): void;
  
  /**
   * 값을 설정합니다
   */
  setValue(key: string, value: number): void;
  
  /**
   * 현재 메트릭을 반환합니다
   */
  getMetrics(): Record<string, number>;
  
  /**
   * 메트릭을 초기화합니다
   */
  reset(): void;
}