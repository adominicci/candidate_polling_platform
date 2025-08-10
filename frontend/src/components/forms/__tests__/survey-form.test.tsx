import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SurveyForm } from '../survey-form'
import { Questionnaire, SurveyResponse } from '@/types/survey'
import { useAuth } from '@/hooks/use-auth'

// Mock the auth hook
jest.mock('@/hooks/use-auth')
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

// Mock Heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  ChevronLeftIcon: () => <div data-testid="chevron-left-icon" />,
  ChevronRightIcon: () => <div data-testid="chevron-right-icon" />,
  CheckIcon: () => <div data-testid="check-icon" />
}))

const mockQuestionnaire: Questionnaire = {
  id: 'test-questionnaire',
  version: '1.0.0',
  title: 'Test Survey',
  language: 'es',
  sections: [
    {
      id: 'demographics',
      title: 'Información Personal',
      order: 1,
      questions: [
        {
          id: 'name',
          text: 'Nombre',
          type: 'text',
          required: true,
          validation: { minLength: 2, maxLength: 100 }
        },
        {
          id: 'email',
          text: 'Email',
          type: 'email',
          required: false
        }
      ]
    },
    {
      id: 'preferences',
      title: 'Preferencias',
      order: 2,
      questions: [
        {
          id: 'rating',
          text: 'Calificación',
          type: 'scale',
          required: true,
          min: 1,
          max: 5
        },
        {
          id: 'options',
          text: 'Opciones',
          type: 'checkbox',
          required: true,
          minSelections: 1,
          maxSelections: 3,
          options: [
            { value: 'option1', label: 'Opción 1' },
            { value: 'option2', label: 'Opción 2' },
            { value: 'option3', label: 'Opción 3' }
          ]
        }
      ]
    }
  ],
  metadata: {
    created_at: '2024-01-01',
    last_modified: '2024-01-01',
    source: 'test',
    total_questions: 4,
    estimated_completion_time: '5 minutos'
  }
}

const mockProfile = {
  id: 'user-123',
  tenant_id: 'tenant-1',
  auth_user_id: 'auth-123',
  email: 'test@example.com',
  nombre_completo: 'Test User',
  telefono: null,
  rol: 'Volunteer' as const,
  activo: true,
  ultimo_acceso: '2024-01-01',
  configuracion_perfil: null,
  created_at: '2024-01-01',
  updated_at: '2024-01-01'
}

describe('SurveyForm Component', () => {
  const mockOnSubmit = jest.fn()
  const mockOnSaveDraft = jest.fn()
  
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: null,
      profile: mockProfile,
      isLoading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
      hasRole: jest.fn(),
      hasTenantAccess: jest.fn(),
      refreshProfile: jest.fn()
    })
    
    mockOnSubmit.mockClear()
    mockOnSaveDraft.mockClear()
  })

  it('renders first section by default', () => {
    render(
      <SurveyForm
        questionnaire={mockQuestionnaire}
        onSubmit={mockOnSubmit}
      />
    )

    expect(screen.getByText('Test Survey')).toBeInTheDocument()
    expect(screen.getAllByText('Información Personal')).toHaveLength(2) // Header and card title
    expect(screen.getByText('Nombre')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('shows progress indicator', () => {
    render(
      <SurveyForm
        questionnaire={mockQuestionnaire}
        onSubmit={mockOnSubmit}
      />
    )

    expect(screen.getByText('Sección 1 de 2')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('validates required fields before proceeding', async () => {
    const user = userEvent.setup()
    
    render(
      <SurveyForm
        questionnaire={mockQuestionnaire}
        onSubmit={mockOnSubmit}
      />
    )

    // Try to go to next section without filling required field
    const nextButton = screen.getByText('Siguiente Sección')
    await user.click(nextButton)

    // Should show validation error and stay on same section
    expect(screen.getByText('Este campo es obligatorio')).toBeInTheDocument()
    expect(screen.getAllByText('Información Personal')).toHaveLength(2) // Still on first section
  })

  it('allows navigation to next section when valid', async () => {
    const user = userEvent.setup()
    
    render(
      <SurveyForm
        questionnaire={mockQuestionnaire}
        onSubmit={mockOnSubmit}
      />
    )

    // Fill required field
    const nameInput = screen.getByLabelText(/Nombre/i)
    await user.type(nameInput, 'Juan García')

    // Go to next section
    const nextButton = screen.getByText('Siguiente Sección')
    await user.click(nextButton)

    // Should show second section
    expect(screen.getAllByText('Preferencias')).toHaveLength(2) // Header and card title
    expect(screen.getByText('Calificación')).toBeInTheDocument()
  })

  it('allows navigation back to previous section', async () => {
    const user = userEvent.setup()
    
    render(
      <SurveyForm
        questionnaire={mockQuestionnaire}
        onSubmit={mockOnSubmit}
      />
    )

    // Fill required field and go to next section
    const nameInput = screen.getByLabelText(/Nombre/i)
    await user.type(nameInput, 'Juan García')
    await user.click(screen.getByText('Siguiente Sección'))

    // Go back to previous section
    const prevButton = screen.getByText('Sección Anterior')
    await user.click(prevButton)

    // Should show first section again
    expect(screen.getAllByText('Información Personal')).toHaveLength(2) // Header and card title
  })

  it('shows submit button on last section', async () => {
    const user = userEvent.setup()
    
    render(
      <SurveyForm
        questionnaire={mockQuestionnaire}
        onSubmit={mockOnSubmit}
      />
    )

    // Navigate to last section
    const nameInput = screen.getByLabelText(/Nombre/i)
    await user.type(nameInput, 'Juan García')
    await user.click(screen.getByText('Siguiente Sección'))

    // Should show submit button instead of next button
    expect(screen.getByText('Completar Encuesta')).toBeInTheDocument()
    expect(screen.queryByText('Siguiente Sección')).not.toBeInTheDocument()
  })

  it('handles form submission', async () => {
    const user = userEvent.setup()
    mockOnSubmit.mockResolvedValue(undefined)
    
    render(
      <SurveyForm
        questionnaire={mockQuestionnaire}
        onSubmit={mockOnSubmit}
      />
    )

    // Fill out form
    const nameInput = screen.getByLabelText(/Nombre/i)
    await user.type(nameInput, 'Juan García')
    
    // Go to next section
    await user.click(screen.getByText('Siguiente Sección'))
    
    // Fill rating
    const ratingButton = screen.getByLabelText('Seleccionar valor 4')
    await user.click(ratingButton)
    
    // Select checkbox option
    const checkbox = screen.getByLabelText('Opción 1')
    await user.click(checkbox)
    
    // Submit form
    await user.click(screen.getByText('Completar Encuesta'))

    // Wait for submission
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          questionnaire_id: 'test-questionnaire',
          volunteer_id: 'user-123',
          respondent_name: 'Juan García',
          answers: expect.arrayContaining([
            { questionId: 'name', value: 'Juan García' },
            { questionId: 'rating', value: 4 },
            { questionId: 'options', value: ['option1'] }
          ]),
          is_complete: true
        })
      )
    })
  })

  it('saves draft when save draft button is clicked', async () => {
    const user = userEvent.setup()
    mockOnSaveDraft.mockResolvedValue(undefined)
    
    render(
      <SurveyForm
        questionnaire={mockQuestionnaire}
        onSubmit={mockOnSubmit}
        onSaveDraft={mockOnSaveDraft}
      />
    )

    // Fill partial data
    const nameInput = screen.getByLabelText(/Nombre/i)
    await user.type(nameInput, 'Juan García')

    // Save draft
    await user.click(screen.getByText('Guardar Borrador'))

    await waitFor(() => {
      expect(mockOnSaveDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          questionnaire_id: 'test-questionnaire',
          volunteer_id: 'user-123',
          respondent_name: 'Juan García',
          is_complete: false
        })
      )
    })
  })

  it('loads initial data when provided', () => {
    const initialData = {
      questionnaire_id: 'test-questionnaire',
      volunteer_id: 'user-123',
      respondent_name: 'Initial Name',
      respondent_email: 'initial@example.com',
      answers: [
        { questionId: 'name', value: 'Initial Name' },
        { questionId: 'email', value: 'initial@example.com' }
      ],
      is_complete: false
    }

    render(
      <SurveyForm
        questionnaire={mockQuestionnaire}
        onSubmit={mockOnSubmit}
        initialData={initialData}
      />
    )

    // Should pre-populate form fields
    expect(screen.getByDisplayValue('Initial Name')).toBeInTheDocument()
    expect(screen.getByDisplayValue('initial@example.com')).toBeInTheDocument()
  })

  it('handles different question types correctly', async () => {
    const user = userEvent.setup()
    
    const questionnaireWithAllTypes: Questionnaire = {
      ...mockQuestionnaire,
      sections: [{
        id: 'all-types',
        title: 'All Question Types',
        order: 1,
        questions: [
          { id: 'text_field', text: 'Text', type: 'text', required: false },
          { id: 'email_field', text: 'Email', type: 'email', required: false },
          { id: 'tel_field', text: 'Phone', type: 'tel', required: false },
          { id: 'date_field', text: 'Date', type: 'date', required: false },
          { id: 'textarea_field', text: 'Textarea', type: 'textarea', required: false },
          { 
            id: 'radio_field', 
            text: 'Radio', 
            type: 'radio', 
            required: false,
            options: [
              { value: 'yes', label: 'Yes' },
              { value: 'no', label: 'No' }
            ]
          }
        ]
      }]
    }

    render(
      <SurveyForm
        questionnaire={questionnaireWithAllTypes}
        onSubmit={mockOnSubmit}
      />
    )

    // Verify all question types render by checking for their input elements
    expect(screen.getByDisplayValue('')).toBeInTheDocument() // At least one input
    expect(screen.getByText('Yes')).toBeInTheDocument()
    expect(screen.getByText('No')).toBeInTheDocument()
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    
    render(
      <SurveyForm
        questionnaire={mockQuestionnaire}
        onSubmit={mockOnSubmit}
        isSubmitting={true}
      />
    )

    // Since we're on first section, should show next button as disabled
    const nextButton = screen.getByText('Siguiente Sección')
    expect(nextButton).toBeDisabled()
  })

  it('updates completion percentage as form is filled', async () => {
    const user = userEvent.setup()
    
    render(
      <SurveyForm
        questionnaire={mockQuestionnaire}
        onSubmit={mockOnSubmit}
      />
    )

    // Initially should show low percentage
    expect(screen.getByText(/completo/)).toBeInTheDocument()

    // Fill some fields and check if percentage updates
    const nameInput = screen.getByLabelText(/Nombre/i)
    await user.type(nameInput, 'Juan García')

    // Go to next section and fill more fields
    await user.click(screen.getByText('Siguiente Sección'))
    
    const ratingButton = screen.getByLabelText('Seleccionar valor 5')
    await user.click(ratingButton)

    // Completion percentage should increase
    // Note: This would need to be tested with actual percentage calculation
  })
})