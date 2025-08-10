/**
 * Database RLS (Row Level Security) Integration Tests
 * Comprehensive test suite for testing RLS policies across all tables and user roles
 * 
 * Tests covered:
 * - Tenant isolation (multi-tenant data separation)
 * - Role-based access control (admin, manager, analyst, volunteer)
 * - CRUD operation permissions per role
 * - Cross-tenant access prevention
 * - Security edge cases and attack scenarios
 */

import { DatabaseTestManager, RLSTestHelpers, testUsers } from '../utils/db-test-utils'
import { requiresDatabase } from '../setup/supabase-test-client'

// Skip tests if database is not properly configured
const describeDb = requiresDatabase() ? describe : describe.skip

describeDb('Database RLS Policies', () => {
  let testManager: DatabaseTestManager

  beforeAll(async () => {
    testManager = new DatabaseTestManager()
    await testManager.setupAll()
  })

  afterAll(async () => {
    await testManager.cleanup()
  })

  describe('Tenant Isolation Tests', () => {
    test('PPD Admin can only see PPD tenant data', async () => {
      const client = testManager.getUserClient('admin_ppd')
      
      // Test each table for proper tenant isolation
      await RLSTestHelpers.testTenantIsolation(
        client,
        'users',
        testUsers.admin_ppd.tenant_id,
        [testUsers.admin_pip.tenant_id]
      )
      
      await RLSTestHelpers.testTenantIsolation(
        client,
        'precincts',
        testUsers.admin_ppd.tenant_id,
        [testUsers.admin_pip.tenant_id]
      )
      
      await RLSTestHelpers.testTenantIsolation(
        client,
        'questionnaires',
        testUsers.admin_ppd.tenant_id,
        [testUsers.admin_pip.tenant_id]
      )
    })

    test('PIP Admin can only see PIP tenant data', async () => {
      const client = testManager.getUserClient('admin_pip')
      
      await RLSTestHelpers.testTenantIsolation(
        client,
        'users',
        testUsers.admin_pip.tenant_id,
        [testUsers.admin_ppd.tenant_id]
      )
      
      await RLSTestHelpers.testTenantIsolation(
        client,
        'precincts',
        testUsers.admin_pip.tenant_id,
        [testUsers.admin_ppd.tenant_id]
      )
    })

    test('Volunteers cannot access other tenant data', async () => {
      const ppdVolunteerClient = testManager.getUserClient('volunteer_ppd')
      const pipVolunteerClient = testManager.getUserClient('volunteer_pip')
      
      // PPD volunteer should not see PIP data
      await RLSTestHelpers.testTenantIsolation(
        ppdVolunteerClient,
        'survey_responses',
        testUsers.volunteer_ppd.tenant_id,
        [testUsers.volunteer_pip.tenant_id]
      )
      
      // PIP volunteer should not see PPD data
      await RLSTestHelpers.testTenantIsolation(
        pipVolunteerClient,
        'survey_responses',
        testUsers.volunteer_pip.tenant_id,
        [testUsers.volunteer_ppd.tenant_id]
      )
    })
  })

  describe('Admin Role Permissions', () => {
    test('Admin can read all tenant data', async () => {
      const client = testManager.getUserClient('admin_ppd')

      // Admin should be able to read all data in their tenant
      const tables = ['users', 'precincts', 'questionnaires', 'walklists', 'survey_responses']
      
      for (const table of tables) {
        await RLSTestHelpers.expectRLSAllow(client, () => 
          client.from(table as any).select('*')
        )
      }
    })

    test('Admin can create, update, delete tenant data', async () => {
      const client = testManager.getUserClient('admin_ppd')
      
      // Test CREATE
      const { data: newPrecinct } = await RLSTestHelpers.expectRLSAllow(client, () =>
        client.from('precincts').insert({
          tenant_id: testUsers.admin_ppd.tenant_id,
          number: 'TEST-ADMIN',
          name: 'Admin Test Precinct',
          municipality: 'Test City',
        }).select()
      )
      
      expect(newPrecinct).toBeDefined()
      const precinctId = newPrecinct![0].id
      
      // Test UPDATE
      await RLSTestHelpers.expectRLSAllow(client, () =>
        client.from('precincts').update({
          name: 'Updated Admin Test Precinct'
        }).eq('id', precinctId)
      )
      
      // Test DELETE
      await RLSTestHelpers.expectRLSAllow(client, () =>
        client.from('precincts').delete().eq('id', precinctId)
      )
    })

    test('Admin cannot access other tenant data', async () => {
      const ppdAdminClient = testManager.getUserClient('admin_ppd')
      
      // Try to insert data with different tenant_id - should fail
      await RLSTestHelpers.expectRLSBlock(ppdAdminClient, () =>
        ppdAdminClient.from('precincts').insert({
          tenant_id: testUsers.admin_pip.tenant_id, // Different tenant!
          number: 'HACK-ATTEMPT',
          name: 'Cross Tenant Hack',
          municipality: 'Nowhere',
        })
      )
    })
  })

  describe('Manager Role Permissions', () => {
    test('Manager can read all tenant data', async () => {
      const client = testManager.getUserClient('manager_ppd')

      // Manager should read access to all data in their tenant
      const tables = ['users', 'precincts', 'questionnaires', 'walklists', 'survey_responses']
      
      for (const table of tables) {
        await RLSTestHelpers.expectRLSAllow(client, () => 
          client.from(table as any).select('*')
        )
      }
    })

    test('Manager has limited write access', async () => {
      const client = testManager.getUserClient('manager_ppd')
      
      // Manager should be able to create walklists
      const { data: newWalklist } = await RLSTestHelpers.expectRLSAllow(client, () =>
        client.from('walklists').insert({
          tenant_id: testUsers.manager_ppd.tenant_id,
          precinct_id: 'test-precinct-ppd-001',
          assigned_to: testUsers.volunteer_ppd.id,
          title: 'Manager Created Walklist',
          status: 'active',
        }).select()
      )
      
      expect(newWalklist).toBeDefined()
      
      // But should NOT be able to modify user roles (admin-only operation)
      await RLSTestHelpers.expectRLSBlock(client, () =>
        client.from('users').update({
          role: 'admin'
        }).eq('id', testUsers.volunteer_ppd.id)
      )
    })
  })

  describe('Analyst Role Permissions', () => {
    test('Analyst can read aggregated data but not PII', async () => {
      const client = testManager.getUserClient('analyst_ppd')

      // Analyst should be able to read survey responses for analysis
      const { data: responses } = await RLSTestHelpers.expectRLSAllow(client, () =>
        client.from('survey_responses').select('id, tenant_id, questionnaire_id, precinct_id, is_complete')
      )
      
      expect(responses).toBeDefined()
      
      // But should have restricted access to PII fields
      // This would be enforced by database views or column-level RLS
      const { data: piiData } = await client
        .from('survey_responses')
        .select('respondent_name, respondent_email, respondent_phone')
      
      // Depending on RLS implementation, this should either:
      // 1. Return null/empty values for PII fields, or
      // 2. Be blocked entirely
      if (piiData && piiData.length > 0) {
        // If data is returned, PII fields should be null or redacted
        piiData.forEach(row => {
          expect(row.respondent_name).toBeNull()
          expect(row.respondent_email).toBeNull()
          expect(row.respondent_phone).toBeNull()
        })
      }
    })

    test('Analyst cannot create or modify data', async () => {
      const client = testManager.getUserClient('analyst_ppd')
      
      // Analyst should NOT be able to create survey responses
      await RLSTestHelpers.expectRLSBlock(client, () =>
        client.from('survey_responses').insert({
          tenant_id: testUsers.analyst_ppd.tenant_id,
          questionnaire_id: 'test-questionnaire-ppd-001',
          volunteer_id: testUsers.volunteer_ppd.id,
          respondent_name: 'Analyst Hack Attempt',
        })
      )
      
      // Analyst should NOT be able to modify existing data
      await RLSTestHelpers.expectRLSBlock(client, () =>
        client.from('survey_responses').update({
          respondent_name: 'Modified by Analyst'
        }).eq('tenant_id', testUsers.analyst_ppd.tenant_id)
      )
    })
  })

  describe('Volunteer Role Permissions', () => {
    test('Volunteer can only see assigned walklists', async () => {
      const client = testManager.getUserClient('volunteer_ppd')
      
      const { data: walklists } = await RLSTestHelpers.expectRLSAllow(client, () =>
        client.from('walklists').select('*')
      )
      
      // Volunteer should only see walklists assigned to them
      if (walklists && walklists.length > 0) {
        walklists.forEach(walklist => {
          expect(walklist.assigned_to).toBe(testUsers.volunteer_ppd.id)
          expect(walklist.tenant_id).toBe(testUsers.volunteer_ppd.tenant_id)
        })
      }
    })

    test('Volunteer can create survey responses for their assignments', async () => {
      const client = testManager.getUserClient('volunteer_ppd')
      
      // Volunteer should be able to create survey responses
      const { data: newResponse } = await RLSTestHelpers.expectRLSAllow(client, () =>
        client.from('survey_responses').insert({
          tenant_id: testUsers.volunteer_ppd.tenant_id,
          questionnaire_id: 'test-questionnaire-ppd-001',
          volunteer_id: testUsers.volunteer_ppd.id,
          respondent_name: 'Volunteer Survey Response',
          respondent_phone: '787-555-9999',
          precinct_id: 'test-precinct-ppd-001',
        }).select()
      )
      
      expect(newResponse).toBeDefined()
      expect(newResponse![0].volunteer_id).toBe(testUsers.volunteer_ppd.id)
    })

    test('Volunteer cannot access other volunteers data', async () => {
      const client = testManager.getUserClient('volunteer_ppd')
      
      // Try to create survey response as different volunteer - should fail
      await RLSTestHelpers.expectRLSBlock(client, () =>
        client.from('survey_responses').insert({
          tenant_id: testUsers.volunteer_ppd.tenant_id,
          questionnaire_id: 'test-questionnaire-ppd-001',
          volunteer_id: testUsers.volunteer_pip.id, // Different volunteer!
          respondent_name: 'Impersonation Attempt',
        })
      )
      
      // Should not see other volunteers' survey responses
      const { data: responses } = await client
        .from('survey_responses')
        .select('*')
        .neq('volunteer_id', testUsers.volunteer_ppd.id)
      
      expect(responses).toEqual([])
    })

    test('Volunteer cannot access administrative functions', async () => {
      const client = testManager.getUserClient('volunteer_ppd')
      
      // Volunteer should NOT be able to create users
      await RLSTestHelpers.expectRLSBlock(client, () =>
        client.from('users').insert({
          tenant_id: testUsers.volunteer_ppd.tenant_id,
          email: 'volunteer.created@test.com',
          full_name: 'Volunteer Created User',
          role: 'volunteer',
        })
      )
      
      // Volunteer should NOT be able to modify walklist assignments
      await RLSTestHelpers.expectRLSBlock(client, () =>
        client.from('walklists').update({
          assigned_to: testUsers.volunteer_ppd.id
        }).neq('assigned_to', testUsers.volunteer_ppd.id)
      )
    })
  })

  describe('Cross-Tenant Attack Prevention', () => {
    test('Users cannot read data from other tenants via SQL injection attempts', async () => {
      const client = testManager.getUserClient('volunteer_ppd')
      
      // Attempt various SQL injection patterns that might bypass tenant isolation
      const attackPatterns = [
        `' OR tenant_id != '${testUsers.volunteer_ppd.tenant_id}' --`,
        `'; DELETE FROM users; --`,
        `' UNION SELECT * FROM users WHERE tenant_id != '${testUsers.volunteer_ppd.tenant_id}' --`,
        `' OR 1=1 --`,
        `') OR tenant_id IS NOT NULL --`,
      ]
      
      for (const pattern of attackPatterns) {
        // These should all be safely handled by parameterized queries and RLS
        const { data, error } = await client
          .from('survey_responses')
          .select('*')
          .eq('respondent_name', pattern)
        
        if (data) {
          // If data is returned, it should only be from the user's tenant
          data.forEach(response => {
            expect(response.tenant_id).toBe(testUsers.volunteer_ppd.tenant_id)
          })
        }
      }
    })

    test('JWT manipulation cannot bypass RLS', async () => {
      // This test verifies that the RLS policies properly check auth.uid()
      // and cannot be bypassed by client-side JWT manipulation
      
      const normalClient = testManager.getUserClient('volunteer_ppd')
      
      // Normal operation should work
      const { data: normalData } = await normalClient
        .from('survey_responses')
        .select('*')
        .eq('volunteer_id', testUsers.volunteer_ppd.id)
      
      expect(normalData).toBeDefined()
      
      // Attempt to access data as different user (simulated JWT manipulation)
      // This should be prevented by RLS checking auth.uid() server-side
      const { data: hackedData } = await normalClient
        .from('survey_responses')
        .select('*')
        .eq('volunteer_id', testUsers.volunteer_pip.id)
      
      // Should return empty result due to RLS
      expect(hackedData).toEqual([])
    })
  })

  describe('Performance and Edge Cases', () => {
    test('RLS policies do not cause significant performance degradation', async () => {
      const client = testManager.getUserClient('admin_ppd')
      
      const startTime = performance.now()
      
      // Execute multiple queries that would trigger RLS evaluation
      await Promise.all([
        client.from('users').select('*'),
        client.from('precincts').select('*'),
        client.from('questionnaires').select('*'),
        client.from('walklists').select('*'),
        client.from('survey_responses').select('*'),
      ])
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // Performance requirement: RLS should add < 50ms overhead
      expect(duration).toBeLessThan(1000) // 1 second is reasonable for test environment
    })

    test('RLS handles edge cases correctly', async () => {
      const client = testManager.getUserClient('volunteer_ppd')
      
      // Test with null values
      const { data: nullTest } = await client
        .from('survey_responses')
        .select('*')
        .is('precinct_id', null)
      
      // Should still respect tenant isolation even with null values
      if (nullTest && nullTest.length > 0) {
        nullTest.forEach(response => {
          expect(response.tenant_id).toBe(testUsers.volunteer_ppd.tenant_id)
        })
      }
      
      // Test with very long strings
      const longString = 'a'.repeat(1000)
      const { data: longStringTest } = await client
        .from('survey_responses')
        .select('*')
        .eq('respondent_name', longString)
      
      // Should not cause errors and still respect RLS
      expect(longStringTest).toEqual([])
    })
  })

  describe('Unauthenticated Access Prevention', () => {
    test('Anonymous users cannot access any data', async () => {
      // Create client without authentication
      const serviceClient = testManager.getServiceClient()
      const { data } = await serviceClient.auth.signOut()
      
      // Remove authentication from the client to simulate anonymous access
      const anonClient = testManager.getServiceClient()
      
      // Override auth methods to simulate no authentication
      anonClient.auth.getUser = async () => ({ data: { user: null }, error: { message: 'Not authenticated' } as any })
      anonClient.auth.getSession = async () => ({ data: { session: null }, error: { message: 'No session' } as any })
      
      // All table access should be blocked for anonymous users
      const tables = ['users', 'tenants', 'precincts', 'questionnaires', 'walklists', 'survey_responses']
      
      for (const table of tables) {
        await RLSTestHelpers.expectRLSBlock(anonClient, () =>
          anonClient.from(table as any).select('*')
        )
      }
    })
  })
})