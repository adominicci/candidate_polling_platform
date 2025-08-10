import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { LoginForm } from '@/components/auth/login-form'
import { useAuth } from '@/hooks/use-auth'
import { 
  mockAuthScenarios, 
  mockUserProfiles, 
  mockSupabaseAuthUsers,
  mockAuthErrors,
  mockFormData,
  AuthTestController 
} from '@/__tests__/utils/auth-test-utils'

// Mock dependencies
jest.mock('next/navigation')
jest.mock('@/hooks/use-auth')

const mockPush = jest.fn()
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

describe('Fixed Authentication Flow Tests', () => {
  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    })

    // Default to unauthenticated state
    mockUseAuth.mockReturnValue(mockAuthScenarios.unauthenticated())
    
    jest.clearAllMocks()
  })

  describe('Component Rendering and Basic Interaction', () => {
    test('LoginForm renders with proper initial state', () => {
      render(<LoginForm />)

      // Should show proper Spanish labels
      expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/recordarme/i)).toBeInTheDocument()
      
      // Should show "Iniciar Sesión" button (not loading state)
      expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /iniciar sesión/i })).not.toBeDisabled()
    })

    test('Form fields are interactive when not loading', async () => {
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)
      const rememberCheckbox = screen.getByLabelText(/recordarme/i)

      // All fields should be enabled
      expect(emailInput).not.toBeDisabled()
      expect(passwordInput).not.toBeDisabled()
      expect(rememberCheckbox).not.toBeDisabled()

      // Should be able to type in fields
      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.type(passwordInput, 'password123')
      await userEvent.click(rememberCheckbox)

      expect(emailInput).toHaveValue('test@example.com')
      expect(passwordInput).toHaveValue('password123')
      expect(rememberCheckbox).toBeChecked()
    })

    test('Form shows loading state when auth context is loading', () => {
      // Mock the loading state
      mockUseAuth.mockReturnValue(mockAuthScenarios.loading())
      
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)
      const submitButton = screen.getByRole('button')
      const rememberCheckbox = screen.getByLabelText(/recordarme/i)

      // All form elements should be disabled during loading
      expect(emailInput).toBeDisabled()
      expect(passwordInput).toBeDisabled()
      expect(submitButton).toBeDisabled()
      expect(rememberCheckbox).toBeDisabled()
    })
  })

  describe('Form Validation', () => {
    test('Shows Spanish validation errors for empty fields', async () => {
      render(<LoginForm />)

      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })
      await userEvent.click(submitButton)

      expect(screen.getByText(/el email es requerido/i)).toBeInTheDocument()
      expect(mockUseAuth().signIn).not.toHaveBeenCalled()
    })

    test('Shows password required error when email is provided', async () => {
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })

      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.click(submitButton)

      expect(screen.getByText(/la contraseña es requerida/i)).toBeInTheDocument()
      expect(mockUseAuth().signIn).not.toHaveBeenCalled()
    })

    test('Clears validation errors when user starts typing', async () => {
      render(<LoginForm />)

      // Trigger validation error
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })
      await userEvent.click(submitButton)
      expect(screen.getByText(/el email es requerido/i)).toBeInTheDocument()

      // Start typing to clear error
      const emailInput = screen.getByLabelText(/correo electrónico/i)
      await userEvent.type(emailInput, 'a')
      expect(screen.queryByText(/el email es requerido/i)).not.toBeInTheDocument()
    })
  })

  describe('Authentication Submission', () => {
    test('Successful admin login triggers proper signIn call and redirect', async () => {
      const mockSignIn = jest.fn().mockResolvedValue({ error: null })
      mockUseAuth.mockReturnValue({
        ...mockAuthScenarios.unauthenticated(),
        signIn: mockSignIn,
      })

      render(<LoginForm />)

      await userEvent.type(screen.getByLabelText(/correo electrónico/i), mockFormData.validAdmin.email)
      await userEvent.type(screen.getByLabelText(/contraseña/i), mockFormData.validAdmin.password)
      await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))

      expect(mockSignIn).toHaveBeenCalledWith(
        mockFormData.validAdmin.email,
        mockFormData.validAdmin.password
      )

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    test('Failed login shows error message and does not redirect', async () => {
      const mockSignIn = jest.fn().mockResolvedValue({ 
        error: mockAuthErrors.invalidCredentials 
      })
      mockUseAuth.mockReturnValue({
        ...mockAuthScenarios.unauthenticated(),
        signIn: mockSignIn,
      })

      render(<LoginForm />)

      await userEvent.type(screen.getByLabelText(/correo electrónico/i), mockFormData.invalidCredentials.email)
      await userEvent.type(screen.getByLabelText(/contraseña/i), mockFormData.invalidCredentials.password)
      await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))

      await waitFor(() => {
        expect(screen.getByText(/invalid login credentials/i)).toBeInTheDocument()
      })

      expect(mockPush).not.toHaveBeenCalled()
    })

    test('Network error shows generic error message', async () => {
      const mockSignIn = jest.fn().mockRejectedValue(new Error('Network error'))
      mockUseAuth.mockReturnValue({
        ...mockAuthScenarios.unauthenticated(),
        signIn: mockSignIn,
      })

      render(<LoginForm />)

      await userEvent.type(screen.getByLabelText(/correo electrónico/i), 'test@example.com')
      await userEvent.type(screen.getByLabelText(/contraseña/i), 'password123')
      await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))

      await waitFor(() => {
        expect(screen.getByText(/error inesperado/i)).toBeInTheDocument()
      })
    })
  })

  describe('Loading States and User Experience', () => {
    test('Shows loading state during form submission', async () => {
      let resolveSignIn: (value: any) => void
      const mockSignIn = jest.fn().mockImplementation(() => {
        return new Promise(resolve => {
          resolveSignIn = resolve
        })
      })

      // Start with non-loading state
      mockUseAuth.mockReturnValue({
        ...mockAuthScenarios.unauthenticated(),
        signIn: mockSignIn,
      })

      render(<LoginForm />)

      await userEvent.type(screen.getByLabelText(/correo electrónico/i), 'admin@ppd.pr')
      await userEvent.type(screen.getByLabelText(/contraseña/i), 'password123')
      
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })
      await userEvent.click(submitButton)

      // Should show loading state
      expect(screen.getByText(/iniciando sesión/i)).toBeInTheDocument()
      expect(screen.getByRole('button')).toBeDisabled()

      // Resolve the promise
      resolveSignIn!({ error: null })
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    test('Prevents multiple submissions during loading', async () => {
      const mockSignIn = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100))
      )

      mockUseAuth.mockReturnValue({
        ...mockAuthScenarios.unauthenticated(),
        signIn: mockSignIn,
      })

      render(<LoginForm />)

      await userEvent.type(screen.getByLabelText(/correo electrónico/i), 'admin@ppd.pr')
      await userEvent.type(screen.getByLabelText(/contraseña/i), 'password123')
      
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })
      
      // Click multiple times quickly
      await userEvent.click(submitButton)
      await userEvent.click(submitButton)
      await userEvent.click(submitButton)

      // Should only call signIn once
      expect(mockSignIn).toHaveBeenCalledTimes(1)
    })
  })

  describe('Role-Based Authentication Scenarios', () => {
    const testRoleLogin = async (role: 'admin' | 'manager' | 'analyst' | 'volunteer') => {
      const mockSignIn = jest.fn().mockResolvedValue({ error: null })
      const formData = mockFormData[`valid${role.charAt(0).toUpperCase() + role.slice(1)}` as keyof typeof mockFormData] as any
      
      mockUseAuth.mockReturnValue({
        ...mockAuthScenarios.unauthenticated(),
        signIn: mockSignIn,
      })

      render(<LoginForm />)

      await userEvent.type(screen.getByLabelText(/correo electrónico/i), formData.email)
      await userEvent.type(screen.getByLabelText(/contraseña/i), formData.password)
      await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))

      expect(mockSignIn).toHaveBeenCalledWith(formData.email, formData.password)
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    }

    test('Admin login flow', () => testRoleLogin('admin'))
    test('Manager login flow', () => testRoleLogin('manager'))
    test('Analyst login flow', () => testRoleLogin('analyst'))
    test('Volunteer login flow', () => testRoleLogin('volunteer'))
  })

  describe('Password Visibility and Remember Me', () => {
    test('Password visibility toggle works correctly', async () => {
      render(<LoginForm />)

      const passwordInput = screen.getByLabelText(/contraseña/i)
      expect(passwordInput).toHaveAttribute('type', 'password')

      // Find the eye icon button (it's the only button other than submit)
      const buttons = screen.getAllByRole('button')
      const eyeButton = buttons.find(button => 
        button.type === 'button' && 
        button.className.includes('absolute inset-y-0 right-0')
      )
      
      expect(eyeButton).toBeInTheDocument()
      await userEvent.click(eyeButton!)
      
      expect(passwordInput).toHaveAttribute('type', 'text')
      
      await userEvent.click(eyeButton!)
      expect(passwordInput).toHaveAttribute('type', 'password')
    })

    test('Remember me checkbox functionality', async () => {
      render(<LoginForm />)

      const rememberCheckbox = screen.getByLabelText(/recordarme/i)
      expect(rememberCheckbox).not.toBeChecked()

      await userEvent.click(rememberCheckbox)
      expect(rememberCheckbox).toBeChecked()

      await userEvent.click(rememberCheckbox)
      expect(rememberCheckbox).not.toBeChecked()
    })

    test('Forgot password link is present and accessible', () => {
      render(<LoginForm />)

      const forgotPasswordLink = screen.getByText(/¿olvidaste tu contraseña\?/i)
      expect(forgotPasswordLink).toBeInTheDocument()
      expect(forgotPasswordLink.closest('a')).toHaveAttribute('href', '/auth/forgot-password')
    })
  })

  describe('Development vs Production Environment', () => {
    test('Shows demo accounts in development environment', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      render(<LoginForm />)

      expect(screen.getByText(/cuentas de prueba:/i)).toBeInTheDocument()
      expect(screen.getByText(/admin@ppd.pr/i)).toBeInTheDocument()
      expect(screen.getByText(/volunteer@ppd.pr/i)).toBeInTheDocument()
      expect(screen.getByText(/password123/i)).toBeInTheDocument()

      process.env.NODE_ENV = originalEnv
    })

    test('Hides demo accounts in production environment', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      render(<LoginForm />)

      expect(screen.queryByText(/cuentas de prueba:/i)).not.toBeInTheDocument()

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('Error Recovery', () => {
    test('User can retry login after failed attempt', async () => {
      const mockSignIn = jest.fn()
        .mockResolvedValueOnce({ error: mockAuthErrors.invalidCredentials })
        .mockResolvedValueOnce({ error: null })

      mockUseAuth.mockReturnValue({
        ...mockAuthScenarios.unauthenticated(),
        signIn: mockSignIn,
      })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)

      // First attempt with wrong credentials
      await userEvent.type(emailInput, 'admin@ppd.pr')
      await userEvent.type(passwordInput, 'wrong')
      await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))

      await waitFor(() => {
        expect(screen.getByText(/invalid login credentials/i)).toBeInTheDocument()
      })

      // Correct the password and try again
      await userEvent.clear(passwordInput)
      await userEvent.type(passwordInput, 'password123')
      await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })

      expect(mockSignIn).toHaveBeenCalledTimes(2)
    })
  })

  describe('Accessibility', () => {
    test('Form has proper ARIA attributes and labels', () => {
      render(<LoginForm />)

      // Check form labels are properly associated
      expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/recordarme/i)).toBeInTheDocument()
      
      // Check input types are correct
      expect(screen.getByLabelText(/correo electrónico/i)).toHaveAttribute('type', 'email')
      expect(screen.getByLabelText(/contraseña/i)).toHaveAttribute('type', 'password')
      expect(screen.getByLabelText(/recordarme/i)).toHaveAttribute('type', 'checkbox')
      
      // Check autocomplete attributes
      expect(screen.getByLabelText(/correo electrónico/i)).toHaveAttribute('autoComplete', 'email')
      expect(screen.getByLabelText(/contraseña/i)).toHaveAttribute('autoComplete', 'current-password')
      
      // Check required attributes
      expect(screen.getByLabelText(/correo electrónico/i)).toHaveAttribute('required')
      expect(screen.getByLabelText(/contraseña/i)).toHaveAttribute('required')
    })

    test('Error messages are properly announced', async () => {
      render(<LoginForm />)

      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })
      await userEvent.click(submitButton)

      const errorMessage = screen.getByText(/el email es requerido/i)
      expect(errorMessage).toBeInTheDocument()
      
      // Check error styling
      const errorContainer = errorMessage.closest('div')
      expect(errorContainer).toHaveClass('bg-red-50', 'border-red-200')
      expect(errorMessage).toHaveClass('text-red-700')
    })
  })
})