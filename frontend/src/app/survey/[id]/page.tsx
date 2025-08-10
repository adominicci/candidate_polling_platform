'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { SurveyForm } from '@/components/forms/survey-form'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Questionnaire, SurveyResponse } from '@/types/survey'
import { surveyApi, SurveyApiError } from '@/lib/api/survey-api'
import { useAuth } from '@/hooks/use-auth'
import { CheckCircleIcon } from '@heroicons/react/24/outline'
export default function SurveyPage() {
  const params = useParams()
  const router = useRouter()
  const { profile } = useAuth()
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null)
  const [draftResponse, setDraftResponse] = useState<SurveyResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const questionnaireId = params.id as string

  // Load questionnaire and check for existing drafts
  useEffect(() => {
    const loadData = async () => {
      if (!profile) return

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
          id: questionnaireId,
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
              max: question.max
            }))
          })),
          metadata: surveyQuestions.questionnaire.metadata
        }

        setQuestionnaire(staticQuestionnaire)

        // Check for existing draft
        try {
          const draft = await surveyApi.getDraftResponse(profile.id, questionnaireId)
          if (draft) {
            setDraftResponse(draft)
          }
        } catch (draftError) {
          // Draft not found is OK, continue without it
          console.log('No draft found, starting fresh survey')
        }

      } catch (err) {
        console.error('Error loading survey data:', err)
        setError(err instanceof Error ? err.message : 'Error al cargar la encuesta')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [questionnaireId, profile])

  // Handle form submission
  const handleSubmit = async (response: SurveyResponse) => {
    setIsSubmitting(true)
    setError(null)

    try {
      await surveyApi.submitSurveyResponse(response)
      setIsSubmitted(true)
    } catch (err) {
      console.error('Error submitting survey:', err)
      if (err instanceof SurveyApiError) {
        setError(err.message)
      } else {
        setError('Error al enviar la encuesta. Por favor, intente nuevamente.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle draft saving
  const handleSaveDraft = async (response: Partial<SurveyResponse>) => {
    if (!profile) return

    try {
      const result = await surveyApi.saveDraftResponse(response, draftResponse?.id)
      if (!draftResponse) {
        // If this was a new draft, update our local state
        setDraftResponse({ 
          ...response as SurveyResponse,
          id: result.id 
        })
      }
    } catch (err) {
      console.error('Error saving draft:', err)
      // Silently fail draft saves to avoid interrupting user flow
    }
  }

  // Go back to dashboard
  const goBackToDashboard = () => {
    router.push('/dashboard')
  }

  if (isLoading) {
    return (
      <ProtectedRoute requiredRole={['volunteer', 'manager', 'admin']}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
              <p className="text-gray-600">Cargando encuesta...</p>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    )
  }

  if (error) {
    return (
      <ProtectedRoute requiredRole={['volunteer', 'manager', 'admin']}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center text-red-600">
                Error
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-gray-700">{error}</p>
              <Button onClick={goBackToDashboard} variant="outline">
                Volver al Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    )
  }

  if (isSubmitted) {
    return (
      <ProtectedRoute requiredRole={['volunteer', 'manager', 'admin']}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="text-center py-12 space-y-6">
              <div className="flex justify-center">
                <CheckCircleIcon className="h-16 w-16 text-success-600" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">
                  ¡Encuesta Completada!
                </h2>
                <p className="text-gray-600">
                  Gracias por su participación. La información ha sido enviada exitosamente.
                </p>
              </div>
              <div className="space-y-3">
                <Button 
                  onClick={goBackToDashboard} 
                  className="w-full"
                >
                  Volver al Dashboard
                </Button>
                <Button 
                  onClick={() => router.push(`/survey/${questionnaireId}`)} 
                  variant="outline"
                  className="w-full"
                >
                  Realizar Otra Encuesta
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    )
  }

  if (!questionnaire) {
    return (
      <ProtectedRoute requiredRole={['volunteer', 'manager', 'admin']}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="text-center py-12">
              <p className="text-gray-600">Encuesta no encontrada</p>
              <Button onClick={goBackToDashboard} variant="outline" className="mt-4">
                Volver al Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRole={['volunteer', 'manager', 'admin']}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <Button 
                  variant="ghost" 
                  onClick={goBackToDashboard}
                  className="text-gray-600 hover:text-gray-900"
                >
                  ← Volver
                </Button>
                <div className="hidden sm:block">
                  <h1 className="text-lg font-medium text-gray-900">
                    Nueva Encuesta
                  </h1>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span className="hidden sm:inline">Voluntario:</span>
                <span className="font-medium text-gray-900">
                  {profile?.nombre}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Survey Form */}
        <div className="py-6">
          <SurveyForm
            questionnaire={questionnaire}
            onSubmit={handleSubmit}
            onSaveDraft={handleSaveDraft}
            initialData={draftResponse || undefined}
            isSubmitting={isSubmitting}
          />
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-gray-200 py-4">
          <div className="max-w-2xl mx-auto px-4 text-center text-sm text-gray-500">
            <p>
              Partido Popular Democrático - Consulta Electoral y Comunitaria
            </p>
            {draftResponse && (
              <p className="mt-1 text-primary-600">
                ✓ Borrador guardado automáticamente
              </p>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}