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

    // Build the query using correct field names from database schema
    const baseQuery = supabase
      .from('questionnaires')
      .select(`
        id, titulo, descripcion, version, estado, configuracion_formulario, metadatos, 
        total_secciones, total_preguntas, created_at, updated_at
        ${includeStructure ? `,
        sections (
          id, titulo, order_index, is_required,
          questions (
            id, text, type, order_index, is_required,
            options, validation_rules, conditional_logic
          )
        )` : ''}
      `)
      .eq('tenant_id', userProfile.tenant_id)
      .eq('estado', 'Activo')

    let data, error

    // Execute query based on whether specific questionnaire requested
    if (questionnaireId) {
      const result = await baseQuery
        .eq('id', questionnaireId)
        .single()
      data = result.data
      error = result.error
    } else {
      const result = await baseQuery
        .order('created_at', { ascending: false })
      data = result.data
      error = result.error
    }

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
    let responseData: any = data
    
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
 * Maps Spanish database field names to English frontend interface
 */
function transformQuestionnaire(data: any) {
  const sections = data.sections?.map((section: any) => {
    const questions = section.questions?.map((question: any) => ({
      id: question.id,
      text: question.titulo, // Use Spanish field name
      type: question.tipo, // Use Spanish field name
      required: question.requerida || false, // Use Spanish field name
      order: question.orden, // Use Spanish field name
      options: question.opciones || [],
      validation: question.validaciones || {},
      conditional: question.condiciones_visibilidad || {}
    })) || []

    // Sort questions by order
    questions.sort((a: any, b: any) => a.order - b.order)

    return {
      id: section.id,
      title: section.titulo, // Use Spanish field name
      order: section.orden, // Use Spanish field name
      required: section.requerida || false, // Use Spanish field name
      questions
    }
  }) || []

  // Sort sections by order
  sections.sort((a: any, b: any) => a.order - b.order)

  // Extract configuration and metadata
  const config = data.configuracion_formulario || {}
  const metadata = data.metadatos || {}

  return {
    id: data.id,
    title: data.titulo, // Use Spanish field name
    description: data.descripcion, // Use Spanish field name
    version: data.version,
    language: config.language || 'es',
    status: data.estado,
    sections,
    configuration: {
      mobile_optimized: config.mobile_optimized || true,
      allow_partial_save: config.allow_partial_save || true,
      estimated_completion_time: config.estimated_completion_time || '10-15 minutos',
      ...config
    },
    metadata: {
      created_at: data.created_at,
      updated_at: data.updated_at,
      total_questions: data.total_preguntas || sections.reduce((total: number, section: any) => 
        total + section.questions.length, 0),
      total_sections: data.total_secciones || sections.length,
      source: metadata.source || 'CUESTIONARIO CONSULTA DISTRITO 23',
      ...metadata
    }
  }
}