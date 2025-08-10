import { jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/surveys/drafts/route'

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

jest.mock('@/lib/monitoring/logger', () => ({
  Logger: jest.fn()
}))

jest.mock('@/lib/api/network-resilience', () => ({
  networkResilience: {
    saveDraftWithRetry: jest.fn()
  }
}))

describe('Draft Management API', () => {
  let mockSupabase: any
  let mockValidator: any
  let mockRateLimiter: any
  let mockSanitizer: any
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
                single: jest.fn(),
                limit: jest.fn(() => ({
                  single: jest.fn()
                })),
                range: jest.fn()
              }))
            }))
          }))
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn()
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn()
            }))
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

  describe('POST /api/surveys/drafts (Create/Update Draft)', () => {
    it('should create a new draft successfully', async () => {
      // Setup mocks for successful creation
      mockRateLimiter.checkLimit.mockResolvedValue({ success: true })
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: { id: 'profile-123', tenant_id: 'tenant-123', rol: 'volunteer', activo: true },
        error: null
      })

      mockSanitizer.sanitizeSurveyData.mockReturnValue({
        questionnaire_id: 'q-123',
        respondent_name: 'Draft User',
        answers: [{ question_id: 'q1', answer_value: 'test' }],
        metadata: {
          start_time: new Date().toISOString(),
          device_info: { user_agent: 'test', screen_size: '1920x1080' }
        }
      })

      // Mock questionnaire validation
      mockSupabase.from().select().eq().eq().eq().single.mockResolvedValue({
        data: { 
          id: 'q-123',
          tenant_id: 'tenant-123',
          is_active: true,
          sections: [{ id: 's1', questions: [] }]
        },
        error: null
      })

      // Mock no existing draft
      mockSupabase.from().select().eq().eq().eq().order().limit().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' } // No rows found
      })

      mockValidator.getCompletionPercentage.mockReturnValue(25)
      mockValidator.validateSurveySubmission.mockResolvedValue({
        isValid: false, // Drafts can have validation warnings
        errors: { 'answers.name': ['Campo requerido'] }
      })

      // Mock successful draft creation via network resilience
      mockNetworkResilience.saveDraftWithRetry.mockResolvedValue({
        data: { id: 'draft-123' }
      })

      const requestBody = {
        questionnaire_id: 'q-123',
        respondent_name: 'Draft User',
        answers: [{ question_id: 'q1', answer_value: 'test' }],
        metadata: {
          start_time: new Date().toISOString(),
          device_info: { user_agent: 'test', screen_size: '1920x1080' },
          auto_save: false
        }
      }

      const request = new NextRequest('http://localhost:3000/api/surveys/drafts', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(201)
      expect(responseData.success).toBe(true)
      expect(responseData.data.id).toBe('draft-123')
      expect(responseData.data.status).toBe('draft')
      expect(responseData.data.is_update).toBe(false)
      expect(responseData.data.completion_percentage).toBe(25)

      expect(mockNetworkResilience.saveDraftWithRetry).toHaveBeenCalledTimes(2) // Draft + answers
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Draft saved successfully'),
        expect.any(Object)
      )
    })

    it('should update an existing draft', async () => {
      // Setup mocks for successful update
      mockRateLimiter.checkLimit.mockResolvedValue({ success: true })
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: { id: 'profile-123', tenant_id: 'tenant-123', rol: 'volunteer', activo: true },
        error: null
      })

      mockSanitizer.sanitizeSurveyData.mockReturnValue({
        questionnaire_id: 'q-123',
        respondent_name: 'Updated Draft User',
        answers: [
          { question_id: 'q1', answer_value: 'updated answer' },
          { question_id: 'q2', answer_value: 'new answer' }
        ]
      })

      // Mock questionnaire validation
      mockSupabase.from().select().eq().eq().eq().single.mockResolvedValue({
        data: { 
          id: 'q-123',
          tenant_id: 'tenant-123',
          is_active: true,
          sections: [{ id: 's1', questions: [] }]
        },
        error: null
      })

      // Mock existing draft found
      mockSupabase.from().select().eq().eq().eq().order().limit().single.mockResolvedValue({
        data: { 
          id: 'existing-draft-123',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        error: null
      })

      mockValidator.getCompletionPercentage.mockReturnValue(50)

      // Mock successful draft update via network resilience
      mockNetworkResilience.saveDraftWithRetry.mockResolvedValue({
        data: { id: 'existing-draft-123' }
      })

      const requestBody = {
        questionnaire_id: 'q-123',
        respondent_name: 'Updated Draft User',
        answers: [
          { question_id: 'q1', answer_value: 'updated answer' },
          { question_id: 'q2', answer_value: 'new answer' }
        ],
        metadata: {
          auto_save: true
        }
      }

      const request = new NextRequest('http://localhost:3000/api/surveys/drafts', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data.id).toBe('existing-draft-123')
      expect(responseData.data.is_update).toBe(true)
      expect(responseData.data.completion_percentage).toBe(50)

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Draft saved successfully'),
        expect.objectContaining({
          isAutoSave: true
        })
      )
    })

    it('should handle draft rate limiting', async () => {
      mockRateLimiter.checkLimit.mockResolvedValue({
        success: false,
        remaining: 0,
        resetTime: Date.now() + 300000 // 5 minutes
      })

      const request = new NextRequest('http://localhost:3000/api/surveys/drafts', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(429)
      expect(responseData.code).toBe('DRAFT_RATE_LIMIT_EXCEEDED')
      expect(responseData.request_id).toBeDefined()
    })

    it('should handle request parsing timeout', async () => {
      mockRateLimiter.checkLimit.mockResolvedValue({ success: true })

      // Create a request that will timeout
      const request = new NextRequest('http://localhost:3000/api/surveys/drafts', {
        method: 'POST',
        body: new ReadableStream({
          start() {
            // Never provide data
          }
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      // Mock the text() method to simulate timeout
      jest.spyOn(request, 'text').mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.code).toBe('INVALID_REQUEST_FORMAT')
    })

    it('should handle network errors during draft save', async () => {
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

      mockSanitizer.sanitizeSurveyData.mockReturnValue({
        questionnaire_id: 'q-123',
        respondent_name: 'Test User',
        answers: []
      })

      mockSupabase.from().select().eq().eq().eq().single.mockResolvedValue({
        data: { id: 'q-123', tenant_id: 'tenant-123', is_active: true, sections: [] },
        error: null
      })

      mockSupabase.from().select().eq().eq().eq().order().limit().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      })

      // Mock network failure
      mockNetworkResilience.saveDraftWithRetry.mockRejectedValue(
        new Error('Network connection failed')
      )

      const request = new NextRequest('http://localhost:3000/api/surveys/drafts', {
        method: 'POST',
        body: JSON.stringify({
          questionnaire_id: 'q-123',
          respondent_name: 'Test User',
          answers: []
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(503)
      expect(responseData.code).toBe('NETWORK_ERROR')
      expect(responseData.retry_suggested).toBe(true)
    })

    it('should handle validation warnings for drafts', async () => {
      // Setup successful flow but with validation warnings
      mockRateLimiter.checkLimit.mockResolvedValue({ success: true })
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: { id: 'profile-123', tenant_id: 'tenant-123', rol: 'volunteer', activo: true },
        error: null
      })

      mockSanitizer.sanitizeSurveyData.mockReturnValue({
        questionnaire_id: 'q-123',
        respondent_name: 'Incomplete User',
        answers: [{ question_id: 'q1', answer_value: 'partial' }]
      })

      mockSupabase.from().select().eq().eq().eq().single.mockResolvedValue({
        data: { id: 'q-123', tenant_id: 'tenant-123', is_active: true, sections: [] },
        error: null
      })

      mockSupabase.from().select().eq().eq().eq().order().limit().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      })

      // Mock validation with warnings (but allow draft save)
      mockValidator.validateSurveySubmission.mockResolvedValue({
        isValid: false,
        errors: { 'answers.required_field': ['Campo obligatorio'] }
      })

      mockValidator.getCompletionPercentage.mockReturnValue(30)
      mockNetworkResilience.saveDraftWithRetry.mockResolvedValue({
        data: { id: 'draft-with-warnings' }
      })

      const request = new NextRequest('http://localhost:3000/api/surveys/drafts', {
        method: 'POST',
        body: JSON.stringify({
          questionnaire_id: 'q-123',
          respondent_name: 'Incomplete User',
          answers: [{ question_id: 'q1', answer_value: 'partial' }]
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(201)
      expect(responseData.success).toBe(true)
      expect(responseData.data.completion_percentage).toBe(30)

      // Verify validation warnings were logged but didn't prevent save
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Draft validation warnings'),
        expect.any(Object)
      )
    })
  })

  describe('GET /api/surveys/drafts (List Drafts)', () => {
    it('should list user drafts successfully', async () => {
      // Setup auth
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: { id: 'profile-123', tenant_id: 'tenant-123' },
        error: null
      })

      // Mock drafts query
      const mockDrafts = [
        {
          id: 'draft-1',
          questionnaire_id: 'q-123',
          respondent_name: 'User A',
          created_at: '2025-01-01T10:00:00Z',
          updated_at: '2025-01-01T10:30:00Z',
          metadata: { completion_percentage: 75, answer_count: 15, last_auto_save: null },
          questionnaires: { title: 'PPD Survey', version: '1.0.0' }
        },
        {
          id: 'draft-2',
          questionnaire_id: 'q-124',
          respondent_name: 'User B',
          created_at: '2025-01-01T09:00:00Z',
          updated_at: '2025-01-01T09:15:00Z',
          metadata: { completion_percentage: 40, answer_count: 8, last_auto_save: '2025-01-01T09:15:00Z' },
          questionnaires: { title: 'Community Survey', version: '1.1.0' }
        }
      ]

      mockSupabase.from().select().eq().eq().order().range.mockResolvedValue({
        data: mockDrafts,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/surveys/drafts?limit=10&offset=0')

      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data.drafts).toHaveLength(2)
      expect(responseData.data.drafts[0]).toMatchObject({
        id: 'draft-1',
        questionnaire_title: 'PPD Survey',
        completion_percentage: 75,
        answer_count: 15
      })
      expect(responseData.data.drafts[0].age_minutes).toBeDefined()

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Drafts retrieved successfully'),
        expect.objectContaining({
          draftCount: 2
        })
      )
    })

    it('should filter drafts by questionnaire ID', async () => {
      // Setup auth
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: { id: 'profile-123', tenant_id: 'tenant-123' },
        error: null
      })

      const filteredDrafts = [
        {
          id: 'draft-filtered',
          questionnaire_id: 'specific-q-123',
          respondent_name: 'Filtered User',
          created_at: '2025-01-01T10:00:00Z',
          updated_at: '2025-01-01T10:30:00Z',
          metadata: { completion_percentage: 60, answer_count: 12 },
          questionnaires: { title: 'Specific Survey', version: '1.0.0' }
        }
      ]

      // Mock with questionnaire filter
      mockSupabase.from().select().eq().eq().order().range.mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: filteredDrafts,
          error: null
        })
      })

      const request = new NextRequest('http://localhost:3000/api/surveys/drafts?questionnaire_id=specific-q-123')

      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.data.drafts).toHaveLength(1)
      expect(responseData.data.drafts[0].questionnaire_id).toBe('specific-q-123')
    })

    it('should handle pagination parameters', async () => {
      // Setup auth
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: { id: 'profile-123', tenant_id: 'tenant-123' },
        error: null
      })

      mockSupabase.from().select().eq().eq().order().range.mockResolvedValue({
        data: [],
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/surveys/drafts?limit=25&offset=50')

      await GET(request)

      // Verify pagination was applied
      expect(mockSupabase.from().select().eq().eq().order().range).toHaveBeenCalledWith(50, 74) // offset to offset+limit-1
    })

    it('should handle authentication failures', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' }
      })

      const request = new NextRequest('http://localhost:3000/api/surveys/drafts')

      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.code).toBe('UNAUTHORIZED_ACCESS')
    })

    it('should handle database errors gracefully', async () => {
      // Setup auth
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: { id: 'profile-123', tenant_id: 'tenant-123' },
        error: null
      })

      // Mock database error
      mockSupabase.from().select().eq().eq().order().range.mockResolvedValue({
        data: null,
        error: { message: 'Connection timeout' }
      })

      const request = new NextRequest('http://localhost:3000/api/surveys/drafts')

      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.code).toBe('DRAFT_RETRIEVAL_ERROR')

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error retrieving drafts'),
        expect.any(Object)
      )
    })

    it('should calculate draft age in minutes', async () => {
      // Setup auth
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: { id: 'profile-123', tenant_id: 'tenant-123' },
        error: null
      })

      // Mock a draft that's 2 hours old
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      const mockDrafts = [
        {
          id: 'old-draft',
          questionnaire_id: 'q-123',
          respondent_name: 'Old User',
          created_at: twoHoursAgo,
          updated_at: twoHoursAgo,
          metadata: { completion_percentage: 25, answer_count: 5 },
          questionnaires: { title: 'Old Survey', version: '1.0.0' }
        }
      ]

      mockSupabase.from().select().eq().eq().order().range.mockResolvedValue({
        data: mockDrafts,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/surveys/drafts')

      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.data.drafts[0].age_minutes).toBeGreaterThan(100) // Should be around 120 minutes
      expect(responseData.data.drafts[0].age_minutes).toBeLessThan(130)
    })
  })
})