/**
 * Supabase Test Client Configuration
 * Specialized client for database integration testing with RLS policies
 */

import { createClient, SupabaseClient, User } from '@supabase/supabase-js'
import { Database } from '@/types/database'

export type TestUser = {
  id: string
  email: string
  role: Database['public']['Enums']['user_role']
  tenant_id: string
  full_name: string
}

export type DatabaseTestClient = SupabaseClient<Database>

/**
 * Creates a Supabase client configured for database testing
 * Uses service role key to bypass RLS for test setup/cleanup
 */
export function createTestClient(): DatabaseTestClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL. Please set this environment variable.')
  }
  
  if (!supabaseServiceKey) {
    console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not found. Database tests will be limited.')
    console.warn('   To run full database integration tests, please:')
    console.warn('   1. Go to Supabase Dashboard > Settings > API')
    console.warn('   2. Copy the "service_role" secret key')
    console.warn('   3. Add it to your .env.local file as SUPABASE_SERVICE_ROLE_KEY=your_key_here')
    console.warn('   4. Never commit this key to version control!')
    
    // Fallback to anon key for limited testing
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseAnonKey) {
      throw new Error('Neither SUPABASE_SERVICE_ROLE_KEY nor NEXT_PUBLIC_SUPABASE_ANON_KEY found.')
    }
    
    console.log('Using anon key for limited database testing')
    return createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  console.log('Creating service role test client with URL:', supabaseUrl)
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Creates a Supabase client for testing user-specific RLS policies
 * Uses anon key with JWT impersonation for specific users
 */
export function createUserTestClient(user: TestUser): DatabaseTestClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase configuration for tests. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your test environment.')
  }

  const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // Mock the auth state to simulate logged-in user
  // This will be used by RLS policies that check auth.uid()
  const mockUser: User = {
    id: user.id,
    email: user.email,
    aud: 'authenticated',
    role: 'authenticated',
    email_confirmed_at: '2024-01-01T00:00:00.000Z',
    phone: '',
    confirmation_sent_at: '',
    confirmed_at: '2024-01-01T00:00:00.000Z',
    recovery_sent_at: '',
    last_sign_in_at: '2024-01-01T00:00:00.000Z',
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  }

  // Override the auth methods to simulate authenticated user
  client.auth.getUser = async () => ({ data: { user: mockUser }, error: null })
  client.auth.getSession = async () => ({ 
    data: { 
      session: {
        access_token: `mock-token-${user.id}`,
        refresh_token: 'mock-refresh',
        expires_in: 3600,
        expires_at: Date.now() + 3600 * 1000,
        token_type: 'bearer',
        user: mockUser
      } 
    }, 
    error: null 
  })

  return client
}

/**
 * Database test configuration and utilities
 */
export const dbTestConfig = {
  // Test tenant IDs for isolation testing
  tenants: {
    ppd: 'test-tenant-ppd-001',
    pip: 'test-tenant-pip-002',
    pnp: 'test-tenant-pnp-003',
  },
  
  // Test user IDs for role testing
  users: {
    admin_ppd: 'test-user-admin-ppd',
    manager_ppd: 'test-user-manager-ppd',
    analyst_ppd: 'test-user-analyst-ppd',
    volunteer_ppd: 'test-user-volunteer-ppd',
    admin_pip: 'test-user-admin-pip',
    volunteer_pip: 'test-user-volunteer-pip',
  },

  // Test data prefixes to avoid conflicts
  prefixes: {
    precinct: 'test-precinct',
    questionnaire: 'test-questionnaire',
    survey: 'test-survey',
    walklist: 'test-walklist',
  },
}

/**
 * Test environment variables validation
 */
export function validateTestEnvironment(): void {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]

  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables for database tests: ${missing.join(', ')}\n` +
      'Please create a .env.local file with your Supabase configuration or set them in your CI environment.'
    )
  }
}

/**
 * Helper to check if we're running in test environment
 */
export function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined
}

/**
 * Helper to skip tests if not properly configured
 */
export function requiresDatabase() {
  if (!isTestEnvironment()) {
    throw new Error('Database tests should only run in test environment')
  }

  try {
    validateTestEnvironment()
  } catch (error) {
    console.warn('Database tests skipped:', (error as Error).message)
    return false
  }

  return true
}