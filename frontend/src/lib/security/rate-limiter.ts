import { NextRequest } from 'next/server'

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  max: number // Maximum requests per window
  keyGenerator: (req: NextRequest) => string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetTime: number
  retryAfter?: number
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

export class RateLimiter {
  private store = new Map<string, RateLimitEntry>()
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
    
    // Clean up expired entries every minute
    setInterval(() => {
      this.cleanup()
    }, 60000)
  }

  async checkLimit(request: NextRequest): Promise<RateLimitResult> {
    const key = this.config.keyGenerator(request)
    const now = Date.now()
    const windowStart = now - this.config.windowMs
    
    // Clean up old entries for this key
    this.cleanupKey(key, windowStart)
    
    // Get or create entry
    let entry = this.store.get(key)
    
    if (!entry) {
      entry = {
        count: 1,
        resetTime: now + this.config.windowMs
      }
      this.store.set(key, entry)
    } else {
      entry.count++
    }
    
    const remaining = Math.max(0, this.config.max - entry.count)
    const success = entry.count <= this.config.max
    
    return {
      success,
      limit: this.config.max,
      remaining,
      resetTime: entry.resetTime,
      retryAfter: success ? undefined : Math.ceil((entry.resetTime - now) / 1000)
    }
  }

  private cleanup(): void {
    const now = Date.now()
    
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime <= now) {
        this.store.delete(key)
      }
    }
  }

  private cleanupKey(key: string, windowStart: number): void {
    const entry = this.store.get(key)
    
    if (entry && entry.resetTime <= Date.now()) {
      this.store.delete(key)
    }
  }

  // Get current stats for monitoring
  getStats(): { totalKeys: number; activeKeys: number } {
    const now = Date.now()
    let activeKeys = 0
    
    for (const entry of this.store.values()) {
      if (entry.resetTime > now) {
        activeKeys++
      }
    }
    
    return {
      totalKeys: this.store.size,
      activeKeys
    }
  }

  // Reset rate limit for a specific key (for testing or admin override)
  resetKey(key: string): void {
    this.store.delete(key)
  }

  // Clear all rate limit data (use with caution)
  clearAll(): void {
    this.store.clear()
  }
}