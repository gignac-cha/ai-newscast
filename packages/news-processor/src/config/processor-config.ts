import { config } from 'dotenv';
import type { ProcessingConfig } from '@ai-newscast/core';

// 환경변수 로드
config();

/**
 * News Processor 구성 관리 클래스
 */
export class ProcessorConfig {
  private static instance: ProcessorConfig;
  private _config: Required<ProcessingConfig>;
  private _apiKey: string;

  private constructor() {
    // 환경변수에서 API 키 로드
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY가 설정되지 않았습니다. .env 파일을 확인해주세요.');
    }
    this._apiKey = apiKey;

    // 기본 구성 설정
    this._config = {
      aiModel: 'gemini-2.5-pro-preview-03-25',
      maxTokens: 8192,
      temperature: 0.7,
      retryAttempts: 3
    };

    // 환경변수로부터 구성 오버라이드
    this.loadFromEnvironment();
  }

  /**
   * 싱글톤 인스턴스 반환
   */
  static getInstance(): ProcessorConfig {
    if (!ProcessorConfig.instance) {
      ProcessorConfig.instance = new ProcessorConfig();
    }
    return ProcessorConfig.instance;
  }

  /**
   * 환경변수로부터 구성을 로드합니다
   */
  private loadFromEnvironment(): void {
    if (process.env.AI_MODEL) {
      this._config.aiModel = process.env.AI_MODEL;
    }

    if (process.env.AI_MAX_TOKENS) {
      const maxTokens = parseInt(process.env.AI_MAX_TOKENS, 10);
      if (!isNaN(maxTokens) && maxTokens > 0) {
        this._config.maxTokens = maxTokens;
      }
    }

    if (process.env.AI_TEMPERATURE) {
      const temperature = parseFloat(process.env.AI_TEMPERATURE);
      if (!isNaN(temperature) && temperature >= 0 && temperature <= 2) {
        this._config.temperature = temperature;
      }
    }

    if (process.env.AI_RETRY_ATTEMPTS) {
      const retryAttempts = parseInt(process.env.AI_RETRY_ATTEMPTS, 10);
      if (!isNaN(retryAttempts) && retryAttempts > 0) {
        this._config.retryAttempts = retryAttempts;
      }
    }
  }

  /**
   * API 키를 반환합니다
   */
  get apiKey(): string {
    return this._apiKey;
  }

  /**
   * 현재 구성을 반환합니다
   */
  get config(): Required<ProcessingConfig> {
    return { ...this._config };
  }

  /**
   * 구성을 업데이트합니다
   */
  updateConfig(newConfig: Partial<ProcessingConfig>): void {
    this._config = { ...this._config, ...newConfig };
  }

  /**
   * API 키를 업데이트합니다
   */
  updateApiKey(newApiKey: string): void {
    if (!newApiKey || newApiKey.trim() === '') {
      throw new Error('API 키는 비어있을 수 없습니다.');
    }
    this._apiKey = newApiKey;
  }

  /**
   * 구성 유효성을 검사합니다
   */
  validate(): void {
    if (!this._apiKey) {
      throw new Error('Google AI API 키가 설정되지 않았습니다.');
    }

    if (!this._config.aiModel || this._config.aiModel.trim() === '') {
      throw new Error('AI 모델이 지정되지 않았습니다.');
    }

    if (this._config.maxTokens <= 0) {
      throw new Error('최대 토큰 수는 0보다 커야 합니다.');
    }

    if (this._config.temperature < 0 || this._config.temperature > 2) {
      throw new Error('Temperature는 0과 2 사이의 값이어야 합니다.');
    }

    if (this._config.retryAttempts <= 0) {
      throw new Error('재시도 횟수는 0보다 커야 합니다.');
    }
  }

  /**
   * 현재 구성을 콘솔에 출력합니다
   */
  displayConfig(): void {
    console.log('🔧 News Processor 구성:');
    console.log(`  🤖 AI 모델: ${this._config.aiModel}`);
    console.log(`  🎯 최대 토큰: ${this._config.maxTokens}`);
    console.log(`  🌡️  Temperature: ${this._config.temperature}`);
    console.log(`  🔄 재시도 횟수: ${this._config.retryAttempts}`);
    console.log(`  🔑 API 키: ${this._apiKey.substring(0, 8)}...`);
  }

  /**
   * 구성을 JSON으로 내보냅니다 (API 키 제외)
   */
  toJSON(): ProcessingConfig {
    return { ...this._config };
  }

  /**
   * JSON으로부터 구성을 로드합니다
   */
  fromJSON(json: Partial<ProcessingConfig>): void {
    this.updateConfig(json);
  }

  /**
   * 개발/테스트용 구성을 설정합니다
   */
  setDevelopmentMode(): void {
    this._config.temperature = 0.3; // 더 일관된 결과
    this._config.retryAttempts = 1; // 빠른 실패
    console.log('🚧 개발 모드로 구성 변경');
  }

  /**
   * 프로덕션용 구성을 설정합니다
   */
  setProductionMode(): void {
    this._config.temperature = 0.7; // 균형잡힌 창의성
    this._config.retryAttempts = 3; // 안정적인 재시도
    console.log('🚀 프로덕션 모드로 구성 변경');
  }
}