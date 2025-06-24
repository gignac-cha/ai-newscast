/**
 * AI Generation Step
 * Google Gemini API를 사용하여 뉴스캐스트 스크립트를 생성하는 단계
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  ScriptPipelineStep,
  ScriptGenerationContext,
  ConsolidatedNews,
  TTSVoices,
  AIGenerationError
} from '../../interfaces/index.ts';
import { Logger, RetryUtils } from '@ai-newscast/core';
import { PromptLoader } from '../../utils/prompt-loader.ts';

interface AIGenerationInput extends ScriptGenerationContext {
  rawScript?: string;
}

export class AIGenerationStep implements ScriptPipelineStep<ScriptGenerationContext, AIGenerationInput> {
  readonly name = 'ai_generation';
  private genai: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new AIGenerationError('GOOGLE_AI_API_KEY 환경변수가 설정되지 않았습니다');
    }
    
    this.genai = new GoogleGenerativeAI(apiKey);
    Logger.debug('Google Generative AI 클라이언트 초기화 완료');
  }

  async execute(context: ScriptGenerationContext): Promise<AIGenerationInput> {
    Logger.info('🤖 AI 뉴스캐스트 스크립트 생성 시작');
    
    if (!context.metrics) {
      throw new AIGenerationError('메트릭스가 초기화되지 않았습니다');
    }

    if (!context.voices) {
      throw new AIGenerationError('음성 설정이 로드되지 않았습니다');
    }

    const startTime = performance.now();

    try {
      // Gemini API로 스크립트 생성
      const scriptText = await this.generateNewscastScript(
        context.news,
        context.voices,
        context.config.maxRetries
      );

      const generationTime = performance.now() - startTime;
      context.metrics.aiGenerationTime = generationTime;
      context.metrics.scriptLength = scriptText.length;

      Logger.info(`   ✅ AI 스크립트 생성 완료 (${generationTime.toFixed(1)}ms)`);
      Logger.info(`   📝 스크립트 길이: ${scriptText.length}자`);

      // 컨텍스트에 생성된 스크립트 추가
      return {
        ...context,
        rawScript: scriptText
      };

    } catch (error) {
      Logger.error('❌ AI 스크립트 생성 실패:', error);
      throw new AIGenerationError(
        `AI 스크립트 생성 실패: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Gemini API를 사용한 뉴스캐스트 스크립트 생성
   */
  private async generateNewscastScript(
    newsData: ConsolidatedNews,
    voices: TTSVoices,
    maxRetries: number
  ): Promise<string> {
    const host1 = voices.default_newscast_hosts.host1;
    const host2 = voices.default_newscast_hosts.host2;
    
    const prompt = this.buildPrompt(newsData, voices, host1, host2);
    
    return RetryUtils.withRetry(async () => {
      Logger.debug('Gemini API 호출 시작');
      
      const model = this.genai.getGenerativeModel({ 
        model: 'gemini-1.5-pro' // gemini-2.5-pro-preview-03-25에서 안정 버전으로 변경
      });
      
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 4096,
        },
      });

      const response = await result.response;
      const text = response.text();
      
      if (!text || text.trim().length === 0) {
        throw new Error('Gemini API에서 빈 응답을 받았습니다');
      }

      Logger.debug(`Gemini API 응답 길이: ${text.length}자`);
      return text.trim();

    }, maxRetries, 1000); // 1초 간격으로 재시도
  }

  /**
   * 프롬프트 템플릿을 로드하고 변수를 치환하여 Gemini API용 프롬프트 생성
   */
  private buildPrompt(
    newsData: ConsolidatedNews,
    voices: TTSVoices,
    host1: { name: string; gender: 'male' | 'female' },
    host2: { name: string; gender: 'male' | 'female' }
  ): string {
    try {
      // 프롬프트 템플릿에 사용할 변수들
      const variables = {
        PROGRAM_NAME: voices.metadata.default_program,
        HOST1_NAME: host1.name,
        HOST1_GENDER: host1.gender === 'male' ? '남성' : '여성',
        HOST2_NAME: host2.name,
        HOST2_GENDER: host2.gender === 'male' ? '남성' : '여성',
        NEWS_TOPIC: newsData.topic,
        NEWS_SOURCES: newsData.sources.slice(0, 5).join(', '),
        SOURCES_COUNT: newsData.sources.length.toString(),
        TOTAL_ARTICLES: newsData.total_articles.toString(),
        NEWS_CONTENT: newsData.consolidated_content
      };

      // 프롬프트 템플릿 로드 및 변수 치환
      const prompt = PromptLoader.loadNewscastPrompt(variables);
      
      // 템플릿 변수가 모두 치환되었는지 검증
      if (!PromptLoader.validateTemplate(prompt)) {
        const remaining = PromptLoader.getRemainingPlaceholders(prompt);
        Logger.warn(`프롬프트 템플릿에 치환되지 않은 변수가 있습니다: ${remaining.join(', ')}`);
      }
      
      Logger.debug(`프롬프트 길이: ${prompt.length}자`);
      return prompt;
      
    } catch (error) {
      Logger.error('프롬프트 로드 실패, 하드코딩된 프롬프트 사용:', error);
      
      // 프롬프트 로드 실패 시 기본 프롬프트 반환 (백업)
      return this.buildFallbackPrompt(newsData, voices, host1, host2);
    }
  }

  /**
   * 프롬프트 로드 실패 시 사용할 백업 프롬프트
   */
  private buildFallbackPrompt(
    newsData: ConsolidatedNews,
    voices: TTSVoices,
    host1: { name: string; gender: 'male' | 'female' },
    host2: { name: string; gender: 'male' | 'female' }
  ): string {
    return `당신은 전문 뉴스캐스트 스크립트 작가입니다. 다음 뉴스 정보를 바탕으로 두 명의 진행자가 대화하는 형식의 3-4분 분량 뉴스캐스트 스크립트를 작성해주세요.

프로그램명: "${voices.metadata.default_program}"
진행자: ${host1.name}(${host1.gender === 'male' ? '남성' : '여성'}), ${host2.name}(${host2.gender === 'male' ? '남성' : '여성'})
주제: ${newsData.topic}
총 기사 수: ${newsData.total_articles}개

뉴스 내용:
${newsData.consolidated_content}

중요한 요구사항:
1. 반드시 **진행자이름:** 형식으로 화자를 구분해주세요
2. TTS 음성 생성을 위해 인명이나 지명에 발음 가이드 괄호를 사용하지 마세요`;
  }

  /**
   * API 키 유효성 검증
   */
  static validateApiKey(): boolean {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    return Boolean(apiKey && apiKey.length > 10);
  }
}