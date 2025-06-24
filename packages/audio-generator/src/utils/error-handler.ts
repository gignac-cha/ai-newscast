/**
 * Audio generation specific error types and handling
 */
export class AudioGenerationError extends Error {
  public readonly code: string;
  public readonly retryable: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    retryable = false,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AudioGenerationError';
    this.code = code;
    this.retryable = retryable;
    this.details = details;
  }
}

export class TTSServiceError extends AudioGenerationError {
  constructor(message: string, retryable = true, details?: Record<string, unknown>) {
    super(message, 'TTS_SERVICE_ERROR', retryable, details);
    this.name = 'TTSServiceError';
  }
}

export class VoiceConfigError extends AudioGenerationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VOICE_CONFIG_ERROR', false, details);
    this.name = 'VoiceConfigError';
  }
}

export class RateLimitError extends AudioGenerationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'RATE_LIMIT_ERROR', true, details);
    this.name = 'RateLimitError';
  }
}

export class FileSystemError extends AudioGenerationError {
  constructor(message: string, retryable = false, details?: Record<string, unknown>) {
    super(message, 'FILE_SYSTEM_ERROR', retryable, details);
    this.name = 'FileSystemError';
  }
}

/**
 * Retry mechanism with exponential backoff
 */
export class RetryManager {
  private readonly maxRetries: number;
  private readonly backoffMultiplier: number;
  private readonly initialDelay: number;

  constructor(maxRetries = 3, backoffMultiplier = 2, initialDelay = 1000) {
    this.maxRetries = maxRetries;
    this.backoffMultiplier = backoffMultiplier;
    this.initialDelay = initialDelay;
  }

  /**
   * Execute a function with retry logic
   */
  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    errorContext?: string
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry on non-retryable errors
        if (error instanceof AudioGenerationError && !error.retryable) {
          throw error;
        }

        // Don't retry on the last attempt
        if (attempt === this.maxRetries) {
          break;
        }

        const delay = this.calculateDelay(attempt);
        console.warn(
          `${errorContext ? `[${errorContext}] ` : ''}Attempt ${attempt + 1} failed, retrying in ${delay}ms: ${lastError.message}`
        );
        
        await this.delay(delay);
      }
    }

    throw new AudioGenerationError(
      `Operation failed after ${this.maxRetries + 1} attempts: ${lastError!.message}`,
      'MAX_RETRIES_EXCEEDED',
      false,
      { originalError: lastError!.message, attempts: this.maxRetries + 1 }
    );
  }

  private calculateDelay(attempt: number): number {
    return this.initialDelay * Math.pow(this.backoffMultiplier, attempt);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Error categorization and handling strategies
 */
export class ErrorHandler {
  /**
   * Categorize and wrap errors appropriately
   */
  public static handleTTSError(error: unknown, context?: string): AudioGenerationError {
    if (error instanceof AudioGenerationError) {
      return error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    const contextMessage = context ? `[${context}] ${errorMessage}` : errorMessage;

    // Google Cloud TTS specific error patterns
    if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
      return new RateLimitError(contextMessage, { originalError: errorMessage });
    }

    if (errorMessage.includes('authentication') || errorMessage.includes('credential')) {
      return new TTSServiceError(contextMessage, false, { originalError: errorMessage });
    }

    if (errorMessage.includes('voice') || errorMessage.includes('language')) {
      return new VoiceConfigError(contextMessage, { originalError: errorMessage });
    }

    if (errorMessage.includes('ENOENT') || errorMessage.includes('permission')) {
      return new FileSystemError(contextMessage, false, { originalError: errorMessage });
    }

    // Default to retryable TTS service error
    return new TTSServiceError(contextMessage, true, { originalError: errorMessage });
  }

  /**
   * Get user-friendly error message with suggestions
   */
  public static getUserFriendlyMessage(error: AudioGenerationError): string {
    switch (error.code) {
      case 'TTS_SERVICE_ERROR':
        return `음성 생성 서비스 오류: ${error.message}\\n💡 Google Cloud TTS API 설정을 확인해주세요.`;
      
      case 'VOICE_CONFIG_ERROR':
        return `음성 설정 오류: ${error.message}\\n💡 지원되는 음성 모델을 사용하고 있는지 확인해주세요.`;
      
      case 'RATE_LIMIT_ERROR':
        return `API 요청 한도 초과: ${error.message}\\n💡 잠시 후 다시 시도하거나 요청 간격을 늘려주세요.`;
      
      case 'FILE_SYSTEM_ERROR':
        return `파일 시스템 오류: ${error.message}\\n💡 출력 폴더 권한과 디스크 공간을 확인해주세요.`;
      
      default:
        return `알 수 없는 오류: ${error.message}`;
    }
  }
}