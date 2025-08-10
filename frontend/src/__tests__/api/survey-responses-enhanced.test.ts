import { jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/surveys/responses/route'

// Mock dependencies
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn()
}))

jest.mock('@/lib/validation/server-validation', () => ({
  SurveySubmissionValidator: jest.fn()
}))

jest.mock('@/lib/security/rate-limiter', () => ({
  RateLimiter: jest.fn()
}))

jest.mock('@/lib/security/input-sanitizer', () => ({
  InputSanitizer: jest.fn()
}))

jest.mock('@/lib/analytics/survey-analytics', () => ({
  SurveyAnalytics: jest.fn()
}))

jest.mock('@/lib/monitoring/logger', () => ({
  Logger: jest.fn()
}))

jest.mock('@/lib/api/network-resilience', () => ({
  networkResilience: {
    executeWithRetry: jest.fn(),
    saveDraftWithRetry: jest.fn()
  }
}))

describe('Enhanced Survey Responses API', () => {
  let mockSupabase: any
  let mockValidator: any
  let mockRateLimiter: any
  let mockSanitizer: any
  let mockAnalytics: any
  let mockLogger: any
  let mockNetworkResilience: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn()
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(),
              order: jest.fn(() => ({
                single: jest.fn()
              }))
            }))
          }))
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn()
          }))
        })),
        delete: jest.fn(() => ({
          eq: jest.fn()
        }))
      }))
    }

    require('@/lib/supabase/server').createClient.mockResolvedValue(mockSupabase)

    // Mock Validator
    mockValidator = {
      validateSurveySubmission: jest.fn(),
      getCompletionPercentage: jest.fn()
    }
    require('@/lib/validation/server-validation').SurveySubmissionValidator.mockImplementation(() => mockValidator)

    // Mock Rate Limiter
    mockRateLimiter = {
      checkLimit: jest.fn()
    }
    require('@/lib/security/rate-limiter').RateLimiter.mockImplementation(() => mockRateLimiter)

    // Mock Input Sanitizer
    mockSanitizer = {
      sanitizeSurveyData: jest.fn()
    }
    require('@/lib/security/input-sanitizer').InputSanitizer.mockImplementation(() => mockSanitizer)

    // Mock Analytics
    mockAnalytics = {
      trackSubmission: jest.fn(),
      trackRateLimit: jest.fn(),
      trackSecurityEvent: jest.fn(),
      trackValidationFailure: jest.fn(),
      trackDuplicateSubmission: jest.fn(),
      trackSubmissionError: jest.fn()
    }
    require('@/lib/analytics/survey-analytics').SurveyAnalytics.mockImplementation(() => mockAnalytics)

    // Mock Logger
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    }
    require('@/lib/monitoring/logger').Logger.mockImplementation(() => mockLogger)

    // Mock Network Resilience
    mockNetworkResilience = require('@/lib/api/network-resilience').networkResilience
  })

  describe('POST /api/surveys/responses', () => {
    it('should handle successful survey submission with retry logic', async () => {
      // Setup mocks for successful flow
      mockRateLimiter.checkLimit.mockResolvedValue({ success: true })
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null
      })
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: { id: 'profile-123', tenant_id: 'tenant-123', rol: 'volunteer', activo: true },
        error: null
      })
      mockSupabase.from().select().eq().eq().eq().single.mockResolvedValue({
        data: { 
          id: 'questionnaire-123',
          tenant_id: 'tenant-123', 
          is_active: true,
          sections: [{ id: 'section-1', questions: [] }]
        },
        error: null
      })

      mockSanitizer.sanitizeSurveyData.mockReturnValue({
        questionnaire_id: 'questionnaire-123',
        respondent_name: 'Test User',
        answers: [],
        is_draft: false,
        metadata: {
          start_time: new Date().toISOString(),
          device_info: { user_agent: 'test', screen_size: '1920x1080' }
        }
      })

      mockValidator.validateSurveySubmission.mockResolvedValue({
        isValid: true,
        errors: {}
      })

      mockValidator.getCompletionPercentage.mockReturnValue(100)

      // Mock network resilience to simulate successful operations
      mockNetworkResilience.executeWithRetry.mockImplementation(async (operation) => {
        return await operation()
      })

      // Mock successful database operations
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: { id: 'response-123' },
        error: null
      })

      mockSupabase.from().insert.mockResolvedValue({
        data: null,
        error: null
      })

      // Create request
      const requestBody = {
        questionnaire_id: 'questionnaire-123',
        respondent_name: 'Test User',
        answers: [
          { question_id: 'q1', answer_value: 'test answer' }
        ],
        is_draft: false,
        metadata: {
          start_time: new Date().toISOString(),
          device_info: { user_agent: 'test', screen_size: '1920x1080' }
        }
      }

      const request = new NextRequest('http://localhost:3000/api/surveys/responses', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(201)
      expect(responseData.success).toBe(true)
      expect(responseData.data.id).toBe('response-123')
      expect(responseData.data.status).toBe('completed')
      expect(responseData.request_id).toBeDefined()

      // Verify analytics were called
      expect(mockAnalytics.trackSubmission).toHaveBeenCalled()
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Survey submitted successfully'),
        expect.any(Object)
      )
    })

    it('should handle rate limiting with enhanced error response', async () => {
      mockRateLimiter.checkLimit.mockResolvedValue({
        success: false,
        remaining: 0,
        resetTime: Date.now() + 900000 // 15 minutes
      })

      const request = new NextRequest('http://localhost:3000/api/surveys/responses', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '192.168.1.1'
        }
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(429)
      expect(responseData.error).toContain('Demasiadas solicitudes')
      expect(responseData.code).toBe('RATE_LIMIT_EXCEEDED')
      expect(responseData.request_id).toBeDefined()
      expect(responseData.details.retryAfter).toBeDefined()

      // Verify rate limit headers
      expect(response.headers.get('Retry-After')).toBeDefined()
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')

      // Verify analytics were called
      expect(mockAnalytics.trackRateLimit).toHaveBeenCalled()
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Rate limit exceeded'),
        expect.any(Object)
      )
    })

    it('should handle request parsing timeout', async () => {
      // Create a request that will timeout during parsing
      const request = new NextRequest('http://localhost:3000/api/surveys/responses', {
        method: 'POST',
        body: new ReadableStream({
          start(controller) {
            // Never write data to simulate hanging request
          }
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      // Mock the text() method to simulate timeout
      jest.spyOn(request, 'text').mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.code).toBe('INVALID_REQUEST_FORMAT')
      expect(responseData.request_id).toBeDefined()
    })

    it('should handle authentication failures with security tracking', async () => {
      mockRateLimiter.checkLimit.mockResolvedValue({ success: true })
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid JWT' }
      })

      const request = new NextRequest('http://localhost:3000/api/surveys/responses', {
        method: 'POST',
        body: JSON.stringify({
          questionnaire_id: 'test',
          respondent_name: 'Test'
        }),
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 Test Browser'
        }
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.code).toBe('UNAUTHORIZED_ACCESS')
      expect(responseData.request_id).toBeDefined()

      // Verify security event was tracked
      expect(mockAnalytics.trackSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'unauthorized_access',
          request_id: expect.any(String),
          endpoint: '/api/surveys/responses'
        })
      )
    })

    it('should handle validation failures with detailed error tracking', async () => {
      // Setup successful auth
      mockRateLimiter.checkLimit.mockResolvedValue({ success: true })
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: { id: 'profile-123', tenant_id: 'tenant-123', rol: 'volunteer', activo: true },
        error: null
      })
      mockSupabase.from().select().eq().eq().eq().single.mockResolvedValue({
        data: { 
          id: 'questionnaire-123',
          sections: [{ id: 'section-1', questions: [] }]
        },
        error: null
      })

      mockSanitizer.sanitizeSurveyData.mockReturnValue({
        questionnaire_id: 'questionnaire-123',
        respondent_name: 'Test User',
        answers: [],
        is_draft: false
      })

      // Mock validation failure
      mockValidator.validateSurveySubmission.mockResolvedValue({
        isValid: false,
        errors: {
          'answers.name': ['El nombre es obligatorio'],
          'answers.phone': ['Formato de teléfono inválido']
        },
        warnings: {
          'answers.email': ['Email recomendado pero no obligatorio']
        }
      })

      const request = new NextRequest('http://localhost:3000/api/surveys/responses', {
        method: 'POST',
        body: JSON.stringify({
          questionnaire_id: 'questionnaire-123',
          respondent_name: 'Test User',
          answers: [],
          is_draft: false
        })
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.code).toBe('VALIDATION_FAILED')
      expect(responseData.details).toBeDefined()
      expect(responseData.warnings).toBeDefined()

      // Verify validation failure was tracked
      expect(mockAnalytics.trackValidationFailure).toHaveBeenCalledWith(
        expect.objectContaining({
          request_id: expect.any(String),
          user_id: 'user-123',
          questionnaire_id: 'questionnaire-123',
          error_count: 2,
          error_types: ['answers.name', 'answers.phone']
        })
      )
    })

    it('should handle duplicate submission detection', async () => {
      // Setup successful auth and validation
      mockRateLimiter.checkLimit.mockResolvedValue({ success: true })
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: { id: 'profile-123', tenant_id: 'tenant-123', rol: 'volunteer', activo: true },
        error: null
      })
      mockSupabase.from().select().eq().eq().eq().single.mockResolvedValue({
        data: { 
          id: 'questionnaire-123',
          sections: [{ id: 'section-1', questions: [] }]
        },
        error: null
      })

      mockSanitizer.sanitizeSurveyData.mockReturnValue({
        questionnaire_id: 'questionnaire-123',
        respondent_name: 'Duplicate User',
        is_draft: false
      })

      mockValidator.validateSurveySubmission.mockResolvedValue({
        isValid: true,
        errors: {}
      })

      // Mock existing response found
      mockSupabase.from().select().eq().eq().eq().eq().single.mockResolvedValue({
        data: { id: 'existing-response-123' },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/surveys/responses', {
        method: 'POST',
        body: JSON.stringify({
          questionnaire_id: 'questionnaire-123',
          respondent_name: 'Duplicate User',
          is_draft: false
        })
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(409)
      expect(responseData.code).toBe('DUPLICATE_SUBMISSION')
      expect(responseData.details.existingResponseId).toBe('existing-response-123')

      // Verify duplicate attempt was tracked
      expect(mockAnalytics.trackDuplicateSubmission).toHaveBeenCalledWith(
        expect.objectContaining({
          existing_response_id: 'existing-response-123'
        })
      )
    })

    it('should handle network errors with retry logic', async () => {
      // Setup successful auth and validation
      mockRateLimiter.checkLimit.mockResolvedValue({ success: true })
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: { id: 'profile-123', tenant_id: 'tenant-123', rol: 'volunteer', activo: true },
        error: null
      })
      mockSupabase.from().select().eq().eq().eq().single.mockResolvedValue({
        data: { 
          id: 'questionnaire-123',
          sections: [{ id: 'section-1', questions: [] }]
        },
        error: null
      })

      mockSanitizer.sanitizeSurveyData.mockReturnValue({
        questionnaire_id: 'questionnaire-123',
        respondent_name: 'Test User',
        answers: [],
        is_draft: false
      })

      mockValidator.validateSurveySubmission.mockResolvedValue({
        isValid: true,
        errors: {}
      })

      // Mock network resilience failure
      const networkError = new Error('Network error')
      networkError.name = 'NetworkResilienceError'
      mockNetworkResilience.executeWithRetry.mockRejectedValue(networkError)

      const request = new NextRequest('http://localhost:3000/api/surveys/responses', {
        method: 'POST',
        body: JSON.stringify({
          questionnaire_id: 'questionnaire-123',
          respondent_name: 'Test User',
          answers: [],
          is_draft: false
        })
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(503)
      expect(responseData.code).toBe('NETWORK_ERROR')
      expect(responseData.retry_suggested).toBe(true)
      expect(response.headers.get('Retry-After')).toBe('30')

      // Verify error was tracked
      expect(mockAnalytics.trackSubmissionError).toHaveBeenCalled()
    })

    it('should handle batch answer insertion with retry logic', async () => {
      // Setup successful auth and validation
      mockRateLimiter.checkLimit.mockResolvedValue({ success: true })
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: { id: 'profile-123', tenant_id: 'tenant-123', rol: 'volunteer', activo: true },
        error: null
      })
      mockSupabase.from().select().eq().eq().eq().single.mockResolvedValue({
        data: { 
          id: 'questionnaire-123',
          sections: [{ id: 'section-1', questions: [] }]
        },
        error: null
      })

      const manyAnswers = Array.from({ length: 30 }, (_, i) => ({
        question_id: `q${i}`,
        answer_value: `answer ${i}`
      }))

      mockSanitizer.sanitizeSurveyData.mockReturnValue({
        questionnaire_id: 'questionnaire-123',
        respondent_name: 'Test User',
        answers: manyAnswers,
        is_draft: false
      })

      mockValidator.validateSurveySubmission.mockResolvedValue({
        isValid: true,
        errors: {}
      })

      // Mock successful response creation
      mockNetworkResilience.executeWithRetry.mockImplementation(async (operation) => {
        return await operation()
      })

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: { id: 'response-123' },
        error: null
      })

      // Mock batch answer insertion
      mockSupabase.from().insert.mockResolvedValue({
        data: null,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/surveys/responses', {
        method: 'POST',
        body: JSON.stringify({
          questionnaire_id: 'questionnaire-123',
          respondent_name: 'Test User',
          answers: manyAnswers,
          is_draft: false
        })
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(201)
      expect(responseData.success).toBe(true)
      expect(responseData.data.answer_count).toBe(30)

      // Verify network resilience was used for batch insertion
      expect(mockNetworkResilience.executeWithRetry).toHaveBeenCalledTimes(2) // Response + answers
    })

    it('should provide comprehensive error details in development mode', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      mockRateLimiter.checkLimit.mockResolvedValue({ success: true })
      
      const detailedError = new Error('Detailed database error with stack trace')
      mockSupabase.auth.getUser.mockRejectedValue(detailedError)

      const request = new NextRequest('http://localhost:3000/api/surveys/responses', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' })
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.details).toBeDefined()
      expect(responseData.details.original_error).toBe(detailedError.message)

      process.env.NODE_ENV = originalEnv
    })
  })
})