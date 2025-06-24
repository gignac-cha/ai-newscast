/**
 * 성능 측정 유틸리티
 */
export class PerformanceUtils {
  private static timers: Map<string, number> = new Map();
  private static measurements: Map<string, number[]> = new Map();
  
  /**
   * 타이머를 시작합니다
   */
  static startTimer(key: string): void {
    this.timers.set(key, performance.now());
  }
  
  /**
   * 타이머를 종료하고 측정값을 반환합니다
   */
  static endTimer(key: string): number {
    const startTime = this.timers.get(key);
    if (!startTime) {
      throw new Error(`Timer '${key}'가 시작되지 않았습니다.`);
    }
    
    const duration = performance.now() - startTime;
    this.timers.delete(key);
    
    // 측정값 저장
    if (!this.measurements.has(key)) {
      this.measurements.set(key, []);
    }
    this.measurements.get(key)!.push(duration);
    
    return duration;
  }
  
  /**
   * 함수 실행 시간을 측정합니다
   */
  static async measureAsync<T>(
    key: string, 
    fn: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    this.startTimer(key);
    const result = await fn();
    const duration = this.endTimer(key);
    
    return { result, duration };
  }
  
  /**
   * 동기 함수 실행 시간을 측정합니다
   */
  static measure<T>(
    key: string, 
    fn: () => T
  ): { result: T; duration: number } {
    this.startTimer(key);
    const result = fn();
    const duration = this.endTimer(key);
    
    return { result, duration };
  }
  
  /**
   * 측정값 통계를 반환합니다
   */
  static getStats(key: string): {
    count: number;
    total: number;
    average: number;
    min: number;
    max: number;
    median: number;
  } | null {
    const measurements = this.measurements.get(key);
    if (!measurements || measurements.length === 0) {
      return null;
    }
    
    const sorted = [...measurements].sort((a, b) => a - b);
    const count = measurements.length;
    const total = measurements.reduce((sum, val) => sum + val, 0);
    const average = total / count;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const median = count % 2 === 0 
      ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
      : sorted[Math.floor(count / 2)];
    
    return { count, total, average, min, max, median };
  }
  
  /**
   * 모든 측정값을 반환합니다
   */
  static getAllStats(): Record<string, ReturnType<typeof PerformanceUtils.getStats>> {
    const result: Record<string, any> = {};
    
    for (const key of this.measurements.keys()) {
      result[key] = this.getStats(key);
    }
    
    return result;
  }
  
  /**
   * 측정값을 초기화합니다
   */
  static reset(key?: string): void {
    if (key) {
      this.measurements.delete(key);
      this.timers.delete(key);
    } else {
      this.measurements.clear();
      this.timers.clear();
    }
  }
  
  /**
   * 메모리 사용량을 측정합니다
   */
  static getMemoryUsage(): {
    rss: string;
    heapTotal: string;
    heapUsed: string;
    external: string;
    arrayBuffers: string;
  } {
    const usage = process.memoryUsage();
    
    return {
      rss: this.formatBytes(usage.rss),
      heapTotal: this.formatBytes(usage.heapTotal),
      heapUsed: this.formatBytes(usage.heapUsed),
      external: this.formatBytes(usage.external),
      arrayBuffers: this.formatBytes(usage.arrayBuffers)
    };
  }
  
  /**
   * 바이트를 읽기 쉬운 형태로 변환합니다
   */
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  /**
   * 성능 보고서를 생성합니다
   */
  static generateReport(): string {
    const stats = this.getAllStats();
    const memory = this.getMemoryUsage();
    
    let report = '📊 성능 측정 보고서\n';
    report += '='.repeat(50) + '\n\n';
    
    // 시간 측정 결과
    report += '⏱️ 실행 시간 통계:\n';
    for (const [key, stat] of Object.entries(stats)) {
      if (stat) {
        report += `  ${key}:\n`;
        report += `    총 실행 횟수: ${stat.count}회\n`;
        report += `    평균 시간: ${stat.average.toFixed(2)}ms\n`;
        report += `    최소 시간: ${stat.min.toFixed(2)}ms\n`;
        report += `    최대 시간: ${stat.max.toFixed(2)}ms\n`;
        report += `    중간값: ${stat.median.toFixed(2)}ms\n\n`;
      }
    }
    
    // 메모리 사용량
    report += '💾 메모리 사용량:\n';
    report += `  RSS (Resident Set Size): ${memory.rss}\n`;
    report += `  Heap Total: ${memory.heapTotal}\n`;
    report += `  Heap Used: ${memory.heapUsed}\n`;
    report += `  External: ${memory.external}\n`;
    report += `  Array Buffers: ${memory.arrayBuffers}\n\n`;
    
    return report;
  }
}