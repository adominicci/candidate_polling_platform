import '@testing-library/jest-dom'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}))

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies: () => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  }),
  headers: () => ({
    get: jest.fn(),
  }),
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Environment variables for tests
// For database integration tests, use real Supabase credentials from .env.local
// For unit tests, these will be overridden by individual test mocks
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://trkaoeexbzclyxulghyr.supabase.co'
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRya2FvZWV4YnpjbHl4dWxnaHlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3NDIwMDYsImV4cCI6MjA3MDMxODAwNn0.1bwbj1zi7zffzt8CUBmd8oYkGydKcghC5n2wNNgOHMk'
}
// Service role key should be provided via .env.local for database tests
// if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
//   console.warn('SUPABASE_SERVICE_ROLE_KEY not found - database tests will be limited')
// }
process.env.NODE_ENV = 'test'

// Suppress console warnings in tests unless VERBOSE_TESTS is set
if (!process.env.VERBOSE_TESTS) {
  const originalConsoleWarn = console.warn
  const originalConsoleError = console.error
  
  beforeAll(() => {
    console.warn = (...args) => {
      const message = args[0]
      // Allow specific warnings we want to see
      if (typeof message === 'string' && 
          (message.includes('Warning: ReactDOM.render is deprecated') ||
           message.includes('Warning: Failed prop type'))) {
        originalConsoleWarn(...args)
      }
    }
    
    console.error = (...args) => {
      const message = args[0]
      // Allow specific errors we want to see
      if (typeof message === 'string' && 
          (message.includes('Warning: Failed prop type') ||
           message.includes('Error: Uncaught'))) {
        originalConsoleError(...args)
      }
    }
  })

  afterAll(() => {
    console.warn = originalConsoleWarn
    console.error = originalConsoleError
  })
}