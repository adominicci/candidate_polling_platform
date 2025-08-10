import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SurveySubmissionValidator } from '@/lib/validation/server-validation'
import { RateLimiter } from '@/lib/security/rate-limiter'
import { InputSanitizer } from '@/lib/security/input-sanitizer'
import { Logger } from '@/lib/monitoring/logger'
import { networkResilience } from '@/lib/api/network-resilience'

// Rate limiter for draft operations (more lenient than final submissions)
const draftRateLimiter = new RateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // 100 draft saves per window
  keyGenerator: (req) => `draft_${req.ip || 'unknown'}`
})

const validator = new SurveySubmissionValidator()
const sanitizer = new InputSanitizer()
const logger = new Logger('survey-drafts-api')

interface CreateDraftRequest {
  questionnaire_id: string
  answers: SurveyAnswer[]
  metadata?: {
    start_time?: string
    device_info?: DeviceInfo
    location?: GeoLocation
    auto_save?: boolean
    completion_percentage?: number
  }
  respondent_name?: string
  respondent_email?: string
  respondent_phone?: string
  precinct_id?: string
}

interface SurveyAnswer {
  question_id: string
  answer_value: string | string[] | number
  answer_text?: string
  skipped?: boolean
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

// POST /api/surveys/drafts - Create or update a draft
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  let draftId: string | null = null

  try {
    logger.info('Draft save request started', {
      requestId,
      ip: request.ip
    })

    // Apply rate limiting for draft saves
    const rateLimitResult = await draftRateLimiter.checkLimit(request)
    if (!rateLimitResult.success) {
      logger.warn('Rate limit exceeded for draft save', {
        requestId,
        ip: request.ip,
        remaining: rateLimitResult.remaining
      })

      return NextResponse.json(
        {
          error: 'Demasiados intentos de guardado. Por favor, espere un momento.',
          code: 'DRAFT_RATE_LIMIT_EXCEEDED',
          request_id: requestId,
          details: {
            resetTime: rateLimitResult.resetTime,
            remaining: rateLimitResult.remaining
          }
        },
        { status: 429 }
      )
    }

    // Parse request body with timeout
    let body: CreateDraftRequest
    try {
      const bodyText = await Promise.race([
        request.text(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request parsing timeout')), 15000)
        )
      ])

      body = JSON.parse(bodyText)

      logger.debug('Draft request parsed', {
        requestId,
        bodySize: bodyText.length,
        answerCount: body.answers?.length || 0,
        questionnaireId: body.questionnaire_id,
        isAutoSave: body.metadata?.auto_save || false
      })

    } catch (parseError) {
      logger.error('Failed to parse draft request body', {
        requestId,
        error: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
      })

      return NextResponse.json(
        {
          error: 'Formato de solicitud inválido.',
          code: 'INVALID_REQUEST_FORMAT',
          request_id: requestId
        },
        { status: 400 }
      )
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      logger.warn('Unauthorized draft save attempt', {
        requestId,
        ip: request.ip,
        error: authError?.message
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

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, tenant_id, rol, activo')
      .eq('auth_user_id', user.id)
      .eq('activo', true)
      .single()

    if (profileError || !userProfile) {
      logger.warn('Invalid user profile for draft save', {
        requestId,
        userId: user.id,
        error: profileError?.message
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

    // Sanitize input data
    const sanitizedData = sanitizer.sanitizeSurveyData(body)

    // Validate questionnaire exists
    const { data: questionnaire, error: questionnaireError } = await supabase
      .from('questionnaires')
      .select('id, tenant_id, is_active, sections(id, questions(*))')
      .eq('id', sanitizedData.questionnaire_id)
      .eq('tenant_id', userProfile.tenant_id)
      .eq('is_active', true)
      .single()

    if (questionnaireError || !questionnaire) {
      logger.warn('Invalid questionnaire for draft save', {
        requestId,
        questionnaireId: sanitizedData.questionnaire_id,
        userId: user.id,
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

    // Find existing draft for this user and questionnaire
    const { data: existingDraft } = await supabase
      .from('survey_responses')
      .select('id, created_at, updated_at')
      .eq('volunteer_id', userProfile.id)
      .eq('questionnaire_id', sanitizedData.questionnaire_id)
      .eq('is_complete', false)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    // Light validation for drafts (only basic structure, not all business rules)
    if (sanitizedData.answers && sanitizedData.answers.length > 0) {
      const draftValidation = await validator.validateSurveySubmission(
        { ...sanitizedData, is_draft: true },
        questionnaire
      )

      // For drafts, we only log validation warnings, don't block the save
      if (!draftValidation.isValid) {
        logger.info('Draft validation warnings', {
          requestId,
          userId: user.id,
          questionnaireId: sanitizedData.questionnaire_id,
          warnings: draftValidation.errors,
          answerCount: sanitizedData.answers.length
        })
      }
    }

    // Calculate completion percentage
    const completionPercentage = sanitizedData.answers && questionnaire ? 
      validator.getCompletionPercentage(sanitizedData.answers, questionnaire) : 0

    const draftData = {
      tenant_id: userProfile.tenant_id,
      questionnaire_id: sanitizedData.questionnaire_id,
      volunteer_id: userProfile.id,
      respondent_name: sanitizedData.respondent_name || '',
      respondent_email: sanitizedData.respondent_email || null,
      respondent_phone: sanitizedData.respondent_phone || null,
      precinct_id: sanitizedData.precinct_id || null,
      location: sanitizedData.metadata?.location ? 
        JSON.stringify(sanitizedData.metadata.location) : null,
      is_complete: false,
      completion_time: null,
      metadata: {
        device_info: sanitizedData.metadata?.device_info || {},
        start_time: sanitizedData.metadata?.start_time || new Date().toISOString(),
        last_auto_save: sanitizedData.metadata?.auto_save ? new Date().toISOString() : null,
        completion_percentage: completionPercentage,
        answer_count: sanitizedData.answers?.length || 0,
        ip_address: request.ip,
        user_agent: request.headers.get('user-agent')
      }
    }

    let result
    if (existingDraft) {
      // Update existing draft with retry logic
      result = await networkResilience.saveDraftWithRetry(
        async () => {
          const updateResult = await supabase
            .from('survey_responses')
            .update({
              ...draftData,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingDraft.id)
            .select('id')
            .single()

          if (updateResult.error) {
            throw new Error(`Update error: ${updateResult.error.message}`)
          }

          return updateResult
        },
        { id: existingDraft.id, ...sanitizedData }
      )
      
      draftId = existingDraft.id
    } else {
      // Create new draft with retry logic
      result = await networkResilience.saveDraftWithRetry(
        async () => {
          const insertResult = await supabase
            .from('survey_responses')
            .insert(draftData)
            .select('id')
            .single()

          if (insertResult.error) {
            throw new Error(`Insert error: ${insertResult.error.message}`)
          }

          return insertResult
        },
        sanitizedData
      )
      
      draftId = result.data?.id
    }

    if (!draftId) {
      throw new Error('Failed to get draft ID after save operation')
    }

    // Save answers with batch processing and retry
    if (sanitizedData.answers && sanitizedData.answers.length > 0) {
      await networkResilience.saveDraftWithRetry(
        async () => {
          // Delete existing answers first
          const deleteResult = await supabase
            .from('answers')
            .delete()
            .eq('survey_response_id', draftId)

          // Prepare answers for insert
          const answersToInsert = sanitizedData.answers.map(answer => {
            const answerData: any = {
              survey_response_id: draftId,
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

          // Insert answers in batches
          const batchSize = 20
          for (let i = 0; i < answersToInsert.length; i += batchSize) {
            const batch = answersToInsert.slice(i, i + batchSize)
            const insertResult = await supabase
              .from('answers')
              .insert(batch)

            if (insertResult.error) {
              throw new Error(`Answers batch insert error: ${insertResult.error.message}`)
            }
          }

          return { error: null }
        },
        { id: draftId, ...sanitizedData }
      )
    }

    const responseTime = Date.now() - startTime

    logger.info('Draft saved successfully', {
      requestId,
      draftId,
      userId: user.id,
      questionnaireId: sanitizedData.questionnaire_id,
      isUpdate: !!existingDraft,
      answerCount: sanitizedData.answers?.length || 0,
      completionPercentage,
      isAutoSave: sanitizedData.metadata?.auto_save || false,
      responseTime
    })

    return NextResponse.json(
      {
        success: true,
        request_id: requestId,
        data: {
          id: draftId,
          status: 'draft',
          is_update: !!existingDraft,
          completion_percentage: completionPercentage,
          answer_count: sanitizedData.answers?.length || 0,
          response_time: responseTime,
          last_updated: new Date().toISOString()
        }
      },
      {
        status: existingDraft ? 200 : 201,
        headers: {
          'X-Request-ID': requestId,
          'X-Response-Time': String(responseTime)
        }
      }
    )

  } catch (error) {
    const errorDetails = {
      requestId,
      draftId,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorName: error instanceof Error ? error.name : 'UnknownError',
      totalTime: Date.now() - startTime
    }

    logger.error('Draft save error', errorDetails)

    // Cleanup if draft was created but process failed
    if (draftId) {
      try {
        const supabase = await createClient()
        await supabase
          .from('survey_responses')
          .delete()
          .eq('id', draftId)
      } catch (cleanupError) {
        logger.error('Failed to cleanup failed draft', {
          requestId,
          draftId,
          cleanupError: cleanupError instanceof Error ? cleanupError.message : 'Unknown error'
        })
      }
    }

    const isNetworkError = error instanceof Error && 
      (error.name === 'NetworkResilienceError' || error.message.includes('network'))

    return NextResponse.json(
      {
        error: isNetworkError ? 
          'Problema de conectividad al guardar borrador. Intente nuevamente.' :
          'Error al guardar borrador. Por favor, intente nuevamente.',
        code: isNetworkError ? 'NETWORK_ERROR' : 'DRAFT_SAVE_ERROR',
        request_id: requestId,
        retry_suggested: true
      },
      { 
        status: isNetworkError ? 503 : 500,
        headers: {
          'X-Request-ID': requestId,
          'X-Error-Type': isNetworkError ? 'NETWORK_ERROR' : 'SERVER_ERROR'
        }
      }
    )
  }
}

// GET /api/surveys/drafts - List user's drafts
export async function GET(request: NextRequest) {
  const requestId = `draft_list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  try {
    logger.info('Draft list request started', {
      requestId,
      ip: request.ip
    })

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        {
          error: 'No autorizado. Por favor, inicie sesión.',
          code: 'UNAUTHORIZED_ACCESS',
          request_id: requestId
        },
        { status: 401 }
      )
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, tenant_id')
      .eq('auth_user_id', user.id)
      .eq('activo', true)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json(
        {
          error: 'Usuario no válido.',
          code: 'INVALID_USER_PROFILE',
          request_id: requestId
        },
        { status: 403 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const questionnaireId = searchParams.get('questionnaire_id')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

    // Build query
    let query = supabase
      .from('survey_responses')
      .select(`
        id,
        questionnaire_id,
        respondent_name,
        completion_time,
        created_at,
        updated_at,
        metadata,
        questionnaires (
          title,
          version
        )
      `)
      .eq('volunteer_id', userProfile.id)
      .eq('is_complete', false)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (questionnaireId) {
      query = query.eq('questionnaire_id', questionnaireId)
    }

    const { data: drafts, error: draftsError } = await query

    if (draftsError) {
      throw new Error(`Error fetching drafts: ${draftsError.message}`)
    }

    // Transform drafts for response
    const transformedDrafts = drafts?.map(draft => ({
      id: draft.id,
      questionnaire_id: draft.questionnaire_id,
      questionnaire_title: draft.questionnaires?.title || 'Unknown',
      questionnaire_version: draft.questionnaires?.version || '1.0.0',
      respondent_name: draft.respondent_name,
      completion_percentage: draft.metadata?.completion_percentage || 0,
      answer_count: draft.metadata?.answer_count || 0,
      last_auto_save: draft.metadata?.last_auto_save || null,
      created_at: draft.created_at,
      updated_at: draft.updated_at,
      age_minutes: Math.floor((Date.now() - new Date(draft.updated_at).getTime()) / (1000 * 60))
    })) || []

    logger.info('Drafts retrieved successfully', {
      requestId,
      userId: user.id,
      draftCount: transformedDrafts.length,
      questionnaireId
    })

    return NextResponse.json({
      success: true,
      request_id: requestId,
      data: {
        drafts: transformedDrafts,
        total: transformedDrafts.length,
        limit,
        offset
      }
    })

  } catch (error) {
    logger.error('Error retrieving drafts', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      {
        error: 'Error al obtener borradores.',
        code: 'DRAFT_RETRIEVAL_ERROR',
        request_id: requestId
      },
      { status: 500 }
    )
  }
}