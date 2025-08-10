import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SurveySubmissionValidator } from '@/lib/validation/server-validation'
import { RateLimiter } from '@/lib/security/rate-limiter'
import { InputSanitizer } from '@/lib/security/input-sanitizer'
import { SurveyAnalytics } from '@/lib/analytics/survey-analytics'
import { Logger } from '@/lib/monitoring/logger'
import { networkResilience } from '@/lib/api/network-resilience'

// Rate limiter for survey submissions
const rateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 submissions per window
  keyGenerator: (req) => req.ip || 'unknown'
})

const validator = new SurveySubmissionValidator()
const sanitizer = new InputSanitizer()
const analytics = new SurveyAnalytics()
const logger = new Logger('survey-api')

interface CreateSurveyResponseRequest {
  questionnaire_id: string
  answers: SurveyAnswer[]
  metadata: {
    start_time: string
    completion_time?: string
    device_info: DeviceInfo
    location?: GeoLocation
  }
  is_draft: boolean
  respondent_name: string
  respondent_email?: string
  respondent_phone?: string
  precinct_id?: string
}

interface SurveyAnswer {
  question_id: string
  answer_value: string | string[] | number
  answer_text?: string
  skipped: boolean
}

interface DeviceInfo {
  user_agent: string
  screen_size: string
  connection_type?: string
}

interface GeoLocation {
  latitude: number
  longitude: number
  accuracy?: number
}

// POST /api/surveys/responses - Create new survey response
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = `survey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  let responseId: string | null = null
  let retryAttempt = 0
  
  try {
    // Log request start
    logger.info('Survey submission request started', {
      requestId,
      ip: request.ip,
      userAgent: request.headers.get('user-agent')?.substring(0, 100)
    })
    // Apply rate limiting with enhanced logging
    const rateLimitResult = await rateLimiter.checkLimit(request)
    if (!rateLimitResult.success) {
      const rateLimitError = {
        requestId,
        ip: request.ip,
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime,
        windowMs: rateLimiter.windowMs
      }
      
      logger.warn('Rate limit exceeded for survey submission', rateLimitError)
      
      // Track rate limiting in analytics
      analytics.trackRateLimit({
        request_id: requestId,
        ip: request.ip || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        reset_time: rateLimitResult.resetTime
      })
      
      return NextResponse.json(
        { 
          error: 'Demasiadas solicitudes. Por favor, espere antes de enviar otra encuesta.',
          code: 'RATE_LIMIT_EXCEEDED',
          request_id: requestId,
          details: {
            resetTime: rateLimitResult.resetTime,
            remaining: rateLimitResult.remaining,
            retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
          }
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)),
            'X-RateLimit-Limit': '50',
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(rateLimitResult.resetTime)
          }
        }
      )
    }

    // Parse and validate request body with timeout
    let body: CreateSurveyResponseRequest
    try {
      const bodyText = await Promise.race([
        request.text(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Request body parsing timeout')), 30000)
        )
      ])
      
      if (!bodyText) {
        throw new Error('Empty request body')
      }
      
      body = JSON.parse(bodyText)
      
      // Enhanced request logging
      logger.debug('Survey submission request parsed', {
        requestId,
        bodySize: bodyText.length,
        answerCount: body.answers?.length || 0,
        isDraft: body.is_draft,
        questionnaireId: body.questionnaire_id
      })
      
    } catch (parseError) {
      logger.error('Failed to parse survey submission request body', {
        requestId,
        error: parseError instanceof Error ? parseError.message : 'Unknown parsing error',
        contentType: request.headers.get('content-type')
      })
      
      return NextResponse.json(
        {
          error: 'Formato de solicitud inválido. Verifique los datos enviados.',
          code: 'INVALID_REQUEST_FORMAT',
          request_id: requestId
        },
        { status: 400 }
      )
    }
    
    // Sanitize all input data
    const sanitizedData = sanitizer.sanitizeSurveyData(body)
    
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      logger.warn('Unauthorized survey submission attempt', { 
        requestId,
        ip: request.ip,
        userAgent: request.headers.get('user-agent'),
        error: authError?.message,
        timestamp: new Date().toISOString()
      })
      
      // Track security event
      analytics.trackSecurityEvent({
        type: 'unauthorized_access',
        request_id: requestId,
        ip: request.ip || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        endpoint: '/api/surveys/responses'
      })
      
      return NextResponse.json(
        { 
          error: 'No autorizado. Por favor, inicie sesión.',
          code: 'UNAUTHORIZED_ACCESS',
          request_id: requestId
        },
        { status: 401 }
      )
    }

    // Get user profile and validate permissions
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, tenant_id, rol, activo')
      .eq('auth_user_id', user.id)
      .eq('activo', true)
      .single()

    if (profileError || !userProfile) {
      logger.warn('Invalid user profile for survey submission', { 
        requestId,
        userId: user.id,
        error: profileError?.message,
        authUserEmail: user.email
      })
      
      return NextResponse.json(
        { 
          error: 'Usuario no válido o inactivo.',
          code: 'INVALID_USER_PROFILE',
          request_id: requestId
        },
        { status: 403 }
      )
    }

    // Validate questionnaire exists and is active
    const { data: questionnaire, error: questionnaireError } = await supabase
      .from('questionnaires')
      .select('id, tenant_id, is_active, sections(id, questions(*))')
      .eq('id', sanitizedData.questionnaire_id)
      .eq('tenant_id', userProfile.tenant_id)
      .eq('is_active', true)
      .single()

    if (questionnaireError || !questionnaire) {
      logger.warn('Invalid questionnaire for survey submission', {
        requestId,
        questionnaireId: sanitizedData.questionnaire_id,
        userId: user.id,
        tenantId: userProfile.tenant_id,
        error: questionnaireError?.message
      })
      
      return NextResponse.json(
        { 
          error: 'Cuestionario no encontrado o inactivo.',
          code: 'INVALID_QUESTIONNAIRE',
          request_id: requestId
        },
        { status: 400 }
      )
    }

    // Perform comprehensive server-side validation
    const validationResult = await validator.validateSurveySubmission(
      sanitizedData,
      questionnaire
    )
    
    if (!validationResult.isValid) {
      logger.info('Survey validation failed', {
        requestId,
        userId: user.id,
        questionnaireId: sanitizedData.questionnaire_id,
        answerCount: sanitizedData.answers?.length || 0,
        errorCount: Object.keys(validationResult.errors).length,
        errors: validationResult.errors,
        warnings: validationResult.warnings
      })
      
      // Track validation failures for analytics
      analytics.trackValidationFailure({
        request_id: requestId,
        user_id: user.id,
        questionnaire_id: sanitizedData.questionnaire_id,
        error_count: Object.keys(validationResult.errors).length,
        error_types: Object.keys(validationResult.errors)
      })
      
      return NextResponse.json(
        {
          error: 'Error de validación en los datos de la encuesta.',
          code: 'VALIDATION_FAILED',
          request_id: requestId,
          details: validationResult.errors,
          warnings: validationResult.warnings
        },
        { status: 400 }
      )
    }

    // Check for duplicate submissions (only for completed surveys)
    if (!sanitizedData.is_draft) {
      const { data: existingResponse } = await supabase
        .from('survey_responses')
        .select('id')
        .eq('volunteer_id', userProfile.id)
        .eq('questionnaire_id', sanitizedData.questionnaire_id)
        .eq('respondent_name', sanitizedData.respondent_name)
        .eq('is_complete', true)
        .single()

      if (existingResponse) {
        logger.warn('Duplicate survey submission attempt', {
          requestId,
          userId: user.id,
          questionnaireId: sanitizedData.questionnaire_id,
          respondentName: sanitizedData.respondent_name,
          existingResponseId: existingResponse.id
        })
        
        // Track duplicate attempts for analytics
        analytics.trackDuplicateSubmission({
          request_id: requestId,
          user_id: user.id,
          questionnaire_id: sanitizedData.questionnaire_id,
          existing_response_id: existingResponse.id
        })
        
        return NextResponse.json(
          {
            error: 'Ya existe una encuesta completada para este encuestado.',
            code: 'DUPLICATE_SUBMISSION',
            request_id: requestId,
            details: { existingResponseId: existingResponse.id }
          },
          { status: 409 }
        )
      }
    }

    // Create survey response with transaction-like behavior
    const surveyResponseData = {
      tenant_id: userProfile.tenant_id,
      questionnaire_id: sanitizedData.questionnaire_id,
      volunteer_id: userProfile.id,
      respondent_name: sanitizedData.respondent_name,
      respondent_email: sanitizedData.respondent_email || null,
      respondent_phone: sanitizedData.respondent_phone || null,
      precinct_id: sanitizedData.precinct_id || null,
      location: sanitizedData.metadata?.location ? JSON.stringify(sanitizedData.metadata.location) : null,
      is_complete: !sanitizedData.is_draft,
      completion_time: sanitizedData.metadata?.completion_time ? 
        new Date(sanitizedData.metadata.completion_time).getTime() - 
        new Date(sanitizedData.metadata.start_time).getTime() : null,
      metadata: {
        device_info: sanitizedData.metadata.device_info,
        start_time: sanitizedData.metadata.start_time,
        completion_time: sanitizedData.metadata.completion_time,
        ip_address: request.ip,
        user_agent: request.headers.get('user-agent')
      }
    }

    // Execute database operations with retry logic
    const { data: createdResponse, error: responseError } = await networkResilience.executeWithRetry(
      async () => {
        const result = await supabase
          .from('survey_responses')
          .insert(surveyResponseData)
          .select('id')
          .single()
        
        if (result.error) {
          throw new Error(`Database error: ${result.error.message}`)
        }
        
        return result
      },
      {
        maxAttempts: 3,
        baseDelayMs: 1000,
        onRetry: (attempt, error) => {
          retryAttempt = attempt
          logger.warn('Retrying survey response creation', {
            requestId,
            attempt,
            error: error instanceof Error ? error.message : String(error)
          })
        }
      },
      `survey_response_${sanitizedData.questionnaire_id}_${sanitizedData.respondent_name}_${user.id}`
    )

    if (responseError) {
      logger.error('Failed to create survey response after retries', {
        requestId,
        userId: user.id,
        retryAttempts: retryAttempt,
        error: responseError.message,
        data: { ...surveyResponseData, metadata: '[REDACTED]' } // Don't log sensitive metadata
      })
      
      throw new Error(`Error al crear la respuesta de encuesta: ${responseError.message}`)
    }

    responseId = createdResponse.id

    // Insert all answers
    if (sanitizedData.answers && sanitizedData.answers.length > 0) {
      const answersToInsert = sanitizedData.answers.map(answer => {
        const answerData: any = {
          survey_response_id: createdResponse.id,
          question_id: answer.question_id
        }

        // Store answer in appropriate field based on type
        if (Array.isArray(answer.answer_value)) {
          answerData.answer_json = answer.answer_value
          answerData.answer_value = JSON.stringify(answer.answer_value)
        } else if (typeof answer.answer_value === 'number') {
          answerData.answer_numeric = answer.answer_value
          answerData.answer_value = String(answer.answer_value)
        } else {
          answerData.answer_value = String(answer.answer_value)
        }

        return answerData
      })

      // Insert answers with retry logic and batch processing
      const { error: answersError } = await networkResilience.executeWithRetry(
        async () => {
          // Process answers in batches to avoid timeout
          const batchSize = 25
          const batches = []
          
          for (let i = 0; i < answersToInsert.length; i += batchSize) {
            batches.push(answersToInsert.slice(i, i + batchSize))
          }
          
          for (const batch of batches) {
            const result = await supabase
              .from('answers')
              .insert(batch)
            
            if (result.error) {
              throw new Error(`Batch insert error: ${result.error.message}`)
            }
          }
          
          return { error: null }
        },
        {
          maxAttempts: 2,
          baseDelayMs: 500,
          onRetry: (attempt, error) => {
            logger.warn('Retrying answers insert', {
              requestId,
              responseId: createdResponse.id,
              attempt,
              answerCount: answersToInsert.length
            })
          }
        }
      )

      if (answersError) {
        // Enhanced cleanup with retry
        try {
          await networkResilience.executeWithRetry(
            async () => {
              const result = await supabase
                .from('survey_responses')
                .delete()
                .eq('id', createdResponse.id)
              
              if (result.error) {
                throw new Error(`Cleanup error: ${result.error.message}`)
              }
              
              return result
            },
            { maxAttempts: 2 }
          )
        } catch (cleanupError) {
          logger.error('Failed to cleanup survey response after answers failure', {
            requestId,
            responseId: createdResponse.id,
            cleanupError: cleanupError instanceof Error ? cleanupError.message : 'Unknown error'
          })
        }

        logger.error('Failed to insert survey answers after retries', {
          requestId,
          userId: user.id,
          responseId: createdResponse.id,
          answerCount: answersToInsert.length,
          error: answersError.message
        })
        
        throw new Error(`Error al guardar las respuestas: ${answersError.message}`)
      }
    }

    // Track analytics
    const responseTime = Date.now() - startTime
    analytics.trackSubmission({
      response_id: createdResponse.id,
      user_id: user.id,
      questionnaire_id: sanitizedData.questionnaire_id,
      response_time: responseTime,
      answer_count: sanitizedData.answers?.length || 0,
      is_draft: sanitizedData.is_draft,
      device_info: sanitizedData.metadata.device_info,
      completion_percentage: sanitizedData.is_draft ? 
        validator.getCompletionPercentage(sanitizedData.answers, questionnaire) : 100
    })

    logger.info('Survey submitted successfully', {
      requestId,
      responseId: createdResponse.id,
      userId: user.id,
      tenantId: userProfile.tenant_id,
      questionnaireId: sanitizedData.questionnaire_id,
      respondentName: sanitizedData.respondent_name,
      responseTime,
      isDraft: sanitizedData.is_draft,
      answerCount: sanitizedData.answers?.length || 0,
      retryAttempts: retryAttempt,
      completionPercentage: sanitizedData.is_draft ? 
        validator.getCompletionPercentage(sanitizedData.answers, questionnaire) : 100
    })

    return NextResponse.json(
      {
        success: true,
        request_id: requestId,
        data: {
          id: createdResponse.id,
          status: sanitizedData.is_draft ? 'draft' : 'completed',
          response_time: responseTime,
          answer_count: sanitizedData.answers?.length || 0,
          completion_percentage: sanitizedData.is_draft ? 
            validator.getCompletionPercentage(sanitizedData.answers, questionnaire) : 100,
          retry_attempts: retryAttempt
        }
      },
      { 
        status: 201,
        headers: {
          'X-Request-ID': requestId,
          'X-Response-Time': String(responseTime)
        }
      }
    )

  } catch (error) {
    const errorDetails = {
      requestId,
      responseId,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorName: error instanceof Error ? error.name : 'UnknownError',
      stack: error instanceof Error ? error.stack : undefined,
      requestPath: request.nextUrl.pathname,
      retryAttempts: retryAttempt,
      totalTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    }
    
    logger.error('Survey submission error', errorDetails)
    
    // Track error in analytics
    analytics.trackSubmissionError({
      request_id: requestId,
      error_type: error instanceof Error ? error.name : 'UnknownError',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      response_id: responseId,
      retry_attempts: retryAttempt
    })

    // Enhanced cleanup with retry if response was created but process failed
    if (responseId) {
      try {
        const supabase = await createClient()
        await networkResilience.executeWithRetry(
          async () => {
            const result = await supabase
              .from('survey_responses')
              .delete()
              .eq('id', responseId)
            
            if (result.error) {
              throw new Error(`Cleanup error: ${result.error.message}`)
            }
            
            return result
          },
          { maxAttempts: 2 }
        )
        
        logger.info('Successfully cleaned up failed survey response', {
          requestId,
          responseId
        })
      } catch (cleanupError) {
        logger.error('Failed to cleanup failed survey response after retries', {
          requestId,
          responseId,
          cleanupError: cleanupError instanceof Error ? cleanupError.message : 'Unknown error'
        })
      }
    }

    // Determine appropriate error response based on error type
    const isNetworkError = error instanceof Error && 
      (error.name === 'NetworkResilienceError' || error.message.includes('network'))
    const isTimeoutError = error instanceof Error && error.message.includes('timeout')
    
    let statusCode = 500
    let errorMessage = 'Error interno del servidor. Por favor, intente nuevamente.'
    let errorCode = 'SERVER_ERROR'
    
    if (isNetworkError) {
      statusCode = 503
      errorMessage = 'Problema de conectividad. Por favor, intente nuevamente en unos momentos.'
      errorCode = 'NETWORK_ERROR'
    } else if (isTimeoutError) {
      statusCode = 408
      errorMessage = 'La solicitud tardó demasiado tiempo. Por favor, intente nuevamente.'
      errorCode = 'TIMEOUT_ERROR'
    }
    
    return NextResponse.json(
      {
        error: errorMessage,
        code: errorCode,
        request_id: requestId,
        retry_suggested: isNetworkError || isTimeoutError,
        details: process.env.NODE_ENV === 'development' ? {
          original_error: error instanceof Error ? error.message : 'Unknown error',
          error_type: error instanceof Error ? error.name : 'UnknownError',
          retry_attempts: retryAttempt
        } : undefined
      },
      { 
        status: statusCode,
        headers: {
          'X-Request-ID': requestId,
          'X-Error-Type': errorCode,
          ...(isNetworkError && { 'Retry-After': '30' })
        }
      }
    )
  }
}