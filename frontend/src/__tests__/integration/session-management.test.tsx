import { renderHook, waitFor } from '@testing-library/react'
import { act } from 'react-dom/test-utils'
import { AuthProvider, useAuth } from '@/hooks/use-auth'
import { createMockSupabaseClient } from '@/__tests__/utils'
import { 
  mockUserProfiles, 
  mockSupabaseAuthUsers, 
  createMockSession,
  createMockJWT,
  mockAuthErrors 
} from '@/__tests__/utils/auth-test-utils'

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

const mockCreateClient = require('@/lib/supabase/client').createClient

describe('Session Management and Token Refresh Tests', () => {
  let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  )

  beforeEach(() => {
    mockSupabaseClient = createMockSupabaseClient()
    mockCreateClient.mockReturnValue(mockSupabaseClient)
    
    // Mock successful auth state by default
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })
    
    jest.clearAllMocks()
  })

  describe('Session Initialization', () => {
    test('Initializes with no user when no session exists', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      expect(result.current.isLoading).toBe(true) // Initially loading

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.user).toBeNull()
      expect(result.current.profile).toBeNull()
    })

    test('Initializes with existing user session', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockSupabaseAuthUsers.admin },
        error: null,
      })
      mockSupabaseClient.from().single.mockResolvedValue({
        data: mockUserProfiles.admin,
        error: null,
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.user).toEqual(mockSupabaseAuthUsers.admin)
      expect(result.current.profile).toEqual(mockUserProfiles.admin)
    })

    test('Handles user with invalid profile gracefully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockSupabaseAuthUsers.admin },
        error: null,
      })
      // Profile not found or inactive
      mockSupabaseClient.from().single.mockResolvedValue({
        data: null,
        error: { message: 'No rows found' },
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should sign out user with invalid profile
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
      expect(result.current.user).toBeNull()
      expect(result.current.profile).toBeNull()
    })
  })

  describe('Authentication State Changes', () => {
    test('Handles SIGNED_IN event from auth state change', async () => {
      let onAuthStateChangeCallback: (event: string, session: any) => void

      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        onAuthStateChangeCallback = callback
        return { data: { subscription: { unsubscribe: jest.fn() } } }
      })

      mockSupabaseClient.from().single.mockResolvedValue({
        data: mockUserProfiles.manager,
        error: null,
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Simulate sign in event
      await act(async () => {
        onAuthStateChangeCallback('SIGNED_IN', {
          user: mockSupabaseAuthUsers.manager,
        })
      })

      await waitFor(() => {
        expect(result.current.user).toEqual(mockSupabaseAuthUsers.manager)
        expect(result.current.profile).toEqual(mockUserProfiles.manager)
      })
    })

    test('Handles SIGNED_OUT event from auth state change', async () => {
      let onAuthStateChangeCallback: (event: string, session: any) => void

      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        onAuthStateChangeCallback = callback
        return { data: { subscription: { unsubscribe: jest.fn() } } }
      })

      // Start with authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockSupabaseAuthUsers.admin },
        error: null,
      })
      mockSupabaseClient.from().single.mockResolvedValue({
        data: mockUserProfiles.admin,
        error: null,
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.user).toEqual(mockSupabaseAuthUsers.admin)
      })

      // Simulate sign out event
      await act(async () => {
        onAuthStateChangeCallback('SIGNED_OUT', null)
      })

      expect(result.current.user).toBeNull()
      expect(result.current.profile).toBeNull()
    })

    test('Handles TOKEN_REFRESHED event', async () => {
      let onAuthStateChangeCallback: (event: string, session: any) => void

      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        onAuthStateChangeCallback = callback
        return { data: { subscription: { unsubscribe: jest.fn() } } }
      })

      // Start with authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockSupabaseAuthUsers.admin },
        error: null,
      })
      mockSupabaseClient.from().single.mockResolvedValue({
        data: mockUserProfiles.admin,
        error: null,
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.user).toEqual(mockSupabaseAuthUsers.admin)
      })

      const newSession = createMockSession(mockSupabaseAuthUsers.admin)

      // Simulate token refresh
      await act(async () => {
        onAuthStateChangeCallback('TOKEN_REFRESHED', newSession)
      })

      // Should maintain authentication state
      expect(result.current.user).toEqual(mockSupabaseAuthUsers.admin)
      expect(result.current.profile).toEqual(mockUserProfiles.admin)
    })
  })

  describe('Session Persistence', () => {
    test('Maintains authentication state across hook re-renders', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockSupabaseAuthUsers.volunteer },
        error: null,
      })
      mockSupabaseClient.from().single.mockResolvedValue({
        data: mockUserProfiles.volunteer,
        error: null,
      })

      const { result, rerender } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.user).toEqual(mockSupabaseAuthUsers.volunteer)
        expect(result.current.profile).toEqual(mockUserProfiles.volunteer)
      })

      // Re-render the hook
      rerender()

      // Should maintain the same state
      expect(result.current.user).toEqual(mockSupabaseAuthUsers.volunteer)
      expect(result.current.profile).toEqual(mockUserProfiles.volunteer)
    })

    test('Persists profile changes using refreshProfile', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockSupabaseAuthUsers.admin },
        error: null,
      })
      mockSupabaseClient.from().single.mockResolvedValue({
        data: mockUserProfiles.admin,
        error: null,
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.profile).toEqual(mockUserProfiles.admin)
      })

      // Mock updated profile
      const updatedProfile = {
        ...mockUserProfiles.admin,
        full_name: 'Updated Admin Name',
        updated_at: new Date().toISOString(),
      }

      mockSupabaseClient.from().single.mockResolvedValue({
        data: updatedProfile,
        error: null,
      })

      // Refresh profile
      await act(async () => {
        await result.current.refreshProfile()
      })

      expect(result.current.profile?.full_name).toBe('Updated Admin Name')
    })
  })

  describe('Session Errors and Edge Cases', () => {
    test('Handles auth errors during initialization', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth session expired', name: 'AuthError', status: 401 },
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.user).toBeNull()
      expect(result.current.profile).toBeNull()
    })

    test('Handles database errors when fetching profile', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockSupabaseAuthUsers.admin },
        error: null,
      })
      
      // Simulate database error
      mockSupabaseClient.from().single.mockRejectedValue(new Error('Database unavailable'))

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should sign out user when profile fetch fails
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
      expect(result.current.user).toBeNull()
      expect(result.current.profile).toBeNull()
    })

    test('Handles session expiry gracefully', async () => {
      let onAuthStateChangeCallback: (event: string, session: any) => void

      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        onAuthStateChangeCallback = callback
        return { data: { subscription: { unsubscribe: jest.fn() } } }
      })

      // Start with authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockSupabaseAuthUsers.admin },
        error: null,
      })
      mockSupabaseClient.from().single.mockResolvedValue({
        data: mockUserProfiles.admin,
        error: null,
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.user).toEqual(mockSupabaseAuthUsers.admin)
      })

      // Simulate session expiry
      await act(async () => {
        onAuthStateChangeCallback('SIGNED_OUT', null)
      })

      expect(result.current.user).toBeNull()
      expect(result.current.profile).toBeNull()
    })
  })

  describe('Role and Permission Helpers', () => {
    test('hasRole returns correct values for single role', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockSupabaseAuthUsers.manager },
        error: null,
      })
      mockSupabaseClient.from().single.mockResolvedValue({
        data: mockUserProfiles.manager,
        error: null,
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.profile).toEqual(mockUserProfiles.manager)
      })

      expect(result.current.hasRole('manager')).toBe(true)
      expect(result.current.hasRole('admin')).toBe(false)
      expect(result.current.hasRole('volunteer')).toBe(false)
      expect(result.current.hasRole('analyst')).toBe(false)
    })

    test('hasRole returns correct values for role array', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockSupabaseAuthUsers.analyst },
        error: null,
      })
      mockSupabaseClient.from().single.mockResolvedValue({
        data: mockUserProfiles.analyst,
        error: null,
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.profile).toEqual(mockUserProfiles.analyst)
      })

      expect(result.current.hasRole(['admin', 'analyst'])).toBe(true)
      expect(result.current.hasRole(['admin', 'manager'])).toBe(false)
      expect(result.current.hasRole(['volunteer'])).toBe(false)
    })

    test('hasRole returns false when no profile exists', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.hasRole('admin')).toBe(false)
      expect(result.current.hasRole(['admin', 'manager'])).toBe(false)
    })

    test('hasTenantAccess returns correct values', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockSupabaseAuthUsers.volunteer },
        error: null,
      })
      mockSupabaseClient.from().single.mockResolvedValue({
        data: mockUserProfiles.volunteer,
        error: null,
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.profile).toEqual(mockUserProfiles.volunteer)
      })

      expect(result.current.hasTenantAccess('ppd-tenant-1')).toBe(true)
      expect(result.current.hasTenantAccess('other-tenant')).toBe(false)
    })

    test('hasTenantAccess returns false when no profile exists', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.hasTenantAccess('ppd-tenant-1')).toBe(false)
    })
  })

  describe('Sign In Process', () => {
    test('Successful sign in updates profile and last login time', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const signInResponse = await act(async () => {
        return await result.current.signIn('admin@ppd.pr', 'password123')
      })

      expect(signInResponse.error).toBeNull()
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'admin@ppd.pr',
        password: 'password123',
      })

      // Check that last login was updated
      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith({
        last_login_at: expect.any(String),
      })

      expect(result.current.user).toEqual(mockSupabaseAuthUsers.admin)
      expect(result.current.profile).toEqual(mockUserProfiles.admin)
    })

    test('Sign in with email normalization (case and whitespace)', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.signIn('  ADMIN@PPD.PR  ', 'password123')
      })

      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'admin@ppd.pr',
        password: 'password123',
      })
    })

    test('Failed sign in returns error', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: mockAuthErrors.invalidCredentials,
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const signInResponse = await act(async () => {
        return await result.current.signIn('invalid@example.com', 'wrong')
      })

      expect(signInResponse.error).toEqual(mockAuthErrors.invalidCredentials)
      expect(result.current.user).toBeNull()
      expect(result.current.profile).toBeNull()
    })
  })

  describe('Sign Out Process', () => {
    test('Sign out clears user and profile state', async () => {
      // Start with authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockSupabaseAuthUsers.admin },
        error: null,
      })
      mockSupabaseClient.from().single.mockResolvedValue({
        data: mockUserProfiles.admin,
        error: null,
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.user).toEqual(mockSupabaseAuthUsers.admin)
      })

      await act(async () => {
        await result.current.signOut()
      })

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
      expect(result.current.user).toBeNull()
      expect(result.current.profile).toBeNull()
    })
  })

  describe('Memory Management and Cleanup', () => {
    test('Unsubscribes from auth state changes on unmount', () => {
      const mockUnsubscribe = jest.fn()
      mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      })

      const { unmount } = renderHook(() => useAuth(), { wrapper })
      
      unmount()

      expect(mockUnsubscribe).toHaveBeenCalled()
    })
  })
})