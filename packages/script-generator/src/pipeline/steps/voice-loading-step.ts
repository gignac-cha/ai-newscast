/**
 * Voice Loading Step
 * TTS 음성 설정을 로드하고 랜덤 진행자를 선택하는 단계
 */

import fs from 'fs/promises';
import path from 'path';
import {
  ScriptPipelineStep,
  ScriptGenerationContext,
  TTSVoices,
  VoiceConfig,
  VoiceConfigurationError
} from '../../interfaces/index.ts';
import { Logger } from '@ai-newscast/core';

export class VoiceLoadingStep implements ScriptPipelineStep<ScriptGenerationContext, ScriptGenerationContext> {
  readonly name = 'voice_loading';

  async execute(context: ScriptGenerationContext): Promise<ScriptGenerationContext> {
    Logger.info('🎤 TTS 음성 설정 로딩 시작');
    
    if (!context.metrics) {
      throw new VoiceConfigurationError('메트릭스가 초기화되지 않았습니다');
    }

    const startTime = performance.now();

    try {
      // 음성 설정 파일 로드
      const voices = await this.loadTTSVoices(context.config.voicesConfigPath);
      
      // 랜덤 진행자 설정 생성
      const randomizedVoices = this.generateRandomHosts(voices);
      
      // 컨텍스트 업데이트
      context.voices = randomizedVoices;
      
      const loadTime = performance.now() - startTime;
      context.metrics.voiceLoadTime = loadTime;

      Logger.info(`   ✅ 음성 설정 로드 완료 (${loadTime.toFixed(1)}ms)`);
      Logger.info(`   🎯 사용 가능한 Chirp 음성: ${voices.metadata.total_voices}개`);
      
      this.logSelectedHosts(randomizedVoices);

      return context;

    } catch (error) {
      Logger.error('❌ 음성 설정 로드 실패:', error);
      throw new VoiceConfigurationError(
        `음성 설정 로드 실패: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * TTS 음성 설정 파일 로드
   */
  private async loadTTSVoices(voicesConfigPath: string): Promise<TTSVoices> {
    try {
      const voicesContent = await fs.readFile(voicesConfigPath, 'utf-8');
      const voices = JSON.parse(voicesContent) as TTSVoices;
      
      // 기본 유효성 검증
      if (!voices.voices || !voices.metadata) {
        throw new Error('음성 설정 파일 형식이 올바르지 않습니다');
      }

      Logger.debug(`음성 설정 파일 로드: ${voicesConfigPath}`);
      return voices;

    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        throw new Error(`음성 설정 파일을 찾을 수 없습니다: ${voicesConfigPath}`);
      }
      throw error;
    }
  }

  /**
   * 음성 모델을 성별별로 분류
   */
  private getVoiceModelsByGender(voices: TTSVoices): { male: string[], female: string[] } {
    const male: string[] = [];
    const female: string[] = [];
    
    for (const [voiceModel, config] of Object.entries(voices.voices)) {
      if (config.gender === 'male') {
        male.push(voiceModel);
      } else if (config.gender === 'female') {
        female.push(voiceModel);
      }
    }
    
    return { male, female };
  }

  /**
   * 배열에서 랜덤 요소 선택
   */
  private randomChoice<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error('빈 배열에서 랜덤 선택할 수 없습니다');
    }
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * 랜덤 진행자 설정 생성 (성별 균형 보장)
   */
  private generateRandomHosts(voices: TTSVoices): TTSVoices {
    const { male, female } = this.getVoiceModelsByGender(voices);
    
    if (male.length === 0 || female.length === 0) {
      throw new VoiceConfigurationError('남성 또는 여성 음성 모델이 부족합니다 (각각 최소 1개 필요)');
    }
    
    // 랜덤으로 성별 순서 결정 (50% 확률)
    const isMaleFirst = Math.random() < 0.5;
    
    // 각 성별에서 랜덤 음성 모델 선택
    const selectedMale = this.randomChoice(male);
    const selectedFemale = this.randomChoice(female);
    
    // 랜덤 순서로 host1, host2 배정
    const host1 = isMaleFirst 
      ? { 
          voice_model: selectedMale, 
          name: voices.voices[selectedMale].name, 
          gender: 'male' as const 
        }
      : { 
          voice_model: selectedFemale, 
          name: voices.voices[selectedFemale].name, 
          gender: 'female' as const 
        };
        
    const host2 = isMaleFirst
      ? { 
          voice_model: selectedFemale, 
          name: voices.voices[selectedFemale].name, 
          gender: 'female' as const 
        }
      : { 
          voice_model: selectedMale, 
          name: voices.voices[selectedMale].name, 
          gender: 'male' as const 
        };
    
    // 새로운 진행자 설정으로 voices 업데이트
    return {
      ...voices,
      default_newscast_hosts: { host1, host2 }
    };
  }

  /**
   * 선택된 진행자 정보 로깅
   */
  private logSelectedHosts(voices: TTSVoices): void {
    const host1 = voices.default_newscast_hosts.host1;
    const host2 = voices.default_newscast_hosts.host2;
    
    Logger.info(`   🎲 랜덤 진행자 선택:`);
    Logger.info(`      Host1: ${host1.name} (${host1.gender === 'male' ? '남성' : '여성'}) - ${host1.voice_model}`);
    Logger.info(`      Host2: ${host2.name} (${host2.gender === 'male' ? '남성' : '여성'}) - ${host2.voice_model}`);
    Logger.info(`   ✅ 성별 균형 확인: ${host1.gender === 'male' ? '남성' : '여성'} + ${host2.gender === 'male' ? '남성' : '여성'}`);
  }
}