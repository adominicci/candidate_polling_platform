import {
  validateField,
  validateSection,
  validateForm,
  formatPhoneNumber,
  shouldShowQuestion,
  getSectionCompletionPercentage,
  getFormCompletionPercentage,
  VALIDATION_MESSAGES
} from '../survey-validation'
import { Question, Section } from '@/types/survey'

describe('Survey Validation', () => {
  describe('validateField', () => {
    it('validates required fields', () => {
      const question: Question = {
        id: 'name',
        text: 'Nombre',
        type: 'text',
        required: true
      }
      
      expect(validateField(question, '')).toBe(VALIDATION_MESSAGES.required)
      expect(validateField(question, null)).toBe(VALIDATION_MESSAGES.required)
      expect(validateField(question, undefined)).toBe(VALIDATION_MESSAGES.required)
      expect(validateField(question, 'Juan')).toBeNull()
    })

    it('skips validation for non-required empty fields', () => {
      const question: Question = {
        id: 'email',
        text: 'Email',
        type: 'email',
        required: false
      }
      
      expect(validateField(question, '')).toBeNull()
      expect(validateField(question, null)).toBeNull()
      expect(validateField(question, undefined)).toBeNull()
    })

    it('validates email format', () => {
      const question: Question = {
        id: 'email',
        text: 'Email',
        type: 'email',
        required: true
      }
      
      expect(validateField(question, 'invalid-email')).toBe(VALIDATION_MESSAGES.email)
      expect(validateField(question, 'user@')).toBe(VALIDATION_MESSAGES.email)
      expect(validateField(question, '@domain.com')).toBe(VALIDATION_MESSAGES.email)
      expect(validateField(question, 'user@domain.com')).toBeNull()
    })

    it('validates phone format', () => {
      const question: Question = {
        id: 'phone',
        text: 'Teléfono',
        type: 'tel',
        required: true
      }
      
      expect(validateField(question, '1234567890')).toBe(VALIDATION_MESSAGES.phone)
      expect(validateField(question, '787-555-12345')).toBe(VALIDATION_MESSAGES.phone)
      expect(validateField(question, '787-555-1234')).toBeNull()
    })

    it('validates date fields', () => {
      const question: Question = {
        id: 'birth_date',
        text: 'Fecha de Nacimiento',
        type: 'date',
        required: true
      }
      
      expect(validateField(question, 'invalid-date')).toBe(VALIDATION_MESSAGES.invalidDate)
      expect(validateField(question, '2025-12-31')).toBe(VALIDATION_MESSAGES.futureDate)
      expect(validateField(question, '1990-05-15')).toBeNull()
    })

    it('validates text length constraints', () => {
      const question: Question = {
        id: 'comments',
        text: 'Comentarios',
        type: 'text',
        required: true,
        validation: {
          minLength: 5,
          maxLength: 100
        }
      }
      
      expect(validateField(question, 'Hi')).toBe(VALIDATION_MESSAGES.minLength(5))
      expect(validateField(question, 'a'.repeat(101))).toBe(VALIDATION_MESSAGES.maxLength(100))
      expect(validateField(question, 'Valid text here')).toBeNull()
    })

    it('validates scale ranges', () => {
      const question: Question = {
        id: 'rating',
        text: 'Rating',
        type: 'scale',
        required: true,
        min: 1,
        max: 5
      }
      
      expect(validateField(question, 0)).toBe(VALIDATION_MESSAGES.invalidRange(1, 5))
      expect(validateField(question, 6)).toBe(VALIDATION_MESSAGES.invalidRange(1, 5))
      expect(validateField(question, 3)).toBeNull()
    })

    it('validates checkbox selections', () => {
      const question: Question = {
        id: 'priorities',
        text: 'Prioridades',
        type: 'checkbox',
        required: true,
        minSelections: 2,
        maxSelections: 5
      }
      
      expect(validateField(question, ['option1'])).toBe(VALIDATION_MESSAGES.minSelections(2))
      expect(validateField(question, ['op1', 'op2', 'op3', 'op4', 'op5', 'op6']))
        .toBe(VALIDATION_MESSAGES.maxSelections(5))
      expect(validateField(question, ['option1', 'option2'])).toBeNull()
    })
  })

  describe('formatPhoneNumber', () => {
    it('formats phone numbers correctly', () => {
      expect(formatPhoneNumber('7875551234')).toBe('787-555-1234')
      expect(formatPhoneNumber('7875551')).toBe('787-555-1')
      expect(formatPhoneNumber('787555')).toBe('787-555')
      expect(formatPhoneNumber('787')).toBe('787')
      expect(formatPhoneNumber('78')).toBe('78')
    })

    it('handles non-digit characters', () => {
      expect(formatPhoneNumber('(787) 555-1234')).toBe('787-555-1234')
      expect(formatPhoneNumber('787.555.1234')).toBe('787-555-1234')
      expect(formatPhoneNumber('787 555 1234')).toBe('787-555-1234')
    })

    it('limits to 10 digits', () => {
      expect(formatPhoneNumber('78755512345678')).toBe('787-555-1234')
    })
  })

  describe('shouldShowQuestion', () => {
    it('shows questions without conditionals', () => {
      const question: Question = {
        id: 'name',
        text: 'Nombre',
        type: 'text',
        required: true
      }
      
      expect(shouldShowQuestion(question, {})).toBe(true)
    })

    it('shows/hides questions based on conditionals', () => {
      const question: Question = {
        id: 'which_party',
        text: 'Which party?',
        type: 'radio',
        required: false,
        conditional: {
          questionId: 'leans_to_party',
          value: 'SI'
        }
      }
      
      expect(shouldShowQuestion(question, { leans_to_party: 'SI' })).toBe(true)
      expect(shouldShowQuestion(question, { leans_to_party: 'NO' })).toBe(false)
      expect(shouldShowQuestion(question, {})).toBe(false)
    })
  })

  describe('validateSection', () => {
    const questions: Question[] = [
      {
        id: 'name',
        text: 'Nombre',
        type: 'text',
        required: true
      },
      {
        id: 'email',
        text: 'Email',
        type: 'email',
        required: false
      },
      {
        id: 'which_party',
        text: 'Which party?',
        type: 'radio',
        required: true,
        conditional: {
          questionId: 'leans_to_party',
          value: 'SI'
        }
      }
    ]

    it('validates all visible questions in section', () => {
      const answers = {
        name: '',
        email: 'invalid-email',
        leans_to_party: 'SI',
        which_party: ''
      }

      const result = validateSection(questions, answers, true)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.name).toBe(VALIDATION_MESSAGES.required)
      expect(result.errors.email).toBe(VALIDATION_MESSAGES.email)
      expect(result.errors.which_party).toBe(VALIDATION_MESSAGES.required)
    })

    it('skips validation for hidden conditional questions', () => {
      const answers = {
        name: 'Juan',
        leans_to_party: 'NO'
        // which_party is not answered but should be hidden
      }

      const result = validateSection(questions, answers, true)
      
      expect(result.isValid).toBe(true)
      expect(result.errors.which_party).toBeUndefined()
    })
  })

  describe('getSectionCompletionPercentage', () => {
    const questions: Question[] = [
      { id: 'q1', text: 'Q1', type: 'text', required: true },
      { id: 'q2', text: 'Q2', type: 'text', required: false },
      { id: 'q3', text: 'Q3', type: 'radio', required: true, conditional: { questionId: 'q1', value: 'yes' } }
    ]

    it('calculates completion percentage correctly', () => {
      const answers = { q1: 'yes', q2: 'answered' }
      
      // All questions: q1, q2, q3
      // q1 is visible and answered (conditional = none)
      // q2 is visible and answered (conditional = none)  
      // q3 is visible but not answered (conditional = q1 === 'yes')
      // So 2/3 = 67%
      expect(getSectionCompletionPercentage(questions, answers)).toBe(67)
    })

    it('returns 100% for fully completed section', () => {
      const answers = { q1: 'yes', q2: 'answered', q3: 'answered' }
      expect(getSectionCompletionPercentage(questions, answers)).toBe(100)
    })

    it('handles empty sections', () => {
      expect(getSectionCompletionPercentage([], {})).toBe(100)
    })
  })

  describe('getFormCompletionPercentage', () => {
    const sections = [
      {
        id: 'section1',
        title: 'Section 1',
        order: 1,
        questions: [
          { id: 'q1', text: 'Q1', type: 'text' as const, required: true }
        ]
      },
      {
        id: 'section2',
        title: 'Section 2',
        order: 2,
        questions: [
          { id: 'q2', text: 'Q2', type: 'text' as const, required: true },
          { id: 'q3', text: 'Q3', type: 'text' as const, required: true }
        ]
      }
    ]

    it('calculates overall form completion percentage', () => {
      const answers = { q1: 'answered', q2: 'answered' }
      
      // Section 1: 100% (1/1)
      // Section 2: 50% (1/2)
      // Overall: (100 + 50) / 2 = 75%
      expect(getFormCompletionPercentage(sections, answers)).toBe(75)
    })

    it('handles empty forms', () => {
      expect(getFormCompletionPercentage([], {})).toBe(0)
    })
  })
})