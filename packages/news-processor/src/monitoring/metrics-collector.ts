import type { MetricsCollector } from '../interfaces/progress-reporter.ts';

/**
 * 메트릭 수집기
 */
export class ProcessingMetricsCollector implements MetricsCollector {
  private timers: Map<string, number> = new Map();
  private metrics: Map<string, number> = new Map();
  
  /**
   * 메트릭을 시작합니다
   */
  startTimer(key: string): void {
    this.timers.set(key, Date.now());
  }
  
  /**
   * 메트릭을 종료하고 시간을 기록합니다
   */
  endTimer(key: string): number {
    const startTime = this.timers.get(key);
    if (!startTime) {
      throw new Error(`Timer '${key}'가 시작되지 않았습니다.`);
    }
    
    const duration = Date.now() - startTime;
    this.metrics.set(key, duration);
    this.timers.delete(key);
    
    return duration;
  }
  
  /**
   * 카운터를 증가시킵니다
   */
  incrementCounter(key: string, value: number = 1): void {
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + value);
  }
  
  /**
   * 값을 설정합니다
   */
  setValue(key: string, value: number): void {
    this.metrics.set(key, value);
  }
  
  /**
   * 현재 메트릭을 반환합니다
   */
  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }
  
  /**
   * 특정 메트릭 값을 가져옵니다
   */
  getMetric(key: string): number | undefined {
    return this.metrics.get(key);
  }
  
  /**
   * 메트릭이 존재하는지 확인합니다
   */
  hasMetric(key: string): boolean {
    return this.metrics.has(key);
  }
  
  /**
   * 실행 중인 타이머가 있는지 확인합니다
   */
  hasActiveTimer(key: string): boolean {
    return this.timers.has(key);
  }
  
  /**
   * 메트릭을 초기화합니다
   */
  reset(): void {
    this.timers.clear();
    this.metrics.clear();
  }
  
  /**
   * 메트릭을 콘솔에 출력합니다
   */
  displayMetrics(): void {
    console.log('\n⏱️  실행 시간 분석:');
    
    const metrics = this.getMetrics();
    const timeKeys = ['loadTime', 'aiTime', 'saveTime', 'totalTime'];
    const countKeys = ['totalArticles', 'consolidatedLength', 'sourcesCount'];
    
    // 시간 메트릭 출력
    timeKeys.forEach(key => {
      if (metrics[key] !== undefined) {
        const time = metrics[key];
        const seconds = (time / 1000).toFixed(2);
        console.log(`  ${this.getDisplayName(key)}: ${time}ms (${seconds}초)`);
      }
    });
    
    // 카운트 메트릭 출력
    countKeys.forEach(key => {
      if (metrics[key] !== undefined) {
        console.log(`  ${this.getDisplayName(key)}: ${metrics[key]}`);
      }
    });
  }
  
  private getDisplayName(key: string): string {
    const displayNames: Record<string, string> = {
      loadTime: '📂 데이터 로딩',
      aiTime: '🤖 AI 통합',
      saveTime: '💾 파일 저장',
      totalTime: '🚀 전체 시간',
      totalArticles: '📊 총 기사 수',
      consolidatedLength: '📝 통합 내용 길이',
      sourcesCount: '📰 소스 수'
    };
    
    return displayNames[key] || key;
  }
}