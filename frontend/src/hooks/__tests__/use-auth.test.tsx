import { renderHook, waitFor } from '@testing-library/react'
import { act } from 'react-dom/test-utils'
import { AuthProvider, useAuth } from '../use-auth'
import { createMockSupabaseClient, mockUsers, mockSupabaseUsers, mockErrors } from '@/__tests__/utils'

// Mock the Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

const mockCreateClient = require('@/lib/supabase/client').createClient

describe('useAuth Hook', () => {
  let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    mockSupabaseClient = createMockSupabaseClient()
    mockCreateClient.mockReturnValue(mockSupabaseClient)
    
    // Reset all mocks
    jest.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  )

  describe('Initial State', () => {
    it('starts with null user and loading true', () => {
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      expect(result.current.user).toBeNull()
      expect(result.current.profile).toBeNull()
      expect(result.current.isLoading).toBe(true)
    })

    it('initializes with existing user session', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockSupabaseUsers.Admin },
        error: null,
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.user).toEqual(mockSupabaseUsers.Admin)
      expect(result.current.profile).toEqual(mockUsers.Admin)
    })

    it('handles no existing session', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.user).toBeNull()
      expect(result.current.profile).toBeNull()
    })
  })

  describe('signIn', () => {
    it('signs in successfully with valid credentials', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      await act(async () => {
        const response = await result.current.signIn('admin@ppd.pr', 'password123')
        expect(response.error).toBeNull()
      })

      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'admin@ppd.pr',
        password: 'password123',
      })

      expect(result.current.user).toEqual(mockSupabaseUsers.Admin)
      expect(result.current.profile).toEqual(mockUsers.Admin)
    })

    it('handles invalid credentials', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: mockErrors.invalidCredentials,
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await act(async () => {
        const response = await result.current.signIn('invalid@example.com', 'wrong')
        expect(response.error).toEqual(mockErrors.invalidCredentials)
      })

      expect(result.current.user).toBeNull()
      expect(result.current.profile).toBeNull()
    })

    it('handles user not found in database', async () => {
      // User exists in auth but not in our users table
      mockSupabaseClient.from().single.mockResolvedValue({
        data: null,
        error: { message: 'No rows found' },
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await act(async () => {
        const response = await result.current.signIn('nouser@ppd.pr', 'password')
        expect(response.error).toBeDefined()
        expect(response.error?.message).toContain('Usuario no encontrado')
      })

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
    })

    it('handles inactive user', async () => {
      mockSupabaseClient.from().single.mockResolvedValue({
        data: mockUsers.inactive,
        error: null,
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await act(async () => {
        const response = await result.current.signIn('inactive@ppd.pr', 'password')
        expect(response.error?.message).toContain('Usuario no encontrado')
      })

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
    })

    it('trims and lowercases email', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      await act(async () => {
        await result.current.signIn('  ADMIN@PPD.PR  ', 'password123')
      })

      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'admin@ppd.pr',
        password: 'password123',
      })
    })

    it('updates last_login_at timestamp', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      await act(async () => {
        await result.current.signIn('admin@ppd.pr', 'password123')
      })

      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith({
        last_login_at: expect.any(String),
      })
    })
  })

  describe('signOut', () => {
    it('signs out successfully', async () => {
      // First sign in
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await act(async () => {
        await result.current.signIn('admin@ppd.pr', 'password123')
      })

      expect(result.current.user).not.toBeNull()

      // Then sign out
      await act(async () => {
        await result.current.signOut()
      })

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
      expect(result.current.user).toBeNull()
      expect(result.current.profile).toBeNull()
    })
  })

  describe('hasRole', () => {
    it('returns true for matching single role', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await act(async () => {
        await result.current.signIn('admin@ppd.pr', 'password123')
      })

      expect(result.current.hasRole('Admin')).toBe(true)
      expect(result.current.hasRole('Volunteer')).toBe(false)
    })

    it('returns true for matching role in array', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await act(async () => {
        await result.current.signIn('admin@ppd.pr', 'password123')
      })

      expect(result.current.hasRole(['Admin', 'Manager'])).toBe(true)
      expect(result.current.hasRole(['Volunteer', 'Analyst'])).toBe(false)
    })

    it('returns false when no profile exists', () => {
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      expect(result.current.hasRole('Admin')).toBe(false)
    })
  })

  describe('hasTenantAccess', () => {
    it('returns true for matching tenant', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await act(async () => {
        await result.current.signIn('admin@ppd.pr', 'password123')
      })

      expect(result.current.hasTenantAccess('ppd-tenant-1')).toBe(true)
      expect(result.current.hasTenantAccess('other-tenant')).toBe(false)
    })

    it('returns false when no profile exists', () => {
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      expect(result.current.hasTenantAccess('ppd-tenant-1')).toBe(false)
    })
  })

  describe('refreshProfile', () => {
    it('refreshes user profile successfully', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      // Sign in first
      await act(async () => {
        await result.current.signIn('admin@ppd.pr', 'password123')
      })

      // Mock updated profile data
      const updatedProfile = { ...mockUsers.Admin, nombre_completo: 'Updated Name' }
      mockSupabaseClient.from().single.mockResolvedValue({
        data: updatedProfile,
        error: null,
      })

      await act(async () => {
        await result.current.refreshProfile()
      })

      expect(result.current.profile?.nombre_completo).toBe('Updated Name')
    })

    it('does nothing when no user is logged in', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      await act(async () => {
        await result.current.refreshProfile()
      })

      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })
  })

  describe('Auth State Changes', () => {
    it('handles SIGNED_IN event', async () => {
      let onAuthStateChangeCallback: (event: string, session: any) => void

      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        onAuthStateChangeCallback = callback
        return { data: { subscription: { unsubscribe: jest.fn() } } }
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await act(async () => {
        onAuthStateChangeCallback('SIGNED_IN', {
          user: mockSupabaseUsers.Admin,
        })
      })

      await waitFor(() => {
        expect(result.current.user).toEqual(mockSupabaseUsers.Admin)
        expect(result.current.profile).toEqual(mockUsers.Admin)
      })
    })

    it('handles SIGNED_OUT event', async () => {
      let onAuthStateChangeCallback: (event: string, session: any) => void

      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        onAuthStateChangeCallback = callback
        return { data: { subscription: { unsubscribe: jest.fn() } } }
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      // Sign in first
      await act(async () => {
        await result.current.signIn('admin@ppd.pr', 'password123')
      })

      // Then simulate sign out event
      await act(async () => {
        onAuthStateChangeCallback('SIGNED_OUT', null)
      })

      expect(result.current.user).toBeNull()
      expect(result.current.profile).toBeNull()
    })
  })

  describe('Error Handling', () => {
    it('handles database connection errors gracefully', async () => {
      mockSupabaseClient.from().single.mockRejectedValue(new Error('Connection failed'))

      const { result } = renderHook(() => useAuth(), { wrapper })

      await act(async () => {
        const response = await result.current.signIn('admin@ppd.pr', 'password123')
        expect(response.error).toBeDefined()
      })

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
    })
  })

  describe('Context Provider', () => {
    it('throws error when used outside provider', () => {
      // Suppress console.error for this test
      const originalError = console.error
      console.error = jest.fn()

      expect(() => {
        renderHook(() => useAuth())
      }).toThrow('useAuth debe ser usado dentro de un AuthProvider')

      console.error = originalError
    })
  })
})