import type { ProgressManager } from '../interfaces/output-manager.ts';
import type { ProgressCallback } from '../interfaces/crawl-strategy.ts';
import { Logger } from '@ai-newscast/core';

/**
 * 진행상황 관리자
 */
export class CrawlProgressManager implements ProgressManager {
  private metrics: Map<string, number> = new Map();
  private errors: Array<{ strategy: string; error: Error; timestamp: string }> = [];
  private callback?: ProgressCallback;
  
  /**
   * 진행상황 콜백을 설정합니다
   */
  setCallback(callback: ProgressCallback): void {
    this.callback = callback;
  }
  
  /**
   * 진행상황을 보고합니다
   */
  report(strategy: string, progress: number, message: string): void {
    Logger.debug(`[${strategy}] ${progress}% - ${message}`);
    
    if (this.callback) {
      this.callback(strategy, progress, message);
    }
  }
  
  /**
   * 메트릭을 기록합니다
   */
  recordMetric(key: string, value: number): void {
    this.metrics.set(key, value);
  }
  
  /**
   * 에러를 기록합니다
   */
  recordError(strategy: string, error: Error): void {
    const errorRecord = {
      strategy,
      error,
      timestamp: new Date().toISOString()
    };
    
    this.errors.push(errorRecord);
    Logger.error(`[${strategy}] Error recorded:`, error);
  }
  
  /**
   * 통계를 반환합니다
   */
  getStats(): Record<string, any> {
    return {
      metrics: Object.fromEntries(this.metrics),
      totalErrors: this.errors.length,
      errorsByStrategy: this.getErrorsByStrategy(),
      lastErrors: this.errors.slice(-5) // 최근 5개 에러
    };
  }
  
  /**
   * 전략별 에러 통계를 반환합니다
   */
  private getErrorsByStrategy(): Record<string, number> {
    const errorCounts: Record<string, number> = {};
    
    for (const errorRecord of this.errors) {
      const strategy = errorRecord.strategy;
      errorCounts[strategy] = (errorCounts[strategy] || 0) + 1;
    }
    
    return errorCounts;
  }
  
  /**
   * 메트릭을 초기화합니다
   */
  reset(): void {
    this.metrics.clear();
    this.errors.length = 0;
  }
  
  /**
   * 통계를 콘솔에 출력합니다
   */
  displayStats(): void {
    const stats = this.getStats();
    
    console.log('\n📊 크롤링 통계:');
    
    // 메트릭 출력
    if (Object.keys(stats.metrics).length > 0) {
      console.log('  📈 메트릭:');
      Object.entries(stats.metrics).forEach(([key, value]) => {
        console.log(`    ${key}: ${value}`);
      });
    }
    
    // 에러 통계 출력
    if (stats.totalErrors > 0) {
      console.log(`  ❌ 총 에러 수: ${stats.totalErrors}`);
      console.log('  📋 전략별 에러:');
      Object.entries(stats.errorsByStrategy).forEach(([strategy, count]) => {
        console.log(`    ${strategy}: ${count}개`);
      });
    }
  }
}