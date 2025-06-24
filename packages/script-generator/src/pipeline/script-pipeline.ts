/**
 * Script Generation Pipeline
 * news-processor의 Pipeline 패턴을 참조하여 구현
 */

import {
  ScriptPipelineStep,
  ScriptGenerationContext,
  NewscastScript,
  ProgressCallback,
  ScriptGenerationError
} from '../interfaces/index.ts';
import { Logger } from '@ai-newscast/core';

export class ScriptGenerationPipeline {
  private steps: ScriptPipelineStep[] = [];
  private progressCallback?: ProgressCallback;

  constructor() {
    this.steps = [];
  }

  /**
   * 파이프라인 단계 추가
   */
  addStep(step: ScriptPipelineStep): void {
    this.steps.push(step);
    Logger.debug(`Pipeline step added: ${step.name}`);
  }

  /**
   * 진행상황 콜백 설정
   */
  setProgressCallback(callback: ProgressCallback): void {
    this.progressCallback = callback;
  }

  /**
   * 파이프라인 실행
   */
  async execute(context: ScriptGenerationContext): Promise<NewscastScript> {
    Logger.info('🎬 뉴스캐스트 스크립트 생성 파이프라인 시작');
    
    if (!context.metrics) {
      context.metrics = {
        startTime: performance.now(),
        voiceLoadTime: 0,
        aiGenerationTime: 0,
        parsingTime: 0,
        savingTime: 0,
        scriptLength: 0,
        dialogueLines: 0
      };
    }

    const startMemory = process.memoryUsage();
    context.metrics.memoryUsage = {
      before: startMemory.heapUsed,
      after: 0,
      peak: startMemory.heapUsed
    };

    let currentData: any = context;
    
    try {
      for (let i = 0; i < this.steps.length; i++) {
        const step = this.steps[i];
        const stepProgress = ((i / this.steps.length) * 100);
        
        Logger.info(`   📋 단계 ${i + 1}/${this.steps.length}: ${step.name}`);
        
        // 진행상황 콜백 호출
        if (this.progressCallback) {
          this.progressCallback(step.name, stepProgress, `단계 ${i + 1}/${this.steps.length} 실행 중`);
        }

        const stepStartTime = performance.now();
        
        try {
          // 단계 실행
          currentData = await step.execute(currentData);
          
          const stepTime = performance.now() - stepStartTime;
          Logger.info(`   ✅ ${step.name} 완료 (${stepTime.toFixed(1)}ms)`);
          
          // 메모리 추적
          const currentMemory = process.memoryUsage();
          if (context.metrics.memoryUsage && currentMemory.heapUsed > context.metrics.memoryUsage.peak) {
            context.metrics.memoryUsage.peak = currentMemory.heapUsed;
          }
          
        } catch (error) {
          Logger.error(`❌ ${step.name} 실패:`, error);
          throw new ScriptGenerationError(
            `파이프라인 단계 '${step.name}' 실행 실패: ${error instanceof Error ? error.message : String(error)}`,
            step.name,
            error instanceof Error ? error : undefined
          );
        }
      }

      // 최종 결과 검증
      if (!this.isValidNewscastScript(currentData)) {
        throw new ScriptGenerationError(
          '파이프라인 실행 결과가 유효한 NewscastScript 형식이 아닙니다',
          'validation'
        );
      }

      // 메트릭스 완성
      const endTime = performance.now();
      const endMemory = process.memoryUsage();
      
      if (context.metrics) {
        context.metrics.endTime = endTime;
        context.metrics.totalTime = endTime - context.metrics.startTime;
        if (context.metrics.memoryUsage) {
          context.metrics.memoryUsage.after = endMemory.heapUsed;
        }
      }

      // 최종 진행상황
      if (this.progressCallback) {
        this.progressCallback('completed', 100, '스크립트 생성 완료');
      }

      Logger.info(`✅ 스크립트 생성 파이프라인 완료 (${context.metrics?.totalTime?.toFixed(1)}ms)`);
      this.logMetrics(context.metrics);

      return currentData as NewscastScript;

    } catch (error) {
      Logger.error('❌ 스크립트 생성 파이프라인 실패:', error);
      
      if (this.progressCallback) {
        this.progressCallback('error', 0, `오류 발생: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      throw error;
    }
  }

  /**
   * NewscastScript 유효성 검증
   */
  private isValidNewscastScript(data: any): data is NewscastScript {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.title === 'string' &&
      typeof data.program_name === 'string' &&
      data.hosts &&
      data.hosts.host1 &&
      data.hosts.host2 &&
      Array.isArray(data.dialogue_lines) &&
      data.metadata &&
      typeof data.metadata.total_articles === 'number'
    );
  }

  /**
   * 메트릭스 로깅
   */
  private logMetrics(metrics?: ScriptGenerationMetrics): void {
    if (!metrics) return;

    Logger.info('📊 스크립트 생성 성능 메트릭스:');
    Logger.info(`   ⏱️  총 소요 시간: ${metrics.totalTime?.toFixed(1)}ms`);
    Logger.info(`   🎤 음성 설정 로드: ${metrics.voiceLoadTime.toFixed(1)}ms`);
    Logger.info(`   🤖 AI 스크립트 생성: ${metrics.aiGenerationTime.toFixed(1)}ms`);
    Logger.info(`   📝 대화 라인 파싱: ${metrics.parsingTime.toFixed(1)}ms`);
    Logger.info(`   💾 파일 저장: ${metrics.savingTime.toFixed(1)}ms`);
    Logger.info(`   📏 스크립트 길이: ${metrics.scriptLength}자`);
    Logger.info(`   🎬 대화 라인 수: ${metrics.dialogueLines}개`);
    
    if (metrics.memoryUsage) {
      const memoryDiff = metrics.memoryUsage.after - metrics.memoryUsage.before;
      const peakIncrease = metrics.memoryUsage.peak - metrics.memoryUsage.before;
      Logger.info(`   💾 메모리 사용량: ${this.formatBytes(memoryDiff)} (최대: +${this.formatBytes(peakIncrease)})`);
    }
  }

  /**
   * 바이트 포맷팅 유틸리티
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 현재 설정된 단계들 반환
   */
  getSteps(): ReadonlyArray<ScriptPipelineStep> {
    return [...this.steps];
  }

  /**
   * 파이프라인 초기화
   */
  clear(): void {
    this.steps = [];
    this.progressCallback = undefined;
    Logger.debug('Script generation pipeline cleared');
  }
}