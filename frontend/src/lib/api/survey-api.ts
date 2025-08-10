import { createClient } from '@/lib/supabase/client'
import { SurveyResponse, Answer, Questionnaire } from '@/types/survey'
import { Database } from '@/types/database'

type SurveyResponseRow = Database['public']['Tables']['survey_responses']['Row']
type SurveyResponseInsert = Database['public']['Tables']['survey_responses']['Insert']
type AnswerInsert = Database['public']['Tables']['answers']['Insert']

export class SurveyApiError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'SurveyApiError'
  }
}

export class SurveyApi {
  private supabase = createClient()

  /**
   * Submit a completed survey response
   */
  async submitSurveyResponse(response: SurveyResponse): Promise<{ id: string }> {
    try {
      // Start a transaction-like operation
      const { data: surveyResponseData, error: surveyError } = await this.supabase
        .from('survey_responses')
        .insert({
          questionnaire_id: response.questionnaire_id,
          volunteer_id: response.volunteer_id,
          respondent_name: response.respondent_name,
          respondent_email: response.respondent_email || null,
          respondent_phone: response.respondent_phone || null,
          precinct_id: response.precinct_id || null,
          is_complete: response.is_complete,
          completion_time: response.completion_time || null,
          location: response.location || null
        } as SurveyResponseInsert)
        .select('id')
        .single()

      if (surveyError) {
        throw new SurveyApiError(
          `Error al guardar la encuesta: ${surveyError.message}`, 
          surveyError.code
        )
      }

      if (!surveyResponseData) {
        throw new SurveyApiError('No se pudo obtener el ID de la encuesta guardada')
      }

      // Insert all answers
      if (response.answers && response.answers.length > 0) {
        const answersToInsert: AnswerInsert[] = response.answers.map(answer => ({
          survey_response_id: surveyResponseData.id,
          question_id: answer.questionId,
          answer_value: this.serializeAnswerValue(answer.value)
        }))

        const { error: answersError } = await this.supabase
          .from('answers')
          .insert(answersToInsert)

        if (answersError) {
          // Try to clean up the survey response if answers failed
          await this.supabase
            .from('survey_responses')
            .delete()
            .eq('id', surveyResponseData.id)

          throw new SurveyApiError(
            `Error al guardar las respuestas: ${answersError.message}`,
            answersError.code
          )
        }
      }

      return { id: surveyResponseData.id }
    } catch (error) {
      if (error instanceof SurveyApiError) {
        throw error
      }
      throw new SurveyApiError(
        `Error inesperado al enviar la encuesta: ${error instanceof Error ? error.message : 'Error desconocido'}`
      )
    }
  }

  /**
   * Save a draft survey response
   */
  async saveDraftResponse(response: Partial<SurveyResponse>, existingId?: string): Promise<{ id: string }> {
    try {
      if (existingId) {
        // Update existing draft
        const { error: updateError } = await this.supabase
          .from('survey_responses')
          .update({
            respondent_name: response.respondent_name || null,
            respondent_email: response.respondent_email || null,
            respondent_phone: response.respondent_phone || null,
            precinct_id: response.precinct_id || null,
            is_complete: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingId)

        if (updateError) {
          throw new SurveyApiError(
            `Error al actualizar borrador: ${updateError.message}`,
            updateError.code
          )
        }

        // Delete existing answers and insert new ones
        await this.supabase
          .from('answers')
          .delete()
          .eq('survey_response_id', existingId)

        if (response.answers && response.answers.length > 0) {
          const answersToInsert: AnswerInsert[] = response.answers.map(answer => ({
            survey_response_id: existingId,
            question_id: answer.questionId,
            answer_value: this.serializeAnswerValue(answer.value)
          }))

          const { error: answersError } = await this.supabase
            .from('answers')
            .insert(answersToInsert)

          if (answersError) {
            throw new SurveyApiError(
              `Error al guardar respuestas del borrador: ${answersError.message}`,
              answersError.code
            )
          }
        }

        return { id: existingId }
      } else {
        // Create new draft
        const { data: surveyResponseData, error: surveyError } = await this.supabase
          .from('survey_responses')
          .insert({
            questionnaire_id: response.questionnaire_id!,
            volunteer_id: response.volunteer_id!,
            respondent_name: response.respondent_name || null,
            respondent_email: response.respondent_email || null,
            respondent_phone: response.respondent_phone || null,
            precinct_id: response.precinct_id || null,
            is_complete: false
          } as SurveyResponseInsert)
          .select('id')
          .single()

        if (surveyError) {
          throw new SurveyApiError(
            `Error al crear borrador: ${surveyError.message}`,
            surveyError.code
          )
        }

        if (!surveyResponseData) {
          throw new SurveyApiError('No se pudo crear el borrador')
        }

        // Insert answers if any
        if (response.answers && response.answers.length > 0) {
          const answersToInsert: AnswerInsert[] = response.answers.map(answer => ({
            survey_response_id: surveyResponseData.id,
            question_id: answer.questionId,
            answer_value: this.serializeAnswerValue(answer.value)
          }))

          const { error: answersError } = await this.supabase
            .from('answers')
            .insert(answersToInsert)

          if (answersError) {
            // Clean up the survey response if answers failed
            await this.supabase
              .from('survey_responses')
              .delete()
              .eq('id', surveyResponseData.id)

            throw new SurveyApiError(
              `Error al guardar respuestas del borrador: ${answersError.message}`,
              answersError.code
            )
          }
        }

        return { id: surveyResponseData.id }
      }
    } catch (error) {
      if (error instanceof SurveyApiError) {
        throw error
      }
      throw new SurveyApiError(
        `Error inesperado al guardar borrador: ${error instanceof Error ? error.message : 'Error desconocido'}`
      )
    }
  }

  /**
   * Get questionnaire by ID
   */
  async getQuestionnaire(questionnaireId: string): Promise<Questionnaire | null> {
    try {
      const { data, error } = await this.supabase
        .from('questionnaires')
        .select(`
          *,
          sections (
            *,
            questions (
              *
            )
          )
        `)
        .eq('id', questionnaireId)
        .eq('activo', true)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found
        }
        throw new SurveyApiError(
          `Error al obtener cuestionario: ${error.message}`,
          error.code
        )
      }

      return this.transformQuestionnaireData(data)
    } catch (error) {
      if (error instanceof SurveyApiError) {
        throw error
      }
      throw new SurveyApiError(
        `Error inesperado al obtener cuestionario: ${error instanceof Error ? error.message : 'Error desconocido'}`
      )
    }
  }

  /**
   * Get draft survey response for editing
   */
  async getDraftResponse(volunteerId: string, questionnaireId: string): Promise<SurveyResponse | null> {
    try {
      const { data, error } = await this.supabase
        .from('survey_responses')
        .select(`
          *,
          answers (*)
        `)
        .eq('volunteer_id', volunteerId)
        .eq('questionnaire_id', questionnaireId)
        .eq('is_complete', false)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found
        }
        throw new SurveyApiError(
          `Error al obtener borrador: ${error.message}`,
          error.code
        )
      }

      // Transform data to match SurveyResponse type
      const answers: Answer[] = data.answers?.map((answer: any) => ({
        questionId: answer.question_id,
        value: this.deserializeAnswerValue(answer.answer_value)
      })) || []

      return {
        id: data.id,
        questionnaire_id: data.questionnaire_id,
        volunteer_id: data.volunteer_id,
        respondent_name: data.respondent_name || '',
        respondent_email: data.respondent_email || undefined,
        respondent_phone: data.respondent_phone || undefined,
        precinct_id: data.precinct_id || undefined,
        answers,
        is_complete: data.is_complete,
        completion_time: data.completion_time || undefined,
        location: data.location || undefined,
        created_at: data.created_at
      }
    } catch (error) {
      if (error instanceof SurveyApiError) {
        throw error
      }
      throw new SurveyApiError(
        `Error inesperado al obtener borrador: ${error instanceof Error ? error.message : 'Error desconocido'}`
      )
    }
  }

  /**
   * Serialize answer value for storage
   */
  private serializeAnswerValue(value: any): string {
    if (Array.isArray(value)) {
      return JSON.stringify(value)
    }
    return String(value)
  }

  /**
   * Deserialize answer value from storage
   */
  private deserializeAnswerValue(value: string): any {
    try {
      // Try to parse as JSON first (for arrays)
      return JSON.parse(value)
    } catch {
      // If not JSON, return as string or convert to number if it looks like one
      if (!isNaN(Number(value)) && value !== '') {
        return Number(value)
      }
      return value
    }
  }

  /**
   * Transform database questionnaire data to our Questionnaire type
   */
  private transformQuestionnaireData(data: any): Questionnaire {
    const sections = data.sections?.map((section: any) => ({
      id: section.id,
      title: section.titulo,
      order: section.orden,
      questions: section.questions?.map((question: any) => ({
        id: question.id,
        text: question.texto,
        type: question.tipo,
        required: question.requerido,
        options: question.opciones ? JSON.parse(question.opciones) : undefined,
        validation: question.validacion ? JSON.parse(question.validacion) : undefined,
        conditional: question.condicional ? JSON.parse(question.condicional) : undefined,
        maxSelections: question.max_selecciones,
        minSelections: question.min_selecciones,
        min: question.min_valor,
        max: question.max_valor
      })) || []
    })) || []

    return {
      id: data.id,
      version: data.version,
      title: data.titulo,
      language: data.idioma,
      sections: sections.sort((a: any, b: any) => a.order - b.order),
      metadata: {
        created_at: data.created_at,
        last_modified: data.updated_at,
        source: data.fuente || '',
        total_questions: sections.reduce((total: any, section: any) => total + section.questions.length, 0),
        estimated_completion_time: data.tiempo_estimado || '10-15 minutos'
      }
    }
  }
}

// Export singleton instance
export const surveyApi = new SurveyApi()