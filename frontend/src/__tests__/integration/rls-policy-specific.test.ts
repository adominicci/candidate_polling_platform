/**
 * RLS Policy-Specific Tests
 * Tests for individual RLS policies and specific database scenarios
 */

import { DatabaseTestManager, RLSTestHelpers, testUsers } from '../utils/db-test-utils'
import { requiresDatabase } from '../setup/supabase-test-client'

const describeDb = requiresDatabase() ? describe : describe.skip

describeDb('RLS Policy-Specific Tests', () => {
  let testManager: DatabaseTestManager

  beforeAll(async () => {
    testManager = new DatabaseTestManager()
    await testManager.setupAll()
  })

  afterAll(async () => {
    await testManager.cleanup()
  })

  describe('Tenants Table RLS', () => {
    test('Users can only see their own tenant', async () => {
      const ppdClient = testManager.getUserClient('admin_ppd')
      const pipClient = testManager.getUserClient('admin_pip')

      // PPD admin should only see PPD tenant
      const { data: ppdTenants } = await ppdClient.from('tenants').select('*')
      expect(ppdTenants).toBeDefined()
      ppdTenants?.forEach(tenant => {
        expect(tenant.id).toBe(testUsers.admin_ppd.tenant_id)
      })

      // PIP admin should only see PIP tenant
      const { data: pipTenants } = await pipClient.from('tenants').select('*')
      expect(pipTenants).toBeDefined()
      pipTenants?.forEach(tenant => {
        expect(tenant.id).toBe(testUsers.admin_pip.tenant_id)
      })
    })

    test('Only admins can modify tenant settings', async () => {
      const adminClient = testManager.getUserClient('admin_ppd')
      const managerClient = testManager.getUserClient('manager_ppd')
      const volunteerClient = testManager.getUserClient('volunteer_ppd')

      // Admin should be able to update tenant settings
      await RLSTestHelpers.expectRLSAllow(adminClient, () =>
        adminClient.from('tenants').update({
          settings: { test_update: true }
        }).eq('id', testUsers.admin_ppd.tenant_id)
      )

      // Manager should NOT be able to update tenant settings
      await RLSTestHelpers.expectRLSBlock(managerClient, () =>
        managerClient.from('tenants').update({
          settings: { unauthorized_update: true }
        }).eq('id', testUsers.manager_ppd.tenant_id)
      )

      // Volunteer should NOT be able to update tenant settings
      await RLSTestHelpers.expectRLSBlock(volunteerClient, () =>
        volunteerClient.from('tenants').update({
          settings: { hack_attempt: true }
        }).eq('id', testUsers.volunteer_ppd.tenant_id)
      )
    })
  })

  describe('Users Table RLS', () => {
    test('Users can read their own profile', async () => {
      const client = testManager.getUserClient('volunteer_ppd')
      
      const { data: userProfile } = await RLSTestHelpers.expectRLSAllow(client, () =>
        client.from('users').select('*').eq('id', testUsers.volunteer_ppd.id)
      )
      
      expect(userProfile).toBeDefined()
      expect(userProfile![0].id).toBe(testUsers.volunteer_ppd.id)
    })

    test('Non-admins cannot see other users in detail', async () => {
      const volunteerClient = testManager.getUserClient('volunteer_ppd')
      const managerClient = testManager.getUserClient('manager_ppd')

      // Volunteer should not see other users
      const { data: otherUsers } = await volunteerClient
        .from('users')
        .select('*')
        .neq('id', testUsers.volunteer_ppd.id)
      
      expect(otherUsers).toEqual([])

      // Manager might see other users but with limited information
      const { data: managerViewUsers } = await managerClient
        .from('users')
        .select('id, full_name, role, is_active')
        .neq('id', testUsers.manager_ppd.id)
      
      // This depends on specific RLS implementation
      // Manager might see users but not sensitive data
      if (managerViewUsers && managerViewUsers.length > 0) {
        managerViewUsers.forEach(user => {
          expect(user.email).toBeUndefined() // Should not expose email
          expect(user.metadata).toBeUndefined() // Should not expose metadata
        })
      }
    })

    test('Only admins can change user roles', async () => {
      const adminClient = testManager.getUserClient('admin_ppd')
      const managerClient = testManager.getUserClient('manager_ppd')
      
      // Create a test user to modify
      const { data: testUser } = await testManager.getServiceClient()
        .from('users')
        .insert({
          id: 'test-user-role-change',
          tenant_id: testUsers.admin_ppd.tenant_id,
          email: 'roletest@ppd-test.pr',
          full_name: 'Role Test User',
          role: 'volunteer',
          is_active: true,
        })
        .select()

      if (!testUser || testUser.length === 0) {
        throw new Error('Failed to create test user')
      }

      // Admin should be able to change roles
      await RLSTestHelpers.expectRLSAllow(adminClient, () =>
        adminClient.from('users').update({
          role: 'analyst'
        }).eq('id', 'test-user-role-change')
      )

      // Manager should NOT be able to change roles
      await RLSTestHelpers.expectRLSBlock(managerClient, () =>
        managerClient.from('users').update({
          role: 'admin'
        }).eq('id', 'test-user-role-change')
      )

      // Cleanup
      await testManager.getServiceClient()
        .from('users')
        .delete()
        .eq('id', 'test-user-role-change')
    })
  })

  describe('Precincts Table RLS', () => {
    test('All authenticated users can read precincts in their tenant', async () => {
      const clients = [
        testManager.getUserClient('admin_ppd'),
        testManager.getUserClient('manager_ppd'),
        testManager.getUserClient('analyst_ppd'),
        testManager.getUserClient('volunteer_ppd'),
      ]

      for (const client of clients) {
        const { data: precincts } = await RLSTestHelpers.expectRLSAllow(client, () =>
          client.from('precincts').select('*')
        )
        
        expect(precincts).toBeDefined()
        precincts?.forEach(precinct => {
          expect(precinct.tenant_id).toBe(testUsers.admin_ppd.tenant_id)
        })
      }
    })

    test('Only admins and managers can create precincts', async () => {
      const adminClient = testManager.getUserClient('admin_ppd')
      const managerClient = testManager.getUserClient('manager_ppd')
      const analystClient = testManager.getUserClient('analyst_ppd')
      const volunteerClient = testManager.getUserClient('volunteer_ppd')

      const precinctData = {
        tenant_id: testUsers.admin_ppd.tenant_id,
        number: 'TEST-RLS',
        name: 'RLS Test Precinct',
        municipality: 'Test Municipality',
      }

      // Admin should be able to create
      const { data: adminCreated } = await RLSTestHelpers.expectRLSAllow(adminClient, () =>
        adminClient.from('precincts').insert({
          ...precinctData,
          id: 'admin-created-precinct'
        }).select()
      )
      expect(adminCreated).toBeDefined()

      // Manager should be able to create
      const { data: managerCreated } = await RLSTestHelpers.expectRLSAllow(managerClient, () =>
        managerClient.from('precincts').insert({
          ...precinctData,
          id: 'manager-created-precinct'
        }).select()
      )
      expect(managerCreated).toBeDefined()

      // Analyst should NOT be able to create
      await RLSTestHelpers.expectRLSBlock(analystClient, () =>
        analystClient.from('precincts').insert({
          ...precinctData,
          id: 'analyst-blocked-precinct'
        })
      )

      // Volunteer should NOT be able to create
      await RLSTestHelpers.expectRLSBlock(volunteerClient, () =>
        volunteerClient.from('precincts').insert({
          ...precinctData,
          id: 'volunteer-blocked-precinct'
        })
      )

      // Cleanup
      await testManager.getServiceClient()
        .from('precincts')
        .delete()
        .in('id', ['admin-created-precinct', 'manager-created-precinct'])
    })
  })

  describe('Walklists Table RLS', () => {
    test('Volunteers can only see their assigned walklists', async () => {
      const ppdVolunteerClient = testManager.getUserClient('volunteer_ppd')
      const pipVolunteerClient = testManager.getUserClient('volunteer_pip')

      // PPD volunteer should only see their assignments
      const { data: ppdWalklists } = await ppdVolunteerClient.from('walklists').select('*')
      expect(ppdWalklists).toBeDefined()
      ppdWalklists?.forEach(walklist => {
        expect(walklist.assigned_to).toBe(testUsers.volunteer_ppd.id)
        expect(walklist.tenant_id).toBe(testUsers.volunteer_ppd.tenant_id)
      })

      // PIP volunteer should only see their assignments
      const { data: pipWalklists } = await pipVolunteerClient.from('walklists').select('*')
      expect(pipWalklists).toBeDefined()
      pipWalklists?.forEach(walklist => {
        expect(walklist.assigned_to).toBe(testUsers.volunteer_pip.id)
        expect(walklist.tenant_id).toBe(testUsers.volunteer_pip.tenant_id)
      })
    })

    test('Managers can see and assign all walklists in their tenant', async () => {
      const managerClient = testManager.getUserClient('manager_ppd')

      // Manager should see all walklists in their tenant
      const { data: allWalklists } = await managerClient.from('walklists').select('*')
      expect(allWalklists).toBeDefined()
      allWalklists?.forEach(walklist => {
        expect(walklist.tenant_id).toBe(testUsers.manager_ppd.tenant_id)
      })

      // Manager should be able to create new assignments
      const { data: newWalklist } = await RLSTestHelpers.expectRLSAllow(managerClient, () =>
        managerClient.from('walklists').insert({
          id: 'manager-assigned-walklist',
          tenant_id: testUsers.manager_ppd.tenant_id,
          precinct_id: 'test-precinct-ppd-001',
          assigned_to: testUsers.volunteer_ppd.id,
          title: 'Manager Assignment Test',
          status: 'active',
        }).select()
      )
      expect(newWalklist).toBeDefined()

      // Cleanup
      await testManager.getServiceClient()
        .from('walklists')
        .delete()
        .eq('id', 'manager-assigned-walklist')
    })

    test('Volunteers cannot modify walklist assignments', async () => {
      const volunteerClient = testManager.getUserClient('volunteer_ppd')

      // Volunteer should NOT be able to change assignment
      await RLSTestHelpers.expectRLSBlock(volunteerClient, () =>
        volunteerClient.from('walklists').update({
          assigned_to: testUsers.volunteer_ppd.id
        }).neq('assigned_to', testUsers.volunteer_ppd.id)
      )

      // Volunteer should NOT be able to change status to completed without proper validation
      // This might be allowed depending on business rules
      const { data: ownWalklists } = await volunteerClient
        .from('walklists')
        .select('id')
        .eq('assigned_to', testUsers.volunteer_ppd.id)
        .limit(1)

      if (ownWalklists && ownWalklists.length > 0) {
        // This might be allowed - depends on business rules
        const result = await volunteerClient
          .from('walklists')
          .update({ status: 'completed' })
          .eq('id', ownWalklists[0].id)

        // Either should succeed (if allowed) or be blocked
        // Test based on your specific business requirements
      }
    })
  })

  describe('Survey Responses RLS', () => {
    test('Volunteers can only create responses as themselves', async () => {
      const volunteerClient = testManager.getUserClient('volunteer_ppd')

      // Should succeed when volunteer creates response as themselves
      const { data: validResponse } = await RLSTestHelpers.expectRLSAllow(volunteerClient, () =>
        volunteerClient.from('survey_responses').insert({
          id: 'volunteer-valid-response',
          tenant_id: testUsers.volunteer_ppd.tenant_id,
          questionnaire_id: 'test-questionnaire-ppd-001',
          volunteer_id: testUsers.volunteer_ppd.id,
          respondent_name: 'Valid Survey Response',
          respondent_phone: '787-555-0123',
        }).select()
      )
      expect(validResponse).toBeDefined()

      // Should fail when trying to create response as different volunteer
      await RLSTestHelpers.expectRLSBlock(volunteerClient, () =>
        volunteerClient.from('survey_responses').insert({
          id: 'volunteer-invalid-response',
          tenant_id: testUsers.volunteer_ppd.tenant_id,
          questionnaire_id: 'test-questionnaire-ppd-001',
          volunteer_id: testUsers.volunteer_pip.id, // Different volunteer!
          respondent_name: 'Invalid Survey Response',
        })
      )

      // Cleanup
      await testManager.getServiceClient()
        .from('survey_responses')
        .delete()
        .eq('id', 'volunteer-valid-response')
    })

    test('Analysts see anonymized survey data', async () => {
      const analystClient = testManager.getUserClient('analyst_ppd')

      // Analyst should be able to read survey responses for analysis
      const { data: responses } = await analystClient
        .from('survey_responses')
        .select('id, tenant_id, questionnaire_id, precinct_id, is_complete, created_at')

      expect(responses).toBeDefined()
      
      // Try to access PII fields - should be restricted
      const { data: piiData } = await analystClient
        .from('survey_responses')
        .select('respondent_name, respondent_email, respondent_phone')

      // Depending on implementation, PII should be null, empty, or query should fail
      if (piiData) {
        piiData.forEach(row => {
          // PII fields should be null or anonymized
          expect(row.respondent_name).toBeNull()
          expect(row.respondent_email).toBeNull()
          expect(row.respondent_phone).toBeNull()
        })
      }
    })
  })

  describe('Questionnaires and Sections RLS', () => {
    test('All users can read active questionnaires in their tenant', async () => {
      const clients = [
        testManager.getUserClient('admin_ppd'),
        testManager.getUserClient('manager_ppd'),
        testManager.getUserClient('analyst_ppd'),
        testManager.getUserClient('volunteer_ppd'),
      ]

      for (const client of clients) {
        const { data: questionnaires } = await RLSTestHelpers.expectRLSAllow(client, () =>
          client.from('questionnaires').select('*').eq('is_active', true)
        )
        
        expect(questionnaires).toBeDefined()
        questionnaires?.forEach(questionnaire => {
          expect(questionnaire.tenant_id).toBe(testUsers.admin_ppd.tenant_id)
        })
      }
    })

    test('Only admins can create/modify questionnaires', async () => {
      const adminClient = testManager.getUserClient('admin_ppd')
      const managerClient = testManager.getUserClient('manager_ppd')
      const volunteerClient = testManager.getUserClient('volunteer_ppd')

      const questionnaireData = {
        id: 'test-rls-questionnaire',
        tenant_id: testUsers.admin_ppd.tenant_id,
        title: 'RLS Test Questionnaire',
        version: '1.0',
        language: 'es',
        is_active: true,
      }

      // Admin should be able to create
      await RLSTestHelpers.expectRLSAllow(adminClient, () =>
        adminClient.from('questionnaires').insert(questionnaireData).select()
      )

      // Manager should NOT be able to create questionnaires
      await RLSTestHelpers.expectRLSBlock(managerClient, () =>
        managerClient.from('questionnaires').insert({
          ...questionnaireData,
          id: 'manager-blocked-questionnaire'
        })
      )

      // Volunteer should NOT be able to create questionnaires
      await RLSTestHelpers.expectRLSBlock(volunteerClient, () =>
        volunteerClient.from('questionnaires').insert({
          ...questionnaireData,
          id: 'volunteer-blocked-questionnaire'
        })
      )

      // Cleanup
      await testManager.getServiceClient()
        .from('questionnaires')
        .delete()
        .eq('id', 'test-rls-questionnaire')
    })
  })

  describe('Complex Query RLS', () => {
    test('Join queries respect RLS across all tables', async () => {
      const volunteerClient = testManager.getUserClient('volunteer_ppd')

      // Complex query joining multiple tables should still respect RLS
      const { data: joinedData } = await volunteerClient
        .from('survey_responses')
        .select(`
          id,
          tenant_id,
          questionnaires!inner(title, tenant_id),
          precincts!inner(name, tenant_id)
        `)

      if (joinedData && joinedData.length > 0) {
        joinedData.forEach(row => {
          // All joined data should be from the same tenant
          expect(row.tenant_id).toBe(testUsers.volunteer_ppd.tenant_id)
          expect((row as any).questionnaires.tenant_id).toBe(testUsers.volunteer_ppd.tenant_id)
          expect((row as any).precincts.tenant_id).toBe(testUsers.volunteer_ppd.tenant_id)
        })
      }
    })

    test('Aggregate queries respect RLS', async () => {
      const analystClient = testManager.getUserClient('analyst_ppd')

      // Analyst should be able to perform aggregate queries within their tenant
      const { data: aggregateData } = await analystClient
        .rpc('get_survey_statistics', {
          tenant_filter: testUsers.analyst_ppd.tenant_id
        })

      // This RPC would need to be implemented with proper RLS
      // The result should only include data from the analyst's tenant
    })
  })
})