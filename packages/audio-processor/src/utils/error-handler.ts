/**
 * Custom error classes for audio processing
 */

export class AudioProcessingError extends Error {
  public readonly type: string;
  public readonly retryable: boolean;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    type: string = 'AUDIO_PROCESSING_ERROR',
    retryable: boolean = false,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AudioProcessingError';
    this.type = type;
    this.retryable = retryable;
    this.context = context;
  }
}

export class FFmpegError extends AudioProcessingError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'FFMPEG_ERROR', false, context);
    this.name = 'FFmpegError';
  }
}

export class FileSystemError extends AudioProcessingError {
  constructor(message: string, retryable: boolean = false, context?: Record<string, any>) {
    super(message, 'FILESYSTEM_ERROR', retryable, context);
    this.name = 'FileSystemError';
  }
}

export class ValidationError extends AudioProcessingError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', false, context);
    this.name = 'ValidationError';
  }
}

/**
 * Error handler utility for audio processing operations
 */
export class ErrorHandler {
  /**
   * Handle various types of errors and convert them to AudioProcessingError
   */
  public static handleError(error: unknown, context: string): AudioProcessingError {
    if (error instanceof AudioProcessingError) {
      return error;
    }

    if (error instanceof Error) {
      // File system errors
      if (error.message.includes('ENOENT') || error.message.includes('no such file')) {
        return new FileSystemError(
          `파일을 찾을 수 없습니다: ${error.message}`,
          false,
          { originalError: error.message, context }
        );
      }

      if (error.message.includes('EACCES') || error.message.includes('permission denied')) {
        return new FileSystemError(
          `파일 접근 권한이 없습니다: ${error.message}`,
          true,
          { originalError: error.message, context }
        );
      }

      if (error.message.includes('ENOSPC') || error.message.includes('no space left')) {
        return new FileSystemError(
          `디스크 공간이 부족합니다: ${error.message}`,
          false,
          { originalError: error.message, context }
        );
      }

      // FFmpeg specific errors
      if (error.message.includes('ffmpeg') || error.message.includes('FFmpeg')) {
        return new FFmpegError(
          `FFmpeg 오류: ${error.message}`,
          { originalError: error.message, context }
        );
      }

      // Generic error conversion
      return new AudioProcessingError(
        `${context}: ${error.message}`,
        'UNKNOWN_ERROR',
        false,
        { originalError: error.message, context }
      );
    }

    // Handle non-Error objects
    return new AudioProcessingError(
      `${context}: 알 수 없는 오류가 발생했습니다`,
      'UNKNOWN_ERROR',
      false,
      { originalError: String(error), context }
    );
  }

  /**
   * Get user-friendly error message
   */
  public static getUserFriendlyMessage(error: AudioProcessingError): string {
    switch (error.type) {
      case 'FFMPEG_ERROR':
        return `오디오 처리 중 오류가 발생했습니다: ${error.message}`;
      
      case 'FILESYSTEM_ERROR':
        return `파일 시스템 오류: ${error.message}`;
      
      case 'VALIDATION_ERROR':
        return `입력 데이터 검증 실패: ${error.message}`;
      
      default:
        return `오디오 처리 오류: ${error.message}`;
    }
  }

  /**
   * Log error with appropriate level and context
   */
  public static logError(error: AudioProcessingError, operation: string): void {
    const logLevel = error.retryable ? 'warn' : 'error';
    const logMethod = logLevel === 'warn' ? console.warn : console.error;
    
    logMethod(`${operation} 실패:`, {
      type: error.type,
      message: error.message,
      retryable: error.retryable,
      context: error.context,
    });
  }

  /**
   * Check if error is retryable
   */
  public static isRetryable(error: unknown): boolean {
    if (error instanceof AudioProcessingError) {
      return error.retryable;
    }
    return false;
  }
}

/**
 * Retry manager for retryable operations
 */
export class RetryManager {
  private maxRetries: number;
  private backoffMultiplier: number;
  private initialDelay: number;

  constructor(
    maxRetries: number = 3,
    backoffMultiplier: number = 2,
    initialDelay: number = 1000
  ) {
    this.maxRetries = maxRetries;
    this.backoffMultiplier = backoffMultiplier;
    this.initialDelay = initialDelay;
  }

  /**
   * Execute operation with retry logic
   */
  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: AudioProcessingError | null = null;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const audioError = ErrorHandler.handleError(error, operationName);
        lastError = audioError;
        
        if (!audioError.retryable || attempt === this.maxRetries) {
          ErrorHandler.logError(audioError, operationName);
          throw audioError;
        }
        
        const delay = this.initialDelay * Math.pow(this.backoffMultiplier, attempt);
        console.warn(`${operationName} 재시도 중... (${attempt + 1}/${this.maxRetries}) - ${delay}ms 대기`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }
}