import type { PipelineExecutor, PipelineStep, PipelineContext, StepResult } from '../interfaces/pipeline-step.ts';
import type { ProcessingStep } from '../types/index.ts';
import { ProgressTracker } from '../monitoring/progress-tracker.ts';
import { ProcessingMetricsCollector } from '../monitoring/metrics-collector.ts';

/**
 * 뉴스 처리 파이프라인 실행기
 */
export class ProcessingPipeline implements PipelineExecutor {
  private steps: PipelineStep[] = [];
  private progressTracker: ProgressTracker;
  private metricsCollector: ProcessingMetricsCollector;
  
  constructor() {
    this.progressTracker = new ProgressTracker();
    this.metricsCollector = new ProcessingMetricsCollector();
  }
  
  /**
   * 단계를 추가합니다
   */
  addStep(step: PipelineStep): void {
    this.steps.push(step);
  }
  
  /**
   * 진행 상황 콜백을 설정합니다
   */
  onProgress(callback: (stepName: string, progress: number, message: string) => void): void {
    this.progressTracker.setCallback((status) => {
      callback(status.step, status.progress, status.message);
    });
  }
  
  /**
   * 진행 상태 추적을 활성화합니다
   */
  enableProgressTracking(): void {
    this.progressTracker.setEnabled(true);
  }
  
  /**
   * 메트릭 수집기를 반환합니다
   */
  getMetricsCollector(): ProcessingMetricsCollector {
    return this.metricsCollector;
  }
  
  /**
   * 파이프라인을 실행합니다
   */
  async execute(context: PipelineContext): Promise<StepResult> {
    const totalSteps = this.steps.length;
    let currentStep = 0;
    
    this.metricsCollector.startTimer('totalTime');
    
    try {
      for (const step of this.steps) {
        const stepProgress = Math.round((currentStep / totalSteps) * 100);
        
        // 진행 상태 보고
        this.progressTracker.report(
          step.name as ProcessingStep,
          stepProgress,
          `${step.description} 중...`
        );
        
        // 단계 유효성 검사
        if (step.validate) {
          const isValid = await step.validate(context);
          if (!isValid) {
            throw new Error(`${step.name} 단계 유효성 검사 실패`);
          }
        }
        
        // 단계 실행
        this.metricsCollector.startTimer(`${step.name}Time`);
        const result = await step.execute(context);
        const stepTime = this.metricsCollector.endTimer(`${step.name}Time`);
        
        if (!result.success) {
          this.progressTracker.report(
            step.name as ProcessingStep,
            stepProgress,
            result.message || `${step.name} 실패`,
            result.error
          );
          
          return {
            success: false,
            error: result.error,
            message: `${step.name} 단계에서 실패: ${result.message}`
          };
        }
        
        // 메트릭 병합
        if (result.metrics) {
          Object.entries(result.metrics).forEach(([key, value]) => {
            this.metricsCollector.setValue(key, value);
          });
        }
        
        if (context.enableVerbose && step.name !== 'validation') {
          console.log(`✅ ${step.description} 완료 (${stepTime}ms)`);
        }
        
        currentStep++;
      }
      
      const totalTime = this.metricsCollector.endTimer('totalTime');
      this.metricsCollector.setValue('totalTime', totalTime);
      
      // 최종 진행 상태 보고
      this.progressTracker.report(
        'completed' as ProcessingStep,
        100,
        '모든 처리 완료'
      );
      
      return {
        success: true,
        message: '파이프라인 실행 완료',
        metrics: this.metricsCollector.getMetrics()
      };
      
    } catch (error) {
      const totalTime = this.metricsCollector.endTimer('totalTime');
      this.metricsCollector.setValue('totalTime', totalTime);
      
      this.progressTracker.report(
        'error' as ProcessingStep,
        0,
        '파이프라인 실행 중 오류 발생',
        error as Error
      );
      
      return {
        success: false,
        error: error as Error,
        message: '파이프라인 실행 실패'
      };
    } finally {
      // 정리 작업
      await this.cleanup(context);
    }
  }
  
  /**
   * 정리 작업을 수행합니다
   */
  private async cleanup(context: PipelineContext): Promise<void> {
    for (const step of this.steps) {
      if (step.cleanup) {
        try {
          await step.cleanup(context);
        } catch (error) {
          console.warn(`${step.name} 단계 정리 중 오류:`, error);
        }
      }
    }
  }
  
  /**
   * 파이프라인 상태를 초기화합니다
   */
  reset(): void {
    this.metricsCollector.reset();
  }
}