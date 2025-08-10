import validator from 'validator'

export interface SanitizedSurveyData {
  questionnaire_id: string
  answers: SanitizedAnswer[]
  metadata: SanitizedMetadata
  is_draft: boolean
  respondent_name: string
  respondent_email?: string
  respondent_phone?: string
  precinct_id?: string
}

export interface SanitizedAnswer {
  question_id: string
  answer_value: string | string[] | number
  answer_text?: string
  skipped: boolean
}

export interface SanitizedMetadata {
  start_time: string
  completion_time?: string
  device_info: any
  location?: any
}

export class InputSanitizer {
  private readonly MAX_STRING_LENGTH = 10000
  private readonly MAX_ARRAY_LENGTH = 100
  
  /**
   * Sanitize complete survey data submission
   */
  sanitizeSurveyData(data: any): SanitizedSurveyData {
    return {
      questionnaire_id: this.sanitizeString(data.questionnaire_id, 100),
      answers: this.sanitizeAnswers(data.answers || []),
      metadata: this.sanitizeMetadata(data.metadata || {}),
      is_draft: Boolean(data.is_draft),
      respondent_name: this.sanitizePersonName(data.respondent_name),
      respondent_email: data.respondent_email ? 
        this.sanitizeEmail(data.respondent_email) : undefined,
      respondent_phone: data.respondent_phone ? 
        this.sanitizePhoneNumber(data.respondent_phone) : undefined,
      precinct_id: data.precinct_id ? 
        this.sanitizeString(data.precinct_id, 100) : undefined
    }
  }

  /**
   * Sanitize array of survey answers
   */
  private sanitizeAnswers(answers: any[]): SanitizedAnswer[] {
    if (!Array.isArray(answers)) {
      return []
    }

    // Limit array size to prevent DoS
    const limitedAnswers = answers.slice(0, this.MAX_ARRAY_LENGTH)
    
    return limitedAnswers.map(answer => ({
      question_id: this.sanitizeString(answer.question_id, 100),
      answer_value: this.sanitizeAnswerValue(answer.answer_value),
      answer_text: answer.answer_text ? 
        this.sanitizeString(answer.answer_text, 1000) : undefined,
      skipped: Boolean(answer.skipped)
    }))
  }

  /**
   * Sanitize metadata object
   */
  private sanitizeMetadata(metadata: any): SanitizedMetadata {
    return {
      start_time: this.sanitizeISODate(metadata.start_time),
      completion_time: metadata.completion_time ? 
        this.sanitizeISODate(metadata.completion_time) : undefined,
      device_info: this.sanitizeDeviceInfo(metadata.device_info || {}),
      location: metadata.location ? 
        this.sanitizeLocation(metadata.location) : undefined
    }
  }

  /**
   * Sanitize answer value based on its type
   */
  private sanitizeAnswerValue(value: any): string | string[] | number {
    if (value === null || value === undefined) {
      return ''
    }

    if (Array.isArray(value)) {
      // Sanitize array of strings
      return value
        .slice(0, 50) // Limit array size
        .map(item => this.sanitizeString(String(item), 500))
        .filter(item => item.length > 0) // Remove empty strings
    }

    if (typeof value === 'number') {
      // Validate and sanitize numeric values
      if (isNaN(value) || !isFinite(value)) {
        return 0
      }
      // Limit range to reasonable values
      return Math.max(-999999, Math.min(999999, value))
    }

    // Handle string values
    return this.sanitizeString(String(value), this.MAX_STRING_LENGTH)
  }

  /**
   * Sanitize person name (remove unwanted characters, preserve accents)
   */
  private sanitizePersonName(name: any): string {
    if (typeof name !== 'string') {
      return ''
    }

    // Remove potentially dangerous characters but preserve Spanish characters
    const sanitized = name
      .replace(/[<>"'`]/g, '') // Remove HTML/script chars
      .replace(/[\r\n\t]/g, ' ') // Replace newlines with spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()

    // Limit length
    return sanitized.substring(0, 100)
  }

  /**
   * Sanitize email address
   */
  private sanitizeEmail(email: any): string {
    if (typeof email !== 'string') {
      return ''
    }

    const sanitized = email.toLowerCase().trim()
    
    // Validate email format
    if (!validator.isEmail(sanitized)) {
      return ''
    }

    return sanitized.substring(0, 255)
  }

  /**
   * Sanitize phone number (Puerto Rico format)
   */
  private sanitizePhoneNumber(phone: any): string {
    if (typeof phone !== 'string') {
      return ''
    }

    // Remove all non-digits first
    const digits = phone.replace(/\D/g, '')
    
    // Format as XXX-XXX-XXXX if we have 10 digits
    if (digits.length === 10) {
      return `${digits.substring(0, 3)}-${digits.substring(3, 6)}-${digits.substring(6)}`
    }
    
    return '' // Invalid phone number
  }

  /**
   * Sanitize ISO date string
   */
  private sanitizeISODate(dateString: any): string {
    if (typeof dateString !== 'string') {
      return new Date().toISOString()
    }

    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return new Date().toISOString()
      }
      return date.toISOString()
    } catch {
      return new Date().toISOString()
    }
  }

  /**
   * Sanitize device info object
   */
  private sanitizeDeviceInfo(deviceInfo: any): any {
    if (typeof deviceInfo !== 'object' || deviceInfo === null) {
      return {}
    }

    return {
      user_agent: this.sanitizeString(deviceInfo.user_agent, 500),
      screen_size: this.sanitizeString(deviceInfo.screen_size, 50),
      connection_type: this.sanitizeString(deviceInfo.connection_type, 50),
      platform: this.sanitizeString(deviceInfo.platform, 50)
    }
  }

  /**
   * Sanitize location object
   */
  private sanitizeLocation(location: any): any {
    if (typeof location !== 'object' || location === null) {
      return null
    }

    const lat = parseFloat(location.latitude)
    const lng = parseFloat(location.longitude)
    const acc = location.accuracy ? parseFloat(location.accuracy) : undefined

    // Validate coordinates are reasonable (Puerto Rico bounds)
    if (isNaN(lat) || isNaN(lng) || 
        lat < 17.5 || lat > 18.8 || 
        lng < -67.5 || lng > -65.0) {
      return null
    }

    return {
      latitude: lat,
      longitude: lng,
      accuracy: acc && !isNaN(acc) ? Math.min(acc, 10000) : undefined
    }
  }

  /**
   * Generic string sanitizer
   */
  private sanitizeString(input: any, maxLength: number = this.MAX_STRING_LENGTH): string {
    if (typeof input !== 'string') {
      return ''
    }

    // Remove null bytes and control characters (except newlines/tabs for textarea)
    let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    
    // Escape HTML entities to prevent XSS
    sanitized = validator.escape(sanitized)
    
    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim()
    
    // Limit length
    return sanitized.substring(0, maxLength)
  }

  /**
   * Check if input contains potential SQL injection
   */
  private containsSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /('|(\-\-)|(;)|(\||\|)|(\*|\*))/i,
      /((union(\s+(all|distinct))?)|(insert|delete|update|drop|create|alter)|(exec(ute)?\s))/i,
      /(script|javascript|vbscript|onload|onerror|onclick)/i
    ]
    
    return sqlPatterns.some(pattern => pattern.test(input))
  }

  /**
   * Get sanitization stats for monitoring
   */
  getSanitizationStats(original: any, sanitized: any): {
    originalSize: number
    sanitizedSize: number
    reductionPercent: number
  } {
    const originalStr = JSON.stringify(original)
    const sanitizedStr = JSON.stringify(sanitized)
    
    const originalSize = originalStr.length
    const sanitizedSize = sanitizedStr.length
    const reductionPercent = originalSize > 0 ? 
      Math.round(((originalSize - sanitizedSize) / originalSize) * 100) : 0
    
    return {
      originalSize,
      sanitizedSize,
      reductionPercent
    }
  }
}