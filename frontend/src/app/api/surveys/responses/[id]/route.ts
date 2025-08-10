import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SurveySubmissionValidator } from '@/lib/validation/server-validation'
import { InputSanitizer } from '@/lib/security/input-sanitizer'
import { Logger } from '@/lib/monitoring/logger'

const validator = new SurveySubmissionValidator()
const sanitizer = new InputSanitizer()
const logger = new Logger('survey-api')

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

// GET /api/surveys/responses/[id] - Get draft survey response
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, tenant_id, rol')
      .eq('auth_user_id', user.id)
      .eq('activo', true)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'Usuario no válido' },
        { status: 403 }
      )
    }

    // Get survey response with answers
    const { data: response, error: responseError } = await supabase
      .from('survey_responses')
      .select(`
        *,
        answers (*),
        questionnaires (id, title, is_active)
      `)
      .eq('id', id)
      .eq('volunteer_id', userProfile.id) // Ensure user can only access their own responses
      .single()

    if (responseError || !response) {
      logger.warn('Survey response not found or unauthorized access', {
        responseId: id,
        userId: user.id,
        error: responseError?.message
      })

      return NextResponse.json(
        { error: 'Encuesta no encontrada' },
        { status: 404 }
      )
    }

    // Transform answers to frontend format
    const answers = response.answers?.map((answer: any) => ({
      questionId: answer.question_id,
      value: answer.answer_json || answer.answer_numeric || answer.answer_value,
      skipped: false // You might want to add this field to the database
    })) || []

    logger.info('Survey response retrieved', {
      responseId: id,
      userId: user.id,
      isDraft: !response.is_complete
    })

    return NextResponse.json({
      success: true,
      data: {
        id: response.id,
        questionnaire_id: response.questionnaire_id,
        volunteer_id: response.volunteer_id,
        respondent_name: response.respondent_name,
        respondent_email: response.respondent_email,
        respondent_phone: response.respondent_phone,
        precinct_id: response.precinct_id,
        answers,
        is_complete: response.is_complete,
        completion_time: response.completion_time,
        location: response.location ? JSON.parse(response.location) : null,
        created_at: response.created_at,
        updated_at: response.updated_at,
        questionnaire: response.questionnaires
      }
    })

  } catch (error) {
    logger.error('Error retrieving survey response', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/surveys/responses/[id] - Update draft survey response
export async function PUT(request: NextRequest, { params }: RouteContext) {
  const startTime = Date.now()
  
  try {
    const { id } = await params
    const body = await request.json()

    // Sanitize input data
    const sanitizedData = sanitizer.sanitizeSurveyData(body)

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, tenant_id, rol')
      .eq('auth_user_id', user.id)
      .eq('activo', true)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'Usuario no válido' },
        { status: 403 }
      )
    }

    // Verify the response exists and belongs to the user
    const { data: existingResponse, error: existingError } = await supabase
      .from('survey_responses')
      .select('id, volunteer_id, is_complete')
      .eq('id', id)
      .eq('volunteer_id', userProfile.id)
      .single()

    if (existingError || !existingResponse) {
      logger.warn('Draft survey response not found or unauthorized', {
        responseId: id,
        userId: user.id,
        error: existingError?.message
      })

      return NextResponse.json(
        { error: 'Borrador no encontrado' },
        { status: 404 }
      )
    }

    // Don't allow updating completed surveys
    if (existingResponse.is_complete) {
      return NextResponse.json(
        { error: 'No se puede modificar una encuesta completada' },
        { status: 400 }
      )
    }

    // Update survey response metadata
    const updateData = {
      respondent_name: sanitizedData.respondent_name,
      respondent_email: sanitizedData.respondent_email || null,
      respondent_phone: sanitizedData.respondent_phone || null,
      precinct_id: sanitizedData.precinct_id || null,
      location: sanitizedData.metadata?.location ? 
        JSON.stringify(sanitizedData.metadata.location) : null,
      is_complete: !sanitizedData.is_draft,
      completion_time: sanitizedData.is_draft ? null : 
        (sanitizedData.metadata?.completion_time ? 
          new Date(sanitizedData.metadata.completion_time).getTime() - 
          new Date(sanitizedData.metadata.start_time).getTime() : null),
      updated_at: new Date().toISOString(),
      metadata: {
        ...existingResponse.metadata,
        last_updated: new Date().toISOString(),
        device_info: sanitizedData.metadata.device_info,
        ip_address: request.ip
      }
    }

    const { error: updateError } = await supabase
      .from('survey_responses')
      .update(updateData)
      .eq('id', id)

    if (updateError) {
      logger.error('Failed to update survey response', {
        responseId: id,
        userId: user.id,
        error: updateError.message
      })

      throw new Error(`Error al actualizar la encuesta: ${updateError.message}`)
    }

    // Delete existing answers
    const { error: deleteError } = await supabase
      .from('answers')
      .delete()
      .eq('survey_response_id', id)

    if (deleteError) {
      logger.error('Failed to delete existing answers', {
        responseId: id,
        userId: user.id,
        error: deleteError.message
      })
    }

    // Insert new answers if provided
    if (sanitizedData.answers && sanitizedData.answers.length > 0) {
      const answersToInsert = sanitizedData.answers.map(answer => {
        const answerData: any = {
          survey_response_id: id,
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
        logger.error('Failed to insert updated answers', {
          responseId: id,
          userId: user.id,
          error: answersError.message
        })

        throw new Error(`Error al guardar las respuestas: ${answersError.message}`)
      }
    }

    const responseTime = Date.now() - startTime

    logger.info('Survey response updated successfully', {
      responseId: id,
      userId: user.id,
      responseTime,
      isDraft: sanitizedData.is_draft,
      answerCount: sanitizedData.answers?.length || 0
    })

    return NextResponse.json({
      success: true,
      data: {
        id,
        status: sanitizedData.is_draft ? 'draft' : 'completed',
        response_time: responseTime,
        updated_at: updateData.updated_at
      }
    })

  } catch (error) {
    logger.error('Error updating survey response', {
      responseId: params.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      { 
        error: 'Error interno del servidor. Por favor, intente nuevamente.',
        details: process.env.NODE_ENV === 'development' ? 
          error instanceof Error ? error.message : 'Unknown error' : undefined
      },
      { status: 500 }
    )
  }
}

// DELETE /api/surveys/responses/[id] - Delete draft survey response
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, tenant_id, rol')
      .eq('auth_user_id', user.id)
      .eq('activo', true)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'Usuario no válido' },
        { status: 403 }
      )
    }

    // Verify the response exists and belongs to the user
    const { data: existingResponse, error: existingError } = await supabase
      .from('survey_responses')
      .select('id, volunteer_id, is_complete')
      .eq('id', id)
      .eq('volunteer_id', userProfile.id)
      .single()

    if (existingError || !existingResponse) {
      return NextResponse.json(
        { error: 'Borrador no encontrado' },
        { status: 404 }
      )
    }

    // Only allow deletion of draft responses
    if (existingResponse.is_complete) {
      return NextResponse.json(
        { error: 'No se puede eliminar una encuesta completada' },
        { status: 400 }
      )
    }

    // Delete the survey response (answers will be deleted by cascade)
    const { error: deleteError } = await supabase
      .from('survey_responses')
      .delete()
      .eq('id', id)

    if (deleteError) {
      logger.error('Failed to delete survey response', {
        responseId: id,
        userId: user.id,
        error: deleteError.message
      })

      throw new Error(`Error al eliminar el borrador: ${deleteError.message}`)
    }

    logger.info('Draft survey response deleted', {
      responseId: id,
      userId: user.id
    })

    return NextResponse.json({
      success: true,
      message: 'Borrador eliminado exitosamente'
    })

  } catch (error) {
    logger.error('Error deleting survey response', {
      responseId: params.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}