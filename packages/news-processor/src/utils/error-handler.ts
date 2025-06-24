/**
 * 에러 타입 열거형
 */
export enum ErrorType {
  VALIDATION = 'validation',
  FILE_IO = 'file_io',
  NETWORK = 'network',
  AI_SERVICE = 'ai_service',
  PARSING = 'parsing',
  CONFIGURATION = 'configuration',
  UNKNOWN = 'unknown'
}

/**
 * 처리 에러 클래스
 */
export class ProcessingError extends Error {
  public readonly type: ErrorType;
  public readonly step?: string;
  public readonly retryable: boolean;
  public readonly originalError?: Error;
  
  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    step?: string,
    retryable: boolean = false,
    originalError?: Error
  ) {
    super(message);
    this.name = 'ProcessingError';
    this.type = type;
    this.step = step;
    this.retryable = retryable;
    this.originalError = originalError;
  }
}

/**
 * 에러 핸들러 유틸리티
 */
export class ErrorHandler {
  /**
   * 에러 타입을 분류합니다
   */
  static classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorType.VALIDATION;
    }
    
    if (message.includes('file') || message.includes('directory') || message.includes('path')) {
      return ErrorType.FILE_IO;
    }
    
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return ErrorType.NETWORK;
    }
    
    if (message.includes('ai') || message.includes('api') || message.includes('token')) {
      return ErrorType.AI_SERVICE;
    }
    
    if (message.includes('parse') || message.includes('json') || message.includes('format')) {
      return ErrorType.PARSING;
    }
    
    if (message.includes('config') || message.includes('environment') || message.includes('setting')) {
      return ErrorType.CONFIGURATION;
    }
    
    return ErrorType.UNKNOWN;
  }
  
  /**
   * 에러가 재시도 가능한지 판단합니다
   */
  static isRetryable(error: Error): boolean {
    const type = this.classifyError(error);
    
    switch (type) {
      case ErrorType.NETWORK:
      case ErrorType.AI_SERVICE:
        return true;
      case ErrorType.VALIDATION:
      case ErrorType.FILE_IO:
      case ErrorType.PARSING:
      case ErrorType.CONFIGURATION:
        return false;
      default:
        return false;
    }
  }
  
  /**
   * 처리 에러를 생성합니다
   */
  static createProcessingError(
    error: Error,
    step?: string,
    customMessage?: string
  ): ProcessingError {
    const type = this.classifyError(error);
    const retryable = this.isRetryable(error);
    const message = customMessage || `${step ? `[${step}] ` : ''}${error.message}`;
    
    return new ProcessingError(message, type, step, retryable, error);
  }
  
  /**
   * 에러 복구 전략을 제안합니다
   */
  static getRecoveryStrategy(error: ProcessingError): {
    action: string;
    description: string;
    autoRecoverable: boolean;
  } {
    switch (error.type) {
      case ErrorType.VALIDATION:
        return {
          action: 'check_input',
          description: '입력 데이터를 확인하고 수정하세요',
          autoRecoverable: false
        };
        
      case ErrorType.FILE_IO:
        return {
          action: 'check_permissions',
          description: '파일 권한과 디스크 공간을 확인하세요',
          autoRecoverable: false
        };
        
      case ErrorType.NETWORK:
        return {
          action: 'retry_with_backoff',
          description: '잠시 후 다시 시도하세요',
          autoRecoverable: true
        };
        
      case ErrorType.AI_SERVICE:
        return {
          action: 'check_api_key',
          description: 'API 키와 할당량을 확인하세요',
          autoRecoverable: true
        };
        
      case ErrorType.PARSING:
        return {
          action: 'validate_data_format',
          description: '데이터 형식을 확인하세요',
          autoRecoverable: false
        };
        
      case ErrorType.CONFIGURATION:
        return {
          action: 'check_configuration',
          description: '설정 파일과 환경변수를 확인하세요',
          autoRecoverable: false
        };
        
      default:
        return {
          action: 'manual_investigation',
          description: '수동으로 문제를 조사해야 합니다',
          autoRecoverable: false
        };
    }
  }
  
  /**
   * 에러 로그를 포맷팅합니다
   */
  static formatErrorLog(error: ProcessingError): string {
    const timestamp = new Date().toISOString();
    const step = error.step ? ` [${error.step}]` : '';
    const retryInfo = error.retryable ? ' (재시도 가능)' : ' (재시도 불가)';
    
    let log = `[${timestamp}]${step} ${error.type.toUpperCase()}: ${error.message}${retryInfo}`;
    
    if (error.originalError) {
      log += `\n원본 에러: ${error.originalError.message}`;
      if (error.originalError.stack) {
        log += `\n스택 트레이스:\n${error.originalError.stack}`;
      }
    }
    
    const recovery = this.getRecoveryStrategy(error);
    log += `\n복구 방법: ${recovery.description}`;
    
    return log;
  }
}