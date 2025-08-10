import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SurveyForm } from '../survey-form'
import { Questionnaire } from '@/types/survey'
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

const simpleQuestionnaire: Questionnaire = {
  id: 'simple-test',
  version: '1.0.0',
  title: 'Simple Survey',
  language: 'es',
  sections: [
    {
      id: 'basic',
      title: 'Información Básica',
      order: 1,
      questions: [
        {
          id: 'name',
          text: 'Nombre completo',
          type: 'text',
          required: true
        }
      ]
    }
  ],
  metadata: {
    created_at: '2024-01-01',
    last_modified: '2024-01-01',
    source: 'test',
    total_questions: 1,
    estimated_completion_time: '2 minutos'
  }
}

const mockProfile = {
  id: 'user-123',
  tenant_id: 'tenant-1',
  auth_user_id: 'auth-123',
  email: 'test@example.com',
  nombre_completo: 'Test User',
  telefono: '+1-787-555-0001',
  rol: 'Volunteer' as const,
  activo: true,
  ultimo_acceso: '2024-01-01T00:00:00.000Z',
  configuracion_perfil: null,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z'
}

describe('SurveyForm Simple Tests', () => {
  const mockOnSubmit = jest.fn()
  
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
  })

  it('renders survey title and form elements', () => {
    render(
      <SurveyForm
        questionnaire={simpleQuestionnaire}
        onSubmit={mockOnSubmit}
      />
    )

    expect(screen.getByText('Simple Survey')).toBeInTheDocument()
    expect(screen.getByText('Nombre completo')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('shows progress bar', () => {
    render(
      <SurveyForm
        questionnaire={simpleQuestionnaire}
        onSubmit={mockOnSubmit}
      />
    )

    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('shows completion button for single section survey', () => {
    render(
      <SurveyForm
        questionnaire={simpleQuestionnaire}
        onSubmit={mockOnSubmit}
      />
    )

    // Single section should show complete button
    expect(screen.getByText('Completar Encuesta')).toBeInTheDocument()
    expect(screen.queryByText('Siguiente Sección')).not.toBeInTheDocument()
  })

  it('prevents submission without required field', async () => {
    const user = userEvent.setup()
    
    render(
      <SurveyForm
        questionnaire={simpleQuestionnaire}
        onSubmit={mockOnSubmit}
      />
    )

    // Try to submit without filling required field
    const submitButton = screen.getByText('Completar Encuesta')
    await user.click(submitButton)

    // Should show validation error
    expect(screen.getByText('Este campo es obligatorio')).toBeInTheDocument()
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('allows submission when form is valid', async () => {
    const user = userEvent.setup()
    mockOnSubmit.mockResolvedValue(undefined)
    
    render(
      <SurveyForm
        questionnaire={simpleQuestionnaire}
        onSubmit={mockOnSubmit}
      />
    )

    // Fill required field
    const nameInput = screen.getByRole('textbox')
    await user.type(nameInput, 'Juan García')

    // Submit form
    const submitButton = screen.getByText('Completar Encuesta')
    await user.click(submitButton)

    // Should call onSubmit with correct data
    expect(mockOnSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        questionnaire_id: 'simple-test',
        volunteer_id: 'user-123',
        respondent_name: 'Juan García',
        is_complete: true
      })
    )
  })

  it('handles loading state', () => {
    render(
      <SurveyForm
        questionnaire={simpleQuestionnaire}
        onSubmit={mockOnSubmit}
        isSubmitting={true}
      />
    )

    // Find the button element, not the text
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(screen.getByText('Cargando...')).toBeInTheDocument()
  })

  it('shows estimated completion time', () => {
    render(
      <SurveyForm
        questionnaire={simpleQuestionnaire}
        onSubmit={mockOnSubmit}
      />
    )

    expect(screen.getByText(/2 minutos/)).toBeInTheDocument()
  })
})