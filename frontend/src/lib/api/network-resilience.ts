import { Logger } from '@/lib/monitoring/logger'

interface RetryOptions {
  maxAttempts?: number
  baseDelayMs?: number
  maxDelayMs?: number
  backoffMultiplier?: number
  retryableErrors?: string[]
  onRetry?: (attempt: number, error: any) => void
}

interface NetworkRequest {
  id?: string
  timestamp: number
  attempt: number
  maxAttempts: number
  lastError?: any
}

interface IdempotencyCache {
  [key: string]: {
    result: any
    timestamp: number
    expiresAt: number
  }
}

export class NetworkResilience {
  private logger = new Logger('network-resilience')
  private idempotencyCache: IdempotencyCache = {}
  private readonly CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

  private readonly DEFAULT_OPTIONS: Required<RetryOptions> = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    retryableErrors: [
      'NETWORK_ERROR',
      'TIMEOUT_ERROR',
      'SERVER_ERROR',
      '500',
      '502',
      '503',
      '504',
      '408',
      '429'
    ],
    onRetry: () => {}
  }

  /**
   * Execute a function with retry logic and exponential backoff
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {},
    idempotencyKey?: string
  ): Promise<T> {
    const config = { ...this.DEFAULT_OPTIONS, ...options }
    
    // Check idempotency cache first
    if (idempotencyKey) {
      const cached = this.getFromCache(idempotencyKey)
      if (cached) {
        this.logger.info('Returning cached result for idempotent operation', {
          idempotencyKey,
          cacheAge: Date.now() - cached.timestamp
        })
        return cached.result
      }
    }

    const request: NetworkRequest = {
      id: idempotencyKey || this.generateRequestId(),
      timestamp: Date.now(),
      attempt: 0,
      maxAttempts: config.maxAttempts
    }

    let lastError: any

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      request.attempt = attempt

      try {
        this.logger.debug('Executing network operation', {
          requestId: request.id,
          attempt,
          maxAttempts: config.maxAttempts
        })

        const result = await operation()

        // Cache successful result if idempotent
        if (idempotencyKey) {
          this.cacheResult(idempotencyKey, result)
        }

        // Log successful completion
        if (attempt > 1) {
          this.logger.info('Operation succeeded after retries', {
            requestId: request.id,
            attempt,
            totalTime: Date.now() - request.timestamp
          })
        }

        return result

      } catch (error) {
        lastError = error
        request.lastError = error

        const isRetryable = this.isRetryableError(error, config.retryableErrors)
        const isLastAttempt = attempt >= config.maxAttempts

        this.logger.warn('Network operation failed', {
          requestId: request.id,
          attempt,
          maxAttempts: config.maxAttempts,
          error: error instanceof Error ? error.message : String(error),
          errorCode: this.extractErrorCode(error),
          isRetryable,
          isLastAttempt
        })

        if (isLastAttempt || !isRetryable) {
          this.logger.error('Network operation failed permanently', {
            requestId: request.id,
            totalAttempts: attempt,
            totalTime: Date.now() - request.timestamp,
            finalError: error instanceof Error ? error.message : String(error)
          })
          
          throw this.enhanceError(error, request)
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(attempt, config)
        
        this.logger.info('Retrying network operation', {
          requestId: request.id,
          attempt,
          nextAttempt: attempt + 1,
          delayMs: delay
        })

        config.onRetry(attempt, error)
        await this.delay(delay)
      }
    }

    throw this.enhanceError(lastError, request)
  }

  /**
   * Create a specialized function for survey submission with retry logic
   */
  async submitSurveyWithRetry<T>(
    operation: () => Promise<T>,
    surveyData: any,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    // Create idempotency key based on survey data
    const idempotencyKey = this.createSurveyIdempotencyKey(surveyData)
    
    const surveyOptions: RetryOptions = {
      maxAttempts: 5, // More attempts for critical survey data
      baseDelayMs: 2000, // Longer initial delay
      maxDelayMs: 60000, // Allow up to 1 minute delay
      retryableErrors: [
        'NETWORK_ERROR',
        'TIMEOUT_ERROR',
        'SERVER_ERROR',
        'RATE_LIMIT_EXCEEDED',
        '500', '502', '503', '504', '408', '429'
      ],
      onRetry: (attempt, error) => {
        this.logger.warn('Survey submission retry', {
          surveyId: surveyData.questionnaire_id,
          respondentName: surveyData.respondent_name,
          attempt,
          error: error instanceof Error ? error.message : String(error)
        })
      },
      ...options
    }

    return this.executeWithRetry(operation, surveyOptions, idempotencyKey)
  }

  /**
   * Create a specialized function for draft saving with retry logic
   */
  async saveDraftWithRetry<T>(
    operation: () => Promise<T>,
    draftData: any,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const idempotencyKey = this.createDraftIdempotencyKey(draftData)
    
    const draftOptions: RetryOptions = {
      maxAttempts: 3,
      baseDelayMs: 1000,
      maxDelayMs: 15000,
      retryableErrors: [
        'NETWORK_ERROR',
        'TIMEOUT_ERROR',
        'SERVER_ERROR',
        '500', '502', '503', '504', '408'
      ],
      onRetry: (attempt, error) => {
        this.logger.info('Draft save retry', {
          draftId: draftData.id || 'new',
          attempt,
          answerCount: draftData.answers?.length || 0
        })
      },
      ...options
    }

    return this.executeWithRetry(operation, draftOptions, idempotencyKey)
  }

  /**
   * Batch retry for multiple operations
   */
  async executeBatch<T>(
    operations: Array<() => Promise<T>>,
    options: RetryOptions = {}
  ): Promise<Array<{ success: boolean; result?: T; error?: any }>> {
    const results = await Promise.allSettled(
      operations.map(op => this.executeWithRetry(op, options))
    )

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return { success: true, result: result.value }
      } else {
        this.logger.error('Batch operation failed', {
          operationIndex: index,
          error: result.reason instanceof Error ? result.reason.message : String(result.reason)
        })
        return { success: false, error: result.reason }
      }
    })
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any, retryableErrors: string[]): boolean {
    const errorCode = this.extractErrorCode(error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    // Check HTTP status codes
    if (errorCode && retryableErrors.includes(errorCode)) {
      return true
    }

    // Check error types
    if (error.name === 'NetworkError' || error.name === 'TimeoutError') {
      return true
    }

    // Check error messages
    const retryableMessages = [
      'network error',
      'connection failed',
      'timeout',
      'rate limit',
      'service unavailable',
      'internal server error',
      'bad gateway',
      'gateway timeout'
    ]

    return retryableMessages.some(msg => 
      errorMessage.toLowerCase().includes(msg)
    )
  }

  /**
   * Extract error code from various error formats
   */
  private extractErrorCode(error: any): string | null {
    if (error.code) return String(error.code)
    if (error.status) return String(error.status)
    if (error.statusCode) return String(error.statusCode)
    if (error.response?.status) return String(error.response.status)
    return null
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number, config: Required<RetryOptions>): number {
    const exponentialDelay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1)
    const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs)
    
    // Add jitter (±25% randomness)
    const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1)
    
    return Math.max(0, cappedDelay + jitter)
  }

  /**
   * Enhance error with retry context
   */
  private enhanceError(error: any, request: NetworkRequest): Error {
    const enhancedError = new Error(
      `Network operation failed after ${request.attempt} attempts: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
    
    enhancedError.name = 'NetworkResilienceError'
    ;(enhancedError as any).originalError = error
    ;(enhancedError as any).attempts = request.attempt
    ;(enhancedError as any).requestId = request.id
    ;(enhancedError as any).totalTime = Date.now() - request.timestamp
    
    return enhancedError
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Create idempotency key for survey submissions
   */
  private createSurveyIdempotencyKey(surveyData: any): string {
    const key = `survey_${surveyData.questionnaire_id}_${surveyData.respondent_name}_${
      surveyData.volunteer_id || 'unknown'
    }_${surveyData.is_draft ? 'draft' : 'final'}`
    return this.hashString(key)
  }

  /**
   * Create idempotency key for draft saves
   */
  private createDraftIdempotencyKey(draftData: any): string {
    const key = `draft_${draftData.id || 'new'}_${draftData.questionnaire_id}_${
      draftData.volunteer_id || 'unknown'
    }_${Date.now().toString().slice(0, -3)}000` // Round to nearest second
    return this.hashString(key)
  }

  /**
   * Simple hash function for idempotency keys
   */
  private hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * Cache result for idempotent operations
   */
  private cacheResult(key: string, result: any): void {
    const now = Date.now()
    this.idempotencyCache[key] = {
      result,
      timestamp: now,
      expiresAt: now + this.CACHE_TTL_MS
    }

    // Clean up expired entries
    this.cleanupCache()
  }

  /**
   * Get cached result if still valid
   */
  private getFromCache(key: string): any | null {
    const cached = this.idempotencyCache[key]
    if (!cached) return null

    if (Date.now() > cached.expiresAt) {
      delete this.idempotencyCache[key]
      return null
    }

    return cached
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now()
    for (const [key, cached] of Object.entries(this.idempotencyCache)) {
      if (now > cached.expiresAt) {
        delete this.idempotencyCache[key]
      }
    }
  }

  /**
   * Delay helper function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get network resilience statistics
   */
  getStats(): {
    cacheSize: number
    cacheHitRate: number
    activeRequests: number
  } {
    const cacheSize = Object.keys(this.idempotencyCache).length
    
    return {
      cacheSize,
      cacheHitRate: 0, // Would need to track hits/misses to calculate
      activeRequests: 0 // Would need to track active operations
    }
  }

  /**
   * Clear cache manually
   */
  clearCache(): void {
    this.idempotencyCache = {}
    this.logger.info('Network resilience cache cleared')
  }
}

// Export singleton instance
export const networkResilience = new NetworkResilience()