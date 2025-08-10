import { Database, User, UserRole } from '@/types/database'

/**
 * Mock user profiles for testing
 */
export const mockUsers = {
  Admin: {
    id: 'admin-id-123',
    tenant_id: 'ppd-tenant-1',
    auth_user_id: 'admin-id-123',
    email: 'admin@ppd.pr',
    nombre_completo: 'Administrador PPD',
    telefono: '787-555-0001',
    rol: 'Admin' as UserRole,
    activo: true,
    ultimo_acceso: '2024-01-01T00:00:00.000Z',
    configuracion_perfil: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  } as User,

  Volunteer: {
    id: 'volunteer-id-456',
    tenant_id: 'ppd-tenant-1',
    auth_user_id: 'volunteer-id-456',
    email: 'volunteer@ppd.pr',
    nombre_completo: 'Voluntario Activo',
    telefono: '787-555-0002',
    rol: 'Volunteer' as UserRole,
    activo: true,
    ultimo_acceso: '2024-01-01T00:00:00.000Z',
    configuracion_perfil: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  } as User,

  Analyst: {
    id: 'analyst-id-789',
    tenant_id: 'ppd-tenant-1',
    auth_user_id: 'analyst-id-789',
    email: 'analyst@ppd.pr',
    nombre_completo: 'Analista Datos',
    telefono: '787-555-0003',
    rol: 'Analyst' as UserRole,
    activo: true,
    ultimo_acceso: '2024-01-01T00:00:00.000Z',
    configuracion_perfil: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  } as User,

  Manager: {
    id: 'manager-id-101',
    tenant_id: 'ppd-tenant-1',
    auth_user_id: 'manager-id-101',
    email: 'manager@ppd.pr',
    nombre_completo: 'Gerente Campaña',
    telefono: '787-555-0004',
    rol: 'Manager' as UserRole,
    activo: true,
    ultimo_acceso: '2024-01-01T00:00:00.000Z',
    configuracion_perfil: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  } as User,

  inactive: {
    id: 'inactive-id-999',
    tenant_id: 'ppd-tenant-1',
    auth_user_id: 'inactive-id-999',
    email: 'inactive@ppd.pr',
    nombre_completo: 'Usuario Inactivo',
    telefono: '787-555-0005',
    rol: 'Volunteer' as UserRole,
    activo: false,
    ultimo_acceso: null,
    configuracion_perfil: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  } as User,
}

/**
 * Mock Supabase auth users
 */
export const mockSupabaseUsers = {
  Admin: {
    id: 'admin-id-123',
    email: 'admin@ppd.pr',
    email_confirmed_at: '2024-01-01T00:00:00.000Z',
    user_metadata: {},
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },

  Volunteer: {
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