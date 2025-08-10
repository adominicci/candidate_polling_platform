/**
 * Database Test Setup
 * Global setup and configuration for database integration tests
 */

import { validateTestEnvironment, isTestEnvironment } from './supabase-test-client'

/**
 * Global test setup for database tests
 */
export function setupDatabaseTests(): void {
  // Only run setup in test environment
  if (!isTestEnvironment()) {
    console.warn('Database test setup skipped - not in test environment')
    return
  }

  try {
    validateTestEnvironment()
    console.log('Database test environment validated')
  } catch (error) {
    console.error('Database test environment validation failed:', error)
    process.exit(1)
  }

  // Set up global test timeouts for database operations
  jest.setTimeout(30000) // 30 seconds for database tests

  // Global error handlers for database tests
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection in database test:', promise, 'reason:', reason)
  })

  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception in database test:', error)
  })
}

/**
 * Database test environment configuration
 */
export const DB_TEST_CONFIG = {
  // Test database configuration
  database: {
    maxConnections: 10,
    connectionTimeout: 5000,
    queryTimeout: 10000,
  },

  // RLS testing configuration
  rls: {
    testAllRoles: ['admin', 'manager', 'analyst', 'volunteer'],
    testAllTables: [
      'tenants',
      'users', 
      'precincts',
      'questionnaires',
      'sections',
      'questions',
      'walklists',
      'survey_responses',
      'answers'
    ],
    securityTestCases: [
      'tenant_isolation',
      'role_based_access',
      'cross_tenant_prevention',
      'sql_injection_prevention',
      'jwt_manipulation_prevention',
      'anonymous_access_prevention'
    ]
  },

  // Performance testing thresholds
  performance: {
    maxQueryTime: 1000, // 1 second max for queries in test environment
    maxRLSOverhead: 50, // 50ms max overhead for RLS evaluation
    minConcurrentConnections: 5,
  },

  // Test data configuration
  testData: {
    cleanupOnExit: true,
    preserveBetweenTests: false,
    generateRandomData: true,
    dataSetSize: 'small', // small, medium, large
  }
}

/**
 * Environment-specific configuration
 */
export function getTestEnvironmentConfig() {
  const environment = process.env.NODE_ENV
  const isCI = process.env.CI === 'true'
  const isLocal = !isCI

  return {
    environment,
    isCI,
    isLocal,
    
    // CI environment has stricter requirements
    timeouts: {
      testTimeout: isCI ? 60000 : 30000,
      setupTimeout: isCI ? 30000 : 10000,
      teardownTimeout: isCI ? 20000 : 5000,
    },

    // Different logging levels
    logging: {
      level: isCI ? 'error' : 'warn',
      verbose: isLocal && process.env.VERBOSE_TESTS === 'true',
      performance: isLocal && process.env.PERFORMANCE_TESTS === 'true',
    },

    // Resource limits
    resources: {
      maxConcurrentTests: isCI ? 2 : 4,
      maxMemoryUsage: '512MB',
      maxDatabaseConnections: isCI ? 5 : 10,
    }
  }
}

/**
 * Test data lifecycle hooks
 */
export const testLifecycle = {
  beforeAllTests: async () => {
    console.log('🚀 Starting database test suite...')
    const config = getTestEnvironmentConfig()
    console.log('Environment:', config.environment)
    console.log('CI Mode:', config.isCI)
  },

  afterAllTests: async () => {
    console.log('✅ Database test suite completed')
  },

  beforeEachTest: async (testName: string) => {
    if (process.env.VERBOSE_TESTS === 'true') {
      console.log(`🧪 Starting test: ${testName}`)
    }
  },

  afterEachTest: async (testName: string, success: boolean) => {
    if (process.env.VERBOSE_TESTS === 'true') {
      console.log(`${success ? '✅' : '❌'} Completed test: ${testName}`)
    }
  }
}

/**
 * Database test utilities
 */
export const dbTestUtils = {
  /**
   * Wait for database operation to complete
   */
  waitForOperation: async (operation: () => Promise<any>, maxWait = 5000): Promise<any> => {
    const startTime = Date.now()
    let lastError: Error | null = null

    while (Date.now() - startTime < maxWait) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    throw new Error(`Operation timed out after ${maxWait}ms. Last error: ${lastError?.message}`)
  },

  /**
   * Retry database operation with exponential backoff
   */
  retryOperation: async <T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 100
  ): Promise<T> => {
    let lastError: Error

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        if (attempt === maxRetries) {
          throw lastError
        }

        const delay = baseDelay * Math.pow(2, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError!
  },

  /**
   * Measure query performance
   */
  measureQueryPerformance: async <T>(
    queryName: string,
    query: () => Promise<T>
  ): Promise<{ result: T; duration: number }> => {
    const startTime = performance.now()
    const result = await query()
    const duration = performance.now() - startTime

    if (process.env.PERFORMANCE_TESTS === 'true') {
      console.log(`⏱️  Query "${queryName}" took ${duration.toFixed(2)}ms`)
    }

    return { result, duration }
  },

  /**
   * Generate test data with proper relationships
   */
  generateTestData: {
    tenant: (overrides = {}) => ({
      name: `Test Tenant ${Math.random().toString(36).substring(7)}`,
      slug: `test-tenant-${Math.random().toString(36).substring(7)}`,
      description: 'Generated test tenant',
      settings: { test_mode: true },
      ...overrides
    }),

    user: (tenantId: string, overrides = {}) => ({
      tenant_id: tenantId,
      email: `test-${Math.random().toString(36).substring(7)}@test.pr`,
      full_name: `Test User ${Math.random().toString(36).substring(7)}`,
      role: 'volunteer' as const,
      is_active: true,
      metadata: { generated: true },
      ...overrides
    }),

    precinct: (tenantId: string, overrides = {}) => ({
      tenant_id: tenantId,
      number: Math.random().toString(36).substring(7).toUpperCase(),
      name: `Test Precinct ${Math.random().toString(36).substring(7)}`,
      municipality: 'Test Municipality',
      voter_count: Math.floor(Math.random() * 2000) + 100,
      metadata: { generated: true },
      ...overrides
    })
  }
}

// Set up database tests when this module is imported
setupDatabaseTests()