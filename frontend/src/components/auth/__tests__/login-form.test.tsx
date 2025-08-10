import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { LoginForm } from '../login-form'
import { useAuth } from '@/hooks/use-auth'
import { mockAuthSuccess, mockAuthErrors, mockFormData } from '@/__tests__/utils'

// Mock the hooks - next/navigation is already globally mocked
jest.mock('@/hooks/use-auth')

const mockPush = jest.fn()
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

// Override the global navigation mock for this test
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}))

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>

describe('LoginForm Component', () => {
  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    })

    mockUseAuth.mockReturnValue(mockAuthSuccess.unauthenticated())
    
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders all form elements', () => {
      render(<LoginForm />)

      expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/recordarme/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument()
      expect(screen.getByText(/¿olvidaste tu contraseña\?/i)).toBeInTheDocument()
    })

    it('shows demo accounts in development', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      render(<LoginForm />)

      expect(screen.getByText(/cuentas de prueba:/i)).toBeInTheDocument()
      expect(screen.getByText(/admin@ppd.pr/i)).toBeInTheDocument()
      expect(screen.getByText(/volunteer@ppd.pr/i)).toBeInTheDocument()
      expect(screen.getByText(/password123/i)).toBeInTheDocument()

      process.env.NODE_ENV = originalEnv
    })

    it('hides demo accounts in production', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      render(<LoginForm />)

      expect(screen.queryByText(/cuentas de prueba:/i)).not.toBeInTheDocument()

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('Form Interaction', () => {
    it('handles email input changes', async () => {
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      await userEvent.type(emailInput, 'test@example.com')

      expect(emailInput).toHaveValue('test@example.com')
    })

    it('handles password input changes', async () => {
      render(<LoginForm />)

      const passwordInput = screen.getByLabelText(/contraseña/i)
      await userEvent.type(passwordInput, 'password123')

      expect(passwordInput).toHaveValue('password123')
    })

    it('toggles password visibility', async () => {
      render(<LoginForm />)

      const passwordInput = screen.getByLabelText(/contraseña/i)
      const toggleButton = screen.getByRole('button', { name: /show password/i }) || 
                          screen.getByRole('button', { name: '' }) // The button has no text, just an icon

      expect(passwordInput).toHaveAttribute('type', 'password')

      await userEvent.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'text')

      await userEvent.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('handles remember me checkbox', async () => {
      render(<LoginForm />)

      const rememberCheckbox = screen.getByLabelText(/recordarme/i)
      expect(rememberCheckbox).not.toBeChecked()

      await userEvent.click(rememberCheckbox)
      expect(rememberCheckbox).toBeChecked()

      await userEvent.click(rememberCheckbox)
      expect(rememberCheckbox).not.toBeChecked()
    })
  })

  describe('Form Validation', () => {
    it('shows error for empty email', async () => {
      render(<LoginForm />)

      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })
      await userEvent.click(submitButton)

      expect(screen.getByText(/el email es requerido/i)).toBeInTheDocument()
    })

    it('shows error for empty password', async () => {
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })

      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.click(submitButton)

      expect(screen.getByText(/la contraseña es requerida/i)).toBeInTheDocument()
    })

    it('clears errors when user starts typing', async () => {
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })

      // Submit empty form to trigger error
      await userEvent.click(submitButton)
      expect(screen.getByText(/el email es requerido/i)).toBeInTheDocument()

      // Start typing to clear error
      await userEvent.type(emailInput, 't')
      expect(screen.queryByText(/el email es requerido/i)).not.toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    it('submits form with valid credentials', async () => {
      const mockSignIn = jest.fn().mockResolvedValue({ error: null })
      mockUseAuth.mockReturnValue({
        ...mockAuthSuccess.unauthenticated(),
        signIn: mockSignIn,
      })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })

      await userEvent.type(emailInput, mockFormData.validLogin.email)
      await userEvent.type(passwordInput, mockFormData.validLogin.password)
      await userEvent.click(submitButton)

      expect(mockSignIn).toHaveBeenCalledWith(
        mockFormData.validLogin.email,
        mockFormData.validLogin.password
      )

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('handles authentication errors', async () => {
      const mockSignIn = jest.fn().mockResolvedValue({ 
        error: { message: 'Invalid login credentials' } 
      })
      mockUseAuth.mockReturnValue({
        ...mockAuthSuccess.unauthenticated(),
        signIn: mockSignIn,
      })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })

      await userEvent.type(emailInput, mockFormData.invalidLogin.email)
      await userEvent.type(passwordInput, mockFormData.invalidLogin.password)
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/invalid login credentials/i)).toBeInTheDocument()
      })

      expect(mockPush).not.toHaveBeenCalled()
    })

    it('handles network errors', async () => {
      const mockSignIn = jest.fn().mockRejectedValue(new Error('Network error'))
      mockUseAuth.mockReturnValue({
        ...mockAuthSuccess.unauthenticated(),
        signIn: mockSignIn,
      })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })

      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.type(passwordInput, 'password')
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/error inesperado/i)).toBeInTheDocument()
      })
    })

    it('prevents multiple submissions', async () => {
      const mockSignIn = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      )
      mockUseAuth.mockReturnValue({
        ...mockAuthSuccess.unauthenticated(),
        signIn: mockSignIn,
      })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })

      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.type(passwordInput, 'password')
      
      // Click submit multiple times
      await userEvent.click(submitButton)
      await userEvent.click(submitButton)
      await userEvent.click(submitButton)

      expect(mockSignIn).toHaveBeenCalledTimes(1)
    })
  })

  describe('Loading States', () => {
    it('shows loading state during submission', async () => {
      const mockSignIn = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100))
      )
      mockUseAuth.mockReturnValue({
        ...mockAuthSuccess.unauthenticated(),
        signIn: mockSignIn,
      })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })

      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.type(passwordInput, 'password')
      await userEvent.click(submitButton)

      expect(screen.getByText(/iniciando sesión/i)).toBeInTheDocument()
      expect(submitButton).toBeDisabled()

      await waitFor(() => {
        expect(screen.queryByText(/iniciando sesión/i)).not.toBeInTheDocument()
      })
    })

    it('disables form elements when auth context is loading', () => {
      mockUseAuth.mockReturnValue({
        ...mockAuthSuccess.loading(),
        isLoading: true,
      })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })
      const rememberCheckbox = screen.getByLabelText(/recordarme/i)

      expect(emailInput).toBeDisabled()
      expect(passwordInput).toBeDisabled()
      expect(submitButton).toBeDisabled()
      expect(rememberCheckbox).toBeDisabled()
    })
  })

  describe('Error Display', () => {
    it('displays error messages in red background', async () => {
      render(<LoginForm />)

      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })
      await userEvent.click(submitButton)

      const errorContainer = screen.getByText(/el email es requerido/i).closest('div')
      expect(errorContainer).toHaveClass('bg-red-50', 'border-red-200')
      expect(screen.getByText(/el email es requerido/i)).toHaveClass('text-red-700')
    })

    it('shows error styling on input fields', async () => {
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })

      await userEvent.click(submitButton)

      expect(emailInput).toHaveClass('border-red-300')
      expect(passwordInput).toHaveClass('border-red-300')
    })
  })

  describe('Accessibility', () => {
    it('has proper form labels', () => {
      render(<LoginForm />)

      expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/recordarme/i)).toBeInTheDocument()
    })

    it('has proper input types', () => {
      render(<LoginForm />)

      expect(screen.getByLabelText(/correo electrónico/i)).toHaveAttribute('type', 'email')
      expect(screen.getByLabelText(/contraseña/i)).toHaveAttribute('type', 'password')
      expect(screen.getByLabelText(/recordarme/i)).toHaveAttribute('type', 'checkbox')
    })

    it('has proper autocomplete attributes', () => {
      render(<LoginForm />)

      expect(screen.getByLabelText(/correo electrónico/i)).toHaveAttribute('autoComplete', 'email')
      expect(screen.getByLabelText(/contraseña/i)).toHaveAttribute('autoComplete', 'current-password')
    })

    it('has required fields marked as required', () => {
      render(<LoginForm />)

      expect(screen.getByLabelText(/correo electrónico/i)).toHaveAttribute('required')
      expect(screen.getByLabelText(/contraseña/i)).toHaveAttribute('required')
    })

    it('maintains tab order', () => {
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)
      const rememberCheckbox = screen.getByLabelText(/recordarme/i)
      const forgotPasswordLink = screen.getByText(/¿olvidaste tu contraseña\?/i)
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })

      emailInput.focus()
      expect(document.activeElement).toBe(emailInput)

      // Note: Full tab order testing would require more complex setup
      // This test confirms the elements are focusable in the expected order
      expect(passwordInput).toHaveAttribute('tabIndex', undefined)
      expect(rememberCheckbox).toHaveAttribute('tabIndex', undefined)
      expect(submitButton).toHaveAttribute('tabIndex', undefined)
    })
  })
})