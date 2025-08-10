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
  private readonly ELECTORAL_NUMBER_REGEX = /^[A-Z0-9]{10,15}$/i
  private readonly SQL_INJECTION_PATTERNS = [
    /('|(\-\-)|(;)|(\||\|)|(\*|\*))/i,
    /(exec|execute|sp_|xp_)/i,
    /(union|select|insert|delete|update|drop|create|alter)/i,
    /(<script|javascript:|onerror=|onload=)/i
  ]
  
  // PPD-specific validation rules
  private readonly PPD_SURVEY_RULES = {
    AGE_RANGES: ['18-25', '26-40', '41-55', '56+'],
    POLITICAL_PARTIES: ['NO_APLICA', 'PPD', 'PNP', 'PIP', 'MVC', 'PD'],
    VOTING_STYLES: ['integro', 'candidatura'],
    VOTING_MODALITIES: ['presencial', 'correo', 'domicilio'],
    YES_NO_OPTIONS: ['SI', 'NO'],
    VOTING_HISTORY_OPTIONS: ['SI', 'NO', 'NO_RECUERDO'],
    INTENTION_OPTIONS: ['SI', 'NO', 'TAL_VEZ'],
    PRIORITY_OPTIONS: [
      'salud', 'educacion', 'seguridad', 'desarrollo_economico', 'estatus_politico',
      'deuda_pr', 'costo_energia', 'costo_aaa', 'costo_vida', 'recuperacion_desastres',
      'anti_corrupcion', 'empleos', 'vivienda'
    ]
  }

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
   * Validate individual question answer with PPD-specific rules
   */
  private validateQuestionAnswer(
    question: QuestionStructure,
    answer: any
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    const value = answer.answer_value
    const questionId = question.id

    // First, apply generic type-based validation
    switch (question.type) {
      case 'text':
        if (typeof value !== 'string') {
          errors.push('Respuesta debe ser texto válido')
        } else {
          const trimmedValue = value.trim()
          const rules = question.validation_rules
          
          if (rules) {
            if (rules.minLength && trimmedValue.length < rules.minLength) {
              errors.push(VALIDATION_MESSAGES.minLength(rules.minLength))
            }
            if (rules.maxLength && trimmedValue.length > rules.maxLength) {
              errors.push(VALIDATION_MESSAGES.maxLength(rules.maxLength))
            }
            if (rules.pattern && !new RegExp(rules.pattern).test(trimmedValue)) {
              errors.push(VALIDATION_MESSAGES.invalidFormat)
            }
          }
          
          // Question-specific text validations
          const textValidation = this.validateSpecificTextFields(questionId, trimmedValue)
          errors.push(...textValidation)
        }
        break

      case 'textarea':
        if (typeof value !== 'string') {
          errors.push('Respuesta debe ser texto válido')
        } else {
          const trimmedValue = value.trim()
          const maxLength = question.validation_rules?.maxLength || 1000
          
          if (trimmedValue.length > maxLength) {
            errors.push(VALIDATION_MESSAGES.maxLength(maxLength))
          }
          
          // Check for minimum meaningful content for required textareas
          if (question.is_required && trimmedValue.length < 10) {
            errors.push('Proporcione una respuesta más detallada (mínimo 10 caracteres)')
          }
        }
        break

      case 'email':
        if (typeof value !== 'string' || !this.EMAIL_REGEX.test(value.trim())) {
          errors.push(VALIDATION_MESSAGES.email)
        }
        break

      case 'tel':
        if (typeof value !== 'string') {
          errors.push('Número de teléfono debe ser texto válido')
        } else {
          const cleanPhone = value.replace(/\s+/g, '')
          if (!this.PHONE_REGEX.test(cleanPhone)) {
            errors.push('Formato de teléfono inválido. Use: ###-###-####')
          }
        }
        break

      case 'date':
        if (typeof value !== 'string') {
          errors.push('Fecha debe ser texto válido')
        } else {
          if (!this.isValidISODate(value) && !this.isValidDateString(value)) {
            errors.push(VALIDATION_MESSAGES.invalidDate)
          } else {
            const date = new Date(value)
            const dateValidation = this.validateSpecificDates(questionId, date)
            errors.push(...dateValidation)
          }
        }
        break

      case 'scale':
        if (typeof value !== 'number' && typeof value !== 'string') {
          errors.push('Respuesta debe ser un número válido')
        } else {
          const numValue = typeof value === 'string' ? parseInt(value, 10) : value
          if (isNaN(numValue)) {
            errors.push('Respuesta debe ser un número válido')
          } else {
            const scaleValidation = this.validateScaleQuestion(questionId, numValue, question)
            errors.push(...scaleValidation)
          }
        }
        break

      case 'radio':
        if (typeof value !== 'string') {
          errors.push('Seleccione una opción válida')
        } else {
          const radioValidation = this.validateRadioQuestion(questionId, value, question)
          errors.push(...radioValidation)
        }
        break

      case 'checkbox':
        if (!Array.isArray(value)) {
          errors.push('Respuesta debe ser un array de selecciones')
        } else {
          const checkboxValidation = this.validateCheckboxQuestion(questionId, value, question)
          errors.push(...checkboxValidation)
        }
        break

      default:
        errors.push(`Tipo de pregunta no soportado: ${question.type}`)
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate specific text fields with custom rules
   */
  private validateSpecificTextFields(questionId: string, value: string): string[] {
    const errors: string[] = []
    
    switch (questionId) {
      case 'name':
        if (value.length < 2) {
          errors.push('El nombre debe tener al menos 2 caracteres')
        }
        if (!/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s.'-]+$/.test(value)) {
          errors.push('El nombre solo puede contener letras, espacios, puntos, guiones y apostrofes')
        }
        if (value.length > 100) {
          errors.push('El nombre no puede exceder 100 caracteres')
        }
        break
        
      case 'residential_address':
      case 'postal_address':
        if (value.length > 200) {
          errors.push('La dirección no puede exceder 200 caracteres')
        }
        break
        
      case 'electoral_number':
        if (value && !this.ELECTORAL_NUMBER_REGEX.test(value)) {
          errors.push('Número electoral inválido. Debe contener 10-15 caracteres alfanuméricos')
        }
        break
        
      case 'precinct':
        if (!/^\d{1,3}$/.test(value)) {
          errors.push('El precinto debe ser un número de 1 a 3 dígitos')
        }
        break
        
      case 'unit':
        if (value && !/^[A-Z0-9\-]{1,10}$/i.test(value)) {
          errors.push('La unidad debe contener solo letras, números y guiones (máximo 10 caracteres)')
        }
        break
        
      case 'voting_location':
        if (value.length > 150) {
          errors.push('El lugar de votación no puede exceder 150 caracteres')
        }
        break
        
      case 'other_priorities':
        if (value.length > 500) {
          errors.push('Otras prioridades no puede exceder 500 caracteres')
        }
        break
    }
    
    return errors
  }

  /**
   * Validate date fields with specific business rules
   */
  private validateSpecificDates(questionId: string, date: Date): string[] {
    const errors: string[] = []
    const now = new Date()
    
    switch (questionId) {
      case 'birth_date':
        // Must be in the past
        if (date >= now) {
          errors.push('La fecha de nacimiento debe ser anterior a hoy')
        }
        
        // Must be reasonable (not more than 120 years ago)
        const age = now.getFullYear() - date.getFullYear()
        if (age > 120) {
          errors.push('La fecha de nacimiento no puede ser más de 120 años atrás')
        }
        
        // Must be at least 18 years old to vote
        if (age < 18) {
          errors.push('Debe tener al menos 18 años para participar en la encuesta')
        }
        break
    }
    
    return errors
  }

  /**
   * Validate scale questions with specific ranges
   */
  private validateScaleQuestion(questionId: string, value: number, question: QuestionStructure): string[] {
    const errors: string[] = []
    
    switch (questionId) {
      case 'family_voters_count':
        if (value < 0 || value > 10) {
          errors.push('El número de votantes en la familia debe estar entre 0 y 10')
        }
        if (!Number.isInteger(value)) {
          errors.push('El número de votantes debe ser un número entero')
        }
        break
        
      default:
        // Generic scale validation
        const min = question.validation_rules?.min ?? 0
        const max = question.validation_rules?.max ?? 10
        if (value < min || value > max) {
          errors.push(VALIDATION_MESSAGES.invalidRange(min, max))
        }
    }
    
    return errors
  }

  /**
   * Validate radio button questions with PPD-specific options
   */
  private validateRadioQuestion(questionId: string, value: string, question: QuestionStructure): string[] {
    const errors: string[] = []
    
    // First check if the value is in the question's options
    if (question.options) {
      const validOptions = question.options.map((opt: any) => opt.value)
      if (!validOptions.includes(value)) {
        errors.push('Opción seleccionada no es válida para esta pregunta')
        return errors
      }
    }
    
    // Then apply specific validation rules per question
    switch (questionId) {
      case 'gender':
        if (!['M', 'F'].includes(value)) {
          errors.push('Género debe ser Masculino (M) o Femenino (F)')
        }
        break
        
      case 'age_range':
        if (!this.PPD_SURVEY_RULES.AGE_RANGES.includes(value)) {
          errors.push('Rango de edad no válido')
        }
        break
        
      case 'voted_2016':
      case 'voted_2020':
      case 'voted_2024':
        if (!this.PPD_SURVEY_RULES.VOTING_HISTORY_OPTIONS.includes(value)) {
          errors.push('Opción de historial de votación no válida')
        }
        break
        
      case 'intention_2028':
        if (!this.PPD_SURVEY_RULES.INTENTION_OPTIONS.includes(value)) {
          errors.push('Intención de voto no válida')
        }
        break
        
      case 'voting_modality':
        if (!this.PPD_SURVEY_RULES.VOTING_MODALITIES.includes(value)) {
          errors.push('Modalidad de voto no válida')
        }
        break
        
      case 'has_transportation':
      case 'needs_transportation':
      case 'interested_mail_voting':
      case 'interested_home_voting':
      case 'family_in_usa':
      case 'leans_to_party':
      case 'ppd_chances_2028':
        if (!this.PPD_SURVEY_RULES.YES_NO_OPTIONS.includes(value)) {
          errors.push('Respuesta debe ser SÍ o NO')
        }
        break
        
      case 'which_party':
        if (!this.PPD_SURVEY_RULES.POLITICAL_PARTIES.includes(value)) {
          errors.push('Partido político no válido')
        }
        break
        
      case 'voting_style':
        if (!this.PPD_SURVEY_RULES.VOTING_STYLES.includes(value)) {
          errors.push('Estilo de votación no válido')
        }
        break
    }
    
    return errors
  }

  /**
   * Validate checkbox questions with selection limits
   */
  private validateCheckboxQuestion(questionId: string, values: any[], question: QuestionStructure): string[] {
    const errors: string[] = []
    
    // Check if all values are valid options
    if (question.options) {
      const validOptions = question.options.map((opt: any) => opt.value)
      const invalidSelections = values.filter(v => !validOptions.includes(v))
      if (invalidSelections.length > 0) {
        errors.push(`Selecciones no válidas: ${invalidSelections.join(', ')}`)
      }
    }
    
    // Apply specific validation rules per question
    switch (questionId) {
      case 'top_5_priorities':
        if (values.length < 1) {
          errors.push('Debe seleccionar al menos una prioridad')
        }
        if (values.length > 5) {
          errors.push('No puede seleccionar más de 5 prioridades')
        }
        // Check if all selected priorities are from the valid list
        const invalidPriorities = values.filter(v => !this.PPD_SURVEY_RULES.PRIORITY_OPTIONS.includes(v))
        if (invalidPriorities.length > 0) {
          errors.push(`Prioridades no válidas: ${invalidPriorities.join(', ')}`)
        }
        break
        
      default:
        // Generic checkbox validation
        const rules = question.validation_rules
        if (rules) {
          if (rules.minSelections && values.length < rules.minSelections) {
            errors.push(VALIDATION_MESSAGES.minSelections(rules.minSelections))
          }
          if (rules.maxSelections && values.length > rules.maxSelections) {
            errors.push(VALIDATION_MESSAGES.maxSelections(rules.maxSelections))
          }
        }
    }
    
    return errors
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
   * Validate business rules specific to the PPD survey
   */
  private validateBusinessRules(
    data: any,
    questionnaire: QuestionnaireStructure
  ): { isValid: boolean; errors: Record<string, string[]> } {
    const errors: Record<string, string[]> = {}
    const answers = data.answers || []
    const answerMap = new Map(answers.map((a: any) => [a.question_id, a.answer_value]))

    // 1. Age consistency check between birth_date and age_range
    this.validateAgeConsistency(answerMap, errors)
    
    // 2. Political affiliation conditional logic
    this.validatePoliticalAffiliationLogic(answerMap, errors)
    
    // 3. Transportation logic consistency
    this.validateTransportationLogic(answerMap, errors)
    
    // 4. Voting history consistency
    this.validateVotingHistoryConsistency(answerMap, errors)
    
    // 5. Priority selection validation
    this.validatePrioritySelections(answerMap, errors)
    
    // 6. Contact information completeness
    this.validateContactCompleteness(answerMap, errors)

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  }
  
  /**
   * Validate age consistency between birth date and age range
   */
  private validateAgeConsistency(answerMap: Map<string, any>, errors: Record<string, string[]>): void {
    const birthDateValue = answerMap.get('birth_date')
    const ageRangeValue = answerMap.get('age_range')

    if (birthDateValue && ageRangeValue) {
      const birthDate = new Date(birthDateValue)
      const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      
      const expectedRanges: Record<string, (age: number) => boolean> = {
        '18-25': (age) => age >= 18 && age <= 25,
        '26-40': (age) => age >= 26 && age <= 40,
        '41-55': (age) => age >= 41 && age <= 55,
        '56+': (age) => age >= 56
      }

      const checkRange = expectedRanges[ageRangeValue as string]
      if (checkRange && !checkRange(age)) {
        errors['business_rules.age_consistency'] = [
          `La edad calculada (${age} años) no coincide con el rango seleccionado (${ageRangeValue})`
        ]
      }
    }
  }
  
  /**
   * Validate political affiliation conditional logic
   */
  private validatePoliticalAffiliationLogic(answerMap: Map<string, any>, errors: Record<string, string[]>): void {
    const leansToParty = answerMap.get('leans_to_party')
    const whichParty = answerMap.get('which_party')

    if (leansToParty === 'SI' && (!whichParty || whichParty === 'NO_APLICA')) {
      errors['business_rules.political_affiliation'] = [
        'Si se inclina hacia un partido, debe especificar cuál partido'
      ]
    }
    
    if (leansToParty === 'NO' && whichParty && whichParty !== 'NO_APLICA') {
      errors['business_rules.political_affiliation'] = [
        'Si no se inclina hacia ningún partido, no debe especificar un partido específico'
      ]
    }
  }
  
  /**
   * Validate transportation logic consistency
   */
  private validateTransportationLogic(answerMap: Map<string, any>, errors: Record<string, string[]>): void {
    const hasTransportation = answerMap.get('has_transportation')
    const needsTransportation = answerMap.get('needs_transportation')
    const votingModality = answerMap.get('voting_modality')

    // If has transportation = YES, then needs transportation should be NO (usually)
    if (hasTransportation === 'SI' && needsTransportation === 'SI') {
      // This might be valid in some cases, but flag as warning
      if (!errors['business_rules.transportation_warning']) {
        errors['business_rules.transportation_warning'] = []
      }
      errors['business_rules.transportation_warning'].push(
        'Tiene transportación pero indica que necesita transportación. Verifique la respuesta.'
      )
    }
    
    // If voting modality is not presencial, transportation questions might not be relevant
    if (votingModality && votingModality !== 'presencial') {
      if (needsTransportation === 'SI') {
        if (!errors['business_rules.transportation_warning']) {
          errors['business_rules.transportation_warning'] = []
        }
        errors['business_rules.transportation_warning'].push(
          `Modalidad de voto es '${votingModality}' pero indica que necesita transportación para votar presencial.`
        )
      }
    }
  }
  
  /**
   * Validate voting history consistency
   */
  private validateVotingHistoryConsistency(answerMap: Map<string, any>, errors: Record<string, string[]>): void {
    const voted2016 = answerMap.get('voted_2016')
    const voted2020 = answerMap.get('voted_2020')
    const voted2024 = answerMap.get('voted_2024')
    const intention2028 = answerMap.get('intention_2028')
    const birthDate = answerMap.get('birth_date')

    // Check if person was eligible to vote in each election
    if (birthDate) {
      const birth = new Date(birthDate)
      const age2016 = 2016 - birth.getFullYear()
      const age2020 = 2020 - birth.getFullYear()
      const age2024 = 2024 - birth.getFullYear()
      
      if (age2016 < 18 && voted2016 === 'SI') {
        errors['business_rules.voting_eligibility'] = [
          'No era elegible para votar en 2016 (menor de 18 años) pero indicó que votó'
        ]
      }
      
      if (age2020 < 18 && voted2020 === 'SI') {
        errors['business_rules.voting_eligibility'] = [
          'No era elegible para votar en 2020 (menor de 18 años) pero indicó que votó'
        ]
      }
      
      if (age2024 < 18 && voted2024 === 'SI') {
        errors['business_rules.voting_eligibility'] = [
          'No era elegible para votar en 2024 (menor de 18 años) pero indicó que votó'
        ]
      }
    }
    
    // Pattern analysis: if never voted before, question why intention is YES for 2028
    if (voted2016 === 'NO' && voted2020 === 'NO' && voted2024 === 'NO' && intention2028 === 'SI') {
      if (!errors['business_rules.voting_pattern_warning']) {
        errors['business_rules.voting_pattern_warning'] = []
      }
      errors['business_rules.voting_pattern_warning'].push(
        'No ha votado en elecciones anteriores pero tiene intención de votar en 2028. Considerar seguimiento.'
      )
    }
  }
  
  /**
   * Validate priority selections make sense
   */
  private validatePrioritySelections(answerMap: Map<string, any>, errors: Record<string, string[]>): void {
    const priorities = answerMap.get('top_5_priorities')
    const otherPriorities = answerMap.get('other_priorities')
    
    if (Array.isArray(priorities)) {
      // Check for duplicate selections (shouldn't happen with checkboxes, but validate anyway)
      const uniquePriorities = new Set(priorities)
      if (uniquePriorities.size !== priorities.length) {
        errors['business_rules.priority_duplicates'] = [
          'Se detectaron prioridades duplicadas en la selección'
        ]
      }
      
      // If "other" is specified as text but not selected in checkboxes
      if (otherPriorities && otherPriorities.trim().length > 0) {
        // This is actually fine - they can specify other priorities in text
        // without having a separate "Other" checkbox option
      }
    }
  }
  
  /**
   * Validate contact information completeness
   */
  private validateContactCompleteness(answerMap: Map<string, any>, errors: Record<string, string[]>): void {
    const email = answerMap.get('email')
    const phone = answerMap.get('phone')
    const postalAddress = answerMap.get('postal_address')
    const residentialAddress = answerMap.get('residential_address')
    
    // Ensure at least one contact method is provided
    if (!email && !phone) {
      if (!errors['business_rules.contact_warning']) {
        errors['business_rules.contact_warning'] = []
      }
      errors['business_rules.contact_warning'].push(
        'Se recomienda proporcionar al menos un método de contacto (email o teléfono)'
      )
    }
    
    // If no postal address, ensure residential address is complete
    if (!postalAddress && residentialAddress) {
      if (residentialAddress.trim().length < 10) {
        if (!errors['business_rules.address_warning']) {
          errors['business_rules.address_warning'] = []
        }
        errors['business_rules.address_warning'].push(
          'La dirección residencial parece incompleta. Proporcione una dirección más detallada.'
        )
      }
    }
  }
  
  /**
   * Check if a date string is valid (supports multiple formats)
   */
  private isValidDateString(dateString: string): boolean {
    // Support common date formats: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY
    const formats = [
      /^\d{4}-\d{2}-\d{2}$/, // ISO format
      /^\d{1,2}\/\d{1,2}\/\d{4}$/, // MM/DD/YYYY or M/D/YYYY
      /^\d{1,2}-\d{1,2}-\d{4}$/ // MM-DD-YYYY or M-D-YYYY
    ]
    
    const isFormatValid = formats.some(format => format.test(dateString))
    if (!isFormatValid) return false
    
    const date = new Date(dateString)
    return !isNaN(date.getTime())
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
   * Enhanced to support multiple conditions and complex logic
   */
  private shouldQuestionBeAnswered(
    question: QuestionStructure,
    answerMap: Map<string, any>
  ): boolean {
    if (!question.conditional_logic) {
      return true
    }

    const condition = question.conditional_logic
    
    // Support for multiple conditions (future enhancement)
    if (Array.isArray(condition)) {
      // For now, treat as AND logic - all conditions must be met
      return condition.every(cond => {
        const dependentAnswer = answerMap.get(cond.questionId)
        return dependentAnswer && dependentAnswer.answer_value === cond.value
      })
    }
    
    // Single condition logic
    const dependentAnswer = answerMap.get(condition.questionId)
    if (!dependentAnswer) {
      return false
    }

    // Support different condition types
    const dependentValue = dependentAnswer.answer_value
    
    if (condition.operator) {
      switch (condition.operator) {
        case 'equals':
          return dependentValue === condition.value
        case 'not_equals':
          return dependentValue !== condition.value
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(dependentValue)
        case 'not_in':
          return Array.isArray(condition.value) && !condition.value.includes(dependentValue)
        default:
          return dependentValue === condition.value
      }
    }
    
    // Default: simple equality check
    return dependentValue === condition.value
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
   * Takes into account conditional questions and required vs optional questions
   */
  getCompletionPercentage(answers: any[], questionnaire: QuestionnaireStructure): number {
    const questionMap = this.createQuestionMap(questionnaire)
    const answerMap = new Map(answers.map(a => [a.question_id, a]))
    
    let totalApplicableQuestions = 0
    let answeredQuestions = 0
    let requiredAnswered = 0
    let totalRequired = 0
    
    for (const question of Object.values(questionMap)) {
      // Check if this question should be answered based on conditional logic
      if (this.shouldQuestionBeAnswered(question, answerMap)) {
        totalApplicableQuestions++
        
        if (question.is_required) {
          totalRequired++
        }
        
        const answer = answerMap.get(question.id)
        if (answer && !this.isEmptyAnswer(answer.answer_value)) {
          answeredQuestions++
          
          if (question.is_required) {
            requiredAnswered++
          }
        }
      }
    }
    
    if (totalApplicableQuestions === 0) return 0
    
    // Weight required questions more heavily
    const requiredWeight = 0.7
    const optionalWeight = 0.3
    
    const requiredPercentage = totalRequired > 0 ? (requiredAnswered / totalRequired) : 1
    const optionalPercentage = totalApplicableQuestions > totalRequired ? 
      ((answeredQuestions - requiredAnswered) / (totalApplicableQuestions - totalRequired)) : 1
    
    const weightedPercentage = (requiredPercentage * requiredWeight) + (optionalPercentage * optionalWeight)
    
    return Math.round(weightedPercentage * 100)
  }
  
  /**
   * Get detailed validation summary for analytics
   */
  getValidationSummary(answers: any[], questionnaire: QuestionnaireStructure): {
    totalQuestions: number
    applicableQuestions: number
    answeredQuestions: number
    requiredQuestions: number
    requiredAnswered: number
    completionPercentage: number
    missingRequired: string[]
    conditionalQuestions: string[]
  } {
    const questionMap = this.createQuestionMap(questionnaire)
    const answerMap = new Map(answers.map(a => [a.question_id, a]))
    
    let totalQuestions = Object.keys(questionMap).length
    let applicableQuestions = 0
    let answeredQuestions = 0
    let requiredQuestions = 0
    let requiredAnswered = 0
    const missingRequired: string[] = []
    const conditionalQuestions: string[] = []
    
    for (const question of Object.values(questionMap)) {
      if (question.conditional_logic) {
        conditionalQuestions.push(question.id)
      }
      
      if (this.shouldQuestionBeAnswered(question, answerMap)) {
        applicableQuestions++
        
        if (question.is_required) {
          requiredQuestions++
          
          const answer = answerMap.get(question.id)
          if (!answer || this.isEmptyAnswer(answer.answer_value)) {
            missingRequired.push(question.id)
          } else {
            requiredAnswered++
          }
        }
        
        const answer = answerMap.get(question.id)
        if (answer && !this.isEmptyAnswer(answer.answer_value)) {
          answeredQuestions++
        }
      }
    }
    
    return {
      totalQuestions,
      applicableQuestions,
      answeredQuestions,
      requiredQuestions,
      requiredAnswered,
      completionPercentage: this.getCompletionPercentage(answers, questionnaire),
      missingRequired,
      conditionalQuestions
    }
  }
}