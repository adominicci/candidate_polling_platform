import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SurveySubmissionValidator } from '@/lib/validation/server-validation'
import { RateLimiter } from '@/lib/security/rate-limiter'
import { InputSanitizer } from '@/lib/security/input-sanitizer'
import { SurveyAnalytics } from '@/lib/analytics/survey-analytics'
import { Logger } from '@/lib/monitoring/logger'
import { networkResilience } from '@/lib/api/network-resilience'

// Special rate limiter for batch operations
const batchRateLimiter = new RateLimiter({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 5, // 5 batch operations per window
  keyGenerator: (req) => `batch_${req.ip || 'unknown'}`
})

const validator = new SurveySubmissionValidator()
const sanitizer = new InputSanitizer()
const analytics = new SurveyAnalytics()
const logger = new Logger('survey-batch-api')

interface BatchSubmissionRequest {
  submissions: SingleSubmission[]
  metadata: {
    batch_id?: string
    sync_timestamp?: string
    offline_mode?: boolean
    device_info?: DeviceInfo
  }
}

interface SingleSubmission {
  client_id?: string // Unique client-side ID for deduplication
  questionnaire_id: string
  answers: SurveyAnswer[]
  respondent_name: string
  respondent_email?: string
  respondent_phone?: string
  precinct_id?: string
  is_draft: boolean
  metadata: {
    start_time: string
    completion_time?: string
    device_info: DeviceInfo
    location?: GeoLocation
    offline_created?: string
  }
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

interface BatchResult {
  client_id?: string
  success: boolean
  survey_id?: string
  error?: string
  error_code?: string
  validation_errors?: Record<string, string[]>
}

// POST /api/surveys/batch - Submit multiple surveys in a batch
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  let processedCount = 0

  try {
    logger.info('Batch submission request started', {
      requestId,
      ip: request.ip,
      userAgent: request.headers.get('user-agent')?.substring(0, 100)
    })

    // Apply batch rate limiting
    const rateLimitResult = await batchRateLimiter.checkLimit(request)
    if (!rateLimitResult.success) {
      logger.warn('Batch rate limit exceeded', {
        requestId,
        ip: request.ip,
        remaining: rateLimitResult.remaining
      })

      return NextResponse.json(
        {
          error: 'Demasiadas operaciones en lote. Por favor, espere antes de enviar otro lote.',
          code: 'BATCH_RATE_LIMIT_EXCEEDED',
          request_id: requestId,
          details: {
            resetTime: rateLimitResult.resetTime,
            remaining: rateLimitResult.remaining
          }
        },
        { status: 429 }
      )
    }

    // Parse request body with extended timeout for batch operations
    let body: BatchSubmissionRequest
    try {
      const bodyText = await Promise.race([
        request.text(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Batch request timeout')), 60000) // 60 seconds for batches
        )
      ])

      body = JSON.parse(bodyText)

      // Validate batch structure
      if (!body.submissions || !Array.isArray(body.submissions)) {
        throw new Error('Invalid batch structure: submissions must be an array')
      }

      if (body.submissions.length === 0) {
        throw new Error('Empty batch: no submissions provided')
      }

      if (body.submissions.length > 50) {
        throw new Error('Batch too large: maximum 50 submissions per batch')
      }

      logger.info('Batch request parsed', {
        requestId,
        bodySize: bodyText.length,
        submissionCount: body.submissions.length,
        batchId: body.metadata?.batch_id,
        isOfflineMode: body.metadata?.offline_mode || false
      })

    } catch (parseError) {
      logger.error('Failed to parse batch request body', {
        requestId,
        error: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
      })

      return NextResponse.json(
        {
          error: 'Formato de lote inválido.',
          code: 'INVALID_BATCH_FORMAT',
          request_id: requestId
        },
        { status: 400 }
      )
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      logger.warn('Unauthorized batch submission attempt', {
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
      logger.warn('Invalid user profile for batch submission', {
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

    // Process submissions in batch with parallel processing but controlled concurrency
    const results: BatchResult[] = []
    const maxConcurrency = 5 // Process max 5 submissions concurrently

    // Split submissions into chunks for controlled parallel processing
    const chunks = []
    for (let i = 0; i < body.submissions.length; i += maxConcurrency) {
      chunks.push(body.submissions.slice(i, i + maxConcurrency))
    }

    for (const chunk of chunks) {
      const chunkResults = await Promise.allSettled(
        chunk.map(submission => 
          processSingleSubmission(
            submission,
            userProfile,
            request,
            requestId,
            supabase
          )
        )
      )

      // Process chunk results
      chunkResults.forEach((result, index) => {
        const submission = chunk[index]
        processedCount++

        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          logger.error('Batch submission processing error', {
            requestId,
            submissionIndex: processedCount,
            clientId: submission.client_id,
            error: result.reason instanceof Error ? result.reason.message : String(result.reason)
          })

          results.push({
            client_id: submission.client_id,
            success: false,
            error: result.reason instanceof Error ? result.reason.message : 'Processing failed',
            error_code: 'BATCH_PROCESSING_ERROR'
          })
        }
      })

      // Small delay between chunks to avoid overwhelming the database
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    // Analyze batch results
    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length
    const responseTime = Date.now() - startTime

    // Track batch analytics
    analytics.trackBatchSubmission({
      request_id: requestId,
      user_id: user.id,
      batch_id: body.metadata?.batch_id,
      total_submissions: body.submissions.length,
      successful_submissions: successCount,
      failed_submissions: failureCount,
      response_time: responseTime,
      offline_mode: body.metadata?.offline_mode || false
    })

    logger.info('Batch submission completed', {
      requestId,
      userId: user.id,
      batchId: body.metadata?.batch_id,
      totalSubmissions: body.submissions.length,
      successCount,
      failureCount,
      responseTime,
      isOfflineSync: body.metadata?.offline_mode || false
    })

    return NextResponse.json(
      {
        success: successCount > 0,
        request_id: requestId,
        batch_id: body.metadata?.batch_id,
        data: {
          total_submissions: body.submissions.length,
          successful_submissions: successCount,
          failed_submissions: failureCount,
          response_time: responseTime,
          results
        }
      },
      {
        status: failureCount > 0 ? 207 : 200, // 207 Multi-Status for partial success
        headers: {
          'X-Request-ID': requestId,
          'X-Response-Time': String(responseTime),
          'X-Batch-Success-Rate': String(Math.round((successCount / body.submissions.length) * 100))
        }
      }
    )

  } catch (error) {
    logger.error('Batch submission error', {
      requestId,
      processedCount,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      totalTime: Date.now() - startTime
    })

    return NextResponse.json(
      {
        error: 'Error interno en el procesamiento del lote.',
        code: 'BATCH_PROCESSING_ERROR',
        request_id: requestId,
        details: {
          processed_count: processedCount,
          total_time: Date.now() - startTime
        }
      },
      { status: 500 }
    )
  }
}

/**
 * Process a single submission within a batch
 */
async function processSingleSubmission(
  submission: SingleSubmission,
  userProfile: any,
  request: NextRequest,
  batchRequestId: string,
  supabase: any
): Promise<BatchResult> {
  const submissionId = `${batchRequestId}_${submission.client_id || Math.random().toString(36).substr(2, 9)}`
  
  try {
    // Sanitize submission data
    const sanitizedData = sanitizer.sanitizeSurveyData(submission)

    // Check for duplicate submission using client_id
    if (submission.client_id) {
      const { data: existingResponse } = await supabase
        .from('survey_responses')
        .select('id')
        .eq('volunteer_id', userProfile.id)
        .eq('questionnaire_id', sanitizedData.questionnaire_id)
        .eq('is_complete', !sanitizedData.is_draft)
        .eq('metadata->client_id', submission.client_id)
        .single()

      if (existingResponse) {
        return {
          client_id: submission.client_id,
          success: true,
          survey_id: existingResponse.id,
          error: 'Submission already exists (duplicate)',
          error_code: 'DUPLICATE_CLIENT_ID'
        }
      }
    }

    // Validate questionnaire exists
    const { data: questionnaire, error: questionnaireError } = await supabase
      .from('questionnaires')
      .select('id, tenant_id, is_active, sections(id, questions(*))')
      .eq('id', sanitizedData.questionnaire_id)
      .eq('tenant_id', userProfile.tenant_id)
      .eq('is_active', true)
      .single()

    if (questionnaireError || !questionnaire) {
      return {
        client_id: submission.client_id,
        success: false,
        error: 'Cuestionario no encontrado o inactivo',
        error_code: 'INVALID_QUESTIONNAIRE'
      }
    }

    // Perform validation
    const validationResult = await validator.validateSurveySubmission(
      sanitizedData,
      questionnaire
    )

    if (!validationResult.isValid) {
      return {
        client_id: submission.client_id,
        success: false,
        error: 'Error de validación en los datos',
        error_code: 'VALIDATION_FAILED',
        validation_errors: validationResult.errors
      }
    }

    // Create survey response
    const surveyResponseData = {
      tenant_id: userProfile.tenant_id,
      questionnaire_id: sanitizedData.questionnaire_id,
      volunteer_id: userProfile.id,
      respondent_name: sanitizedData.respondent_name,
      respondent_email: sanitizedData.respondent_email || null,
      respondent_phone: sanitizedData.respondent_phone || null,
      precinct_id: sanitizedData.precinct_id || null,
      location: sanitizedData.metadata?.location ? 
        JSON.stringify(sanitizedData.metadata.location) : null,
      is_complete: !sanitizedData.is_draft,
      completion_time: sanitizedData.metadata?.completion_time ?
        new Date(sanitizedData.metadata.completion_time).getTime() -
        new Date(sanitizedData.metadata.start_time).getTime() : null,
      metadata: {
        ...sanitizedData.metadata,
        client_id: submission.client_id,
        batch_request_id: batchRequestId,
        ip_address: request.ip,
        user_agent: request.headers.get('user-agent'),
        batch_processed: true
      }
    }

    // Insert with retry logic
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
      { maxAttempts: 2, baseDelayMs: 500 },
      `batch_${sanitizedData.questionnaire_id}_${sanitizedData.respondent_name}_${userProfile.id}`
    )

    if (responseError) {
      throw new Error(`Failed to create survey response: ${responseError.message}`)
    }

    // Insert answers in batches
    if (sanitizedData.answers && sanitizedData.answers.length > 0) {
      const answersToInsert = sanitizedData.answers.map(answer => {
        const answerData: any = {
          survey_response_id: createdResponse.data.id,
          question_id: answer.question_id
        }

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

      const { error: answersError } = await networkResilience.executeWithRetry(
        async () => {
          const batchSize = 15
          for (let i = 0; i < answersToInsert.length; i += batchSize) {
            const batch = answersToInsert.slice(i, i + batchSize)
            const result = await supabase
              .from('answers')
              .insert(batch)

            if (result.error) {
              throw new Error(`Answers batch insert error: ${result.error.message}`)
            }
          }

          return { error: null }
        },
        { maxAttempts: 2 }
      )

      if (answersError) {
        // Cleanup: Delete the survey response
        await supabase
          .from('survey_responses')
          .delete()
          .eq('id', createdResponse.data.id)

        throw new Error(`Failed to insert answers: ${answersError.message}`)
      }
    }

    return {
      client_id: submission.client_id,
      success: true,
      survey_id: createdResponse.data.id
    }

  } catch (error) {
    logger.error('Single submission processing error', {
      submissionId,
      clientId: submission.client_id,
      questionnaireId: submission.questionnaire_id,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return {
      client_id: submission.client_id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown processing error',
      error_code: 'SUBMISSION_PROCESSING_ERROR'
    }
  }
}