import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SurveySubmissionValidator } from '@/lib/validation/server-validation'
import { RateLimiter } from '@/lib/security/rate-limiter'
import { InputSanitizer } from '@/lib/security/input-sanitizer'
import { SurveyAnalytics } from '@/lib/analytics/survey-analytics'
import { Logger } from '@/lib/monitoring/logger'

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
  let responseId: string | null = null
  
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimiter.checkLimit(request)
    if (!rateLimitResult.success) {
      logger.warn('Rate limit exceeded', { 
        ip: request.ip,
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime
      })
      
      return NextResponse.json(
        { 
          error: 'Demasiadas solicitudes. Por favor, espere antes de enviar otra encuesta.',
          code: 'RATE_LIMIT_EXCEEDED',
          details: {
            resetTime: rateLimitResult.resetTime,
            remaining: rateLimitResult.remaining
          }
        },
        { status: 429 }
      )
    }

    // Parse and validate request body
    const body: CreateSurveyResponseRequest = await request.json()
    
    // Sanitize all input data
    const sanitizedData = sanitizer.sanitizeSurveyData(body)
    
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      logger.warn('Unauthorized survey submission attempt', { 
        ip: request.ip,
        error: authError?.message 
      })
      
      return NextResponse.json(
        { 
          error: 'No autorizado. Por favor, inicie sesión.',
          code: 'UNAUTHORIZED_ACCESS'
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
        userId: user.id,
        error: profileError?.message 
      })
      
      return NextResponse.json(
        { 
          error: 'Usuario no válido o inactivo.',
          code: 'INVALID_USER_PROFILE'
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
        questionnaireId: sanitizedData.questionnaire_id,
        userId: user.id,
        error: questionnaireError?.message
      })
      
      return NextResponse.json(
        { 
          error: 'Cuestionario no encontrado o inactivo.',
          code: 'INVALID_QUESTIONNAIRE'
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
        userId: user.id,
        questionnaireId: sanitizedData.questionnaire_id,
        errors: validationResult.errors
      })
      
      return NextResponse.json(
        {
          error: 'Error de validación en los datos de la encuesta.',
          code: 'VALIDATION_FAILED',
          details: validationResult.errors
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
          userId: user.id,
          questionnaireId: sanitizedData.questionnaire_id,
          existingResponseId: existingResponse.id
        })
        
        return NextResponse.json(
          {
            error: 'Ya existe una encuesta completada para este encuestado.',
            code: 'DUPLICATE_SUBMISSION',
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

    const { data: createdResponse, error: responseError } = await supabase
      .from('survey_responses')
      .insert(surveyResponseData)
      .select('id')
      .single()

    if (responseError) {
      logger.error('Failed to create survey response', {
        userId: user.id,
        error: responseError.message,
        data: surveyResponseData
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

      const { error: answersError } = await supabase
        .from('answers')
        .insert(answersToInsert)

      if (answersError) {
        // Cleanup: Delete the survey response if answers failed
        await supabase
          .from('survey_responses')
          .delete()
          .eq('id', createdResponse.id)

        logger.error('Failed to insert survey answers', {
          userId: user.id,
          responseId: createdResponse.id,
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
      responseId: createdResponse.id,
      userId: user.id,
      questionnaireId: sanitizedData.questionnaire_id,
      responseTime,
      isDraft: sanitizedData.is_draft,
      answerCount: sanitizedData.answers?.length || 0
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          id: createdResponse.id,
          status: sanitizedData.is_draft ? 'draft' : 'completed',
          response_time: responseTime
        }
      },
      { status: 201 }
    )

  } catch (error) {
    logger.error('Survey submission error', {
      responseId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      requestPath: request.nextUrl.pathname
    })

    // Cleanup if response was created but process failed
    if (responseId) {
      try {
        const supabase = await createClient()
        await supabase
          .from('survey_responses')
          .delete()
          .eq('id', responseId)
      } catch (cleanupError) {
        logger.error('Failed to cleanup failed survey response', {
          responseId,
          cleanupError: cleanupError instanceof Error ? cleanupError.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json(
      {
        error: 'Error interno del servidor. Por favor, intente nuevamente.',
        code: 'SERVER_ERROR',
        details: process.env.NODE_ENV === 'development' ? 
          error instanceof Error ? error.message : 'Unknown error' : undefined
      },
      { status: 500 }
    )
  }
}