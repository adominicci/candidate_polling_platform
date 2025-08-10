import { NetworkResilience } from '@/lib/api/network-resilience'

describe('NetworkResilience', () => {
  let networkResilience: NetworkResilience

  beforeEach(() => {
    networkResilience = new NetworkResilience()
    jest.clearAllMocks()
  })

  afterEach(() => {
    networkResilience.clearCache()
  })

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success')

      const result = await networkResilience.executeWithRetry(mockOperation)

      expect(result).toBe('success')
      expect(mockOperation).toHaveBeenCalledTimes(1)
    })

    it('should retry on retryable errors', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('NETWORK_ERROR'))
        .mockRejectedValueOnce(new Error('SERVER_ERROR'))
        .mockResolvedValueOnce('success')

      const result = await networkResilience.executeWithRetry(mockOperation, {
        maxAttempts: 3,
        baseDelayMs: 10
      })

      expect(result).toBe('success')
      expect(mockOperation).toHaveBeenCalledTimes(3)
    })

    it('should fail after max attempts', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('NETWORK_ERROR'))

      await expect(
        networkResilience.executeWithRetry(mockOperation, {
          maxAttempts: 3,
          baseDelayMs: 10
        })
      ).rejects.toThrow('NetworkResilienceError')

      expect(mockOperation).toHaveBeenCalledTimes(3)
    })

    it('should not retry non-retryable errors', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('VALIDATION_ERROR'))

      await expect(
        networkResilience.executeWithRetry(mockOperation, {
          maxAttempts: 3,
          baseDelayMs: 10,
          retryableErrors: ['NETWORK_ERROR'] // VALIDATION_ERROR not in list
        })
      ).rejects.toThrow('NetworkResilienceError')

      expect(mockOperation).toHaveBeenCalledTimes(1)
    })

    it('should use idempotency cache', async () => {
      const mockOperation = jest.fn().mockResolvedValue('cached-result')
      const idempotencyKey = 'test-key-123'

      // First call
      const result1 = await networkResilience.executeWithRetry(
        mockOperation,
        {},
        idempotencyKey
      )

      // Second call with same key
      const result2 = await networkResilience.executeWithRetry(
        mockOperation,
        {},
        idempotencyKey
      )

      expect(result1).toBe('cached-result')
      expect(result2).toBe('cached-result')
      expect(mockOperation).toHaveBeenCalledTimes(1) // Only called once due to cache
    })

    it('should call onRetry callback', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('NETWORK_ERROR'))
        .mockResolvedValueOnce('success')
      
      const onRetryCallback = jest.fn()

      await networkResilience.executeWithRetry(mockOperation, {
        maxAttempts: 2,
        baseDelayMs: 10,
        onRetry: onRetryCallback
      })

      expect(onRetryCallback).toHaveBeenCalledWith(1, expect.any(Error))
    })
  })

  describe('submitSurveyWithRetry', () => {
    it('should create proper idempotency key for surveys', async () => {
      const mockOperation = jest.fn().mockResolvedValue('survey-success')
      const surveyData = {
        questionnaire_id: 'q1',
        respondent_name: 'John Doe',
        volunteer_id: 'v1',
        is_draft: false
      }

      const result = await networkResilience.submitSurveyWithRetry(
        mockOperation,
        surveyData
      )

      expect(result).toBe('survey-success')
      expect(mockOperation).toHaveBeenCalledTimes(1)
    })

    it('should use survey-specific retry options', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('RATE_LIMIT_EXCEEDED'))
        .mockResolvedValueOnce('success')

      const surveyData = {
        questionnaire_id: 'q1',
        respondent_name: 'Jane Doe',
        volunteer_id: 'v1',
        is_draft: true
      }

      const result = await networkResilience.submitSurveyWithRetry(
        mockOperation,
        surveyData
      )

      expect(result).toBe('success')
      expect(mockOperation).toHaveBeenCalledTimes(2)
    })
  })

  describe('saveDraftWithRetry', () => {
    it('should handle draft-specific retry logic', async () => {
      const mockOperation = jest.fn().mockResolvedValue('draft-saved')
      const draftData = {
        id: 'draft-123',
        questionnaire_id: 'q1',
        answers: [{ question_id: 'q1', answer_value: 'test' }]
      }

      const result = await networkResilience.saveDraftWithRetry(
        mockOperation,
        draftData
      )

      expect(result).toBe('draft-saved')
      expect(mockOperation).toHaveBeenCalledTimes(1)
    })
  })

  describe('executeBatch', () => {
    it('should execute multiple operations in batch', async () => {
      const operations = [
        jest.fn().mockResolvedValue('result1'),
        jest.fn().mockResolvedValue('result2'),
        jest.fn().mockRejectedValue(new Error('failed')),
        jest.fn().mockResolvedValue('result4')
      ]

      const results = await networkResilience.executeBatch(operations)

      expect(results).toHaveLength(4)
      expect(results[0]).toEqual({ success: true, result: 'result1' })
      expect(results[1]).toEqual({ success: true, result: 'result2' })
      expect(results[2]).toEqual({ success: false, error: expect.any(Error) })
      expect(results[3]).toEqual({ success: true, result: 'result4' })
    })
  })

  describe('delay calculation', () => {
    it('should calculate exponential backoff delays', () => {
      // Test internal delay calculation by examining actual delays in retries
      const startTimes: number[] = []
      let attemptCount = 0

      const mockOperation = jest.fn().mockImplementation(() => {
        startTimes.push(Date.now())
        attemptCount++
        if (attemptCount < 3) {
          throw new Error('NETWORK_ERROR')
        }
        return Promise.resolve('success')
      })

      return networkResilience.executeWithRetry(mockOperation, {
        maxAttempts: 3,
        baseDelayMs: 100,
        backoffMultiplier: 2
      }).then(() => {
        expect(startTimes).toHaveLength(3)
        
        // First retry should have some delay
        const delay1 = startTimes[1] - startTimes[0]
        expect(delay1).toBeGreaterThan(50) // Should be around 100ms ± jitter
        
        // Second retry should have longer delay
        const delay2 = startTimes[2] - startTimes[1]
        expect(delay2).toBeGreaterThan(delay1) // Should be around 200ms ± jitter
      })
    })
  })

  describe('error handling', () => {
    it('should enhance error with retry context', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Original error'))

      try {
        await networkResilience.executeWithRetry(mockOperation, {
          maxAttempts: 2,
          baseDelayMs: 10
        })
      } catch (error: any) {
        expect(error.name).toBe('NetworkResilienceError')
        expect(error.message).toContain('Network operation failed after 2 attempts')
        expect(error.originalError).toBeDefined()
        expect(error.attempts).toBe(2)
        expect(error.requestId).toBeDefined()
        expect(error.totalTime).toBeGreaterThan(0)
      }
    })
  })

  describe('cache management', () => {
    it('should expire cached results after TTL', async () => {
      const mockOperation = jest.fn().mockResolvedValue('fresh-result')
      const idempotencyKey = 'test-expiry'

      // Mock Date.now to control time
      const originalNow = Date.now
      let mockTime = originalNow()
      jest.spyOn(Date, 'now').mockImplementation(() => mockTime)

      // First call - should cache result
      await networkResilience.executeWithRetry(mockOperation, {}, idempotencyKey)
      expect(mockOperation).toHaveBeenCalledTimes(1)

      // Fast forward time beyond TTL (10 minutes)
      mockTime += 11 * 60 * 1000

      // Second call - should not use cache
      await networkResilience.executeWithRetry(mockOperation, {}, idempotencyKey)
      expect(mockOperation).toHaveBeenCalledTimes(2)

      // Restore Date.now
      Date.now = originalNow
    })

    it('should clear cache manually', async () => {
      const mockOperation = jest.fn().mockResolvedValue('result')
      const idempotencyKey = 'test-clear'

      // Cache a result
      await networkResilience.executeWithRetry(mockOperation, {}, idempotencyKey)
      expect(mockOperation).toHaveBeenCalledTimes(1)

      // Clear cache
      networkResilience.clearCache()

      // Should call operation again
      await networkResilience.executeWithRetry(mockOperation, {}, idempotencyKey)
      expect(mockOperation).toHaveBeenCalledTimes(2)
    })
  })

  describe('statistics', () => {
    it('should provide basic stats', () => {
      const stats = networkResilience.getStats()
      
      expect(stats).toHaveProperty('cacheSize')
      expect(stats).toHaveProperty('cacheHitRate')
      expect(stats).toHaveProperty('activeRequests')
      
      expect(typeof stats.cacheSize).toBe('number')
      expect(typeof stats.cacheHitRate).toBe('number')
      expect(typeof stats.activeRequests).toBe('number')
    })
  })
})