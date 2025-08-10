// Survey-specific type definitions for the Candidate Polling Platform

export type QuestionType = 
  | 'text' 
  | 'radio' 
  | 'checkbox' 
  | 'scale' 
  | 'date' 
  | 'email' 
  | 'tel' 
  | 'textarea'

export interface QuestionOption {
  value: string
  label: string
}

export interface ValidationRule {
  minLength?: number
  maxLength?: number
  pattern?: string
  min?: number
  max?: number
}

export interface ConditionalLogic {
  questionId: string
  value: string
}

export interface Question {
  id: string
  text: string
  type: QuestionType
  required: boolean
  options?: QuestionOption[]
  validation?: ValidationRule
  conditional?: ConditionalLogic
  maxSelections?: number
  minSelections?: number
  min?: number
  max?: number
}

export interface Section {
  id: string
  title: string
  order: number
  questions: Question[]
}

export interface Questionnaire {
  id: string
  version: string
  title: string
  language: string
  sections: Section[]
  metadata: {
    created_at: string
    last_modified: string
    source: string
    total_questions: number
    estimated_completion_time: string
  }
}

export interface Answer {
  questionId: string
  value: string | string[] | number
}

export interface SurveyResponse {
  id?: string
  questionnaire_id: string
  volunteer_id: string
  respondent_name: string
  respondent_email?: string
  respondent_phone?: string
  precinct_id?: string
  answers: Answer[]
  is_complete: boolean
  completion_time?: number
  location?: {
    latitude: number
    longitude: number
  }
  created_at?: string
}

// Spanish language constants for the UI
export const SPANISH_LABELS = {
  SURVEY_TITLE: 'Consulta Electoral y Comunitaria',
  REQUIRED_FIELD: 'Campo requerido',
  OPTIONAL_FIELD: 'Opcional',
  SUBMIT: 'Enviar',
  SAVE_DRAFT: 'Guardar Borrador',
  NEXT_SECTION: 'Siguiente Sección',
  PREVIOUS_SECTION: 'Sección Anterior',
  COMPLETE_SURVEY: 'Completar Encuesta',
  SURVEY_COMPLETED: 'Encuesta Completada',
  THANK_YOU: 'Gracias por su participación',
  ERROR_REQUIRED: 'Este campo es requerido',
  ERROR_EMAIL: 'Ingrese un correo electrónico válido',
  ERROR_PHONE: 'Ingrese un número de teléfono válido',
  ERROR_MIN_SELECTIONS: 'Debe seleccionar al menos {min} opciones',
  ERROR_MAX_SELECTIONS: 'Puede seleccionar máximo {max} opciones',
  LOADING: 'Cargando...',
  SAVING: 'Guardando...',
  SUBMITTING: 'Enviando...',
} as const

export type SpanishLabel = keyof typeof SPANISH_LABELS