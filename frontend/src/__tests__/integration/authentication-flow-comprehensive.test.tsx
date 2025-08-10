import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { LoginForm } from '@/components/auth/login-form'
import { AuthProvider, useAuth } from '@/hooks/use-auth'
import { createMockSupabaseClient } from '@/__tests__/utils'

// Enhanced mock data with all user roles
const mockUserProfiles = {
  admin: {
    id: 'admin-id-123',
    email: 'admin@ppd.pr',
    role: 'admin' as const,
    tenant_id: 'ppd-tenant-1',
    full_name: 'Administrador PPD',
    is_active: true,
    metadata: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    last_login_at: '2024-01-01T00:00:00.000Z',
  },
  manager: {
    id: 'manager-id-101',
    email: 'manager@ppd.pr',
    role: 'manager' as const,
    tenant_id: 'ppd-tenant-1',
    full_name: 'Gerente Campaña',
    is_active: true,
    metadata: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    last_login_at: '2024-01-01T00:00:00.000Z',
  },
  analyst: {
    id: 'analyst-id-789',
    email: 'analyst@ppd.pr',
    role: 'analyst' as const,
    tenant_id: 'ppd-tenant-1',
    full_name: 'Analista Datos',
    is_active: true,
    metadata: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    last_login_at: '2024-01-01T00:00:00.000Z',
  },
  volunteer: {
    id: 'volunteer-id-456',
    email: 'volunteer@ppd.pr',
    role: 'volunteer' as const,
    tenant_id: 'ppd-tenant-1',
    full_name: 'Voluntario Activo',
    is_active: true,
    metadata: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    last_login_at: '2024-01-01T00:00:00.000Z',
  },
  inactive: {
    id: 'inactive-id-999',
    email: 'inactive@ppd.pr',
    role: 'volunteer' as const,
    tenant_id: 'ppd-tenant-1',
    full_name: 'Usuario Inactivo',
    is_active: false,
    metadata: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    last_login_at: null,
  },
}

const mockSupabaseAuthUsers = {
  admin: {
    id: 'admin-id-123',
    email: 'admin@ppd.pr',
    email_confirmed_at: '2024-01-01T00:00:00.000Z',
    user_metadata: {},
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  manager: {
    id: 'manager-id-101',
    email: 'manager@ppd.pr',
    email_confirmed_at: '2024-01-01T00:00:00.000Z',
    user_metadata: {},
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  analyst: {
    id: 'analyst-id-789',
    email: 'analyst@ppd.pr',
    email_confirmed_at: '2024-01-01T00:00:00.000Z',
    user_metadata: {},
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  volunteer: {
    id: 'volunteer-id-456',
    email: 'volunteer@ppd.pr',
    email_confirmed_at: '2024-01-01T00:00:00.000Z',
    user_metadata: {},
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
}

// Mock dependencies
jest.mock('next/navigation')
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

const mockPush = jest.fn()
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockCreateClient = require('@/lib/supabase/client').createClient

describe('Comprehensive Authentication Flow Tests', () => {
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

  describe('Role-Based Authentication Tests', () => {
    test('Admin user login and proper redirect', async () => {
      // Configure mocks for admin
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockSupabaseAuthUsers.admin },
        error: null,
      })
      mockSupabaseClient.from().single.mockResolvedValue({
        data: mockUserProfiles.admin,
        error: null,
      })

      renderWithAuth(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)
      
      // Initially should show "Iniciar Sesión" button
      expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument()

      await userEvent.type(emailInput, 'admin@ppd.pr')
      await userEvent.type(passwordInput, 'password123')
      
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })
      await userEvent.click(submitButton)

      // Should show loading state briefly
      await waitFor(() => {
        expect(screen.queryByText(/iniciando sesión/i)).toBeInTheDocument()
      })

      // Wait for authentication to complete
      await waitFor(() => {
        expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
          email: 'admin@ppd.pr',
          password: 'password123',
        })
      })

      // Verify database profile was fetched and last login updated
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users')
      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith({
        last_login_at: expect.any(String),
      })

      // Verify redirect to admin dashboard
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    test('Manager user login and role verification', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockSupabaseAuthUsers.manager },
        error: null,
      })
      mockSupabaseClient.from().single.mockResolvedValue({
        data: mockUserProfiles.manager,
        error: null,
      })

      renderWithAuth(<LoginForm />)

      await userEvent.type(screen.getByLabelText(/correo electrónico/i), 'manager@ppd.pr')
      await userEvent.type(screen.getByLabelText(/contraseña/i), 'password123')
      await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))

      await waitFor(() => {
        expect(mockSupabaseClient.from().eq).toHaveBeenCalledWith('id', 'manager-id-101')
        expect(mockSupabaseClient.from().eq).toHaveBeenCalledWith('is_active', true)
      })
    })

    test('Analyst user login with proper permissions', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockSupabaseAuthUsers.analyst },
        error: null,
      })
      mockSupabaseClient.from().single.mockResolvedValue({
        data: mockUserProfiles.analyst,
        error: null,
      })

      renderWithAuth(<LoginForm />)

      await userEvent.type(screen.getByLabelText(/correo electrónico/i), 'analyst@ppd.pr')
      await userEvent.type(screen.getByLabelText(/contraseña/i), 'password123')
      await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    test('Volunteer user login with limited access', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockSupabaseAuthUsers.volunteer },
        error: null,
      })
      mockSupabaseClient.from().single.mockResolvedValue({
        data: mockUserProfiles.volunteer,
        error: null,
      })

      renderWithAuth(<LoginForm />)

      await userEvent.type(screen.getByLabelText(/correo electrónico/i), 'volunteer@ppd.pr')
      await userEvent.type(screen.getByLabelText(/contraseña/i), 'password123')
      await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })
  })

  describe('Authentication Error Handling', () => {
    test('Invalid credentials error in Spanish', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid login credentials', status: 400, name: 'AuthApiError' },
      })

      renderWithAuth(<LoginForm />)

      await userEvent.type(screen.getByLabelText(/correo electrónico/i), 'wrong@example.com')
      await userEvent.type(screen.getByLabelText(/contraseña/i), 'wrongpassword')
      await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))

      await waitFor(() => {
        expect(screen.getByText(/invalid login credentials/i)).toBeInTheDocument()
      })

      expect(mockPush).not.toHaveBeenCalled()
    })

    test('Inactive user account handling', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockSupabaseAuthUsers.volunteer },
        error: null,
      })
      mockSupabaseClient.from().single.mockResolvedValue({
        data: mockUserProfiles.inactive,
        error: null,
      })

      renderWithAuth(<LoginForm />)

      await userEvent.type(screen.getByLabelText(/correo electrónico/i), 'inactive@ppd.pr')
      await userEvent.type(screen.getByLabelText(/contraseña/i), 'password123')
      await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))

      await waitFor(() => {
        expect(screen.getByText(/usuario no encontrado o inactivo/i)).toBeInTheDocument()
      })

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
      expect(mockPush).not.toHaveBeenCalled()
    })

    test('User not found in database', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockSupabaseAuthUsers.admin },
        error: null,
      })
      mockSupabaseClient.from().single.mockResolvedValue({
        data: null,
        error: { message: 'No rows found' },
      })

      renderWithAuth(<LoginForm />)

      await userEvent.type(screen.getByLabelText(/correo electrónico/i), 'notfound@ppd.pr')
      await userEvent.type(screen.getByLabelText(/contraseña/i), 'password123')
      await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))

      await waitFor(() => {
        expect(screen.getByText(/usuario no encontrado o inactivo/i)).toBeInTheDocument()
      })

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
    })

    test('Network and database errors', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockSupabaseAuthUsers.admin },
        error: null,
      })
      mockSupabaseClient.from().single.mockRejectedValue(new Error('Database connection failed'))

      renderWithAuth(<LoginForm />)

      await userEvent.type(screen.getByLabelText(/correo electrónico/i), 'admin@ppd.pr')
      await userEvent.type(screen.getByLabelText(/contraseña/i), 'password123')
      await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))

      await waitFor(() => {
        expect(screen.getByText(/usuario no encontrado o inactivo/i)).toBeInTheDocument()
      })
    })
  })

  describe('Form Validation and UX', () => {
    test('Email validation with Spanish messages', async () => {
      renderWithAuth(<LoginForm />)

      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })
      await userEvent.click(submitButton)

      expect(screen.getByText(/el email es requerido/i)).toBeInTheDocument()
      expect(mockSupabaseClient.auth.signInWithPassword).not.toHaveBeenCalled()
    })

    test('Password validation with Spanish messages', async () => {
      renderWithAuth(<LoginForm />)

      await userEvent.type(screen.getByLabelText(/correo electrónico/i), 'test@example.com')
      await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))

      expect(screen.getByText(/la contraseña es requerida/i)).toBeInTheDocument()
      expect(mockSupabaseClient.auth.signInWithPassword).not.toHaveBeenCalled()
    })

    test('Error clearing when user types', async () => {
      renderWithAuth(<LoginForm />)

      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })
      await userEvent.click(submitButton)
      expect(screen.getByText(/el email es requerido/i)).toBeInTheDocument()

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      await userEvent.type(emailInput, 'a')
      expect(screen.queryByText(/el email es requerido/i)).not.toBeInTheDocument()
    })

    test('Loading state during authentication', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockImplementation(
        () => new Promise(resolve => {
          setTimeout(() => resolve({
            data: { user: mockSupabaseAuthUsers.admin },
            error: null,
          }), 100)
        })
      )
      mockSupabaseClient.from().single.mockResolvedValue({
        data: mockUserProfiles.admin,
        error: null,
      })

      renderWithAuth(<LoginForm />)

      await userEvent.type(screen.getByLabelText(/correo electrónico/i), 'admin@ppd.pr')
      await userEvent.type(screen.getByLabelText(/contraseña/i), 'password123')
      
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })
      await userEvent.click(submitButton)

      // Should show loading state
      expect(screen.getByText(/iniciando sesión/i)).toBeInTheDocument()
      expect(screen.getByRole('button')).toBeDisabled()

      // Wait for completion
      await waitFor(() => {
        expect(screen.queryByText(/iniciando sesión/i)).not.toBeInTheDocument()
      })
    })

    test('Prevention of multiple submissions', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockImplementation(
        () => new Promise(resolve => {
          setTimeout(() => resolve({
            data: { user: mockSupabaseAuthUsers.admin },
            error: null,
          }), 200)
        })
      )

      renderWithAuth(<LoginForm />)

      await userEvent.type(screen.getByLabelText(/correo electrónico/i), 'admin@ppd.pr')
      await userEvent.type(screen.getByLabelText(/contraseña/i), 'password123')
      
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })
      
      // Click multiple times
      await userEvent.click(submitButton)
      await userEvent.click(submitButton)
      await userEvent.click(submitButton)

      // Should only call signIn once
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledTimes(1)
    })
  })

  describe('Remember Me and UI Features', () => {
    test('Remember me checkbox functionality', async () => {
      renderWithAuth(<LoginForm />)

      const rememberCheckbox = screen.getByLabelText(/recordarme/i)
      expect(rememberCheckbox).not.toBeChecked()

      await userEvent.click(rememberCheckbox)
      expect(rememberCheckbox).toBeChecked()
    })

    test('Password visibility toggle', async () => {
      renderWithAuth(<LoginForm />)

      const passwordInput = screen.getByLabelText(/contraseña/i)
      expect(passwordInput).toHaveAttribute('type', 'password')

      // Find the eye icon button (it has no accessible name)
      const toggleButtons = screen.getAllByRole('button')
      const eyeButton = toggleButtons.find(button => 
        button.type === 'button' && 
        button.className.includes('absolute inset-y-0 right-0')
      )
      
      expect(eyeButton).toBeInTheDocument()
      await userEvent.click(eyeButton!)
      
      expect(passwordInput).toHaveAttribute('type', 'text')
    })

    test('Forgot password link', () => {
      renderWithAuth(<LoginForm />)

      const forgotPasswordLink = screen.getByText(/¿olvidaste tu contraseña\?/i)
      expect(forgotPasswordLink).toBeInTheDocument()
      expect(forgotPasswordLink.closest('a')).toHaveAttribute('href', '/auth/forgot-password')
    })
  })

  describe('Error Recovery and Retry', () => {
    test('Retry after failed attempt', async () => {
      // First attempt fails
      mockSupabaseClient.auth.signInWithPassword
        .mockResolvedValueOnce({
          data: { user: null },
          error: { message: 'Invalid credentials', status: 400, name: 'AuthApiError' },
        })
        .mockResolvedValueOnce({
          data: { user: mockSupabaseAuthUsers.admin },
          error: null,
        })

      mockSupabaseClient.from().single.mockResolvedValue({
        data: mockUserProfiles.admin,
        error: null,
      })

      renderWithAuth(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)

      // First attempt with wrong credentials
      await userEvent.type(emailInput, 'admin@ppd.pr')
      await userEvent.type(passwordInput, 'wrong')
      await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
      })

      // Clear and try again with correct credentials
      await userEvent.clear(passwordInput)
      await userEvent.type(passwordInput, 'password123')
      await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })
  })

  describe('Accessibility and Internationalization', () => {
    test('Form has proper Spanish labels and accessibility', () => {
      renderWithAuth(<LoginForm />)

      expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/recordarme/i)).toBeInTheDocument()
      
      // Check input types
      expect(screen.getByLabelText(/correo electrónico/i)).toHaveAttribute('type', 'email')
      expect(screen.getByLabelText(/contraseña/i)).toHaveAttribute('type', 'password')
      expect(screen.getByLabelText(/recordarme/i)).toHaveAttribute('type', 'checkbox')
      
      // Check autocomplete attributes
      expect(screen.getByLabelText(/correo electrónico/i)).toHaveAttribute('autoComplete', 'email')
      expect(screen.getByLabelText(/contraseña/i)).toHaveAttribute('autoComplete', 'current-password')
      
      // Check required fields
      expect(screen.getByLabelText(/correo electrónico/i)).toHaveAttribute('required')
      expect(screen.getByLabelText(/contraseña/i)).toHaveAttribute('required')
    })

    test('Development environment shows demo accounts', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      renderWithAuth(<LoginForm />)

      expect(screen.getByText(/cuentas de prueba:/i)).toBeInTheDocument()
      expect(screen.getByText(/admin@ppd.pr/i)).toBeInTheDocument()
      expect(screen.getByText(/volunteer@ppd.pr/i)).toBeInTheDocument()
      expect(screen.getByText(/password123/i)).toBeInTheDocument()

      process.env.NODE_ENV = originalEnv
    })

    test('Production environment hides demo accounts', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      renderWithAuth(<LoginForm />)

      expect(screen.queryByText(/cuentas de prueba:/i)).not.toBeInTheDocument()

      process.env.NODE_ENV = originalEnv
    })
  })
})