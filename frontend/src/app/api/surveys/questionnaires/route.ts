import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Logger } from '@/lib/monitoring/logger'

const logger = new Logger('questionnaires-api')

// GET /api/surveys/questionnaires - Get active questionnaires for user's tenant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeStructure = searchParams.get('include_structure') === 'true'
    const questionnaireId = searchParams.get('id')

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Get user profile to determine tenant
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

    let query = supabase
      .from('questionnaires')
      .select(`
        id, title, description, version, language, is_active,
        metadata, created_at, updated_at
        ${includeStructure ? `,
        sections (
          id, title, order_index, is_required,
          questions (
            id, text, type, is_required, order_index,
            options, validation_rules, conditional_logic
          )
        )` : ''}
      `)
      .eq('tenant_id', userProfile.tenant_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    // If specific questionnaire requested
    if (questionnaireId) {
      query = query.eq('id', questionnaireId).single()
    }

    const { data, error } = await query

    if (error) {
      logger.error('Error fetching questionnaires', {
        userId: user.id,
        tenantId: userProfile.tenant_id,
        questionnaireId,
        error: error.message
      })

      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Cuestionario no encontrado' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: 'Error al obtener cuestionarios' },
        { status: 500 }
      )
    }

    // Transform data if including structure
    let responseData = data
    
    if (includeStructure) {
      if (Array.isArray(data)) {
        responseData = data.map(transformQuestionnaire)
      } else if (data) {
        responseData = transformQuestionnaire(data)
      }
    }

    logger.info('Questionnaires retrieved', {
      userId: user.id,
      tenantId: userProfile.tenant_id,
      count: Array.isArray(responseData) ? responseData.length : 1,
      includeStructure
    })

    return NextResponse.json({
      success: true,
      data: responseData
    })

  } catch (error) {
    logger.error('Questionnaires API error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * Transform questionnaire data to match frontend expectations
 */
function transformQuestionnaire(data: any) {
  const sections = data.sections?.map((section: any) => {
    const questions = section.questions?.map((question: any) => ({
      id: question.id,
      text: question.text,
      type: question.type,
      required: question.is_required,
      order: question.order_index,
      options: question.options,
      validation: question.validation_rules,
      conditional: question.conditional_logic
    })) || []

    // Sort questions by order
    questions.sort((a: any, b: any) => a.order - b.order)

    return {
      id: section.id,
      title: section.title,
      order: section.order_index,
      required: section.is_required,
      questions
    }
  }) || []

  // Sort sections by order
  sections.sort((a: any, b: any) => a.order - b.order)

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    version: data.version,
    language: data.language,
    sections,
    metadata: {
      created_at: data.created_at,
      updated_at: data.updated_at,
      is_active: data.is_active,
      total_questions: sections.reduce((total: number, section: any) => 
        total + section.questions.length, 0),
      total_sections: sections.length,
      estimated_completion_time: data.metadata?.estimated_completion_time || '10-15 minutos',
      ...data.metadata
    }
  }
}