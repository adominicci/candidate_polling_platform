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
        id, titulo, descripcion, version, metadatos, created_at, updated_at,
        estado, total_secciones, total_preguntas
        ${includeStructure ? `,
        sections (
          id, titulo, descripcion, orden, visible, requerida,
          condiciones_visibilidad, configuracion_seccion,
          questions (
            id, titulo, descripcion, tipo, orden, requerida, visible,
            opciones, validaciones, condiciones_visibilidad, logica_salto,
            escala_minima, escala_maxima, etiquetas_escala, 
            ayuda_texto, placeholder, configuracion_pregunta
          )
        )` : ''}
      `)
      .eq('tenant_id', userProfile.tenant_id)
      .eq('estado', 'Activo')
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
      text: question.titulo,
      description: question.descripcion,
      placeholder: question.placeholder,
      type: question.tipo,
      required: question.requerida,
      visible: question.visible,
      order: question.orden,
      options: question.opciones || [],
      validation: question.validaciones || {},
      conditional: question.condiciones_visibilidad || {},
      skip_logic: question.logica_salto || {},
      help_text: question.ayuda_texto,
      scale_min: question.escala_minima,
      scale_max: question.escala_maxima,
      scale_labels: question.etiquetas_escala || {},
      configuration: question.configuracion_pregunta || {}
    })) || []

    // Sort questions by order
    questions.sort((a: any, b: any) => a.order - b.order)

    return {
      id: section.id,
      title: section.titulo,
      description: section.descripcion,
      order: section.orden,
      visible: section.visible,
      required: section.requerida,
      visibility_conditions: section.condiciones_visibilidad || {},
      configuration: section.configuracion_seccion || {},
      questions
    }
  }) || []

  // Sort sections by order
  sections.sort((a: any, b: any) => a.order - b.order)

  return {
    id: data.id,
    title: data.titulo,
    description: data.descripcion,
    version: data.version,
    status: data.estado,
    language: 'es',
    sections,
    metadata: {
      created_at: data.created_at,
      updated_at: data.updated_at,
      total_questions: data.total_preguntas || sections.reduce((total: number, section: any) => 
        total + section.questions.length, 0),
      total_sections: data.total_secciones || sections.length,
      estimated_completion_time: data.metadatos?.estimated_completion_time || '10-15 minutos',
      source: data.metadatos?.source || 'CUESTIONARIO CONSULTA DISTRITO 23',
      ...data.metadatos
    }
  }
}