import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Logger } from '@/lib/monitoring/logger'

const logger = new Logger('draft-cleanup-api')

// POST /api/surveys/drafts/cleanup - Clean up old drafts
export async function POST(request: NextRequest) {
  const requestId = `cleanup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  try {
    logger.info('Draft cleanup request started', {
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
      .select('id, tenant_id, rol')
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

    // Parse request body for cleanup criteria
    const body = await request.json()
    const {
      older_than_days = 7,
      questionnaire_id,
      keep_recent = 3, // Keep the 3 most recent drafts per questionnaire
      dry_run = false
    } = body

    // Calculate cutoff date
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - older_than_days)
    const cutoffISO = cutoffDate.toISOString()

    logger.info('Draft cleanup criteria', {
      requestId,
      userId: user.id,
      olderThanDays: older_than_days,
      questionnaireId: questionnaire_id,
      keepRecent: keep_recent,
      cutoffDate: cutoffISO,
      dryRun: dry_run
    })

    // Find drafts to clean up
    let query = supabase
      .from('survey_responses')
      .select('id, questionnaire_id, respondent_name, created_at, updated_at')
      .eq('volunteer_id', userProfile.id)
      .eq('is_complete', false)
      .lt('updated_at', cutoffISO)
      .order('updated_at', { ascending: false })

    if (questionnaire_id) {
      query = query.eq('questionnaire_id', questionnaire_id)
    }

    const { data: candidateDrafts, error: fetchError } = await query

    if (fetchError) {
      throw new Error(`Error fetching drafts for cleanup: ${fetchError.message}`)
    }

    if (!candidateDrafts || candidateDrafts.length === 0) {
      logger.info('No drafts found for cleanup', {
        requestId,
        userId: user.id,
        cutoffDate: cutoffISO
      })

      return NextResponse.json({
        success: true,
        request_id: requestId,
        data: {
          drafts_found: 0,
          drafts_deleted: 0,
          kept_recent: 0,
          dry_run
        }
      })
    }

    // Group drafts by questionnaire to preserve recent ones
    const draftsByQuestionnaire = candidateDrafts.reduce((acc, draft) => {
      const qId = draft.questionnaire_id
      if (!acc[qId]) {
        acc[qId] = []
      }
      acc[qId].push(draft)
      return acc
    }, {} as Record<string, typeof candidateDrafts>)

    // Determine which drafts to delete
    const draftsToDelete: string[] = []
    let draftsKept = 0

    for (const [qId, drafts] of Object.entries(draftsByQuestionnaire)) {
      // Sort by update time (newest first)
      drafts.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      
      // Keep the most recent ones, delete the rest
      const toKeep = drafts.slice(0, keep_recent)
      const toDelete = drafts.slice(keep_recent)
      
      draftsKept += toKeep.length
      draftsToDelete.push(...toDelete.map(d => d.id))
      
      logger.debug('Questionnaire draft cleanup analysis', {
        requestId,
        questionnaireId: qId,
        totalDrafts: drafts.length,
        toKeep: toKeep.length,
        toDelete: toDelete.length
      })
    }

    if (dry_run) {
      logger.info('Draft cleanup dry run completed', {
        requestId,
        userId: user.id,
        draftsFound: candidateDrafts.length,
        draftsToDelete: draftsToDelete.length,
        draftsToKeep: draftsKept
      })

      return NextResponse.json({
        success: true,
        request_id: requestId,
        data: {
          drafts_found: candidateDrafts.length,
          drafts_to_delete: draftsToDelete.length,
          drafts_to_keep: draftsKept,
          dry_run: true,
          preview: candidateDrafts.map(d => ({
            id: d.id,
            questionnaire_id: d.questionnaire_id,
            respondent_name: d.respondent_name,
            created_at: d.created_at,
            updated_at: d.updated_at,
            will_delete: draftsToDelete.includes(d.id)
          }))
        }
      })
    }

    // Actually delete the drafts
    let deletedCount = 0
    if (draftsToDelete.length > 0) {
      const { error: deleteError, count } = await supabase
        .from('survey_responses')
        .delete({ count: 'exact' })
        .in('id', draftsToDelete)
        .eq('volunteer_id', userProfile.id) // Extra safety check

      if (deleteError) {
        throw new Error(`Error deleting drafts: ${deleteError.message}`)
      }

      deletedCount = count || 0
    }

    logger.info('Draft cleanup completed', {
      requestId,
      userId: user.id,
      draftsFound: candidateDrafts.length,
      draftsDeleted: deletedCount,
      draftsKept: draftsKept,
      cutoffDate: cutoffISO
    })

    return NextResponse.json({
      success: true,
      request_id: requestId,
      data: {
        drafts_found: candidateDrafts.length,
        drafts_deleted: deletedCount,
        drafts_kept: draftsKept,
        cutoff_date: cutoffISO,
        dry_run: false
      }
    })

  } catch (error) {
    logger.error('Error in draft cleanup', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      {
        error: 'Error al limpiar borradores.',
        code: 'CLEANUP_ERROR',
        request_id: requestId
      },
      { status: 500 }
    )
  }
}