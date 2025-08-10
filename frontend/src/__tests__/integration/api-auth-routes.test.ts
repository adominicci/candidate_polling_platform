import { NextRequest, NextResponse } from 'next/server'
import { POST as loginPOST } from '@/app/api/auth/login/route'
import { POST as logoutPOST } from '@/app/api/auth/logout/route'
import { POST as refreshPOST } from '@/app/api/auth/refresh/route'
import { GET as meGET } from '@/app/api/auth/me/route'

// Mock Next.js server functions
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    set: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(),
  })),
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

const { createClient } = require('@/lib/supabase/server')
const { cookies } = require('next/headers')

describe('API Authentication Routes Tests', () => {
  let mockSupabaseClient: any
  let mockCookieStore: any

  beforeEach(() => {
    mockCookieStore = {
      set: jest.fn(),
      delete: jest.fn(),
      get: jest.fn(),
    }
    cookies.mockResolvedValue(mockCookieStore)

    mockSupabaseClient = {
      auth: {
        signInWithPassword: jest.fn(),
        signOut: jest.fn(),
        getUser: jest.fn(),
        refreshSession: jest.fn(),
      },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
        update: jest.fn().mockReturnThis(),
      })),
    }
    createClient.mockResolvedValue(mockSupabaseClient)

    jest.clearAllMocks()
  })

  describe('/api/auth/login', () => {
    const createLoginRequest = (body: any) => {
      return new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      })
    }

    test('Successful login with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'admin@ppd.pr',
        email_confirmed_at: '2024-01-01T00:00:00.000Z',
      }

      const mockSession = {
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-123',
        expires_in: 3600,
        user: mockUser,
      }

      const mockProfile = {
        id: 'user-123',
        email: 'admin@ppd.pr',
        role: 'admin',
        tenant_id: 'tenant-1',
        full_name: 'Admin User',
        is_active: true,
      }

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      })

      mockSupabaseClient.from().single.mockResolvedValue({
        data: mockProfile,
        error: null,
      })

      const request = createLoginRequest({
        email: 'admin@ppd.pr',
        password: 'password123',
      })

      const response = await loginPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user.id).toBe(mockUser.id)
      expect(data.user.email).toBe(mockUser.email)
      expect(data.user.profile).toEqual(mockProfile)

      // Should normalize email
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'admin@ppd.pr',
        password: 'password123',
      })

      // Should update last login timestamp
      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith({
        last_login_at: expect.any(String),
        updated_at: expect.any(String),
      })

      // Should set auth cookies
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        'sb-access-token',
        'access-token-123',
        expect.objectContaining({
          httpOnly: true,
          secure: false, // false in test environment
          sameSite: 'lax',
          path: '/',
        })
      )

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        'sb-refresh-token',
        'refresh-token-123',
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 30, // 30 days
        })
      )
    })

    test('Login with email normalization (case insensitive and whitespace)', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: {}, session: { access_token: 'token', refresh_token: 'refresh' } },
        error: null,
      })

      mockSupabaseClient.from().single.mockResolvedValue({
        data: { id: 'user-123', is_active: true },
        error: null,
      })

      const request = createLoginRequest({
        email: '  ADMIN@PPD.PR  ',
        password: 'password123',
      })

      await loginPOST(request)

      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'admin@ppd.pr', // normalized
        password: 'password123',
      })
    })

    test('Invalid credentials error', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials', status: 400 },
      })

      const request = createLoginRequest({
        email: 'wrong@example.com',
        password: 'wrongpassword',
      })

      const response = await loginPOST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Credenciales incorrectas. Verifica tu email y contraseña.')
    })

    test('Email not confirmed error', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email not confirmed', status: 400 },
      })

      const request = createLoginRequest({
        email: 'unconfirmed@ppd.pr',
        password: 'password123',
      })

      const response = await loginPOST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Email no confirmado. Contacta al administrador.')
    })

    test('Too many requests error', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Too many requests', status: 429 },
      })

      const request = createLoginRequest({
        email: 'admin@ppd.pr',
        password: 'password123',
      })

      const response = await loginPOST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Demasiados intentos. Espera unos minutos antes de intentar nuevamente.')
    })

    test('User not found in database', async () => {
      const mockUser = { id: 'user-123', email: 'nouser@ppd.pr' }
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'token', refresh_token: 'refresh' } },
        error: null,
      })

      // Profile not found
      mockSupabaseClient.from().single.mockResolvedValue({
        data: null,
        error: { message: 'No rows found' },
      })

      const request = createLoginRequest({
        email: 'nouser@ppd.pr',
        password: 'password123',
      })

      const response = await loginPOST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Usuario no encontrado o inactivo. Contacta al administrador.')

      // Should sign out the user
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
    })

    test('Inactive user account', async () => {
      const mockUser = { id: 'user-123', email: 'inactive@ppd.pr' }
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'token', refresh_token: 'refresh' } },
        error: null,
      })

      // Profile exists but is inactive
      mockSupabaseClient.from().single.mockResolvedValue({
        data: { id: 'user-123', is_active: false },
        error: null,
      })

      const request = createLoginRequest({
        email: 'inactive@ppd.pr',
        password: 'password123',
      })

      const response = await loginPOST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Usuario no encontrado o inactivo. Contacta al administrador.')
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
    })

    test('Missing email or password', async () => {
      const request1 = createLoginRequest({ password: 'password123' })
      const response1 = await loginPOST(request1)
      const data1 = await response1.json()

      expect(response1.status).toBe(400)
      expect(data1.error).toBe('Email y contraseña son requeridos')

      const request2 = createLoginRequest({ email: 'admin@ppd.pr' })
      const response2 = await loginPOST(request2)
      const data2 = await response2.json()

      expect(response2.status).toBe(400)
      expect(data2.error).toBe('Email y contraseña son requeridos')
    })

    test('Server error handling', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockRejectedValue(new Error('Database connection failed'))

      const request = createLoginRequest({
        email: 'admin@ppd.pr',
        password: 'password123',
      })

      const response = await loginPOST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error interno del servidor. Intenta nuevamente.')
    })
  })

  describe('/api/auth/logout', () => {
    const createLogoutRequest = () => {
      return new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
      })
    }

    test('Successful logout', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null })

      const request = createLogoutRequest()
      const response = await logoutPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Sesión cerrada exitosamente')

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()

      // Should clear auth cookies
      expect(mockCookieStore.delete).toHaveBeenCalledWith('sb-access-token')
      expect(mockCookieStore.delete).toHaveBeenCalledWith('sb-refresh-token')
      expect(mockCookieStore.delete).toHaveBeenCalledWith('sb-auth-token')
      expect(mockCookieStore.delete).toHaveBeenCalledWith('supabase-auth-token')
      expect(mockCookieStore.delete).toHaveBeenCalledWith('supabase.auth.token')
    })

    test('Logout with error still clears cookies', async () => {
      mockSupabaseClient.auth.signOut.mockRejectedValue(new Error('Logout failed'))

      const request = createLogoutRequest()
      const response = await logoutPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Sesión cerrada')

      // Should still clear cookies even if error occurs
      expect(mockCookieStore.delete).toHaveBeenCalledTimes(5)
    })
  })

  describe('/api/auth/me', () => {
    const createMeRequest = () => {
      return new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
      })
    }

    test('Returns user profile for authenticated user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'manager@ppd.pr',
        email_confirmed_at: '2024-01-01T00:00:00.000Z',
      }

      const mockProfile = {
        id: 'user-123',
        email: 'manager@ppd.pr',
        role: 'manager',
        tenant_id: 'tenant-1',
        full_name: 'Manager User',
        is_active: true,
      }

      const mockTenant = {
        id: 'tenant-1',
        name: 'PPD Tenant',
        slug: 'ppd',
        description: 'Test tenant',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from().single.mockResolvedValue({
        data: { ...mockProfile, tenants: mockTenant },
        error: null,
      })

      const request = createMeRequest()
      const response = await meGET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user.id).toBe(mockUser.id)
      expect(data.user.email).toBe(mockUser.email)
      expect(data.user.emailVerified).toBe(true)
      expect(data.user.profile.role).toBe('manager')
    })

    test('Returns 401 for unauthenticated user', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = createMeRequest()
      const response = await meGET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('No autenticado')
    })

    test('Returns 404 for user without profile', async () => {
      const mockUser = { id: 'user-123', email: 'noprofile@ppd.pr' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from().single.mockResolvedValue({
        data: null,
        error: { message: 'No rows found' },
      })

      const request = createMeRequest()
      const response = await meGET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Perfil de usuario no encontrado')
    })

    test('Handles server errors', async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValue(new Error('Database error'))

      const request = createMeRequest()
      const response = await meGET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error interno del servidor')
    })
  })

  describe('/api/auth/refresh', () => {
    const createRefreshRequest = () => {
      return new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
      })
    }

    test('Successfully refreshes session', async () => {
      const mockSession = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      }

      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      const request = createRefreshRequest()
      const response = await refreshPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.session.access_token).toBe('new-access-token')
      expect(data.session.expires_in).toBe(3600)

      // Should update cookies with new tokens
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        'sb-access-token',
        'new-access-token',
        expect.objectContaining({ httpOnly: true })
      )

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        'sb-refresh-token',
        'new-refresh-token',
        expect.objectContaining({ httpOnly: true })
      )
    })

    test('Handles refresh error', async () => {
      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Refresh token expired', status: 401 },
      })

      const request = createRefreshRequest()
      const response = await refreshPOST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Error al renovar la sesión')
    })

    test('Handles null session response', async () => {
      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })

      const request = createRefreshRequest()
      const response = await refreshPOST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('No se pudo renovar la sesión')
    })

    test('Handles server errors', async () => {
      mockSupabaseClient.auth.refreshSession.mockRejectedValue(new Error('Database error'))

      const request = createRefreshRequest()
      const response = await refreshPOST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error interno del servidor')
    })
  })
})