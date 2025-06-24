/**
 * Script Generator 패키지 인터페이스 정의
 * AI 뉴스캐스트 스크립트 생성을 위한 타입 시스템
 */

export interface ConsolidatedNews {
  topic: string;
  total_articles: number;
  sources: string[];
  consolidated_content: string;
  original_timestamp: string;
  consolidation_timestamp: string;
}

export interface VoiceConfig {
  name: string;
  gender: 'male' | 'female';
  description: string;
  role: string;
  voice_type: string;
}

export interface TTSVoices {
  voices: Record<string, VoiceConfig>;
  default_newscast_hosts: {
    host1: {
      voice_model: string;
      name: string;
      gender: 'male' | 'female';
    };
    host2: {
      voice_model: string;
      name: string;
      gender: 'male' | 'female';
    };
  };
  voice_selection_strategy: Record<string, string[]>;
  metadata: {
    created: string;
    description: string;
    total_voices: number;
    default_program: string;
  };
}

export interface DialogueLine {
  speaker: string;
  voice_model: string;
  text: string;
  sequence: number;
  type: 'dialogue' | 'opening_music' | 'closing_music' | 'background_music';
}

export interface NewscastScript {
  title: string;
  program_name: string;
  hosts: {
    host1: {
      name: string;
      voice_model: string;
      gender: 'male' | 'female';
    };
    host2: {
      name: string;
      voice_model: string;
      gender: 'male' | 'female';
    };
  };
  opening: string;
  main_content: string;
  closing: string;
  dialogue_lines: DialogueLine[];
  metadata: {
    total_articles: number;
    sources_count: number;
    main_sources: string[];
    generation_timestamp: string;
    estimated_duration: string;
    total_dialogue_lines: number;
  };
}

export interface ScriptGeneratorOptions {
  voicesConfigPath?: string;
  outputPath?: string;
  enableProgress?: boolean;
  enableMetrics?: boolean;
  maxRetries?: number;
  timeout?: number;
}

export interface ScriptGeneratorConfig {
  geminiModel: string;
  voicesConfigPath: string;
  outputPath: string;
  enableProgress: boolean;
  enableMetrics: boolean;
  maxRetries: number;
  timeout: number;
}

/**
 * Pipeline Step 인터페이스 (news-processor 패턴 참조)
 */
export interface ScriptPipelineStep<TInput = any, TOutput = any> {
  readonly name: string;
  execute(input: TInput): Promise<TOutput>;
}

/**
 * 스크립트 생성 컨텍스트
 */
export interface ScriptGenerationContext {
  news: ConsolidatedNews;
  voices: TTSVoices;
  config: ScriptGeneratorConfig;
  outputPath: string;
  metrics?: ScriptGenerationMetrics;
}

/**
 * 성능 측정 메트릭스
 */
export interface ScriptGenerationMetrics {
  startTime: number;
  endTime?: number;
  voiceLoadTime: number;
  aiGenerationTime: number;
  parsingTime: number;
  savingTime: number;
  totalTime?: number;
  scriptLength: number;
  dialogueLines: number;
  memoryUsage?: {
    before: number;
    after: number;
    peak: number;
  };
}

/**
 * 진행상황 추적
 */
export interface ProgressCallback {
  (step: string, progress: number, message?: string): void;
}

/**
 * 에러 타입 정의
 */
export class ScriptGenerationError extends Error {
  constructor(
    message: string,
    public readonly step: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'ScriptGenerationError';
  }
}

export class VoiceConfigurationError extends ScriptGenerationError {
  constructor(message: string, originalError?: Error) {
    super(message, 'voice_configuration', originalError);
    this.name = 'VoiceConfigurationError';
  }
}

export class AIGenerationError extends ScriptGenerationError {
  constructor(message: string, originalError?: Error) {
    super(message, 'ai_generation', originalError);
    this.name = 'AIGenerationError';
  }
}

export class DialogueParsingError extends ScriptGenerationError {
  constructor(message: string, originalError?: Error) {
    super(message, 'dialogue_parsing', originalError);
    this.name = 'DialogueParsingError';
  }
}