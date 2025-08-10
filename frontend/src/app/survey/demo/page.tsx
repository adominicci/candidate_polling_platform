'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SurveyForm } from '@/components/forms/survey-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Questionnaire, SurveyResponse } from '@/types/survey'
import { CheckCircleIcon } from '@heroicons/react/24/outline'

export default function SurveyDemoPage() {
  const router = useRouter()
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Demo profile for testing
  const demoProfile = {
    id: 'demo-user',
    tenant_id: 'demo-tenant',
    auth_user_id: 'demo-auth',
    email: 'demo@ppd.pr',
    nombre_completo: 'Usuario Demo',
    telefono: '787-555-0123',
    rol: 'volunteer' as const,
    activo: true,
    ultimo_acceso: null,
    configuracion_perfil: null,
    created_at: null,
    updated_at: null,
  }

  // Load questionnaire demo
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Load questionnaire from public folder
        const response = await fetch('/survey_questions.json')
        if (!response.ok) {
          throw new Error('Failed to load questionnaire')
        }
        const surveyQuestions = await response.json()
        
        const staticQuestionnaire: Questionnaire = {
          id: 'ppd_voter_consultation_v1',
          version: surveyQuestions.questionnaire.version,
          title: surveyQuestions.questionnaire.title,
          language: surveyQuestions.questionnaire.language,
          sections: surveyQuestions.questionnaire.sections.map(section => ({
            id: section.id,
            title: section.title,
            order: section.order,
            questions: section.questions.map(question => ({
              id: question.id,
              text: question.text,
              type: question.type as any,
              required: question.required,
              options: question.options,
              validation: question.validation,
              conditional: question.conditional,
              maxSelections: question.maxSelections,
              minSelections: question.minSelections,
              min: question.min,
              max: question.max,
              maxLength: question.maxLength,
              order: section.questions.indexOf(question) + 1
            }))
          }))
        }

        setQuestionnaire(staticQuestionnaire)

      } catch (err) {
        console.error('Error loading survey data:', err)
        setError(err instanceof Error ? err.message : 'Error al cargar la encuesta')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // Handle form submission
  const handleSubmit = async (response: SurveyResponse) => {
    setIsSubmitting(true)
    setError(null)

    try {
      // For demo, just simulate submission
      console.log('Demo submission:', response)
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setIsSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar la encuesta')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle draft saving (demo - just log it)
  const handleSaveDraft = async (response: Partial<SurveyResponse>) => {
    try {
      console.log('Demo draft save:', response)
    } catch (err) {
      console.error('Error saving draft:', err)
    }
  }

  // Go back to dashboard
  const goBackToDashboard = () => {
    router.push('/dashboard')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-600">Cargando encuesta...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">{error}</p>
            <Button onClick={goBackToDashboard} variant="outline" className="w-full">
              Volver al Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <CheckCircleIcon className="h-16 w-16 text-green-600" />
              <h2 className="text-2xl font-bold text-gray-900">
                ¡Encuesta Completada!
              </h2>
              <p className="text-gray-600">
                Gracias por participar en la consulta electoral del PPD.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <Button onClick={goBackToDashboard} className="flex-1">
                  Volver al Dashboard
                </Button>
                <Button 
                  onClick={() => window.location.reload()} 
                  variant="outline"
                  className="flex-1"
                >
                  Nueva Encuesta
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!questionnaire) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">No se pudo cargar el cuestionario.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SurveyForm
        questionnaire={questionnaire}
        userProfile={demoProfile}
        onSubmit={handleSubmit}
        onSaveDraft={handleSaveDraft}
        isSubmitting={isSubmitting}
        submitButtonText="Completar Encuesta Demo"
      />
    </div>
  )
}