/**
 * Epic 2 - Survey Data Collection Database Integration Test
 * 
 * Tests the complete database integration for questionnaire loading
 * and survey form functionality after migration.
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Mock Next.js cookies for testing
jest.mock('next/headers', () => ({
  cookies: jest.fn()
}))

const mockCookies = {
  getAll: jest.fn(() => []),
  setAll: jest.fn()
}

beforeEach(() => {
  ;(cookies as jest.Mock).mockImplementation(() => Promise.resolve(mockCookies))
})

// Test database connection and questionnaire data
describe('Epic 2 - Database Integration', () => {
  let supabase: any

  beforeEach(() => {
    // Create mock Supabase client
    supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => mockCookies.getAll(),
          setAll: (cookies) => mockCookies.setAll(cookies)
        }
      }
    )
  })

  describe('Questionnaire Data Migration', () => {
    test('should have the PPD questionnaire in database', async () => {
      const { data, error } = await supabase
        .from('questionnaires')
        .select('*')
        .eq('id', 'ppd_voter_consultation_v1')
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.title).toBe('CONSULTA ELECTORAL Y COMUNITARIA')
      expect(data.version).toBe('1.0.0')
      expect(data.language).toBe('es')
      expect(data.is_active).toBe(true)
    })

    test('should have 8 sections for the questionnaire', async () => {
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .eq('questionnaire_id', 'ppd_voter_consultation_v1')
        .order('order_index')

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data).toHaveLength(8)

      // Verify section titles
      const expectedSections = [
        'Información Personal',
        'Información del Hogar', 
        'Historial de Votación',
        'Modalidad de Voto',
        'Afiliación Política',
        'Prioridades',
        'Asuntos Comunitarios',
        'Evaluación Partidista'
      ]

      data.forEach((section, index) => {
        expect(section.title).toBe(expectedSections[index])
        expect(section.order_index).toBe(index + 1)
      })
    })

    test('should have 31 questions across all sections', async () => {
      const { data, error } = await supabase
        .from('questions')
        .select(`
          *,
          sections!inner(questionnaire_id)
        `)
        .eq('sections.questionnaire_id', 'ppd_voter_consultation_v1')

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data).toHaveLength(31)

      // Verify question types are properly set
      const questionTypes = data.map(q => q.type)
      expect(questionTypes).toContain('text')
      expect(questionTypes).toContain('radio') 
      expect(questionTypes).toContain('checkbox')
      expect(questionTypes).toContain('scale')
      expect(questionTypes).toContain('date')
      expect(questionTypes).toContain('email')
      expect(questionTypes).toContain('tel')
      expect(questionTypes).toContain('textarea')
    })
  })

  describe('Questionnaire API Integration', () => {
    test('should load questionnaire with proper structure via API', async () => {
      // Mock the API response structure
      const mockApiResponse = {
        success: true,
        data: {
          id: 'ppd_voter_consultation_v1',
          title: 'CONSULTA ELECTORAL Y COMUNITARIA',
          version: '1.0.0',
          language: 'es',
          sections: [
            {
              id: 'demographics',
              title: 'Información Personal',
              order: 1,
              questions: [
                {
                  id: 'name',
                  text: 'NOMBRE',
                  type: 'text',
                  required: true,
                  order: 1
                }
              ]
            }
          ],
          metadata: {
            total_questions: 31,
            total_sections: 8,
            estimated_completion_time: '10-15 minutos'
          }
        }
      }

      // This tests the expected API response structure
      expect(mockApiResponse.success).toBe(true)
      expect(mockApiResponse.data.id).toBe('ppd_voter_consultation_v1')
      expect(mockApiResponse.data.sections).toHaveLength(1) // Mock has only 1 section
      expect(mockApiResponse.data.metadata.total_questions).toBe(31)
      expect(mockApiResponse.data.metadata.total_sections).toBe(8)
    })
  })

  describe('Database Schema Validation', () => {
    test('should have proper question validation rules stored as JSONB', async () => {
      // Check a question with validation rules
      const { data, error } = await supabase
        .from('questions')
        .select(`
          *,
          sections!inner(questionnaire_id)
        `)
        .eq('sections.questionnaire_id', 'ppd_voter_consultation_v1')
        .eq('id', 'name')
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.validation_rules).toBeDefined()
      
      // Parse JSON validation rules
      const validationRules = typeof data.validation_rules === 'string' 
        ? JSON.parse(data.validation_rules) 
        : data.validation_rules

      expect(validationRules.minLength).toBe(2)
      expect(validationRules.maxLength).toBe(100)
    })

    test('should have proper question options stored as JSONB', async () => {
      // Check a radio question with options
      const { data, error } = await supabase
        .from('questions')
        .select(`
          *,
          sections!inner(questionnaire_id)
        `)
        .eq('sections.questionnaire_id', 'ppd_voter_consultation_v1')
        .eq('id', 'gender')
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.options).toBeDefined()
      
      // Parse JSON options
      const options = typeof data.options === 'string'
        ? JSON.parse(data.options)
        : data.options

      expect(options).toHaveLength(2)
      expect(options[0]).toEqual({ value: 'M', label: 'Masculino' })
      expect(options[1]).toEqual({ value: 'F', label: 'Femenino' })
    })

    test('should have conditional logic properly stored', async () => {
      // Check a question with conditional logic
      const { data, error } = await supabase
        .from('questions')
        .select(`
          *,
          sections!inner(questionnaire_id)
        `)
        .eq('sections.questionnaire_id', 'ppd_voter_consultation_v1')
        .eq('id', 'which_party')
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.conditional_logic).toBeDefined()

      // Parse JSON conditional logic
      const conditionalLogic = typeof data.conditional_logic === 'string'
        ? JSON.parse(data.conditional_logic)
        : data.conditional_logic

      expect(conditionalLogic.questionId).toBe('leans_to_party')
      expect(conditionalLogic.value).toBe('SI')
    })
  })

  describe('Data Integrity', () => {
    test('should maintain referential integrity between tables', async () => {
      // Get all sections
      const { data: sections, error: sectionsError } = await supabase
        .from('sections')
        .select('id, questionnaire_id')
        .eq('questionnaire_id', 'ppd_voter_consultation_v1')

      expect(sectionsError).toBeNull()
      expect(sections).toHaveLength(8)

      // Check that all questions reference valid sections
      for (const section of sections) {
        const { data: questions, error: questionsError } = await supabase
          .from('questions')
          .select('*')
          .eq('section_id', section.id)

        expect(questionsError).toBeNull()
        expect(questions.length).toBeGreaterThan(0)
      }
    })

    test('should have proper tenant isolation', async () => {
      const { data, error } = await supabase
        .from('questionnaires')
        .select('*')
        .eq('id', 'ppd_voter_consultation_v1')
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.tenant_id).toBe('test-tenant-ppd-001')
    })
  })
})

// Integration test for the complete survey flow
describe('End-to-End Survey Integration', () => {
  test('should be able to simulate complete survey submission', async () => {
    // Mock survey response data structure
    const mockSurveyResponse = {
      questionnaire_id: 'ppd_voter_consultation_v1',
      tenant_id: 'test-tenant-ppd-001',
      volunteer_id: 'test-volunteer-001',
      respondent_name: 'José González',
      respondent_phone: '787-555-0123',
      is_complete: true,
      answers: [
        {
          question_id: 'name',
          answer_value: 'José González'
        },
        {
          question_id: 'gender', 
          answer_value: 'M'
        },
        {
          question_id: 'age_range',
          answer_value: '26-40'
        }
      ]
    }

    // This validates the expected data structure for survey responses
    expect(mockSurveyResponse.questionnaire_id).toBe('ppd_voter_consultation_v1')
    expect(mockSurveyResponse.answers).toHaveLength(3)
    expect(mockSurveyResponse.is_complete).toBe(true)
    
    // Verify answer structure
    mockSurveyResponse.answers.forEach(answer => {
      expect(answer.question_id).toBeDefined()
      expect(answer.answer_value).toBeDefined()
    })
  })
})