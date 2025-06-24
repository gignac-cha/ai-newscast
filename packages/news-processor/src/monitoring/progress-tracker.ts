import type { ProgressReporter } from '../interfaces/progress-reporter.ts';
import type { ProcessingStep, ProcessingStatus } from '../types/index.ts';

/**
 * 진행 상태 추적기
 */
export class ProgressTracker implements ProgressReporter {
  private callback?: (status: ProcessingStatus) => void;
  private enabled: boolean = false;
  
  /**
   * 진행 상태를 보고합니다
   */
  report(step: ProcessingStep, progress: number, message: string, error?: Error): void {
    if (!this.enabled || !this.callback) {
      return;
    }
    
    const status: ProcessingStatus = {
      step,
      progress,
      message,
      timestamp: new Date().toISOString(),
      error
    };
    
    this.callback(status);
  }
  
  /**
   * 진행 상태 콜백을 설정합니다
   */
  setCallback(callback: (status: ProcessingStatus) => void): void {
    this.callback = callback;
  }
  
  /**
   * 진행 상태 추적을 활성화/비활성화합니다
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  /**
   * 진행 상태 추적이 활성화되어 있는지 확인합니다
   */
  isEnabled(): boolean {
    return this.enabled;
  }
  
  /**
   * 콜백이 설정되어 있는지 확인합니다
   */
  hasCallback(): boolean {
    return !!this.callback;
  }
}