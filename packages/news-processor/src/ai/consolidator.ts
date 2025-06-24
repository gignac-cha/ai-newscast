import { GoogleGenerativeAI } from '@google/generative-ai';
import type { NewsList, NewsDetail, ProcessingConfig } from '@ai-newscast/core';
import { PromptLoader } from '../utils/prompt-loader.ts';

/**
 * AI를 사용한 뉴스 통합 처리를 담당하는 클래스
 */
export class AIConsolidator {
  private genai: GoogleGenerativeAI;
  private config: Required<ProcessingConfig>;

  constructor(apiKey: string, config: Partial<ProcessingConfig> = {}) {
    if (!apiKey) {
      throw new Error('Google AI API 키가 필요합니다.');
    }

    this.genai = new GoogleGenerativeAI(apiKey);
    this.config = {
      aiModel: 'gemini-2.5-pro-preview-03-25',
      maxTokens: 8192,
      temperature: 0.7,
      retryAttempts: 3,
      ...config
    } as Required<ProcessingConfig>;
  }

  /**
   * AI 모델 구성을 업데이트합니다
   */
  updateConfig(config: Partial<ProcessingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 뉴스 통합을 위한 프롬프트를 생성합니다
   */
  private createConsolidationPrompt(topic: string, newsCount: number, sourcesCount: number, formattedNews: string): string {
    try {
      // 프롬프트 템플릿에 사용할 변수들
      const variables = {
        TOPIC: topic,
        NEWS_COUNT: newsCount.toString(),
        SOURCES_COUNT: sourcesCount.toString(),
        FORMATTED_NEWS: formattedNews
      };

      // 프롬프트 템플릿 로드 및 변수 치환
      const prompt = PromptLoader.loadConsolidationPrompt(variables);
      
      // 템플릿 변수가 모두 치환되었는지 검증
      if (!PromptLoader.validateTemplate(prompt)) {
        const remaining = PromptLoader.getRemainingPlaceholders(prompt);
        console.warn(`프롬프트 템플릿에 치환되지 않은 변수가 있습니다: ${remaining.join(', ')}`);
      }
      
      return prompt;
      
    } catch (error) {
      console.error('프롬프트 로드 실패, 하드코딩된 프롬프트 사용:', error);
      
      // 프롬프트 로드 실패 시 기본 프롬프트 반환 (백업)
      return this.buildFallbackPrompt(topic, newsCount, formattedNews);
    }
  }

  /**
   * 프롬프트 로드 실패 시 사용할 백업 프롬프트
   */
  private buildFallbackPrompt(topic: string, newsCount: number, formattedNews: string): string {
    return `당신은 뉴스 정리 전문가입니다. 같은 주제에 대한 여러 뉴스 기사들을 하나의 통합된 내용으로 정리해주세요.

주제: ${topic}
총 기사 수: ${newsCount}개

=== 뉴스 기사들 ===
${formattedNews}

=== 요청사항 ===
위 뉴스 기사들을 다음 조건에 맞게 하나의 통합된 내용으로 정리해주세요:

1. 모든 기사의 핵심 정보를 포함하되 중복되는 내용은 제거
2. 시간 순서대로 사건의 흐름을 정리
3. 객관적이고 정확한 정보만 포함
4. 읽기 쉽고 이해하기 쉬운 구조로 작성
5. 중요한 인물, 숫자, 날짜 등은 정확히 포함
6. 한국어로 자연스럽게 작성

통합된 뉴스 내용만 출력하고, 다른 설명이나 주석은 포함하지 마세요.`;
  }

  /**
   * 뉴스 데이터들을 AI를 사용해 하나로 통합합니다
   */
  async consolidateNews(
    newsListData: NewsList, 
    formattedNewsContent: string
  ): Promise<string> {
    console.log(`🤖 AI를 사용한 뉴스 통합 시작...`);
    
    // 언론사 수 계산 (중복 제거)
    const uniqueSources = new Set(newsListData.news_list.map(news => news.provider_name));
    const sourcesCount = uniqueSources.size;
    
    const prompt = this.createConsolidationPrompt(
      newsListData.topic,
      newsListData.total_news || newsListData.news_list.length,
      sourcesCount,
      formattedNewsContent
    );

    try {
      const model = this.genai.getGenerativeModel({ 
        model: this.config.aiModel,
        generationConfig: {
          temperature: this.config.temperature,
          maxOutputTokens: this.config.maxTokens
        }
      });

      const response = await model.generateContent(prompt);
      const consolidatedContent = response.response.text()?.trim() || '';
      
      if (!consolidatedContent) {
        throw new Error('AI로부터 응답을 받지 못했습니다.');
      }
      
      console.log(`✅ AI 통합 완료 (${consolidatedContent.length} 문자)`);
      return consolidatedContent;
      
    } catch (error) {
      console.error('❌ AI API 호출 오류:', error);
      throw new Error(`AI 통합 처리 중 오류가 발생했습니다: ${error}`);
    }
  }

  /**
   * 재시도 로직을 포함한 뉴스 통합
   */
  async consolidateNewsWithRetry(
    newsListData: NewsList, 
    formattedNewsContent: string
  ): Promise<string> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        console.log(`🔄 통합 시도 ${attempt}/${this.config.retryAttempts}`);
        return await this.consolidateNews(newsListData, formattedNewsContent);
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️  시도 ${attempt} 실패: ${error}`);
        
        if (attempt < this.config.retryAttempts) {
          const delayMs = Math.pow(2, attempt) * 1000; // 지수 백오프
          console.log(`⏳ ${delayMs}ms 후 재시도...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }
    
    throw lastError || new Error(`${this.config.retryAttempts}회 재시도 후에도 실패했습니다.`);
  }

  /**
   * 현재 AI 모델 구성을 반환합니다
   */
  getConfig(): Required<ProcessingConfig> {
    return { ...this.config };
  }
}