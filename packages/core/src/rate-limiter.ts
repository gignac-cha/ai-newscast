/**
 * 범용 Rate Limiter - Google API 요청 제한 관리
 */

export interface RateLimiterConfig {
  requestsPerSecond: number;
  burstLimit: number;
  windowMs: number;
}

export interface RateLimitStatus {
  isReady: boolean;
  nextAvailableTime: number;
  requestsInWindow: number;
  requestsRemaining: number;
}

/**
 * Token Bucket Algorithm 기반 Rate Limiter
 * Google API의 다양한 Rate Limit을 유연하게 처리
 */
export class UniversalRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly config: RateLimiterConfig;
  private requestHistory: number[] = [];

  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.config = {
      requestsPerSecond: 3,      // Google AI API 기본값
      burstLimit: 10,            // 버스트 허용량
      windowMs: 60 * 1000,       // 1분 윈도우
      ...config
    };
    
    this.tokens = this.config.burstLimit;
    this.lastRefill = Date.now();
  }

  /**
   * 요청 전 대기 (Rate Limit 준수)
   */
  async waitForClearance(): Promise<void> {
    const now = Date.now();
    
    // 토큰 리필
    this.refillTokens(now);
    
    // 윈도우 기반 요청 수 정리
    this.cleanupRequestHistory(now);
    
    // Rate Limit 체크
    if (!this.canMakeRequest()) {
      const delay = this.calculateDelay();
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.waitForClearance(); // 재귀적으로 다시 체크
      }
    }
    
    // 토큰 소비 및 요청 기록
    this.consumeToken(now);
  }

  /**
   * 현재 Rate Limit 상태 조회
   */
  getStatus(): RateLimitStatus {
    const now = Date.now();
    this.refillTokens(now);
    this.cleanupRequestHistory(now);
    
    const requestsInWindow = this.requestHistory.length;
    const maxRequestsInWindow = this.config.requestsPerSecond * (this.config.windowMs / 1000);
    
    return {
      isReady: this.canMakeRequest(),
      nextAvailableTime: this.getNextAvailableTime(),
      requestsInWindow,
      requestsRemaining: Math.max(0, maxRequestsInWindow - requestsInWindow)
    };
  }

  /**
   * Rate Limiter 초기화
   */
  reset(): void {
    this.tokens = this.config.burstLimit;
    this.lastRefill = Date.now();
    this.requestHistory = [];
  }

  /**
   * 설정 업데이트
   */
  updateConfig(newConfig: Partial<RateLimiterConfig>): void {
    Object.assign(this.config, newConfig);
    
    // 토큰 수를 새 burstLimit에 맞게 조정
    this.tokens = Math.min(this.tokens, this.config.burstLimit);
  }

  /**
   * 토큰 리필 (Token Bucket Algorithm)
   */
  private refillTokens(now: number): void {
    const timePassed = now - this.lastRefill;
    const tokensToAdd = (timePassed / 1000) * this.config.requestsPerSecond;
    
    this.tokens = Math.min(this.config.burstLimit, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * 요청 가능 여부 체크
   */
  private canMakeRequest(): boolean {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    const requestsInWindow = this.requestHistory.filter(time => time >= windowStart).length;
    const maxRequestsInWindow = this.config.requestsPerSecond * (this.config.windowMs / 1000);
    
    return this.tokens >= 1 && requestsInWindow < maxRequestsInWindow;
  }

  /**
   * 다음 요청 가능 시간 계산
   */
  private getNextAvailableTime(): number {
    if (this.tokens >= 1) {
      return Date.now();
    }
    
    // 토큰이 1개 리필되는데 필요한 시간
    const timeForOneToken = 1000 / this.config.requestsPerSecond;
    return this.lastRefill + timeForOneToken;
  }

  /**
   * 대기 시간 계산
   */
  private calculateDelay(): number {
    const nextAvailable = this.getNextAvailableTime();
    return Math.max(0, nextAvailable - Date.now());
  }

  /**
   * 토큰 소비 및 요청 기록
   */
  private consumeToken(now: number): void {
    this.tokens = Math.max(0, this.tokens - 1);
    this.requestHistory.push(now);
  }

  /**
   * 오래된 요청 기록 정리
   */
  private cleanupRequestHistory(now: number): void {
    const windowStart = now - this.config.windowMs;
    this.requestHistory = this.requestHistory.filter(time => time >= windowStart);
  }
}

/**
 * Google AI API용 사전 구성된 Rate Limiter
 */
export class GoogleAIRateLimiter extends UniversalRateLimiter {
  constructor() {
    super({
      requestsPerSecond: 2,    // Google AI API 안전 마진
      burstLimit: 5,           // 버스트 요청 허용
      windowMs: 60 * 1000      // 1분 윈도우
    });
  }
}

/**
 * Google Cloud TTS용 사전 구성된 Rate Limiter  
 */
export class GoogleTTSRateLimiter extends UniversalRateLimiter {
  constructor() {
    super({
      requestsPerSecond: 10,   // Google Cloud TTS 제한
      burstLimit: 20,          // 버스트 허용
      windowMs: 60 * 1000      // 1분 윈도우
    });
  }
}

/**
 * 병렬 처리용 Rate Limiter Pool
 * 여러 개의 Rate Limiter를 라운드 로빈으로 사용하여 처리량 증대
 */
export class RateLimiterPool {
  private limiters: UniversalRateLimiter[];
  private currentIndex = 0;

  constructor(poolSize: number, config: Partial<RateLimiterConfig> = {}) {
    this.limiters = Array.from(
      { length: poolSize }, 
      () => new UniversalRateLimiter(config)
    );
  }

  /**
   * 사용 가능한 Rate Limiter 가져오기 (라운드 로빈)
   */
  async getAvailableLimiter(): Promise<UniversalRateLimiter> {
    // 모든 Rate Limiter를 확인하여 즉시 사용 가능한 것 찾기
    for (let i = 0; i < this.limiters.length; i++) {
      const limiter = this.limiters[(this.currentIndex + i) % this.limiters.length];
      if (limiter.getStatus().isReady) {
        this.currentIndex = (this.currentIndex + i + 1) % this.limiters.length;
        return limiter;
      }
    }
    
    // 즉시 사용 가능한 것이 없으면 다음 순서 대기
    const limiter = this.limiters[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.limiters.length;
    
    await limiter.waitForClearance();
    return limiter;
  }

  /**
   * 전체 Pool 상태 조회
   */
  getPoolStatus(): RateLimitStatus[] {
    return this.limiters.map(limiter => limiter.getStatus());
  }

  /**
   * Pool 전체 초기화
   */
  reset(): void {
    this.limiters.forEach(limiter => limiter.reset());
    this.currentIndex = 0;
  }
}