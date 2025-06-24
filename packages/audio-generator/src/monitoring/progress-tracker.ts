/**
 * Progress tracking for audio generation operations
 */
export interface ProgressUpdate {
  current: number;
  total: number;
  percentage: number;
  message: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface AudioGenerationStats {
  totalDialogueLines: number;
  musicLines: number;
  processedLines: number;
  successCount: number;
  failCount: number;
  skipCount: number;
  startTime: number;
  currentTime: number;
  estimatedTimeRemaining?: number;
  averageProcessingTime: number;
}

export type ProgressCallback = (update: ProgressUpdate) => void;

/**
 * Tracks progress and performance metrics for audio generation
 */
export class AudioProgressTracker {
  private readonly stats: AudioGenerationStats;
  private readonly progressCallback?: ProgressCallback;
  private readonly processingTimes: number[] = [];
  private lastUpdateTime = 0;

  constructor(
    totalDialogueLines: number,
    musicLines: number,
    progressCallback?: ProgressCallback
  ) {
    this.stats = {
      totalDialogueLines,
      musicLines,
      processedLines: 0,
      successCount: 0,
      failCount: 0,
      skipCount: 0,
      startTime: performance.now(),
      currentTime: performance.now(),
      averageProcessingTime: 0,
    };
    this.progressCallback = progressCallback;
    this.lastUpdateTime = Date.now();
  }

  /**
   * Record successful audio generation
   */
  public recordSuccess(processingTime: number): void {
    this.stats.successCount++;
    this.stats.processedLines++;
    this.processingTimes.push(processingTime);
    this.updateStats();
    this.emitProgress('음성 생성 완료');
  }

  /**
   * Record failed audio generation
   */
  public recordFailure(error?: Error): void {
    this.stats.failCount++;
    this.stats.processedLines++;
    this.updateStats();
    this.emitProgress(`음성 생성 실패: ${error?.message || '알 수 없는 오류'}`);
  }

  /**
   * Record skipped content (music segments)
   */
  public recordSkip(reason = '음악 구간'): void {
    this.stats.skipCount++;
    this.stats.processedLines++;
    this.updateStats();
    this.emitProgress(`구간 스킵: ${reason}`);
  }

  /**
   * Get current progress statistics
   */
  public getStats(): AudioGenerationStats {
    return { ...this.stats };
  }

  /**
   * Get formatted progress summary
   */
  public getProgressSummary(): string {
    const { processedLines, totalDialogueLines, musicLines, successCount, failCount, skipCount } = this.stats;
    const totalLines = totalDialogueLines + musicLines;
    const percentage = totalLines > 0 ? ((processedLines / totalLines) * 100).toFixed(1) : '0.0';
    const successRate = totalDialogueLines > 0 ? ((successCount / totalDialogueLines) * 100).toFixed(1) : '0.0';
    
    return [
      `진행률: ${processedLines}/${totalLines} (${percentage}%)`,
      `TTS 성공률: ${successRate}% (${successCount}/${totalDialogueLines})`,
      `실패: ${failCount}개, 스킵: ${skipCount}개`,
    ].join(' | ');
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(): {
    averageProcessingTime: number;
    totalElapsedTime: number;
    estimatedTimeRemaining?: number;
    processingRate: number;
  } {
    const totalElapsed = this.stats.currentTime - this.stats.startTime;
    const processingRate = this.stats.processedLines > 0 ? this.stats.processedLines / (totalElapsed / 1000) : 0;
    
    return {
      averageProcessingTime: this.stats.averageProcessingTime,
      totalElapsedTime: totalElapsed,
      estimatedTimeRemaining: this.stats.estimatedTimeRemaining,
      processingRate,
    };
  }

  /**
   * Check if processing is complete
   */
  public isComplete(): boolean {
    return this.stats.processedLines >= (this.stats.totalDialogueLines + this.stats.musicLines);
  }

  /**
   * Get completion summary
   */
  public getCompletionSummary(): string {
    const { totalDialogueLines, musicLines, successCount, failCount, skipCount } = this.stats;
    const totalTime = (this.stats.currentTime - this.stats.startTime) / 1000;
    const successRate = totalDialogueLines > 0 ? ((successCount / totalDialogueLines) * 100).toFixed(1) : '0.0';
    
    return [
      `🎤 TTS 생성: ${successCount}개 성공, ${failCount}개 실패`,
      `🎵 음악 구간: ${skipCount}개 스킵`,
      `📈 TTS 성공률: ${successRate}%`,
      `⏱️ 총 소요 시간: ${totalTime.toFixed(1)}초`,
    ].join('\\n   ');
  }

  private updateStats(): void {
    this.stats.currentTime = performance.now();
    
    // Calculate average processing time
    if (this.processingTimes.length > 0) {
      this.stats.averageProcessingTime = 
        this.processingTimes.reduce((sum, time) => sum + time, 0) / this.processingTimes.length;
    }

    // Estimate remaining time
    const remainingLines = (this.stats.totalDialogueLines + this.stats.musicLines) - this.stats.processedLines;
    if (remainingLines > 0 && this.stats.averageProcessingTime > 0) {
      this.stats.estimatedTimeRemaining = remainingLines * this.stats.averageProcessingTime;
    }
  }

  private emitProgress(message: string, details?: Record<string, unknown>): void {
    if (!this.progressCallback) return;

    const now = Date.now();
    // Throttle progress updates to avoid spam (max 10 per second)
    if (now - this.lastUpdateTime < 100) return;
    
    this.lastUpdateTime = now;
    
    const totalLines = this.stats.totalDialogueLines + this.stats.musicLines;
    const percentage = totalLines > 0 ? (this.stats.processedLines / totalLines) * 100 : 0;
    
    this.progressCallback({
      current: this.stats.processedLines,
      total: totalLines,
      percentage,
      message,
      timestamp: new Date().toISOString(),
      details: {
        ...details,
        stats: this.getStats(),
        performance: this.getPerformanceMetrics(),
      },
    });
  }
}