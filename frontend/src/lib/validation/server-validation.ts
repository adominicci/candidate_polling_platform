import { VALIDATION_MESSAGES } from './survey-validation'

export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string[]>
  warnings?: Record<string, string[]>
}

export interface QuestionnaireStructure {
  id: string
  tenant_id: string
  is_active: boolean
  sections: SectionStructure[]
}

export interface SectionStructure {
  id: string
  questions: QuestionStructure[]
}

export interface QuestionStructure {
  id: string
  text: string
  type: 'text' | 'radio' | 'checkbox' | 'scale' | 'date' | 'email' | 'tel' | 'textarea'
  is_required: boolean
  order_index: number
  options?: any
  validation_rules?: any
  conditional_logic?: any
}

export class SurveySubmissionValidator {
  private readonly EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  private readonly PHONE_REGEX = /^[0-9]{3}-[0-9]{3}-[0-9]{4}$/
  private readonly SQL_INJECTION_PATTERNS = [
    /('|(\-\-)|(;)|(\||\|)|(\*|\*))/i,
    /(exec|execute|sp_|xp_)/i,
    /(union|select|insert|delete|update|drop|create|alter)/i
  ]

  /**
   * Validate complete survey submission
   */
  async validateSurveySubmission(
    data: any,
    questionnaire: QuestionnaireStructure
  ): Promise<ValidationResult> {
    const errors: Record<string, string[]> = {}
    const warnings: Record<string, string[]> = {}

    // Validate basic structure
    if (!data.questionnaire_id || typeof data.questionnaire_id !== 'string') {
      errors.questionnaire_id = ['ID de cuestionario requerido y válido']
    }

    if (!data.respondent_name || typeof data.respondent_name !== 'string') {
      errors.respondent_name = ['Nombre del encuestado es requerido']
    } else if (data.respondent_name.trim().length < 2) {
      errors.respondent_name = ['El nombre debe tener al menos 2 caracteres']
    }

    // Validate optional email
    if (data.respondent_email && !this.EMAIL_REGEX.test(data.respondent_email)) {
      errors.respondent_email = [VALIDATION_MESSAGES.email]
    }

    // Validate optional phone
    if (data.respondent_phone && !this.PHONE_REGEX.test(data.respondent_phone)) {
      errors.respondent_phone = [VALIDATION_MESSAGES.phone]
    }

    // Validate metadata
    if (!data.metadata || typeof data.metadata !== 'object') {
      errors.metadata = ['Metadatos de la encuesta requeridos']
    } else {
      if (!data.metadata.start_time || !this.isValidISODate(data.metadata.start_time)) {
        errors['metadata.start_time'] = ['Tiempo de inicio requerido y válido']
      }

      if (data.metadata.completion_time && !this.isValidISODate(data.metadata.completion_time)) {
        errors['metadata.completion_time'] = ['Tiempo de finalización inválido']
      }

      if (!data.metadata.device_info || typeof data.metadata.device_info !== 'object') {
        errors['metadata.device_info'] = ['Información del dispositivo requerida']
      }
    }

    // Validate answers array
    if (!Array.isArray(data.answers)) {
      errors.answers = ['Las respuestas deben ser un array válido']
    } else {
      // Create question lookup for efficient validation
      const questionMap = this.createQuestionMap(questionnaire)
      const answerMap = new Map<string, any>(data.answers.map((a: any) => [a.question_id, a]))

      // Validate each question's answer
      for (const question of Object.values(questionMap)) {
        const answer = answerMap.get(question.id)
        const fieldKey = `answers.${question.id}`

        // Check conditional logic first
        if (question.conditional_logic && !this.shouldQuestionBeAnswered(question, answerMap)) {
          continue // Skip validation for conditionally hidden questions
        }

        // Validate required questions
        if (question.is_required && (!answer || this.isEmptyAnswer(answer?.answer_value))) {
          if (!data.is_draft) {
            errors[fieldKey] = ['Esta pregunta es obligatoria']
          } else {
            warnings[fieldKey] = ['Pregunta requerida pendiente']
          }
          continue
        }

        // Skip further validation if no answer provided for optional question
        if (!answer || this.isEmptyAnswer(answer?.answer_value)) {
          continue
        }

        // Validate answer format and content
        const answerValidation = this.validateQuestionAnswer(question, answer)
        if (!answerValidation.isValid) {
          errors[fieldKey] = answerValidation.errors
        }

        // Check for potential security issues
        const securityCheck = this.checkAnswerSecurity(answer)
        if (!securityCheck.isValid) {
          errors[fieldKey] = (errors[fieldKey] || []).concat(securityCheck.errors)
        }
      }

      // Check for orphaned answers (answers without corresponding questions)
      const orphanedAnswers = data.answers.filter((answer: any) => 
        !questionMap[answer.question_id]
      )
      
      if (orphanedAnswers.length > 0) {
        errors.orphaned_answers = [
          `Se encontraron ${orphanedAnswers.length} respuestas sin preguntas correspondientes`
        ]
      }
    }

    // Additional business rule validations
    const businessRuleValidation = this.validateBusinessRules(data, questionnaire)
    if (!businessRuleValidation.isValid) {
      Object.assign(errors, businessRuleValidation.errors)
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings: Object.keys(warnings).length > 0 ? warnings : undefined
    }
  }

  /**
   * Validate individual question answer
   */
  private validateQuestionAnswer(
    question: QuestionStructure,
    answer: any
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    const value = answer.answer_value

    switch (question.type) {
      case 'text':
      case 'textarea':
        if (typeof value !== 'string') {
          errors.push('Respuesta debe ser texto válido')
        } else {
          const rules = question.validation_rules
          if (rules) {
            if (rules.minLength && value.length < rules.minLength) {
              errors.push(VALIDATION_MESSAGES.minLength(rules.minLength))
            }
            if (rules.maxLength && value.length > rules.maxLength) {
              errors.push(VALIDATION_MESSAGES.maxLength(rules.maxLength))
            }
            if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
              errors.push(VALIDATION_MESSAGES.invalidFormat)
            }
          }
        }
        break

      case 'email':
        if (typeof value !== 'string' || !this.EMAIL_REGEX.test(value)) {
          errors.push(VALIDATION_MESSAGES.email)
        }
        break

      case 'tel':
        if (typeof value !== 'string' || !this.PHONE_REGEX.test(value)) {
          errors.push(VALIDATION_MESSAGES.phone)
        }
        break

      case 'date':
        if (typeof value !== 'string' || !this.isValidISODate(value)) {
          errors.push(VALIDATION_MESSAGES.invalidDate)
        } else {
          const date = new Date(value)
          // Check for future dates in birth date questions
          if (question.id?.includes('birth') && date > new Date()) {
            errors.push(VALIDATION_MESSAGES.futureDate)
          }
        }
        break

      case 'scale':
        if (typeof value !== 'number') {
          errors.push('Respuesta debe ser un número válido')
        } else {
          const min = question.validation_rules?.min ?? 0
          const max = question.validation_rules?.max ?? 10
          if (value < min || value > max) {
            errors.push(VALIDATION_MESSAGES.invalidRange(min, max))
          }
        }
        break

      case 'radio':
        if (typeof value !== 'string') {
          errors.push('Seleccione una opción válida')
        } else if (question.options) {
          const validOptions = question.options.map((opt: any) => opt.value)
          if (!validOptions.includes(value)) {
            errors.push('Opción seleccionada no es válida')
          }
        }
        break

      case 'checkbox':
        if (!Array.isArray(value)) {
          errors.push('Respuesta debe ser un array de selecciones')
        } else {
          const rules = question.validation_rules
          if (rules) {
            if (rules.minSelections && value.length < rules.minSelections) {
              errors.push(VALIDATION_MESSAGES.minSelections(rules.minSelections))
            }
            if (rules.maxSelections && value.length > rules.maxSelections) {
              errors.push(VALIDATION_MESSAGES.maxSelections(rules.maxSelections))
            }
          }
          
          if (question.options) {
            const validOptions = question.options.map((opt: any) => opt.value)
            const invalidSelections = value.filter(v => !validOptions.includes(v))
            if (invalidSelections.length > 0) {
              errors.push('Algunas selecciones no son válidas')
            }
          }
        }
        break
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Check for security issues in answer content
   */
  private checkAnswerSecurity(answer: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    const value = String(answer.answer_value)

    // Check for SQL injection patterns
    for (const pattern of this.SQL_INJECTION_PATTERNS) {
      if (pattern.test(value)) {
        errors.push('Contenido de respuesta contiene caracteres no permitidos')
        break
      }
    }

    // Check for excessive length (potential DoS)
    if (value.length > 10000) {
      errors.push('Respuesta excede la longitud máxima permitida')
    }

    // Check for potential XSS
    if (value.includes('<script') || value.includes('javascript:') || value.includes('onerror=')) {
      errors.push('Respuesta contiene contenido no permitido')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate business rules specific to the survey
   */
  private validateBusinessRules(
    data: any,
    questionnaire: QuestionnaireStructure
  ): { isValid: boolean; errors: Record<string, string[]> } {
    const errors: Record<string, string[]> = {}

    // Example: Age consistency check
    const birthDateAnswer = data.answers?.find((a: any) => a.question_id === 'birth_date')
    const ageRangeAnswer = data.answers?.find((a: any) => a.question_id === 'age_range')

    if (birthDateAnswer && ageRangeAnswer) {
      const birthDate = new Date(birthDateAnswer.answer_value)
      const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      const selectedRange = ageRangeAnswer.answer_value

      const rangeMatch = ({
        '18-25': age >= 18 && age <= 25,
        '26-40': age >= 26 && age <= 40,
        '41-55': age >= 41 && age <= 55,
        '56+': age >= 56
      } as Record<string, boolean>)[selectedRange as string]

      if (!rangeMatch) {
        errors['answers.age_consistency'] = [
          'La edad calculada no coincide con el rango seleccionado'
        ]
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  }

  /**
   * Create question map for efficient lookups
   */
  private createQuestionMap(questionnaire: QuestionnaireStructure): Record<string, QuestionStructure> {
    const questionMap: Record<string, QuestionStructure> = {}
    
    for (const section of questionnaire.sections) {
      for (const question of section.questions) {
        questionMap[question.id] = question
      }
    }
    
    return questionMap
  }

  /**
   * Check if question should be answered based on conditional logic
   */
  private shouldQuestionBeAnswered(
    question: QuestionStructure,
    answerMap: Map<string, any>
  ): boolean {
    if (!question.conditional_logic) {
      return true
    }

    const condition = question.conditional_logic
    const dependentAnswer = answerMap.get(condition.questionId)

    if (!dependentAnswer) {
      return false
    }

    return dependentAnswer.answer_value === condition.value
  }

  /**
   * Check if answer value is considered empty
   */
  private isEmptyAnswer(value: any): boolean {
    if (value === null || value === undefined || value === '') {
      return true
    }
    
    if (Array.isArray(value) && value.length === 0) {
      return true
    }
    
    return false
  }

  /**
   * Validate ISO date string
   */
  private isValidISODate(dateString: string): boolean {
    const date = new Date(dateString)
    return date instanceof Date && !isNaN(date.getTime()) && 
           date.toISOString() === dateString
  }

  /**
   * Calculate completion percentage for draft surveys
   */
  getCompletionPercentage(answers: any[], questionnaire: QuestionnaireStructure): number {
    const questionMap = this.createQuestionMap(questionnaire)
    const answerMap = new Map(answers.map(a => [a.question_id, a]))
    
    const totalQuestions = Object.keys(questionMap).length
    const answeredQuestions = answers.filter(answer => 
      !this.isEmptyAnswer(answer.answer_value)
    ).length
    
    return totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0
  }
}