/**
 * 출력 관리자 인터페이스
 */
export interface OutputManager {
  /**
   * JSON 데이터를 저장합니다
   */
  saveJson<T>(filename: string, data: T): Promise<string>;
  
  /**
   * HTML 데이터를 저장합니다
   */
  saveHtml(filename: string, content: string): Promise<string>;
  
  /**
   * 출력 디렉토리를 설정합니다
   */
  setOutputDir(path: string): void;
  
  /**
   * 출력 디렉토리를 생성합니다
   */
  ensureOutputDir(): Promise<void>;
  
  /**
   * 현재 출력 경로를 반환합니다
   */
  getOutputPath(): string;
}

/**
 * 진행상황 관리자 인터페이스
 */
export interface ProgressManager {
  /**
   * 진행상황을 보고합니다
   */
  report(strategy: string, progress: number, message: string): void;
  
  /**
   * 메트릭을 기록합니다
   */
  recordMetric(key: string, value: number): void;
  
  /**
   * 에러를 기록합니다
   */
  recordError(strategy: string, error: Error): void;
  
  /**
   * 통계를 반환합니다
   */
  getStats(): Record<string, any>;
}