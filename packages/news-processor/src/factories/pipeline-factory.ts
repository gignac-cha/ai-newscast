import type { NewsProcessorOptions } from '../types/index.ts';
import type { ProcessingConfig } from '@ai-newscast/core';
import { ProcessingPipeline } from '../pipeline/processing-pipeline.ts';
import { ValidationStep } from '../pipeline/steps/validation-step.ts';
import { LoadingStep } from '../pipeline/steps/loading-step.ts';
import { ConsolidationStep } from '../pipeline/steps/consolidation-step.ts';
import { SavingStep } from '../pipeline/steps/saving-step.ts';

/**
 * 파이프라인 팩토리
 */
export class PipelineFactory {
  /**
   * 기본 뉴스 처리 파이프라인을 생성합니다
   */
  static createDefaultPipeline(
    options: NewsProcessorOptions,
    config?: Partial<ProcessingConfig>
  ): ProcessingPipeline {
    const pipeline = new ProcessingPipeline();
    
    // 기본 단계들 추가
    pipeline.addStep(new ValidationStep());
    pipeline.addStep(new LoadingStep());
    pipeline.addStep(new ConsolidationStep(options.enableRetry));
    pipeline.addStep(new SavingStep());
    
    // 진행 상태 추적 설정
    if (options.enableProgressTracking) {
      pipeline.enableProgressTracking();
    }
    
    return pipeline;
  }
  
  /**
   * 사용자 정의 파이프라인을 생성합니다
   */
  static createCustomPipeline(
    steps: any[], // PipelineStep[]
    enableProgressTracking: boolean = false
  ): ProcessingPipeline {
    const pipeline = new ProcessingPipeline();
    
    steps.forEach(step => pipeline.addStep(step));
    
    if (enableProgressTracking) {
      pipeline.enableProgressTracking();
    }
    
    return pipeline;
  }
  
  /**
   * 빠른 처리용 파이프라인을 생성합니다 (재시도 없음)
   */
  static createFastPipeline(): ProcessingPipeline {
    const pipeline = new ProcessingPipeline();
    
    pipeline.addStep(new ValidationStep());
    pipeline.addStep(new LoadingStep());
    pipeline.addStep(new ConsolidationStep(false)); // 재시도 비활성화
    pipeline.addStep(new SavingStep());
    
    return pipeline;
  }
  
  /**
   * 안정성 중심 파이프라인을 생성합니다 (재시도 포함)
   */
  static createRobustPipeline(): ProcessingPipeline {
    const pipeline = new ProcessingPipeline();
    
    pipeline.addStep(new ValidationStep());
    pipeline.addStep(new LoadingStep());
    pipeline.addStep(new ConsolidationStep(true)); // 재시도 활성화
    pipeline.addStep(new SavingStep());
    
    pipeline.enableProgressTracking();
    
    return pipeline;
  }
}