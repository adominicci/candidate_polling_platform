import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { LoginForm } from '@/components/auth/login-form'
import { AuthProvider, useAuth } from '@/hooks/use-auth'
import { createMockSupabaseClient, mockUsers, mockSupabaseUsers } from '@/__tests__/utils'

// Mock dependencies
jest.mock('next/navigation')
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

const mockPush = jest.fn()
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockCreateClient = require('@/lib/supabase/client').createClient

describe('Authentication Flow Integration', () => {
  let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    mockSupabaseClient = createMockSupabaseClient()
    mockCreateClient.mockReturnValue(mockSupabaseClient)
    
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    })

    jest.clearAllMocks()
  })

  const renderWithAuth = (component: React.ReactNode) => {
    return render(
      <AuthProvider>
        {component}
      </AuthProvider>
    )
  }

  describe('Successful Login Flow', () => {
    it('allows admin user to login and redirects to dashboard', async () => {
      renderWithAuth(<LoginForm />)

      // Find form elements
      const emailInput = screen.getByLabelText(/correo electrónico/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })

      // Fill in the form
      await userEvent.type(emailInput, 'admin@ppd.pr')
      await userEvent.type(passwordInput, 'password123')

      // Submit the form
      await userEvent.click(submitButton)

      // Wait for authentication to complete
      await waitFor(() => {
        expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
          email: 'admin@ppd.pr',
          password: 'password123',
        })
      })

      // Verify database profile was fetched
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users')

      // Verify last login was updated
      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith({
        last_login_at: expect.any(String),
      })

      // Verify redirect to dashboard
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('allows volunteer to login with proper profile loading', async () => {
      // Configure mocks for volunteer
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockSupabaseUsers.Volunteer },
        error: null,
      })
      mockSupabaseClient.from().single.mockResolvedValue({
        data: mockUsers.Volunteer,
        error: null,
      })

      renderWithAuth(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })

      await userEvent.type(emailInput, 'volunteer@ppd.pr')
      await userEvent.type(passwordInput, 'password123')
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })

      // Verify the correct profile was loaded
      expect(mockSupabaseClient.from().eq).toHaveBeenCalledWith('id', 'volunteer-id-456')
      expect(mockSupabaseClient.from().eq).toHaveBeenCalledWith('is_active', true)
    })
  })

  describe('Failed Login Flows', () => {
    it('handles invalid credentials gracefully', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid login credentials', status: 400, name: 'AuthApiError' },
      })

      renderWithAuth(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })

      await userEvent.type(emailInput, 'wrong@example.com')
      await userEvent.type(passwordInput, 'wrongpassword')
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/invalid login credentials/i)).toBeInTheDocument()
      })

      // Should not redirect
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('handles inactive user account', async () => {
      mockSupabaseClient.from().single.mockResolvedValue({
        data: mockUsers.inactive,
        error: null,
      })

      renderWithAuth(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })

      await userEvent.type(emailInput, 'inactive@ppd.pr')
      await userEvent.type(passwordInput, 'password123')
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/usuario no encontrado o inactivo/i)).toBeInTheDocument()
      })

      // Should sign out the user from Supabase auth
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('handles user not found in database', async () => {
      mockSupabaseClient.from().single.mockResolvedValue({
        data: null,
        error: { message: 'No rows found' },
      })

      renderWithAuth(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })

      await userEvent.type(emailInput, 'notfound@ppd.pr')
      await userEvent.type(passwordInput, 'password123')
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/usuario no encontrado o inactivo/i)).toBeInTheDocument()
      })

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
    })

    it('handles network/database errors', async () => {
      mockSupabaseClient.from().single.mockRejectedValue(new Error('Database connection failed'))

      renderWithAuth(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })

      await userEvent.type(emailInput, 'admin@ppd.pr')
      await userEvent.type(passwordInput, 'password123')
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/usuario no encontrado o inactivo/i)).toBeInTheDocument()
      })

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
    })
  })

  describe('Form Validation Flow', () => {
    it('prevents submission with missing required fields', async () => {
      renderWithAuth(<LoginForm />)

      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })
      
      // Try to submit empty form
      await userEvent.click(submitButton)

      // Should show validation error
      expect(screen.getByText(/el email es requerido/i)).toBeInTheDocument()

      // Should not attempt authentication
      expect(mockSupabaseClient.auth.signInWithPassword).not.toHaveBeenCalled()
    })

    it('validates email field before password', async () => {
      renderWithAuth(<LoginForm />)

      const passwordInput = screen.getByLabelText(/contraseña/i)
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })

      // Fill only password
      await userEvent.type(passwordInput, 'password123')
      await userEvent.click(submitButton)

      // Should show email validation error
      expect(screen.getByText(/el email es requerido/i)).toBeInTheDocument()
      expect(mockSupabaseClient.auth.signInWithPassword).not.toHaveBeenCalled()
    })

    it('validates password field after email', async () => {
      renderWithAuth(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })

      // Fill only email
      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.click(submitButton)

      // Should show password validation error
      expect(screen.getByText(/la contraseña es requerida/i)).toBeInTheDocument()
      expect(mockSupabaseClient.auth.signInWithPassword).not.toHaveBeenCalled()
    })
  })

  describe('Loading States Flow', () => {
    it('shows loading state throughout authentication process', async () => {
      // Mock a delayed response
      mockSupabaseClient.auth.signInWithPassword.mockImplementation(
        () => new Promise(resolve => {
          setTimeout(() => resolve({
            data: { user: mockSupabaseUsers.Admin },
            error: null,
          }), 100)
        })
      )

      renderWithAuth(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })

      await userEvent.type(emailInput, 'admin@ppd.pr')
      await userEvent.type(passwordInput, 'password123')
      await userEvent.click(submitButton)

      // Should show loading state immediately
      expect(screen.getByText(/iniciando sesión/i)).toBeInTheDocument()
      expect(submitButton).toBeDisabled()

      // Wait for completion
      await waitFor(() => {
        expect(screen.queryByText(/iniciando sesión/i)).not.toBeInTheDocument()
      })
    })

    it('prevents multiple submissions during loading', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockImplementation(
        () => new Promise(resolve => {
          setTimeout(() => resolve({
            data: { user: mockSupabaseUsers.Admin },
            error: null,
          }), 200)
        })
      )

      renderWithAuth(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })

      await userEvent.type(emailInput, 'admin@ppd.pr')
      await userEvent.type(passwordInput, 'password123')
      
      // Click multiple times
      await userEvent.click(submitButton)
      await userEvent.click(submitButton)
      await userEvent.click(submitButton)

      // Should only call signIn once
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledTimes(1)

      await waitFor(() => {
        expect(screen.queryByText(/iniciando sesión/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Remember Me Functionality', () => {
    it('captures remember me selection', async () => {
      renderWithAuth(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)
      const rememberCheckbox = screen.getByLabelText(/recordarme/i)
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })

      await userEvent.type(emailInput, 'admin@ppd.pr')
      await userEvent.type(passwordInput, 'password123')
      await userEvent.click(rememberCheckbox)
      await userEvent.click(submitButton)

      expect(rememberCheckbox).toBeChecked()
      
      await waitFor(() => {
        expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalled()
      })
    })
  })

  describe('Error Recovery Flow', () => {
    it('allows retry after failed attempt', async () => {
      // First attempt fails
      mockSupabaseClient.auth.signInWithPassword
        .mockResolvedValueOnce({
          data: { user: null },
          error: { message: 'Invalid credentials', status: 400, name: 'AuthApiError' },
        })
        .mockResolvedValueOnce({
          data: { user: mockSupabaseUsers.Admin },
          error: null,
        })

      renderWithAuth(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })

      // First attempt with wrong credentials
      await userEvent.type(emailInput, 'admin@ppd.pr')
      await userEvent.type(passwordInput, 'wrong')
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
      })

      // Clear and try again with correct credentials
      await userEvent.clear(passwordInput)
      await userEvent.type(passwordInput, 'password123')
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('clears previous errors when correcting form', async () => {
      renderWithAuth(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })

      // Submit empty form
      await userEvent.click(submitButton)
      expect(screen.getByText(/el email es requerido/i)).toBeInTheDocument()

      // Start typing to clear error
      await userEvent.type(emailInput, 'a')
      expect(screen.queryByText(/el email es requerido/i)).not.toBeInTheDocument()
    })
  })
})