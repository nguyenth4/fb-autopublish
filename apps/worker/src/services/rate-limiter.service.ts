/**
 * Token bucket rate limiter per Facebook Page ID.
 * ~200 calls/hour per page → 1 token per 18 seconds, burst capacity 5.
 * Worker awaits until token available — smoother than fail+retry.
 */

interface PageBucket {
  tokens: number
  lastRefillAt: number
}

export class RateLimiterService {
  private readonly buckets = new Map<string, PageBucket>()

  constructor(
    private readonly maxTokens: number = 5,
    private readonly refillIntervalMs: number = 18_000,
  ) {}

  async acquire(pageId: string): Promise<void> {
    const MAX_WAIT_MS = 5 * 60 * 1000
    const startedAt = Date.now()

    while (true) {
      this.refill(pageId)
      const bucket = this.buckets.get(pageId)!

      if (bucket.tokens >= 1) {
        bucket.tokens -= 1
        return
      }

      if (Date.now() - startedAt > MAX_WAIT_MS) {
        throw new Error(`[RateLimiter] Timeout waiting for token on page ${pageId}`)
      }

      await sleep(Math.min(this.refillIntervalMs / 2, 5_000))
    }
  }

  private refill(pageId: string): void {
    const now = Date.now()

    if (!this.buckets.has(pageId)) {
      this.buckets.set(pageId, { tokens: this.maxTokens, lastRefillAt: now })
      return
    }

    const bucket = this.buckets.get(pageId)!
    const tokensToAdd = Math.floor((now - bucket.lastRefillAt) / this.refillIntervalMs)

    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(this.maxTokens, bucket.tokens + tokensToAdd)
      bucket.lastRefillAt = now
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
