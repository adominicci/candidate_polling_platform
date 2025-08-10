import { Database } from '@/types/database'

type UserProfile = Database['public']['Tables']['users']['Row']
type UserRole = Database['public']['Enums']['user_role']

/**
 * Mock user profiles for testing
 */
export const mockUsers = {
  admin: {
    id: 'admin-id-123',
    email: 'admin@ppd.pr',
    role: 'admin' as UserRole,
    tenant_id: 'ppd-tenant-1',
    full_name: 'Administrador PPD',
    is_active: true,
    metadata: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    last_login_at: '2024-01-01T00:00:00.000Z',
  } as UserProfile,

  volunteer: {
    id: 'volunteer-id-456',
    email: 'volunteer@ppd.pr',
    role: 'volunteer' as UserRole,
    tenant_id: 'ppd-tenant-1',
    full_name: 'Voluntario Activo',
    is_active: true,
    metadata: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    last_login_at: '2024-01-01T00:00:00.000Z',
  } as UserProfile,

  analyst: {
    id: 'analyst-id-789',
    email: 'analyst@ppd.pr',
    role: 'analyst' as UserRole,
    tenant_id: 'ppd-tenant-1',
    full_name: 'Analista Datos',
    is_active: true,
    metadata: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    last_login_at: '2024-01-01T00:00:00.000Z',
  } as UserProfile,

  manager: {
    id: 'manager-id-101',
    email: 'manager@ppd.pr',
    role: 'manager' as UserRole,
    tenant_id: 'ppd-tenant-1',
    full_name: 'Gerente Campaña',
    is_active: true,
    metadata: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    last_login_at: '2024-01-01T00:00:00.000Z',
  } as UserProfile,

  inactive: {
    id: 'inactive-id-999',
    email: 'inactive@ppd.pr',
    role: 'volunteer' as UserRole,
    tenant_id: 'ppd-tenant-1',
    full_name: 'Usuario Inactivo',
    is_active: false,
    metadata: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    last_login_at: null,
  } as UserProfile,
}

/**
 * Mock Supabase auth users
 */
export const mockSupabaseUsers = {
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

/**
 * Mock form data for testing
 */
export const mockFormData = {
  validLogin: {
    email: 'admin@ppd.pr',
    password: 'password123',
    remember: false,
  },

  invalidLogin: {
    email: 'invalid@example.com',
    password: 'wrongpassword',
    remember: false,
  },

  emptyLogin: {
    email: '',
    password: '',
    remember: false,
  },
}

/**
 * Mock error responses
 */
export const mockErrors = {
  invalidCredentials: {
    message: 'Invalid login credentials',
    status: 400,
    name: 'AuthApiError',
  },

  userNotFound: {
    message: 'Usuario no encontrado o inactivo. Contacta al administrador.',
    status: 403,
    name: 'UserNotFound',
  },

  networkError: {
    message: 'Network request failed',
    status: 500,
    name: 'NetworkError',
  },
}

/**
 * Utility function to create mock survey data
 */
export const createMockSurveyResponse = (overrides = {}) => ({
  id: 'response-123',
  questionnaire_id: 'questionnaire-456',
  user_id: 'volunteer-id-456',
  precinct_id: 'precinct-789',
  respondent_name: 'Juan Pérez',
  respondent_phone: '787-555-0123',
  respondent_address: 'Calle Principal #123',
  status: 'completed',
  created_at: '2024-01-01T12:00:00.000Z',
  updated_at: '2024-01-01T12:30:00.000Z',
  ...overrides,
})

/**
 * Utility function to create mock questionnaire data
 */
export const createMockQuestionnaire = (overrides = {}) => ({
  id: 'questionnaire-456',
  tenant_id: 'ppd-tenant-1',
  title: 'Encuesta PPD 2024',
  description: 'Encuesta de opinión pública',
  version: '1.0',
  language: 'es',
  is_active: true,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  ...overrides,
})

/**
 * Utility function to create mock walklist data
 */
export const createMockWalklist = (overrides = {}) => ({
  id: 'walklist-789',
  tenant_id: 'ppd-tenant-1',
  precinct_id: 'precinct-123',
  assigned_to: 'volunteer-id-456',
  title: 'Lista de Trabajo PPD 2024',
  description: 'Lista asignada para encuestas',
  status: 'active' as const,
  target_responses: 50,
  current_responses: 0,
  deadline: '2024-12-31T23:59:59.000Z',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  ...overrides,
})

/**
 * Utility function to create mock tenant data
 */
export const createMockTenant = (overrides = {}) => ({
  id: 'tenant-123',
  name: 'PPD Test',
  slug: 'ppd-test',
  description: 'Partido Popular Democrático - Test Environment',
  settings: { test_mode: true },
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  ...overrides,
})

/**
 * Utility function to create mock precinct data
 */
export const createMockPrecinct = (overrides = {}) => ({
  id: 'precinct-123',
  tenant_id: 'ppd-tenant-1',
  number: '001',
  name: 'Precinto 001 - Test',
  municipality: 'San Juan',
  voter_count: 1500,
  polygon: null,
  centroid: null,
  metadata: { test_data: true },
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  ...overrides,
})