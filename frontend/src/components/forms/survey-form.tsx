'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup } from '@/components/ui/radio-group'
import { CheckboxGroup } from '@/components/ui/checkbox-group'
import { NumberScale } from '@/components/ui/number-scale'
import { FormField } from '@/components/ui/form-field'
import { 
  Question, 
  Section, 
  Questionnaire, 
  Answer, 
  SurveyResponse
} from '@/types/survey'
import { 
  validateSection, 
  formatPhoneNumber, 
  shouldShowQuestion,
  getSectionCompletionPercentage,
  getFormCompletionPercentage
} from '@/lib/validation/survey-validation'
import { useAuth } from '@/hooks/use-auth'
import { cx } from '@/lib/utils/cx'
import { ChevronLeftIcon, ChevronRightIcon, CheckIcon } from '@heroicons/react/24/outline'

export interface SurveyFormProps {
  questionnaire: Questionnaire
  onSubmit: (response: SurveyResponse) => Promise<void>
  onSaveDraft?: (response: Partial<SurveyResponse>) => Promise<void>
  initialData?: Partial<SurveyResponse>
  isSubmitting?: boolean
  className?: string
}

export function SurveyForm({ 
  questionnaire, 
  onSubmit, 
  onSaveDraft, 
  initialData, 
  isSubmitting = false,
  className 
}: SurveyFormProps) {
  const { profile } = useAuth()
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, any>>(() => {
    // Initialize with existing data if available
    const initial: Record<string, any> = {}
    if (initialData?.answers) {
      initialData.answers.forEach(answer => {
        initial[answer.questionId] = answer.value
      })
    }
    return initial
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [startTime] = useState(Date.now())

  const currentSection = questionnaire.sections[currentSectionIndex]
  const isFirstSection = currentSectionIndex === 0
  const isLastSection = currentSectionIndex === questionnaire.sections.length - 1

  // Calculate completion percentage
  const completionPercentage = useMemo(() => {
    return getFormCompletionPercentage(questionnaire.sections, answers)
  }, [questionnaire.sections, answers])

  // Calculate section completion percentage
  const sectionCompletionPercentage = useMemo(() => {
    return getSectionCompletionPercentage(currentSection.questions, answers)
  }, [currentSection.questions, answers])

  // Get visible questions for current section
  const visibleQuestions = useMemo(() => {
    return currentSection.questions.filter(q => shouldShowQuestion(q, answers))
  }, [currentSection.questions, answers])

  // Update answer for a specific question
  const updateAnswer = useCallback((questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }))
    
    // Clear error for this field
    if (errors[questionId]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[questionId]
        return newErrors
      })
    }
  }, [errors])

  // Handle phone number formatting
  const handlePhoneChange = useCallback((value: string) => {
    const formatted = formatPhoneNumber(value)
    updateAnswer('phone', formatted)
  }, [updateAnswer])

  // Validate current section
  const validateCurrentSection = useCallback(() => {
    const result = validateSection(currentSection.questions, answers, true)
    setErrors(result.errors)
    return result.isValid
  }, [currentSection.questions, answers])

  // Navigate to next section
  const goToNextSection = useCallback(() => {
    if (validateCurrentSection()) {
      setCurrentSectionIndex(prev => Math.min(prev + 1, questionnaire.sections.length - 1))
    }
  }, [validateCurrentSection, questionnaire.sections.length])

  // Navigate to previous section
  const goToPreviousSection = useCallback(() => {
    setCurrentSectionIndex(prev => Math.max(prev - 1, 0))
    setErrors({}) // Clear errors when going back
  }, [])

  // Save draft
  const saveDraft = useCallback(async () => {
    if (!onSaveDraft || !profile) return
    
    setIsSaving(true)
    try {
      const answersArray: Answer[] = Object.entries(answers).map(([questionId, value]) => ({
        questionId,
        value
      }))

      const draftResponse: Partial<SurveyResponse> = {
        questionnaire_id: questionnaire.id,
        volunteer_id: profile.id,
        respondent_name: answers.name || '',
        respondent_email: answers.email || undefined,
        respondent_phone: answers.phone || undefined,
        precinct_id: answers.precinct || undefined,
        answers: answersArray,
        is_complete: false
      }

      await onSaveDraft(draftResponse)
    } catch (error) {
      console.error('Error saving draft:', error)
    } finally {
      setIsSaving(false)
    }
  }, [onSaveDraft, profile, answers, questionnaire.id])

  // Submit form
  const submitForm = useCallback(async () => {
    if (!profile) return
    
    // Validate all sections
    const allValid = questionnaire.sections.every(section => {
      const result = validateSection(section.questions, answers, true)
      return result.isValid
    })

    if (!allValid) {
      // Go back to first section with errors
      for (let i = 0; i < questionnaire.sections.length; i++) {
        const result = validateSection(questionnaire.sections[i].questions, answers, true)
        if (!result.isValid) {
          setCurrentSectionIndex(i)
          setErrors(result.errors)
          return
        }
      }
    }

    const answersArray: Answer[] = Object.entries(answers).map(([questionId, value]) => ({
      questionId,
      value
    }))

    const response: SurveyResponse = {
      questionnaire_id: questionnaire.id,
      volunteer_id: profile.id,
      respondent_name: answers.name,
      respondent_email: answers.email || undefined,
      respondent_phone: answers.phone || undefined,
      precinct_id: answers.precinct || undefined,
      answers: answersArray,
      is_complete: true,
      completion_time: Math.round((Date.now() - startTime) / 1000) // seconds
    }

    await onSubmit(response)
  }, [profile, questionnaire, answers, startTime, onSubmit])

  // Render question based on type
  const renderQuestion = useCallback((question: Question) => {
    const value = answers[question.id]
    const error = errors[question.id]
    const questionId = `question-${question.id}`

    switch (question.type) {
      case 'text':
        return (
          <FormField
            key={question.id}
            label={question.text}
            required={question.required}
            error={error}
            htmlFor={questionId}
          >
            <Input
              id={questionId}
              type="text"
              value={value || ''}
              onChange={(e) => updateAnswer(question.id, e.target.value)}
              error={!!error}
              className={cx(
                "text-base min-h-[48px] px-4 py-3", // Mobile-first: 48px touch target
                "border-2 rounded-lg transition-all duration-200",
                "focus:border-primary-600 focus:ring-2 focus:ring-primary-600/20",
                error ? "border-red-500 bg-red-50" : "border-gray-300 hover:border-gray-400"
              )}
              placeholder={question.id === 'name' ? 'Ejemplo: Juan García Rodríguez' : 
                         question.id === 'address' ? 'Ejemplo: Calle Luna #123' : ''}
              autoComplete={question.id === 'name' ? 'name' : 
                           question.id === 'address' ? 'street-address' : 'off'}
            />
          </FormField>
        )

      case 'email':
        return (
          <FormField
            key={question.id}
            label={question.text}
            required={question.required}
            error={error}
            htmlFor={questionId}
          >
            <Input
              id={questionId}
              type="email"
              value={value || ''}
              onChange={(e) => updateAnswer(question.id, e.target.value)}
              error={!!error}
              className={cx(
                "text-base min-h-[48px] px-4 py-3",
                "border-2 rounded-lg transition-all duration-200",
                "focus:border-primary-600 focus:ring-2 focus:ring-primary-600/20",
                error ? "border-red-500 bg-red-50" : "border-gray-300 hover:border-gray-400"
              )}
              placeholder="ejemplo@gmail.com"
              autoComplete="email"
              inputMode="email"
            />
          </FormField>
        )

      case 'tel':
        return (
          <FormField
            key={question.id}
            label={question.text}
            required={question.required}
            error={error}
            htmlFor={questionId}
          >
            <Input
              id={questionId}
              type="tel"
              value={value || ''}
              onChange={(e) => handlePhoneChange(e.target.value)}
              error={!!error}
              className={cx(
                "text-base min-h-[48px] px-4 py-3",
                "border-2 rounded-lg transition-all duration-200",
                "focus:border-primary-600 focus:ring-2 focus:ring-primary-600/20",
                error ? "border-red-500 bg-red-50" : "border-gray-300 hover:border-gray-400"
              )}
              placeholder="787-555-1234"
              autoComplete="tel"
              inputMode="tel"
            />
          </FormField>
        )

      case 'date':
        return (
          <FormField
            key={question.id}
            label={question.text}
            required={question.required}
            error={error}
            htmlFor={questionId}
          >
            <Input
              id={questionId}
              type="date"
              value={value || ''}
              onChange={(e) => updateAnswer(question.id, e.target.value)}
              error={!!error}
              className={cx(
                "text-base min-h-[48px] px-4 py-3",
                "border-2 rounded-lg transition-all duration-200",
                "focus:border-primary-600 focus:ring-2 focus:ring-primary-600/20",
                error ? "border-red-500 bg-red-50" : "border-gray-300 hover:border-gray-400"
              )}
              max={new Date().toISOString().split('T')[0]} // Prevent future dates
            />
          </FormField>
        )

      case 'textarea':
        return (
          <FormField
            key={question.id}
            label={question.text}
            required={question.required}
            error={error}
            htmlFor={questionId}
          >
            <div className="relative">
              <Textarea
                id={questionId}
                value={value || ''}
                onChange={(e) => updateAnswer(question.id, e.target.value)}
                error={!!error}
                className={cx(
                  "text-base min-h-[120px] p-4 resize-none",
                  "border-2 rounded-lg transition-all duration-200",
                  "focus:border-primary-600 focus:ring-2 focus:ring-primary-600/20",
                  error ? "border-red-500 bg-red-50" : "border-gray-300 hover:border-gray-400"
                )}
                rows={5}
                maxLength={question.validation?.maxLength || 500}
                placeholder={question.id === 'priorities_other' ? 'Describa brevemente otras prioridades importantes...' :
                           question.id === 'community_concerns' ? 'Mencione los principales asuntos que afectan su comunidad...' :
                           'Escriba su respuesta aquí...'}
              />
              {/* Character counter */}
              {question.validation?.maxLength && (
                <div className="absolute bottom-2 right-3 text-xs text-gray-400">
                  {(value || '').length}/{question.validation.maxLength}
                </div>
              )}
            </div>
          </FormField>
        )

      case 'radio':
        return (
          <FormField
            key={question.id}
            label={question.text}
            required={question.required}
            error={error}
          >
            <div className="mt-4 space-y-3">
              {(question.options || []).map((option) => (
                <label
                  key={option.value}
                  className={cx(
                    "flex items-center p-4 rounded-lg border-2 cursor-pointer",
                    "min-h-[52px] transition-all duration-200",
                    "hover:bg-gray-50 active:scale-[0.99]",
                    value === option.value 
                      ? "border-primary-600 bg-primary-50 ring-2 ring-primary-600/20" 
                      : "border-gray-300 hover:border-gray-400",
                    error && "border-red-500"
                  )}
                >
                  <input
                    type="radio"
                    name={questionId}
                    value={option.value}
                    checked={value === option.value}
                    onChange={(e) => updateAnswer(question.id, e.target.value)}
                    className="sr-only" // Hide default radio, use custom styling
                  />
                  
                  {/* Custom radio indicator */}
                  <div className={cx(
                    "w-5 h-5 rounded-full border-2 mr-3 flex-shrink-0",
                    "transition-all duration-200",
                    value === option.value 
                      ? "border-primary-600 bg-primary-600" 
                      : "border-gray-400"
                  )}>
                    {value === option.value && (
                      <div className="w-2 h-2 bg-white rounded-full m-auto mt-0.5" />
                    )}
                  </div>
                  
                  <span className="text-base font-medium text-gray-900 select-none">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </FormField>
        )

      case 'checkbox':
        return (
          <FormField
            key={question.id}
            label={question.text}
            required={question.required}
            error={error}
          >
            <div className="mt-4">
              {/* Selection counter for multi-select */}
              {question.maxSelections && (
                <div className="flex justify-between items-center mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <span className="text-sm font-medium text-blue-900">
                    Seleccione hasta {question.maxSelections} opciones
                  </span>
                  <span className={cx(
                    "text-sm font-semibold px-2 py-1 rounded-full",
                    Array.isArray(value) && value.length >= question.maxSelections
                      ? "bg-orange-100 text-orange-800"
                      : "bg-blue-100 text-blue-800"
                  )}>
                    {Array.isArray(value) ? value.length : 0}/{question.maxSelections}
                  </span>
                </div>
              )}
              
              <div className="space-y-3">
                {(question.options || []).map((option) => {
                  const isSelected = Array.isArray(value) && value.includes(option.value)
                  const isAtMax = question.maxSelections && 
                                 Array.isArray(value) && 
                                 value.length >= question.maxSelections
                  const isDisabled = Boolean(!isSelected && isAtMax)

                  return (
                    <label
                      key={option.value}
                      className={cx(
                        "flex items-center p-4 rounded-lg border-2 cursor-pointer",
                        "min-h-[52px] transition-all duration-200",
                        !isDisabled && "hover:bg-gray-50 active:scale-[0.99]",
                        isSelected 
                          ? "border-primary-600 bg-primary-50 ring-2 ring-primary-600/20" 
                          : "border-gray-300",
                        isDisabled && "opacity-50 cursor-not-allowed bg-gray-50",
                        error && "border-red-500"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (isDisabled) return
                          const currentValues = Array.isArray(value) ? value : []
                          if (e.target.checked) {
                            updateAnswer(question.id, [...currentValues, option.value])
                          } else {
                            updateAnswer(question.id, currentValues.filter(v => v !== option.value))
                          }
                        }}
                        disabled={isDisabled}
                        className="sr-only" // Hide default checkbox
                      />
                      
                      {/* Custom checkbox indicator */}
                      <div className={cx(
                        "w-5 h-5 rounded border-2 mr-3 flex-shrink-0",
                        "transition-all duration-200",
                        isSelected 
                          ? "border-primary-600 bg-primary-600" 
                          : "border-gray-400"
                      )}>
                        {isSelected && (
                          <CheckIcon className="w-3 h-3 text-white m-auto" />
                        )}
                      </div>
                      
                      <span className={cx(
                        "text-base font-medium select-none",
                        isDisabled ? "text-gray-400" : "text-gray-900"
                      )}>
                        {option.label}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          </FormField>
        )

      case 'scale':
        return (
          <FormField
            key={question.id}
            label={question.text}
            required={question.required}
            error={error}
          >
            <div className="mt-6">
              {/* Scale buttons grid */}
              <div className="grid grid-cols-6 gap-3 mb-4">
                {Array.from({ length: (question.max || 10) - (question.min || 0) + 1 }, (_, i) => {
                  const scaleValue = (question.min || 0) + i
                  const isSelected = value === scaleValue
                  
                  return (
                    <button
                      key={scaleValue}
                      type="button"
                      onClick={() => updateAnswer(question.id, scaleValue)}
                      className={cx(
                        "flex items-center justify-center",
                        "min-h-[48px] rounded-lg border-2 font-semibold text-lg",
                        "transition-all duration-200 active:scale-95",
                        isSelected
                          ? "border-primary-600 bg-primary-600 text-white shadow-lg"
                          : "border-gray-300 text-gray-700 hover:border-primary-300 hover:bg-primary-50",
                        error && !isSelected && "border-red-300"
                      )}
                      aria-label={`Seleccionar ${scaleValue}${
                        scaleValue === 0 ? ' - Mínimo' : 
                        scaleValue === (question.max || 10) ? ' - Máximo' : ''
                      }`}
                      aria-pressed={isSelected}
                    >
                      {scaleValue}
                    </button>
                  )
                })}
              </div>
              
              {/* Scale labels */}
              <div className="flex justify-between text-xs text-gray-500 mb-4">
                <span>{question.min || 0} - Mínimo</span>
                <span>{question.max || 10} - Máximo</span>
              </div>
              
              {/* Current selection display */}
              {typeof value === 'number' && (
                <div className="text-center p-4 bg-primary-50 rounded-lg border border-primary-200">
                  <div className="text-lg font-semibold text-primary-900">
                    Valor seleccionado: <span className="text-primary-600">{value}</span>
                  </div>
                  <div className="text-sm text-primary-700 mt-1">
                    {question.id === 'family_voters' ? 
                      `${value} personas en el hogar que votan` :
                      `Puntuación: ${value} de ${question.max || 10}`
                    }
                  </div>
                </div>
              )}
            </div>
          </FormField>
        )

      default:
        return null
    }
  }, [answers, errors, updateAnswer, handlePhoneChange])

  return (
    <div className={cx('w-full max-w-2xl mx-auto px-4 py-6 min-h-screen bg-gray-50', className)}>
      {/* Mobile-First Section Header */}
      <header className="mb-6">
        {/* Navigation bar */}
        <div className="flex items-center justify-between mb-4 min-h-[44px]">
          {!isFirstSection ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPreviousSection}
              disabled={isSubmitting || isSaving}
              className="p-2 text-gray-600 hover:text-gray-900"
            >
              <ChevronLeftIcon className="w-5 h-5 mr-1" />
              <span className="hidden sm:inline">Volver</span>
            </Button>
          ) : (
            <div className="w-[44px]" /> // Spacer for consistent layout
          )}
          
          <div className="text-sm font-medium text-gray-600 text-center">
            Sección {currentSectionIndex + 1} de {questionnaire.sections.length}
          </div>
          
          <div className="w-[44px]" /> // Right spacer
        </div>
        
        {/* Overall Progress Bar */}
        <div className="mb-4">
          <Progress 
            value={completionPercentage} 
            className="h-3 bg-gray-200"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{completionPercentage}% completo</span>
            <span>{questionnaire.title}</span>
          </div>
        </div>
        
        {/* Section Title and Progress */}
        <div className="text-center mb-4">
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">
            {currentSection.title.toUpperCase()}
          </h1>
          
          {/* Section-specific progress */}
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
            <div className="w-24 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${sectionCompletionPercentage}%` }}
              />
            </div>
            <span>
              {visibleQuestions.filter(q => {
                const value = answers[q.id]
                return value !== undefined && value !== null && value !== '' && 
                       (!Array.isArray(value) || value.length > 0)
              }).length} / {visibleQuestions.length} completas
            </span>
          </div>
        </div>
      </header>

      {/* Questions Card with Enhanced Mobile Design */}
      <Card className="mb-6 border-0 shadow-lg bg-white">
        <CardContent className="p-6 space-y-8">
          {visibleQuestions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                No hay preguntas visibles en esta sección.
              </p>
            </div>
          ) : (
            visibleQuestions.map(renderQuestion)
          )}
        </CardContent>
      </Card>

      {/* Enhanced Mobile Navigation */}
      <div className="sticky bottom-0 bg-gray-50 pt-6 pb-safe">
        <div className="flex items-center justify-between gap-4">
          {/* Previous Button */}
          {!isFirstSection ? (
            <Button
              variant="outline"
              onClick={goToPreviousSection}
              disabled={isSubmitting || isSaving}
              size="lg"
              className="flex-shrink-0 min-h-[48px] px-6 border-gray-300"
            >
              <ChevronLeftIcon className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Anterior</span>
              <span className="sm:hidden">Atrás</span>
            </Button>
          ) : (
            <div />
          )}

          {/* Save Draft Button (mobile-friendly) */}
          {onSaveDraft && !isLastSection && (
            <Button
              variant="outline"
              onClick={saveDraft}
              disabled={isSubmitting || isSaving}
              loading={isSaving}
              size="sm"
              className="hidden sm:flex text-xs px-4 text-gray-600"
            >
              {isSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          )}

          {/* Primary Action Button */}
          {isLastSection ? (
            <Button
              onClick={submitForm}
              disabled={isSubmitting || isSaving || visibleQuestions.some(q => errors[q.id])}
              loading={isSubmitting}
              size="lg"
              className="flex-shrink-0 min-h-[48px] px-8 bg-success-600 hover:bg-success-700 text-white"
            >
              <CheckIcon className="w-4 h-4 mr-2" />
              Completar Encuesta
            </Button>
          ) : (
            <Button
              onClick={goToNextSection}
              disabled={isSubmitting || isSaving}
              size="lg"
              className="flex-shrink-0 min-h-[48px] px-6 bg-primary-600 hover:bg-primary-700"
            >
              <span>Siguiente</span>
              <ChevronRightIcon className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>

        {/* Mobile Draft Save */}
        {onSaveDraft && !isLastSection && (
          <div className="flex justify-center mt-3 sm:hidden">
            <Button
              variant="ghost"
              onClick={saveDraft}
              disabled={isSubmitting || isSaving}
              loading={isSaving}
              size="sm"
              className="text-xs text-gray-500"
            >
              {isSaving ? 'Guardando borrador...' : 'Guardar borrador'}
            </Button>
          </div>
        )}

        {/* Completion Time Estimate */}
        <div className="text-center text-xs text-gray-400 mt-4">
          Tiempo estimado restante: {questionnaire.metadata.estimated_completion_time || '5-10 min'}
          {isSaving && (
            <div className="flex items-center justify-center mt-1">
              <div className="w-1 h-1 bg-success-600 rounded-full mr-1"></div>
              <span className="text-success-600">Progreso guardado</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}