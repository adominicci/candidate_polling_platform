import { Question, Answer } from '@/types/survey'

// Spanish error messages
export const VALIDATION_MESSAGES = {
  required: 'Este campo es obligatorio',
  email: 'Ingrese un correo electrónico válido',
  phone: 'Formato requerido: 787-555-1234',
  minLength: (min: number) => `Mínimo ${min} caracteres`,
  maxLength: (max: number) => `Máximo ${max} caracteres`,
  minSelections: (min: number) => `Debe seleccionar al menos ${min} opciones`,
  maxSelections: (max: number) => `Puede seleccionar máximo ${max} opciones`,
  invalidDate: 'Ingrese una fecha válida',
  futureDate: 'La fecha no puede ser futura',
  invalidRange: (min: number, max: number) => `El valor debe estar entre ${min} y ${max}`,
  invalidFormat: 'Formato inválido'
} as const

export interface ValidationError {
  field: string
  message: string
}

export interface FormValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

// Email validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

// Phone validation regex for Puerto Rico (787-xxx-xxxx format)
const PHONE_REGEX = /^[0-9]{3}-[0-9]{3}-[0-9]{4}$/

// Validate individual field based on question configuration
export function validateField(question: Question, value: any): string | null {
  // Check if field is required
  if (question.required && (value === undefined || value === null || value === '' || 
      (Array.isArray(value) && value.length === 0))) {
    return VALIDATION_MESSAGES.required
  }

  // If field is empty and not required, skip validation
  if (!question.required && (value === undefined || value === null || value === '' || 
      (Array.isArray(value) && value.length === 0))) {
    return null
  }

  // Type-specific validations
  switch (question.type) {
    case 'email':
      if (typeof value === 'string' && !EMAIL_REGEX.test(value)) {
        return VALIDATION_MESSAGES.email
      }
      break

    case 'tel':
      if (typeof value === 'string' && !PHONE_REGEX.test(value)) {
        return VALIDATION_MESSAGES.phone
      }
      break

    case 'date':
      if (typeof value === 'string') {
        const date = new Date(value)
        if (isNaN(date.getTime())) {
          return VALIDATION_MESSAGES.invalidDate
        }
        // Check if date is in the future (for birth dates)
        if (question.id === 'birth_date' && date > new Date()) {
          return VALIDATION_MESSAGES.futureDate
        }
      }
      break

    case 'text':
    case 'textarea':
      if (typeof value === 'string') {
        // Check length constraints
        if (question.validation?.minLength && value.length < question.validation.minLength) {
          return VALIDATION_MESSAGES.minLength(question.validation.minLength)
        }
        if (question.validation?.maxLength && value.length > question.validation.maxLength) {
          return VALIDATION_MESSAGES.maxLength(question.validation.maxLength)
        }
      }
      break

    case 'scale':
      if (typeof value === 'number') {
        const min = question.min ?? 0
        const max = question.max ?? 10
        if (value < min || value > max) {
          return VALIDATION_MESSAGES.invalidRange(min, max)
        }
      }
      break

    case 'checkbox':
      if (Array.isArray(value)) {
        // Check selection constraints
        if (question.minSelections && value.length < question.minSelections) {
          return VALIDATION_MESSAGES.minSelections(question.minSelections)
        }
        if (question.maxSelections && value.length > question.maxSelections) {
          return VALIDATION_MESSAGES.maxSelections(question.maxSelections)
        }
      }
      break

    case 'radio':
      // Radio buttons are typically handled by the required check above
      break

    default:
      // Custom pattern validation for any type
      if (question.validation?.pattern && typeof value === 'string') {
        const regex = new RegExp(question.validation.pattern)
        if (!regex.test(value)) {
          return VALIDATION_MESSAGES.invalidFormat
        }
      }
      break
  }

  return null
}

// Validate form data for a specific section
export function validateSection(questions: Question[], answers: Record<string, any>, checkConditionals: boolean = true): FormValidationResult {
  const errors: Record<string, string> = {}
  
  for (const question of questions) {
    // Check if question should be shown based on conditional logic
    if (checkConditionals && question.conditional) {
      const conditionalValue = answers[question.conditional.questionId]
      if (conditionalValue !== question.conditional.value) {
        continue // Skip validation for hidden questions
      }
    }

    const value = answers[question.id]
    const error = validateField(question, value)
    
    if (error) {
      errors[question.id] = error
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

// Validate entire form
export function validateForm(sections: any[], answers: Record<string, any>): FormValidationResult {
  const errors: Record<string, string> = {}
  
  for (const section of sections) {
    const sectionResult = validateSection(section.questions, answers, true)
    Object.assign(errors, sectionResult.errors)
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

// Format phone number as user types (add dashes automatically)
export function formatPhoneNumber(value: string): string {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '')
  
  // Limit to 10 digits
  const limitedDigits = digits.substring(0, 10)
  
  // Format with dashes
  if (limitedDigits.length >= 7) {
    return `${limitedDigits.substring(0, 3)}-${limitedDigits.substring(3, 6)}-${limitedDigits.substring(6)}`
  } else if (limitedDigits.length >= 4) {
    return `${limitedDigits.substring(0, 3)}-${limitedDigits.substring(3)}`
  } else {
    return limitedDigits
  }
}

// Check if question should be visible based on conditional logic
export function shouldShowQuestion(question: Question, answers: Record<string, any>): boolean {
  if (!question.conditional) {
    return true
  }
  
  const conditionalValue = answers[question.conditional.questionId]
  return conditionalValue === question.conditional.value
}

// Get completion percentage for a section
export function getSectionCompletionPercentage(questions: Question[], answers: Record<string, any>): number {
  const visibleQuestions = questions.filter(q => shouldShowQuestion(q, answers))
  if (visibleQuestions.length === 0) return 100
  
  const answeredQuestions = visibleQuestions.filter(q => {
    const value = answers[q.id]
    return value !== undefined && value !== null && value !== '' && 
           (!Array.isArray(value) || value.length > 0)
  })
  
  return Math.round((answeredQuestions.length / visibleQuestions.length) * 100)
}

// Get overall form completion percentage
export function getFormCompletionPercentage(sections: any[], answers: Record<string, any>): number {
  if (sections.length === 0) return 0
  
  const sectionPercentages = sections.map(section => 
    getSectionCompletionPercentage(section.questions, answers)
  )
  
  return Math.round(sectionPercentages.reduce((sum, pct) => sum + pct, 0) / sections.length)
}