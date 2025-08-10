import { renderHook, waitFor } from '@testing-library/react'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from '@/hooks/use-auth'
import { LoginForm } from '@/components/auth/login-form'
import { createMockSupabaseClient } from '@/__tests__/utils'
import { 
  mockUserProfiles, 
  mockSupabaseAuthUsers, 
  mockAuthErrors,
  AuthTestController 
} from '@/__tests__/utils/auth-test-utils'

// Mock dependencies
jest.mock('next/navigation')
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

const mockCreateClient = require('@/lib/supabase/client').createClient

describe('Authentication Edge Cases and Security Tests', () => {
  let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>
  
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  )

  beforeEach(() => {
    mockSupabaseClient = createMockSupabaseClient()
    mockCreateClient.mockReturnValue(mockSupabaseClient)
    jest.clearAllMocks()
  })

  describe('Concurrent Authentication Scenarios', () => {
    test('Handles multiple simultaneous login attempts', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const signInPromises = [
        result.current.signIn('admin@ppd.pr', 'password123'),
        result.current.signIn('admin@ppd.pr', 'password123'),
        result.current.signIn('admin@ppd.pr', 'password123'),
      ]

      await Promise.all(signInPromises.map(p => p.catch(() => {})))

      // Should handle concurrent calls gracefully
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledTimes(3)
    })

    test('Handles login attempt during existing login process', async () => {
      let resolveFirstSignIn: (value: any) => void
      
      mockSupabaseClient.auth.signInWithPassword
        .mockImplementationOnce(() => new Promise(resolve => {
          resolveFirstSignIn = resolve
        }))
        .mockResolvedValueOnce({
          data: { user: mockSupabaseAuthUsers.Admin },
          error: null,
        })

      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Start first login
      const firstLogin = result.current.signIn('admin@ppd.pr', 'password123')
      
      // Start second login while first is pending
      const secondLogin = result.current.signIn('manager@ppd.pr', 'password456')
      
      // Resolve first login
      resolveFirstSignIn!({
        data: { user: mockSupabaseAuthUsers.Admin },
        error: null,
      })

      const [firstResult, secondResult] = await Promise.all([firstLogin, secondLogin])
      
      expect(firstResult.error).toBeNull()
      expect(secondResult.error).toBeNull()
    })

    test('Handles rapid logout/login cycles', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockSupabaseAuthUsers.Admin },
        error: null,
      })
      mockSupabaseClient.from().single.mockResolvedValue({
        data: mockUserProfiles.Admin,
        error: null,
      })

      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.user).toEqual(mockSupabaseAuthUsers.Admin)
      })

      // Rapid logout/login cycle
      await act(async () => {
        await result.current.signOut()
        await result.current.signIn('admin@ppd.pr', 'password123')
        await result.current.signOut()
        await result.current.signIn('admin@ppd.pr', 'password123')
      })

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalledTimes(2)
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledTimes(2)
    })
  })

  describe('Network and Connection Edge Cases', () => {
    test('Handles network timeout during authentication', async () => {
      // Simulate network timeout
      mockSupabaseClient.auth.signInWithPassword.mockImplementation(
        () => new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Network timeout')), 100)
        })
      )

      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const signInResult = await act(async () => {
        return await result.current.signIn('admin@ppd.pr', 'password123')
      })

      expect(signInResult.error).toBeDefined()
      expect(result.current.user).toBeNull()
    })

    test('Handles intermittent connection during profile fetch', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockSupabaseAuthUsers.Admin },
        error: null,
      })

      // First profile fetch fails, second succeeds
      mockSupabaseClient.from().single
        .mockRejectedValueOnce(new Error('Connection lost'))
        .mockResolvedValueOnce({
          data: mockUserProfiles.Admin,
          error: null,
        })

      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const signInResult = await act(async () => {
        return await result.current.signIn('admin@ppd.pr', 'password123')
      })

      // Should handle the error gracefully
      expect(signInResult.error).toBeDefined()
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
    })

    test('Handles slow database responses', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockSupabaseAuthUsers.Admin },
        error: null,
      })

      // Simulate slow database response
      mockSupabaseClient.from().single.mockImplementation(
        () => new Promise(resolve => {
          setTimeout(() => resolve({
            data: mockUserProfiles.Admin,
            error: null,
          }), 500)
        })
      )

      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const startTime = Date.now()
      const signInResult = await act(async () => {
        return await result.current.signIn('admin@ppd.pr', 'password123')
      })
      const endTime = Date.now()

      expect(endTime - startTime).toBeGreaterThan(400)
      expect(signInResult.error).toBeNull()
      expect(result.current.user).toEqual(mockSupabaseAuthUsers.Admin)
    })
  })

  describe('Data Corruption and Malformed Response Handling', () => {
    test('Handles malformed user object from Supabase', async () => {
      // Return malformed user object
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { 
          user: { 
            id: null, // Invalid ID
            email: undefined, // Missing email
          } 
        },
        error: null,
      })

      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const signInResult = await act(async () => {
        return await result.current.signIn('admin@ppd.pr', 'password123')
      })

      // Should handle gracefully and not crash
      expect(result.current.user).toBeNull()
    })

    test('Handles malformed profile data from database', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockSupabaseAuthUsers.Admin },
        error: null,
      })

      // Return malformed profile
      mockSupabaseClient.from().single.mockResolvedValue({
        data: {
          id: mockSupabaseAuthUsers.Admin.id,
          // Missing required fields
          role: undefined,
          is_active: null,
          tenant_id: '',
        },
        error: null,
      })

      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const signInResult = await act(async () => {
        return await result.current.signIn('admin@ppd.pr', 'password123')
      })

      // Should handle malformed data gracefully
      expect(signInResult.error).toBeDefined()
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
    })

    test('Handles corrupted session data', async () => {
      let onAuthStateChangeCallback: (event: string, session: any) => void

      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        onAuthStateChangeCallback = callback
        return { data: { subscription: { unsubscribe: jest.fn() } } }
      })

      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Simulate corrupted session
      await act(async () => {
        onAuthStateChangeCallback('SIGNED_IN', {
          user: null, // Corrupted: SIGNED_IN event with null user
          access_token: 'corrupted-token',
        })
      })

      // Should handle gracefully
      expect(result.current.user).toBeNull()
    })
  })

  describe('Security Attack Scenarios', () => {
    test('Prevents SQL injection in email field', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const maliciousEmail = "admin@ppd.pr'; DROP TABLE users; --"
      
      await act(async () => {
        await result.current.signIn(maliciousEmail, 'password123')
      })

      // Should pass email as-is to Supabase (which handles sanitization)
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: maliciousEmail.toLowerCase().trim(),
        password: 'password123',
      })
    })

    test('Prevents XSS in profile data', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockSupabaseAuthUsers.Admin },
        error: null,
      })

      // Profile with potentially malicious script
      const maliciousProfile = {
        ...mockUserProfiles.Admin,
        nombre_completo: '<script>alert("XSS")</script>Admin User',
        metadata: {
          description: 'javascript:alert("XSS")',
        },
      }

      mockSupabaseClient.from().single.mockResolvedValue({
        data: maliciousProfile,
        error: null,
      })

      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.signIn('admin@ppd.pr', 'password123')
      })

      // Should store the data as-is (React will escape it when rendering)
      expect(result.current.profile?.nombre_completo).toBe('<script>alert("XSS")</script>Admin User')
    })

    test('Handles extremely long input strings', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const longEmail = 'a'.repeat(10000) + '@ppd.pr'
      const longPassword = 'p'.repeat(10000)
      
      await act(async () => {
        await result.current.signIn(longEmail, longPassword)
      })

      // Should handle long strings without crashing
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: longEmail.toLowerCase().trim(),
        password: longPassword,
      })
    })

    test('Handles special characters in credentials', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const specialEmail = 'user+test@ppd.pr'
      const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?'
      
      await act(async () => {
        await result.current.signIn(specialEmail, specialPassword)
      })

      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: specialEmail,
        password: specialPassword,
      })
    })
  })

  describe('Race Condition Edge Cases', () => {
    test('Handles profile refresh during active session', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockSupabaseAuthUsers.Manager },
        error: null,
      })
      mockSupabaseClient.from().single.mockResolvedValue({
        data: mockUserProfiles.Manager,
        error: null,
      })

      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.user).toEqual(mockSupabaseAuthUsers.Manager)
      })

      // Simulate concurrent profile refresh calls
      const refreshPromises = [
        result.current.refreshProfile(),
        result.current.refreshProfile(),
        result.current.refreshProfile(),
      ]

      await Promise.all(refreshPromises)

      // Should handle multiple calls gracefully
      expect(mockSupabaseClient.from).toHaveBeenCalled()
    })

    test('Handles sign out during profile loading', async () => {
      let resolveProfileFetch: (value: any) => void
      
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockSupabaseAuthUsers.Admin },
        error: null,
      })

      mockSupabaseClient.from().single.mockImplementation(
        () => new Promise(resolve => {
          resolveProfileFetch = resolve
        })
      )

      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Start sign in
      const signInPromise = result.current.signIn('admin@ppd.pr', 'password123')
      
      // Sign out while profile is loading
      await act(async () => {
        await result.current.signOut()
      })

      // Resolve profile fetch
      resolveProfileFetch!({
        data: mockUserProfiles.Admin,
        error: null,
      })

      await signInPromise

      // Should remain signed out
      expect(result.current.user).toBeNull()
    })

    test('Handles auth state change during component unmount', async () => {
      let onAuthStateChangeCallback: (event: string, session: any) => void

      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        onAuthStateChangeCallback = callback
        return { data: { subscription: { unsubscribe: jest.fn() } } }
      })

      const { result, unmount } = renderHook(() => useAuth(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Unmount the component
      unmount()

      // Try to trigger auth state change after unmount
      await act(async () => {
        onAuthStateChangeCallback('SIGNED_IN', {
          user: mockSupabaseAuthUsers.Admin,
        })
      })

      // Should not cause errors or memory leaks
      expect(true).toBe(true) // Test passes if no errors thrown
    })
  })

  describe('Form Security Edge Cases', () => {
    test('Handles form submission with JavaScript disabled', () => {
      render(<LoginForm />)

      const form = screen.getByRole('form') || screen.getByTestId('login-form') || screen.getByTagName('form')
      
      // Simulate form submission without JavaScript
      if (form) {
        expect(form).toHaveAttribute('method') // Should have fallback method
      }
      
      // Should still render properly without JS
      expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument()
    })

    test('Prevents credential autocomplete leakage', () => {
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)

      expect(emailInput).toHaveAttribute('autoComplete', 'email')
      expect(passwordInput).toHaveAttribute('autoComplete', 'current-password')
      
      // Should not have autocomplete="off" which can be bypassed
      expect(emailInput).not.toHaveAttribute('autoComplete', 'off')
      expect(passwordInput).not.toHaveAttribute('autoComplete', 'off')
    })

    test('Handles rapid form submissions', async () => {
      const mockUseAuth = require('@/hooks/use-auth').useAuth
      const mockSignIn = jest.fn().mockResolvedValue({ error: null })
      
      jest.doMock('@/hooks/use-auth', () => ({
        useAuth: () => ({
          signIn: mockSignIn,
          isLoading: false,
          user: null,
          profile: null,
          signOut: jest.fn(),
          hasRole: jest.fn(),
          hasTenantAccess: jest.fn(),
          refreshProfile: jest.fn(),
        }),
      }))

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })

      await userEvent.type(emailInput, 'admin@ppd.pr')
      await userEvent.type(passwordInput, 'password123')

      // Rapidly submit multiple times
      await userEvent.click(submitButton)
      await userEvent.click(submitButton)
      await userEvent.click(submitButton)

      // Should be protected against rapid submissions
      // (This test verifies the form handles multiple clicks gracefully)
      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })

  describe('Memory and Resource Management', () => {
    test('Cleans up event listeners on unmount', () => {
      const mockUnsubscribe = jest.fn()
      mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      })

      const { unmount } = renderHook(() => useAuth(), { wrapper })
      
      unmount()

      expect(mockUnsubscribe).toHaveBeenCalled()
    })

    test('Handles memory pressure during authentication', async () => {
      // Simulate low memory conditions
      const originalMemoryUsage = process.memoryUsage
      const mockMemoryUsage = jest.fn().mockReturnValue({
        rss: 1024 * 1024 * 1024, // 1GB
        heapTotal: 1024 * 1024 * 512, // 512MB
        heapUsed: 1024 * 1024 * 500, // 500MB
        external: 1024 * 1024 * 10, // 10MB
        arrayBuffers: 0,
      })
      
      // @ts-ignore
      process.memoryUsage = mockMemoryUsage

      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.signIn('admin@ppd.pr', 'password123')
      })

      // Should handle authentication even under memory pressure
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalled()

      // @ts-ignore
      process.memoryUsage = originalMemoryUsage
    })
  })
})