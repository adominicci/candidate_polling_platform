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
  SurveyResponse,
  SPANISH_LABELS 
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
              className="text-base md:text-lg min-h-[44px]" // Mobile-friendly sizing
              placeholder={question.id === 'name' ? 'Ejemplo: Juan García' : ''}
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
              className="text-base md:text-lg min-h-[44px]"
              placeholder="ejemplo@correo.com"
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
              className="text-base md:text-lg min-h-[44px]"
              placeholder="787-555-1234"
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
              className="text-base md:text-lg min-h-[44px]"
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
            <Textarea
              id={questionId}
              value={value || ''}
              onChange={(e) => updateAnswer(question.id, e.target.value)}
              error={!!error}
              className="text-base md:text-lg min-h-[120px]"
              rows={4}
              maxLength={question.validation?.maxLength}
            />
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
            <RadioGroup
              value={value || ''}
              onChange={(selectedValue) => updateAnswer(question.id, selectedValue)}
              options={question.options || []}
              error={!!error}
              className="mt-2"
            />
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
            <CheckboxGroup
              value={Array.isArray(value) ? value : []}
              onChange={(selectedValues) => updateAnswer(question.id, selectedValues)}
              options={question.options || []}
              error={!!error}
              className="mt-2"
              maxSelections={question.maxSelections}
              minSelections={question.minSelections}
            />
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
            <NumberScale
              value={typeof value === 'number' ? value : undefined}
              onChange={(scaleValue) => updateAnswer(question.id, scaleValue)}
              min={question.min || 0}
              max={question.max || 10}
              error={!!error}
              className="mt-4"
            />
          </FormField>
        )

      default:
        return null
    }
  }, [answers, errors, updateAnswer, handlePhoneChange])

  return (
    <div className={cx('w-full max-w-2xl mx-auto p-4', className)}>
      {/* Header with progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            {questionnaire.title}
          </h1>
          <div className="text-sm text-gray-500">
            {completionPercentage}% completo
          </div>
        </div>
        
        <Progress 
          value={completionPercentage} 
          className="mb-2"
          label={`Sección ${currentSectionIndex + 1} de ${questionnaire.sections.length}`}
        />
        
        <div className="text-sm text-gray-600">
          {currentSection.title}
        </div>
      </div>

      {/* Current section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">
            {currentSection.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {visibleQuestions.map(renderQuestion)}
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2">
          {!isFirstSection && (
            <Button
              variant="outline"
              onClick={goToPreviousSection}
              disabled={isSubmitting || isSaving}
              className="min-h-[44px] px-6"
            >
              <ChevronLeftIcon className="w-4 h-4 mr-2" />
              {SPANISH_LABELS.PREVIOUS_SECTION}
            </Button>
          )}
        </div>

        <div className="flex gap-2 sm:ml-auto">
          {onSaveDraft && (
            <Button
              variant="outline"
              onClick={saveDraft}
              disabled={isSubmitting || isSaving}
              loading={isSaving}
              className="min-h-[44px] px-6"
            >
              {SPANISH_LABELS.SAVE_DRAFT}
            </Button>
          )}

          {isLastSection ? (
            <Button
              onClick={submitForm}
              disabled={isSubmitting || isSaving}
              loading={isSubmitting}
              className="min-h-[44px] px-6"
              variant="success"
            >
              <CheckIcon className="w-4 h-4 mr-2" />
              {SPANISH_LABELS.COMPLETE_SURVEY}
            </Button>
          ) : (
            <Button
              onClick={goToNextSection}
              disabled={isSubmitting || isSaving}
              className="min-h-[44px] px-6"
            >
              {SPANISH_LABELS.NEXT_SECTION}
              <ChevronRightIcon className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Mobile-friendly completion time estimate */}
      <div className="mt-6 text-center text-sm text-gray-500">
        Tiempo estimado: {questionnaire.metadata.estimated_completion_time}
      </div>
    </div>
  )
}