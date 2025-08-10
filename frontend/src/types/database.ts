// Database type definitions for Candidate Polling Platform
// Generated from Supabase schema - update when schema changes

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          settings: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          settings?: any | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          settings?: any | null
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          tenant_id: string
          auth_user_id: string | null
          email: string
          nombre_completo: string
          telefono: string | null
          rol: 'Admin' | 'Analyst' | 'Volunteer' | 'Manager'
          activo: boolean | null
          ultimo_acceso: string | null
          configuracion_perfil: any | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          auth_user_id?: string | null
          email: string
          nombre_completo: string
          telefono?: string | null
          rol: 'Admin' | 'Analyst' | 'Volunteer' | 'Manager'
          activo?: boolean | null
          ultimo_acceso?: string | null
          configuracion_perfil?: any | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          tenant_id?: string
          auth_user_id?: string | null
          email?: string
          nombre_completo?: string
          telefono?: string | null
          rol?: 'Admin' | 'Analyst' | 'Volunteer' | 'Manager'
          activo?: boolean | null
          ultimo_acceso?: string | null
          configuracion_perfil?: any | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      precincts: {
        Row: {
          id: string
          tenant_id: string
          number: string
          name: string
          municipality: string
          polygon: any | null
          centroid: any | null
          voter_count: number | null
          metadata: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          number: string
          name: string
          municipality: string
          polygon?: any | null
          centroid?: any | null
          voter_count?: number | null
          metadata?: any | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          number?: string
          name?: string
          municipality?: string
          polygon?: any | null
          centroid?: any | null
          voter_count?: number | null
          metadata?: any | null
          created_at?: string
          updated_at?: string
        }
      }
      questionnaires: {
        Row: {
          id: string
          tenant_id: string
          title: string
          description: string | null
          version: string
          language: string
          is_active: boolean
          metadata: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          title: string
          description?: string | null
          version: string
          language: string
          is_active?: boolean
          metadata?: any | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          title?: string
          description?: string | null
          version?: string
          language?: string
          is_active?: boolean
          metadata?: any | null
          created_at?: string
          updated_at?: string
        }
      }
      sections: {
        Row: {
          id: string
          questionnaire_id: string
          title: string
          order_index: number
          is_required: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          questionnaire_id: string
          title: string
          order_index: number
          is_required?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          questionnaire_id?: string
          title?: string
          order_index?: number
          is_required?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      questions: {
        Row: {
          id: string
          section_id: string
          text: string
          type: 'text' | 'radio' | 'checkbox' | 'scale' | 'date' | 'email' | 'tel' | 'textarea'
          is_required: boolean
          order_index: number
          options: any | null
          validation_rules: any | null
          conditional_logic: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          section_id: string
          text: string
          type: 'text' | 'radio' | 'checkbox' | 'scale' | 'date' | 'email' | 'tel' | 'textarea'
          is_required?: boolean
          order_index: number
          options?: any | null
          validation_rules?: any | null
          conditional_logic?: any | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          section_id?: string
          text?: string
          type?: 'text' | 'radio' | 'checkbox' | 'scale' | 'date' | 'email' | 'tel' | 'textarea'
          is_required?: boolean
          order_index?: number
          options?: any | null
          validation_rules?: any | null
          conditional_logic?: any | null
          created_at?: string
          updated_at?: string
        }
      }
      survey_responses: {
        Row: {
          id: string
          tenant_id: string
          questionnaire_id: string
          volunteer_id: string
          respondent_name: string
          respondent_email: string | null
          respondent_phone: string | null
          precinct_id: string | null
          location: any | null
          is_complete: boolean
          completion_time: number | null
          metadata: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          questionnaire_id: string
          volunteer_id: string
          respondent_name: string
          respondent_email?: string | null
          respondent_phone?: string | null
          precinct_id?: string | null
          location?: any | null
          is_complete?: boolean
          completion_time?: number | null
          metadata?: any | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          questionnaire_id?: string
          volunteer_id?: string
          respondent_name?: string
          respondent_email?: string | null
          respondent_phone?: string | null
          precinct_id?: string | null
          location?: any | null
          is_complete?: boolean
          completion_time?: number | null
          metadata?: any | null
          created_at?: string
          updated_at?: string
        }
      }
      walklists: {
        Row: {
          id: string
          tenant_id: string
          precinct_id: string
          assigned_to: string
          title: string
          description: string | null
          status: 'active' | 'completed' | 'paused'
          target_responses: number | null
          current_responses: number | null
          deadline: string | null
          metadata: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          precinct_id: string
          assigned_to: string
          title: string
          description?: string | null
          status?: 'active' | 'completed' | 'paused'
          target_responses?: number | null
          current_responses?: number | null
          deadline?: string | null
          metadata?: any | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          precinct_id?: string
          assigned_to?: string
          title?: string
          description?: string | null
          status?: 'active' | 'completed' | 'paused'
          target_responses?: number | null
          current_responses?: number | null
          deadline?: string | null
          metadata?: any | null
          created_at?: string
          updated_at?: string
        }
      }
      answers: {
        Row: {
          id: string
          survey_response_id: string
          question_id: string
          answer_value: string | null
          answer_numeric: number | null
          answer_json: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          survey_response_id: string
          question_id: string
          answer_value?: string | null
          answer_numeric?: number | null
          answer_json?: any | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          survey_response_id?: string
          question_id?: string
          answer_value?: string | null
          answer_numeric?: number | null
          answer_json?: any | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      // Add views here when they are created
    }
    Functions: {
      // Add functions here when they are created
    }
    Enums: {
      user_role: 'Admin' | 'Analyst' | 'Volunteer' | 'Manager'
      question_type: 'text' | 'radio' | 'checkbox' | 'scale' | 'date' | 'email' | 'tel' | 'textarea'
      walklist_status: 'active' | 'completed' | 'paused'
    }
  }
}

// Type aliases for easier usage
export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']
export type UserRole = Database['public']['Enums']['user_role']