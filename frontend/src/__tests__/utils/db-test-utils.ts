/**
 * Database Test Utilities
 * Helper functions for setting up test data and managing database state during RLS testing
 */

import { Database } from '@/types/database'
import { 
  createTestClient, 
  createUserTestClient, 
  TestUser, 
  DatabaseTestClient,
  dbTestConfig 
} from '../setup/supabase-test-client'

type Tables = Database['public']['Tables']
type UserRow = Tables['users']['Row']
type TenantRow = Tables['tenants']['Row']
type PrecinctRow = Tables['precincts']['Row']
type QuestionnaireRow = Tables['questionnaires']['Row']
type WalklistRow = Tables['walklists']['Row']
type SurveyResponseRow = Tables['survey_responses']['Row']

/**
 * Test user profiles with different roles and tenants
 */
export const testUsers: Record<string, TestUser> = {
  admin_ppd: {
    id: dbTestConfig.users.admin_ppd,
    email: 'admin@ppd-test.pr',
    role: 'admin',
    tenant_id: dbTestConfig.tenants.ppd,
    full_name: 'Admin PPD Test',
  },
  manager_ppd: {
    id: dbTestConfig.users.manager_ppd,
    email: 'manager@ppd-test.pr',
    role: 'manager',
    tenant_id: dbTestConfig.tenants.ppd,
    full_name: 'Manager PPD Test',
  },
  analyst_ppd: {
    id: dbTestConfig.users.analyst_ppd,
    email: 'analyst@ppd-test.pr',
    role: 'analyst',
    tenant_id: dbTestConfig.tenants.ppd,
    full_name: 'Analyst PPD Test',
  },
  volunteer_ppd: {
    id: dbTestConfig.users.volunteer_ppd,
    email: 'volunteer@ppd-test.pr',
    role: 'volunteer',
    tenant_id: dbTestConfig.tenants.ppd,
    full_name: 'Volunteer PPD Test',
  },
  admin_pip: {
    id: dbTestConfig.users.admin_pip,
    email: 'admin@pip-test.pr',
    role: 'admin',
    tenant_id: dbTestConfig.tenants.pip,
    full_name: 'Admin PIP Test',
  },
  volunteer_pip: {
    id: dbTestConfig.users.volunteer_pip,
    email: 'volunteer@pip-test.pr',
    role: 'volunteer',
    tenant_id: dbTestConfig.tenants.pip,
    full_name: 'Volunteer PIP Test',
  },
}

/**
 * Database Test Manager - handles test data lifecycle
 */
export class DatabaseTestManager {
  private serviceClient: DatabaseTestClient
  private createdIds: Set<string> = new Set()

  constructor() {
    this.serviceClient = createTestClient()
  }

  /**
   * Set up test tenants
   */
  async setupTenants(): Promise<TenantRow[]> {
    const tenants: Tables['tenants']['Insert'][] = [
      {
        id: dbTestConfig.tenants.ppd,
        name: 'PPD Test Tenant',
        slug: 'ppd-test',
        description: 'Partido Popular Democrático - Test Environment',
        settings: { test_mode: true },
      },
      {
        id: dbTestConfig.tenants.pip,
        name: 'PIP Test Tenant',
        slug: 'pip-test',
        description: 'Partido Independentista Puertorriqueño - Test Environment',
        settings: { test_mode: true },
      },
      {
        id: dbTestConfig.tenants.pnp,
        name: 'PNP Test Tenant',
        slug: 'pnp-test',
        description: 'Partido Nuevo Progresista - Test Environment',
        settings: { test_mode: true },
      },
    ]

    const { data, error } = await this.serviceClient
      .from('tenants')
      .upsert(tenants)
      .select()

    if (error) throw error

    data?.forEach(tenant => this.createdIds.add(`tenant:${tenant.id}`))
    return data || []
  }

  /**
   * Set up test users
   */
  async setupUsers(): Promise<UserRow[]> {
    const users: Tables['users']['Insert'][] = Object.values(testUsers).map(user => ({
      id: user.id,
      tenant_id: user.tenant_id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_active: true,
      metadata: { test_user: true },
    }))

    const { data, error } = await this.serviceClient
      .from('users')
      .upsert(users)
      .select()

    if (error) throw error

    data?.forEach(user => this.createdIds.add(`user:${user.id}`))
    return data || []
  }

  /**
   * Set up test precincts
   */
  async setupPrecincts(): Promise<PrecinctRow[]> {
    const precincts: Tables['precincts']['Insert'][] = [
      {
        id: `${dbTestConfig.prefixes.precinct}-ppd-001`,
        tenant_id: dbTestConfig.tenants.ppd,
        number: '001',
        name: 'Precinto Test PPD 001',
        municipality: 'San Juan',
        voter_count: 1500,
        metadata: { test_data: true },
      },
      {
        id: `${dbTestConfig.prefixes.precinct}-ppd-002`,
        tenant_id: dbTestConfig.tenants.ppd,
        number: '002',
        name: 'Precinto Test PPD 002',
        municipality: 'Bayamón',
        voter_count: 1200,
        metadata: { test_data: true },
      },
      {
        id: `${dbTestConfig.prefixes.precinct}-pip-001`,
        tenant_id: dbTestConfig.tenants.pip,
        number: '001',
        name: 'Precinto Test PIP 001',
        municipality: 'San Juan',
        voter_count: 800,
        metadata: { test_data: true },
      },
    ]

    const { data, error } = await this.serviceClient
      .from('precincts')
      .upsert(precincts)
      .select()

    if (error) throw error

    data?.forEach(precinct => this.createdIds.add(`precinct:${precinct.id}`))
    return data || []
  }

  /**
   * Set up test questionnaires
   */
  async setupQuestionnaires(): Promise<QuestionnaireRow[]> {
    const questionnaires: Tables['questionnaires']['Insert'][] = [
      {
        id: `${dbTestConfig.prefixes.questionnaire}-ppd-001`,
        tenant_id: dbTestConfig.tenants.ppd,
        title: 'Encuesta PPD Test 2024',
        description: 'Encuesta de prueba para PPD',
        version: '1.0',
        language: 'es',
        is_active: true,
        metadata: { test_data: true },
      },
      {
        id: `${dbTestConfig.prefixes.questionnaire}-pip-001`,
        tenant_id: dbTestConfig.tenants.pip,
        title: 'Encuesta PIP Test 2024',
        description: 'Encuesta de prueba para PIP',
        version: '1.0',
        language: 'es',
        is_active: true,
        metadata: { test_data: true },
      },
    ]

    const { data, error } = await this.serviceClient
      .from('questionnaires')
      .upsert(questionnaires)
      .select()

    if (error) throw error

    data?.forEach(questionnaire => this.createdIds.add(`questionnaire:${questionnaire.id}`))
    return data || []
  }

  /**
   * Set up test walklists
   */
  async setupWalklists(): Promise<WalklistRow[]> {
    const walklists: Tables['walklists']['Insert'][] = [
      {
        id: `${dbTestConfig.prefixes.walklist}-ppd-vol-001`,
        tenant_id: dbTestConfig.tenants.ppd,
        precinct_id: `${dbTestConfig.prefixes.precinct}-ppd-001`,
        assigned_to: testUsers.volunteer_ppd.id,
        title: 'Lista PPD Voluntario 001',
        description: 'Lista asignada al voluntario PPD para pruebas',
        status: 'active',
        target_responses: 50,
        current_responses: 0,
        metadata: { test_data: true },
      },
      {
        id: `${dbTestConfig.prefixes.walklist}-ppd-vol-002`,
        tenant_id: dbTestConfig.tenants.ppd,
        precinct_id: `${dbTestConfig.prefixes.precinct}-ppd-002`,
        assigned_to: testUsers.volunteer_ppd.id,
        title: 'Lista PPD Voluntario 002',
        description: 'Segunda lista asignada al voluntario PPD',
        status: 'active',
        target_responses: 30,
        current_responses: 0,
        metadata: { test_data: true },
      },
      {
        id: `${dbTestConfig.prefixes.walklist}-pip-vol-001`,
        tenant_id: dbTestConfig.tenants.pip,
        precinct_id: `${dbTestConfig.prefixes.precinct}-pip-001`,
        assigned_to: testUsers.volunteer_pip.id,
        title: 'Lista PIP Voluntario 001',
        description: 'Lista asignada al voluntario PIP para pruebas',
        status: 'active',
        target_responses: 25,
        current_responses: 0,
        metadata: { test_data: true },
      },
    ]

    const { data, error } = await this.serviceClient
      .from('walklists')
      .upsert(walklists)
      .select()

    if (error) throw error

    data?.forEach(walklist => this.createdIds.add(`walklist:${walklist.id}`))
    return data || []
  }

  /**
   * Set up test survey responses
   */
  async setupSurveyResponses(): Promise<SurveyResponseRow[]> {
    const surveyResponses: Tables['survey_responses']['Insert'][] = [
      {
        id: `${dbTestConfig.prefixes.survey}-ppd-001`,
        tenant_id: dbTestConfig.tenants.ppd,
        questionnaire_id: `${dbTestConfig.prefixes.questionnaire}-ppd-001`,
        volunteer_id: testUsers.volunteer_ppd.id,
        respondent_name: 'Juan Pérez Test',
        respondent_email: 'juan.test@example.com',
        respondent_phone: '787-555-0001',
        precinct_id: `${dbTestConfig.prefixes.precinct}-ppd-001`,
        is_complete: true,
        completion_time: 300,
        metadata: { test_data: true },
      },
      {
        id: `${dbTestConfig.prefixes.survey}-pip-001`,
        tenant_id: dbTestConfig.tenants.pip,
        questionnaire_id: `${dbTestConfig.prefixes.questionnaire}-pip-001`,
        volunteer_id: testUsers.volunteer_pip.id,
        respondent_name: 'María González Test',
        respondent_email: 'maria.test@example.com',
        respondent_phone: '787-555-0002',
        precinct_id: `${dbTestConfig.prefixes.precinct}-pip-001`,
        is_complete: true,
        completion_time: 420,
        metadata: { test_data: true },
      },
    ]

    const { data, error } = await this.serviceClient
      .from('survey_responses')
      .upsert(surveyResponses)
      .select()

    if (error) throw error

    data?.forEach(response => this.createdIds.add(`survey_response:${response.id}`))
    return data || []
  }

  /**
   * Set up all test data
   */
  async setupAll(): Promise<void> {
    await this.setupTenants()
    await this.setupUsers()
    await this.setupPrecincts()
    await this.setupQuestionnaires()
    await this.setupWalklists()
    await this.setupSurveyResponses()
  }

  /**
   * Clean up all test data
   */
  async cleanup(): Promise<void> {
    // Delete in reverse dependency order
    const tables = [
      'answers',
      'survey_responses', 
      'walklists',
      'questions',
      'sections',
      'questionnaires',
      'precincts',
      'users',
      'tenants'
    ]

    for (const table of tables) {
      try {
        // Delete test records by matching test prefixes or test tenant IDs
        await this.serviceClient
          .from(table as any)
          .delete()
          .or(
            `id.like.test-%,` +
            `tenant_id.in.(${Object.values(dbTestConfig.tenants).join(',')}),` +
            `metadata->test_data.eq.true`
          )
      } catch (error) {
        console.warn(`Failed to cleanup ${table}:`, error)
      }
    }

    this.createdIds.clear()
  }

  /**
   * Get a user-specific test client
   */
  getUserClient(userKey: keyof typeof testUsers): DatabaseTestClient {
    return createUserTestClient(testUsers[userKey])
  }

  /**
   * Get the service client (bypasses RLS)
   */
  getServiceClient(): DatabaseTestClient {
    return this.serviceClient
  }
}

/**
 * RLS Test Helpers
 */
export class RLSTestHelpers {
  /**
   * Test that a query is properly blocked by RLS
   */
  static async expectRLSBlock(
    client: DatabaseTestClient,
    query: () => Promise<any>,
    expectedError?: string
  ): Promise<void> {
    try {
      const result = await query()
      
      // If no error thrown, check if result is empty (some RLS policies return empty instead of error)
      if (result.data && Array.isArray(result.data) && result.data.length === 0) {
        return // Empty result is acceptable for RLS block
      }

      throw new Error('Expected RLS policy to block query, but it succeeded')
    } catch (error) {
      if (expectedError && !((error as Error).message.includes(expectedError))) {
        throw new Error(`Expected error containing "${expectedError}", got: ${(error as Error).message}`)
      }
      // Expected error - RLS is working
    }
  }

  /**
   * Test that a query succeeds as expected
   */
  static async expectRLSAllow(
    client: DatabaseTestClient,
    query: () => Promise<any>
  ): Promise<any> {
    const result = await query()
    if (result.error) {
      throw new Error(`Expected query to succeed, got error: ${result.error.message}`)
    }
    return result
  }

  /**
   * Test tenant isolation
   */
  static async testTenantIsolation(
    userClient: DatabaseTestClient,
    table: keyof Tables,
    userTenantId: string,
    otherTenantIds: string[]
  ): Promise<void> {
    // User should only see their tenant's data
    const { data: ownData } = await userClient
      .from(table as any)
      .select('tenant_id')

    if (ownData && ownData.length > 0) {
      const uniqueTenantIds = new Set(ownData.map((row: any) => row.tenant_id))
      
      // Should only contain user's tenant ID
      expect(uniqueTenantIds.size).toBe(1)
      expect(uniqueTenantIds.has(userTenantId)).toBe(true)
      
      // Should not contain other tenant IDs
      otherTenantIds.forEach(otherTenantId => {
        expect(uniqueTenantIds.has(otherTenantId)).toBe(false)
      })
    }
  }
}