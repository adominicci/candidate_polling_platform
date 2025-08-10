import React, { ReactNode } from 'react'
import { render, RenderResult } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/hooks/use-auth'
import { User } from '@supabase/supabase-js'
import { Database } from '@/types/database'

type UserProfile = Database['public']['Tables']['users']['Row']
type UserRole = Database['public']['Enums']['user_role']

// Complete mock user profiles for all roles
export const mockUserProfiles: Record<UserRole | 'inactive', UserProfile> = {
  Admin: {
    id: 'admin-id-123',
    tenant_id: 'ppd-tenant-1',
    auth_user_id: 'admin-id-123',
    email: 'admin@ppd.pr',
    nombre_completo: 'Administrador PPD',
    telefono: null,
    rol: 'Admin',
    activo: true,
    ultimo_acceso: '2024-01-01T00:00:00.000Z',
    configuracion_perfil: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  Manager: {
    id: 'manager-id-101',
    tenant_id: 'ppd-tenant-1',
    auth_user_id: 'manager-id-101',
    email: 'manager@ppd.pr',
    nombre_completo: 'Gerente Campaña',
    telefono: null,
    rol: 'Manager',
    activo: true,
    ultimo_acceso: '2024-01-01T00:00:00.000Z',
    configuracion_perfil: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  Analyst: {
    id: 'analyst-id-789',
    tenant_id: 'ppd-tenant-1',
    auth_user_id: 'analyst-id-789',
    email: 'analyst@ppd.pr',
    nombre_completo: 'Analista Datos',
    telefono: null,
    rol: 'Analyst',
    activo: true,
    ultimo_acceso: '2024-01-01T00:00:00.000Z',
    configuracion_perfil: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  Volunteer: {
    id: 'volunteer-id-456',
    tenant_id: 'ppd-tenant-1',
    auth_user_id: 'volunteer-id-456',
    email: 'volunteer@ppd.pr',
    nombre_completo: 'Voluntario Activo',
    telefono: null,
    rol: 'Volunteer',
    activo: true,
    ultimo_acceso: '2024-01-01T00:00:00.000Z',
    configuracion_perfil: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  inactive: {
    id: 'inactive-id-999',
    tenant_id: 'ppd-tenant-1',
    auth_user_id: 'inactive-id-999',
    email: 'inactive@ppd.pr',
    nombre_completo: 'Usuario Inactivo',
    telefono: null,
    rol: 'Volunteer',
    activo: false,
    ultimo_acceso: null,
    configuracion_perfil: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
}

// Corresponding Supabase auth users
export const mockSupabaseAuthUsers: Record<UserRole, User> = {
  Admin: {
    id: 'admin-id-123',
    email: 'admin@ppd.pr',
    email_confirmed_at: '2024-01-01T00:00:00.000Z',
    user_metadata: {},
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  } as User,
  Manager: {
    id: 'manager-id-101',
    email: 'manager@ppd.pr',
    email_confirmed_at: '2024-01-01T00:00:00.000Z',
    user_metadata: {},
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  } as User,
  Analyst: {
    id: 'analyst-id-789',
    email: 'analyst@ppd.pr',
    email_confirmed_at: '2024-01-01T00:00:00.000Z',
    user_metadata: {},
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  } as User,
  Volunteer: {
    id: 'volunteer-id-456',
    email: 'volunteer@ppd.pr',
    email_confirmed_at: '2024-01-01T00:00:00.000Z',
    user_metadata: {},
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  } as User,
}

// Mock authentication context interface
export interface MockAuthContextType {
  user: User | null
  profile: UserProfile | null
  isLoading: boolean
  signIn: jest.Mock
  signOut: jest.Mock
  hasRole: jest.Mock
  hasTenantAccess: jest.Mock
  refreshProfile: jest.Mock
}

// Create mock auth context with full control
export const createMockAuthContext = (overrides: Partial<MockAuthContextType> = {}): MockAuthContextType => ({
  user: null,
  profile: null,
  isLoading: false,
  signIn: jest.fn().mockResolvedValue({ error: null }),
  signOut: jest.fn().mockResolvedValue(undefined),
  hasRole: jest.fn().mockReturnValue(false),
  hasTenantAccess: jest.fn().mockReturnValue(false),
  refreshProfile: jest.fn().mockResolvedValue(undefined),
  ...overrides,
})

// Pre-configured auth contexts for different scenarios
export const mockAuthScenarios = {
  // Unauthenticated state
  unauthenticated: (): MockAuthContextType => createMockAuthContext({
    user: null,
    profile: null,
    isLoading: false,
  }),

  // Loading state
  loading: (): MockAuthContextType => createMockAuthContext({
    user: null,
    profile: null,
    isLoading: true,
  }),

  // Authenticated as admin
  authenticatedAdmin: (): MockAuthContextType => createMockAuthContext({
    user: mockSupabaseAuthUsers.Admin,
    profile: mockUserProfiles.Admin,
    isLoading: false,
    hasRole: jest.fn().mockImplementation((role: UserRole | UserRole[]) => {
      const roles = Array.isArray(role) ? role : [role]
      return roles.includes('Admin')
    }),
    hasTenantAccess: jest.fn().mockReturnValue(true),
  }),

  // Authenticated as manager
  authenticatedManager: (): MockAuthContextType => createMockAuthContext({
    user: mockSupabaseAuthUsers.Manager,
    profile: mockUserProfiles.Manager,
    isLoading: false,
    hasRole: jest.fn().mockImplementation((role: UserRole | UserRole[]) => {
      const roles = Array.isArray(role) ? role : [role]
      return roles.includes('Manager')
    }),
    hasTenantAccess: jest.fn().mockReturnValue(true),
  }),

  // Authenticated as analyst
  authenticatedAnalyst: (): MockAuthContextType => createMockAuthContext({
    user: mockSupabaseAuthUsers.Analyst,
    profile: mockUserProfiles.Analyst,
    isLoading: false,
    hasRole: jest.fn().mockImplementation((role: UserRole | UserRole[]) => {
      const roles = Array.isArray(role) ? role : [role]
      return roles.includes('Analyst')
    }),
    hasTenantAccess: jest.fn().mockReturnValue(true),
  }),

  // Authenticated as volunteer
  authenticatedVolunteer: (): MockAuthContextType => createMockAuthContext({
    user: mockSupabaseAuthUsers.Volunteer,
    profile: mockUserProfiles.Volunteer,
    isLoading: false,
    hasRole: jest.fn().mockImplementation((role: UserRole | UserRole[]) => {
      const roles = Array.isArray(role) ? role : [role]
      return roles.includes('Volunteer')
    }),
    hasTenantAccess: jest.fn().mockReturnValue(true),
  }),
}

// Mock AuthProvider component for testing
interface MockAuthProviderProps {
  children: ReactNode
  value: MockAuthContextType
}

const MockAuthProvider: React.FC<MockAuthProviderProps> = ({ children, value }) => {
  // Mock the useAuth hook to return our controlled values
  React.useEffect(() => {
    jest.doMock('@/hooks/use-auth', () => ({
      useAuth: () => value,
      AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
    }))
  }, [value])

  return <>{children}</>
}

// Render helper that provides auth context
export const renderWithAuth = (
  component: ReactNode,
  authContext: MockAuthContextType = mockAuthScenarios.unauthenticated()
): RenderResult => {
  // Mock the useAuth hook before rendering
  const mockUseAuth = jest.fn().mockReturnValue(authContext)
  
  // We need to mock the module before importing the component
  jest.doMock('@/hooks/use-auth', () => ({
    useAuth: mockUseAuth,
    AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  }))

  return render(
    <MockAuthProvider value={authContext}>
      {component}
    </MockAuthProvider>
  )
}

// Helper to simulate auth state changes during tests
export class AuthTestController {
  private mockAuthContext: MockAuthContextType
  private updateCallback?: (context: MockAuthContextType) => void

  constructor(initialContext: MockAuthContextType = mockAuthScenarios.unauthenticated()) {
    this.mockAuthContext = initialContext
  }

  // Update the auth state (useful for testing state transitions)
  updateAuthState(updates: Partial<MockAuthContextType>): void {
    this.mockAuthContext = { ...this.mockAuthContext, ...updates }
    if (this.updateCallback) {
      this.updateCallback(this.mockAuthContext)
    }
  }

  // Simulate successful login
  simulateLogin(role: UserRole): void {
    const user = mockSupabaseAuthUsers[role]
    const profile = mockUserProfiles[role]
    
    this.updateAuthState({
      user,
      profile,
      isLoading: false,
      hasRole: jest.fn().mockImplementation((r: UserRole | UserRole[]) => {
        const roles = Array.isArray(r) ? r : [r]
        return roles.includes(role)
      }),
    })
  }

  // Simulate logout
  simulateLogout(): void {
    this.updateAuthState({
      user: null,
      profile: null,
      isLoading: false,
    })
  }

  // Simulate loading state
  simulateLoading(): void {
    this.updateAuthState({
      isLoading: true,
    })
  }

  // Get current auth context
  getAuthContext(): MockAuthContextType {
    return this.mockAuthContext
  }

  // Set callback for state updates
  onStateUpdate(callback: (context: MockAuthContextType) => void): void {
    this.updateCallback = callback
  }
}

// Common error mocks
export const mockAuthErrors = {
  invalidCredentials: {
    message: 'Invalid login credentials',
    status: 400,
    name: 'AuthApiError' as const,
  },
  userNotFound: {
    message: 'Usuario no encontrado o inactivo. Contacta al administrador.',
    status: 403,
    name: 'UserNotFound' as const,
  },
  networkError: {
    message: 'Network request failed',
    status: 500,
    name: 'NetworkError' as const,
  },
  emailNotConfirmed: {
    message: 'Email not confirmed',
    status: 400,
    name: 'AuthApiError' as const,
  },
  tooManyRequests: {
    message: 'Too many requests',
    status: 429,
    name: 'AuthApiError' as const,
  },
}

// Form data helpers
export const mockFormData = {
  validAdmin: {
    email: 'admin@ppd.pr',
    password: 'password123',
    remember: false,
  },
  validManager: {
    email: 'manager@ppd.pr',
    password: 'password123',
    remember: false,
  },
  validAnalyst: {
    email: 'analyst@ppd.pr',
    password: 'password123',
    remember: false,
  },
  validVolunteer: {
    email: 'volunteer@ppd.pr',
    password: 'password123',
    remember: false,
  },
  invalidCredentials: {
    email: 'invalid@example.com',
    password: 'wrongpassword',
    remember: false,
  },
  emptyForm: {
    email: '',
    password: '',
    remember: false,
  },
}

// Session mock helpers
export const createMockSession = (user: User, expiresIn: number = 3600) => ({
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: expiresIn,
  expires_at: Math.floor(Date.now() / 1000) + expiresIn,
  token_type: 'bearer',
  user,
})

// JWT token helpers for testing
export const createMockJWT = (payload: any = {}) => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify({
    iss: 'supabase',
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    ...payload,
  }))
  const signature = 'mock-signature'
  return `${header}.${body}.${signature}`
}