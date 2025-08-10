import { mockUsers, mockSupabaseUsers, mockErrors } from './test-data'

/**
 * Mock Supabase client for testing
 */
export const createMockSupabaseClient = (overrides = {}) => {
  const mockClient = {
    auth: {
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
    from: jest.fn(),
    ...overrides,
  }

  // Configure default behaviors
  mockClient.auth.signInWithPassword.mockResolvedValue({
    data: { user: mockSupabaseUsers.admin },
    error: null,
  })

  mockClient.auth.signOut.mockResolvedValue({ error: null })
  
  mockClient.auth.getUser.mockResolvedValue({
    data: { user: mockSupabaseUsers.admin },
    error: null,
  })

  mockClient.auth.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: jest.fn() } },
  })

  // Mock database queries
  const mockQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: mockUsers.admin, error: null }),
    update: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
  }

  mockClient.from.mockReturnValue(mockQuery)

  return mockClient
}

/**
 * Mock Next.js router for testing
 */
export const createMockRouter = (overrides = {}) => ({
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
  pathname: '/',
  query: {},
  asPath: '/',
  ...overrides,
})

/**
 * Mock authentication context for testing
 */
export const createMockAuthContext = (overrides = {}) => ({
  user: mockSupabaseUsers.admin,
  profile: mockUsers.admin,
  isLoading: false,
  signIn: jest.fn().mockResolvedValue({ error: null }),
  signOut: jest.fn().mockResolvedValue(undefined),
  hasRole: jest.fn().mockReturnValue(true),
  hasTenantAccess: jest.fn().mockReturnValue(true),
  refreshProfile: jest.fn().mockResolvedValue(undefined),
  ...overrides,
})

/**
 * Mock successful authentication scenarios
 */
export const mockAuthSuccess = {
  admin: () => createMockAuthContext({
    user: mockSupabaseUsers.admin,
    profile: mockUsers.admin,
    hasRole: jest.fn().mockImplementation((role) => {
      const roles = Array.isArray(role) ? role : [role]
      return roles.includes('admin')
    }),
  }),

  volunteer: () => createMockAuthContext({
    user: mockSupabaseUsers.volunteer,
    profile: mockUsers.volunteer,
    hasRole: jest.fn().mockImplementation((role) => {
      const roles = Array.isArray(role) ? role : [role]
      return roles.includes('volunteer')
    }),
  }),

  unauthenticated: () => createMockAuthContext({
    user: null,
    profile: null,
    hasRole: jest.fn().mockReturnValue(false),
    hasTenantAccess: jest.fn().mockReturnValue(false),
  }),

  loading: () => createMockAuthContext({
    isLoading: true,
    user: null,
    profile: null,
  }),
}

/**
 * Mock error scenarios for authentication
 */
export const mockAuthErrors = {
  invalidCredentials: () => ({
    signIn: jest.fn().mockResolvedValue({ error: mockErrors.invalidCredentials }),
  }),

  userNotFound: () => ({
    signIn: jest.fn().mockResolvedValue({ error: mockErrors.userNotFound }),
  }),

  networkError: () => ({
    signIn: jest.fn().mockRejectedValue(new Error('Network error')),
  }),
}

/**
 * Mock form events for testing
 */
export const createMockFormEvent = (formData: Record<string, any> = {}) => {
  const mockEvent = {
    preventDefault: jest.fn(),
    target: {
      elements: {},
    },
  }

  // Add form fields to the mock event
  Object.keys(formData).forEach(key => {
    mockEvent.target.elements[key] = {
      name: key,
      value: formData[key],
      type: typeof formData[key] === 'boolean' ? 'checkbox' : 'text',
      checked: typeof formData[key] === 'boolean' ? formData[key] : false,
    }
  })

  return mockEvent
}

/**
 * Mock input change events
 */
export const createMockInputEvent = (name: string, value: any, type: string = 'text') => ({
  target: {
    name,
    value,
    type,
    checked: type === 'checkbox' ? value : false,
  },
})

/**
 * Utility to wait for async operations in tests
 */
export const waitFor = (ms: number = 0) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Mock file upload for testing
 */
export const createMockFile = (name: string, size: number = 1024, type: string = 'text/plain') => {
  const file = new File(['mock file content'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

/**
 * Mock localStorage for testing
 */
export const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
}

// Replace the global localStorage with our mock
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

/**
 * Mock sessionStorage for testing
 */
export const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
}

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true,
})