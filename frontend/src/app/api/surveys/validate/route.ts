import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateField } from '@/lib/validation/survey-validation'
import { InputSanitizer } from '@/lib/security/input-sanitizer'
import { RateLimiter } from '@/lib/security/rate-limiter'
import { Logger } from '@/lib/monitoring/logger'

// Rate limiter for validation requests (more lenient than submission)
const rateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 validation requests per minute
  keyGenerator: (req) => req.ip || 'unknown'
})

const sanitizer = new InputSanitizer()
const logger = new Logger('survey-validation-api')

interface ValidationRequest {
  questionnaire_id: string
  question_id: string
  answer_value: any
  all_answers?: Record<string, any> // For conditional validation
}

interface BatchValidationRequest {
  questionnaire_id: string
  answers: Record<string, any>
}

// POST /api/surveys/validate - Validate individual field or batch of fields
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimiter.checkLimit(request)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: 'Demasiadas solicitudes de validación',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: rateLimitResult.retryAfter
        },
        { status: 429 }
      )
    }

    const body = await request.json()

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Determine if this is single field or batch validation
    if (body.question_id) {
      // Single field validation
      return await validateSingleField(body, supabase)
    } else if (body.answers) {
      // Batch validation
      return await validateBatch(body, supabase)
    } else {
      return NextResponse.json(
        { 
          error: 'Solicitud de validación inválida',
          details: 'Se requiere question_id o answers'
        },
        { status: 400 }
      )
    }

  } catch (error) {
    logger.error('Validation API error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * Validate a single field
 */
async function validateSingleField(data: ValidationRequest, supabase: any) {
  try {
    // Sanitize input
    const questionId = sanitizer.sanitizeString(data.question_id, 100)
    const questionnaireId = sanitizer.sanitizeString(data.questionnaire_id, 100)
    
    if (!questionId || !questionnaireId) {
      return NextResponse.json(
        { 
          error: 'Parámetros requeridos faltantes',
          details: 'question_id y questionnaire_id son requeridos'
        },
        { status: 400 }
      )
    }

    // Get question definition from database
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select(`
        id, text, type, is_required, validation_rules, conditional_logic,
        sections!inner(questionnaire_id)
      `)
      .eq('id', questionId)
      .eq('sections.questionnaire_id', questionnaireId)
      .single()

    if (questionError || !question) {
      logger.warn('Question not found for validation', {
        questionId,
        questionnaireId,
        error: questionError?.message
      })

      return NextResponse.json(
        { 
          error: 'Pregunta no encontrada',
          field: questionId
        },
        { status: 404 }
      )
    }

    // Transform to validation format
    const questionForValidation = {
      id: question.id,
      text: question.text,
      type: question.type,
      required: question.is_required,
      validation: question.validation_rules,
      conditional: question.conditional_logic
    }

    // Check conditional logic if all answers provided
    if (questionForValidation.conditional && data.all_answers) {
      const conditionalValue = data.all_answers[questionForValidation.conditional.questionId]
      if (conditionalValue !== questionForValidation.conditional.value) {
        // Question should be hidden, so it's valid by default
        return NextResponse.json({
          valid: true,
          field: questionId,
          message: null,
          shouldShow: false
        })
      }
    }

    // Validate the field
    const validationError = validateField(questionForValidation, data.answer_value)

    return NextResponse.json({
      valid: !validationError,
      field: questionId,
      message: validationError,
      shouldShow: true
    })

  } catch (error) {
    logger.error('Single field validation error', {
      questionId: data.question_id,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      { error: 'Error de validación' },
      { status: 500 }
    )
  }
}

/**
 * Validate batch of fields
 */
async function validateBatch(data: BatchValidationRequest, supabase: any) {
  try {
    const questionnaireId = sanitizer.sanitizeString(data.questionnaire_id, 100)
    
    if (!questionnaireId || !data.answers || typeof data.answers !== 'object') {
      return NextResponse.json(
        { 
          error: 'Parámetros requeridos faltantes',
          details: 'questionnaire_id y answers son requeridos'
        },
        { status: 400 }
      )
    }

    // Get all questions for the questionnaire
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select(`
        id, text, type, is_required, validation_rules, conditional_logic,
        sections!inner(questionnaire_id, order_index)
      `)
      .eq('sections.questionnaire_id', questionnaireId)
      .order('sections.order_index')
      .order('order_index')

    if (questionsError) {
      logger.error('Error fetching questions for batch validation', {
        questionnaireId,
        error: questionsError.message
      })

      return NextResponse.json(
        { error: 'Error al obtener preguntas del cuestionario' },
        { status: 500 }
      )
    }

    // Validate each answer
    const validationResults: Record<string, {
      valid: boolean
      message: string | null
      shouldShow: boolean
    }> = {}

    const overallStats = {
      total_questions: questions.length,
      answered_questions: 0,
      valid_answers: 0,
      errors: 0,
      completion_percentage: 0
    }

    for (const question of questions) {
      const questionForValidation = {
        id: question.id,
        text: question.text,
        type: question.type,
        required: question.is_required,
        validation: question.validation_rules,
        conditional: question.conditional_logic
      }

      const answer = data.answers[question.id]
      let shouldShow = true

      // Check conditional logic
      if (questionForValidation.conditional) {
        const conditionalValue = data.answers[questionForValidation.conditional.questionId]
        shouldShow = conditionalValue === questionForValidation.conditional.value
      }

      if (!shouldShow) {
        validationResults[question.id] = {
          valid: true,
          message: null,
          shouldShow: false
        }
        continue
      }

      // Count as answered if not empty
      const hasAnswer = answer !== undefined && answer !== null && answer !== '' && 
                       (!Array.isArray(answer) || answer.length > 0)
      
      if (hasAnswer) {
        overallStats.answered_questions++
      }

      // Validate the field
      const validationError = validateField(questionForValidation, answer)
      const isValid = !validationError

      if (isValid && hasAnswer) {
        overallStats.valid_answers++
      } else if (validationError) {
        overallStats.errors++
      }

      validationResults[question.id] = {
        valid: isValid,
        message: validationError,
        shouldShow: true
      }
    }

    // Calculate completion percentage based on visible questions
    const visibleQuestions = Object.values(validationResults).filter(r => r.shouldShow).length
    overallStats.completion_percentage = visibleQuestions > 0 ? 
      Math.round((overallStats.answered_questions / visibleQuestions) * 100) : 0

    logger.debug('Batch validation completed', {
      questionnaireId,
      stats: overallStats
    })

    return NextResponse.json({
      valid: overallStats.errors === 0,
      results: validationResults,
      stats: overallStats
    })

  } catch (error) {
    logger.error('Batch validation error', {
      questionnaireId: data.questionnaire_id,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      { error: 'Error de validación por lotes' },
      { status: 500 }
    )
  }
}

// GET /api/surveys/validate - Get validation rules for a questionnaire
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const questionnaireId = searchParams.get('questionnaire_id')

    if (!questionnaireId) {
      return NextResponse.json(
        { error: 'questionnaire_id es requerido' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Get validation rules for all questions in questionnaire
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select(`
        id, text, type, is_required, validation_rules, conditional_logic,
        sections!inner(questionnaire_id, title, order_index)
      `)
      .eq('sections.questionnaire_id', questionnaireId)
      .order('sections.order_index')
      .order('order_index')

    if (questionsError) {
      logger.error('Error fetching validation rules', {
        questionnaireId,
        error: questionsError.message
      })

      return NextResponse.json(
        { error: 'Error al obtener reglas de validación' },
        { status: 500 }
      )
    }

    // Group questions by section and format for frontend
    const sections: Record<string, any> = {}
    
    for (const question of questions) {
      const sectionTitle = question.sections.title
      
      if (!sections[sectionTitle]) {
        sections[sectionTitle] = {
          title: sectionTitle,
          order: question.sections.order_index,
          questions: []
        }
      }

      sections[sectionTitle].questions.push({
        id: question.id,
        text: question.text,
        type: question.type,
        required: question.is_required,
        validation: question.validation_rules,
        conditional: question.conditional_logic
      })
    }

    return NextResponse.json({
      success: true,
      questionnaire_id: questionnaireId,
      sections: Object.values(sections).sort((a, b) => a.order - b.order),
      total_questions: questions.length
    })

  } catch (error) {
    logger.error('Error getting validation rules', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}