/**
 * ScriptGenerator - 메인 스크립트 생성 클래스
 * Pipeline 패턴을 사용하여 뉴스캐스트 스크립트를 생성합니다
 */

import path from 'path';
import {
  ScriptGeneratorOptions,
  ScriptGeneratorConfig,
  ConsolidatedNews,
  NewscastScript,
  ScriptGenerationContext,
  ScriptGenerationMetrics,
  ProgressCallback,
  ScriptGenerationError
} from './interfaces/index.ts';
import { ScriptGenerationPipeline } from './pipeline/script-pipeline.ts';
import { VoiceLoadingStep } from './pipeline/steps/voice-loading-step.ts';
import { AIGenerationStep } from './pipeline/steps/ai-generation-step.ts';
import { DialogueParsingStep } from './pipeline/steps/dialogue-parsing-step.ts';
import { ScriptAssemblyStep } from './pipeline/steps/script-assembly-step.ts';
import { Logger } from '@ai-newscast/core';

export class ScriptGenerator {
  private config: ScriptGeneratorConfig;
  private pipeline: ScriptGenerationPipeline;
  private progressCallback?: ProgressCallback;

  constructor(options: ScriptGeneratorOptions = {}) {
    this.config = this.buildConfig(options);
    this.pipeline = new ScriptGenerationPipeline();
    this.initializePipeline();
    
    Logger.info('🎬 ScriptGenerator 초기화 완료');
    Logger.debug('Config:', this.config);
  }

  /**
   * 설정 빌드
   */
  private buildConfig(options: ScriptGeneratorOptions): ScriptGeneratorConfig {
    return {
      geminiModel: 'gemini-1.5-pro',
      voicesConfigPath: options.voicesConfigPath || '/mnt/d/Projects/ai-newscast/packages/core/config/tts-voices.json',
      outputPath: options.outputPath || './output',
      enableProgress: options.enableProgress ?? true,
      enableMetrics: options.enableMetrics ?? true,
      maxRetries: options.maxRetries ?? 3,
      timeout: options.timeout ?? 30000
    };
  }

  /**
   * 파이프라인 초기화
   */
  private initializePipeline(): void {
    this.pipeline.addStep(new VoiceLoadingStep());
    this.pipeline.addStep(new AIGenerationStep());
    this.pipeline.addStep(new DialogueParsingStep());
    this.pipeline.addStep(new ScriptAssemblyStep());

    Logger.debug(`파이프라인 초기화: ${this.pipeline.getSteps().length}개 단계`);
  }

  /**
   * 진행상황 콜백 설정
   */
  setProgressCallback(callback: ProgressCallback): void {
    this.progressCallback = callback;
    this.pipeline.setProgressCallback(callback);
  }

  /**
   * 뉴스캐스트 스크립트 생성
   */
  async generateScript(
    newsData: ConsolidatedNews,
    outputPath?: string
  ): Promise<{ script: NewscastScript; metrics: ScriptGenerationMetrics }> {
    Logger.info(`🚀 뉴스캐스트 스크립트 생성 시작: ${newsData.topic}`);
    
    // API 키 검증
    if (!AIGenerationStep.validateApiKey()) {
      throw new ScriptGenerationError(
        'GOOGLE_AI_API_KEY 환경변수가 설정되지 않았습니다',
        'initialization'
      );
    }

    const totalStartTime = performance.now();
    const startMemory = process.memoryUsage();

    // 메트릭스 초기화
    const metrics: ScriptGenerationMetrics = {
      startTime: totalStartTime,
      voiceLoadTime: 0,
      aiGenerationTime: 0,
      parsingTime: 0,
      savingTime: 0,
      scriptLength: 0,
      dialogueLines: 0,
      memoryUsage: {
        before: startMemory.heapUsed,
        after: 0,
        peak: startMemory.heapUsed
      }
    };

    // 컨텍스트 생성
    const context: ScriptGenerationContext = {
      news: newsData,
      voices: undefined as any, // VoiceLoadingStep에서 설정됨
      config: this.config,
      outputPath: outputPath || path.join(this.config.outputPath, this.generateOutputPath(newsData)),
      metrics
    };

    try {
      // 파이프라인 실행
      const script = await this.pipeline.execute(context);

      // 최종 메트릭스 계산
      const endTime = performance.now();
      const endMemory = process.memoryUsage();
      
      metrics.endTime = endTime;
      metrics.totalTime = endTime - totalStartTime;
      if (metrics.memoryUsage) {
        metrics.memoryUsage.after = endMemory.heapUsed;
      }

      Logger.info(`✅ 스크립트 생성 완료: ${script.title}`);
      Logger.info(`   🕐 총 소요 시간: ${metrics.totalTime?.toFixed(1)}ms`);
      Logger.info(`   📝 스크립트 길이: ${script.main_content.length}자`);
      Logger.info(`   🎬 대화 라인: ${script.dialogue_lines.length}개`);

      return { script, metrics };

    } catch (error) {
      Logger.error('❌ 스크립트 생성 실패:', error);
      
      if (this.progressCallback) {
        this.progressCallback(
          'error', 
          0, 
          `스크립트 생성 실패: ${error instanceof Error ? error.message : String(error)}`
        );
      }
      
      throw error;
    }
  }

  /**
   * 배치 스크립트 생성 (여러 뉴스 동시 처리)
   */
  async generateBatchScripts(
    newsDataList: ConsolidatedNews[],
    baseOutputPath?: string
  ): Promise<{ scripts: NewscastScript[]; metrics: ScriptGenerationMetrics[] }> {
    Logger.info(`📚 배치 스크립트 생성 시작: ${newsDataList.length}개 뉴스`);
    
    const scripts: NewscastScript[] = [];
    const metrics: ScriptGenerationMetrics[] = [];
    
    let completed = 0;
    
    for (const newsData of newsDataList) {
      try {
        const outputPath = baseOutputPath 
          ? path.join(baseOutputPath, this.generateOutputPath(newsData))
          : undefined;
          
        const result = await this.generateScript(newsData, outputPath);
        
        scripts.push(result.script);
        metrics.push(result.metrics);
        completed++;
        
        if (this.progressCallback) {
          this.progressCallback(
            'batch_progress',
            (completed / newsDataList.length) * 100,
            `${completed}/${newsDataList.length} 완료`
          );
        }
        
        // 메모리 정리를 위한 약간의 지연
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        Logger.error(`뉴스 '${newsData.topic}' 스크립트 생성 실패:`, error);
        // 개별 실패는 전체 배치를 중단하지 않음
        continue;
      }
    }
    
    Logger.info(`✅ 배치 스크립트 생성 완료: ${scripts.length}/${newsDataList.length} 성공`);
    
    return { scripts, metrics };
  }

  /**
   * 출력 경로 생성
   */
  private generateOutputPath(newsData: ConsolidatedNews): string {
    // 기본 출력 경로는 현재 디렉토리
    // CLI에서 -o 옵션으로 지정된 경우 해당 경로 사용
    return '.';
  }

  /**
   * 설정 정보 반환
   */
  getConfig(): Readonly<ScriptGeneratorConfig> {
    return { ...this.config };
  }

  /**
   * 파이프라인 상태 반환
   */
  getPipelineInfo(): {
    steps: string[];
    isInitialized: boolean;
  } {
    return {
      steps: this.pipeline.getSteps().map(step => step.name),
      isInitialized: this.pipeline.getSteps().length > 0
    };
  }

  /**
   * 리소스 정리
   */
  dispose(): void {
    this.pipeline.clear();
    this.progressCallback = undefined;
    Logger.debug('ScriptGenerator 리소스 정리 완료');
  }
}