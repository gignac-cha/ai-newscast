/**
 * Rate limiter for Google Cloud TTS API requests
 * Prevents API quota exhaustion and ensures stable performance
 */
export class RateLimiter {
  private requests: number[] = [];
  private readonly requestsPerSecond: number;
  private readonly burstLimit: number;
  private readonly delayBetweenRequests: number;
  private lastRequestTime = 0;

  constructor(
    requestsPerSecond = 10,
    burstLimit = 20,
    delayBetweenRequests = 100
  ) {
    this.requestsPerSecond = requestsPerSecond;
    this.burstLimit = burstLimit;
    this.delayBetweenRequests = delayBetweenRequests;
  }

  /**
   * Wait for rate limit clearance before making a request
   */
  public async waitForClearance(): Promise<void> {
    const now = Date.now();
    
    // Clean old requests (older than 1 second)
    const oneSecondAgo = now - 1000;
    this.requests = this.requests.filter(time => time > oneSecondAgo);

    // Check if we're within rate limits
    if (this.requests.length >= this.requestsPerSecond) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = 1000 - (now - oldestRequest) + 10; // Add 10ms buffer
      if (waitTime > 0) {
        await this.delay(waitTime);
      }
    }

    // Enforce minimum delay between requests
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.delayBetweenRequests) {
      await this.delay(this.delayBetweenRequests - timeSinceLastRequest);
    }

    // Record this request
    this.requests.push(Date.now());
    this.lastRequestTime = Date.now();
  }

  /**
   * Get current rate limit status
   */
  public getStatus(): {
    requestsInLastSecond: number;
    canMakeRequest: boolean;
    estimatedWaitTime: number;
  } {
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    const recentRequests = this.requests.filter(time => time > oneSecondAgo);
    
    const canMakeRequest = recentRequests.length < this.requestsPerSecond;
    let estimatedWaitTime = 0;
    
    if (!canMakeRequest && recentRequests.length > 0) {
      const oldestRequest = Math.min(...recentRequests);
      estimatedWaitTime = 1000 - (now - oldestRequest);
    }

    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.delayBetweenRequests) {
      estimatedWaitTime = Math.max(estimatedWaitTime, this.delayBetweenRequests - timeSinceLastRequest);
    }

    return {
      requestsInLastSecond: recentRequests.length,
      canMakeRequest: canMakeRequest && timeSinceLastRequest >= this.delayBetweenRequests,
      estimatedWaitTime,
    };
  }

  /**
   * Reset rate limiter state
   */
  public reset(): void {
    this.requests = [];
    this.lastRequestTime = 0;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}