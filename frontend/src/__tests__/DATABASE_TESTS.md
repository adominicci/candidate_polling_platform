# Database Integration Tests - RLS Policy Testing

This directory contains comprehensive database integration tests specifically designed to test Row Level Security (RLS) policies for the PPD Candidate Polling Platform.

## Test Structure

### Core Test Files
- **`integration/database-rls.test.ts`** - Main RLS policy test suite covering all tables and user roles
- **`integration/rls-policy-specific.test.ts`** - Detailed tests for specific RLS policies on individual tables
- **`integration/rls-security-attacks.test.ts`** - Security attack tests including SQL injection, privilege escalation, and cross-tenant attacks

### Test Utilities
- **`setup/supabase-test-client.ts`** - Supabase client configuration for testing with user impersonation
- **`setup/database-test-setup.ts`** - Global test setup and configuration
- **`utils/db-test-utils.ts`** - Database test utilities including test data management and RLS helpers

## Prerequisites

### Environment Variables
Create a `.env.local` file in the frontend directory with:

```env
# Supabase Configuration (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Test Configuration (optional)
NODE_ENV=test
VERBOSE_TESTS=true
PERFORMANCE_TESTS=true
```

**⚠️ Security Note**: Never use production database credentials for testing. Always use a dedicated test database or development environment.

### Database Requirements
- Supabase project with RLS policies implemented
- All tables created (tenants, users, precincts, questionnaires, walklists, survey_responses, answers)
- RLS enabled on all tables
- Proper tenant isolation and role-based policies implemented

## Running the Tests

### All Database Tests
```bash
npm test -- --testPathPattern=database
```

### Specific Test Suites
```bash
# Main RLS policy tests
npm test src/__tests__/integration/database-rls.test.ts

# Specific policy tests
npm test src/__tests__/integration/rls-policy-specific.test.ts

# Security attack tests
npm test src/__tests__/integration/rls-security-attacks.test.ts
```

### Verbose Testing
```bash
VERBOSE_TESTS=true npm test -- --testPathPattern=database
```

### Performance Testing
```bash
PERFORMANCE_TESTS=true npm test -- --testPathPattern=database
```

## Test Coverage

### Tables Tested
- ✅ **tenants** - Tenant isolation and admin-only modifications
- ✅ **users** - Profile access and role-based permissions
- ✅ **precincts** - Read access and creation permissions
- ✅ **questionnaires** - Active questionnaire access and admin creation
- ✅ **walklists** - Assignment-based access for volunteers
- ✅ **survey_responses** - Volunteer creation and analyst anonymization
- ✅ **sections** - Questionnaire relationship permissions
- ✅ **questions** - Section relationship permissions
- ✅ **answers** - Survey response relationship permissions

### User Roles Tested
- ✅ **Admin** - Full access within tenant
- ✅ **Manager** - Read access + limited write access
- ✅ **Analyst** - Read access to anonymized data
- ✅ **Volunteer** - Assignment-based access only

### Security Test Cases
- ✅ **Tenant Isolation** - Users cannot access other tenant data
- ✅ **Role-based Access** - Each role respects permission boundaries
- ✅ **CRUD Operations** - Insert, Select, Update, Delete per role
- ✅ **Cross-tenant Prevention** - Cannot access other tenant data
- ✅ **SQL Injection Prevention** - Various injection attack patterns
- ✅ **Authentication Bypass Prevention** - JWT and session manipulation
- ✅ **Privilege Escalation Prevention** - Cannot escalate roles
- ✅ **Anonymous Access Prevention** - Unauthenticated access blocked

## Test Data Management

### Automatic Test Data
Tests automatically create and clean up test data including:
- 3 test tenants (PPD, PIP, PNP)
- 6 test users (2 per tenant with different roles)
- Test precincts, questionnaires, walklists, and survey responses

### Test Data Isolation
- All test data uses `test-` prefixes
- Test data is isolated from development data
- Automatic cleanup after test completion
- No impact on existing application data

## Understanding Test Results

### Successful Test Output
```
✓ PPD Admin can only see PPD tenant data
✓ Volunteers cannot access other volunteers data
✓ RLS blocks SQL injection in WHERE clauses
✓ RLS prevents mass data extraction via pagination
```

### Failed Test Indicators
- **Tenant isolation failure**: Users seeing other tenant data
- **Permission bypass**: Users performing unauthorized operations
- **Security vulnerability**: Attack scenarios succeeding
- **Performance issues**: Queries taking excessive time

## Performance Benchmarks

Tests include performance monitoring with thresholds:
- **Query Performance**: < 1 second per query in test environment
- **RLS Overhead**: < 50ms additional processing time
- **Concurrent Access**: 10 simultaneous queries complete within 10 seconds
- **Policy Evaluation**: Consistent response times regardless of data existence

## Troubleshooting

### Common Issues

#### "Missing Supabase configuration"
- Ensure all environment variables are set in `.env.local`
- Verify Supabase project is accessible
- Check service role key has proper permissions

#### "Database tests skipped"
- Environment variables not properly configured
- Running outside test environment
- Database connection issues

#### "RLS policy test failed"
- RLS policies not implemented correctly
- Database schema doesn't match expected structure
- Test data setup failed

#### "Performance tests failing"
- Database performance issues
- Network latency in test environment
- Concurrent test execution conflicts

### Debug Mode
Enable verbose logging:
```bash
VERBOSE_TESTS=true DEBUG=true npm test -- --testPathPattern=database
```

### Manual Database Inspection
Use the service client to inspect test data:
```typescript
const client = createTestClient()
const { data } = await client.from('users').select('*')
console.log('Test users:', data)
```

## Security Considerations

### Test Environment Safety
- ⚠️ **Never run against production database**
- ✅ Use dedicated test/staging environment
- ✅ Test data uses recognizable prefixes
- ✅ Automatic cleanup prevents data pollution

### Sensitive Data
- Tests use fake email addresses and phone numbers
- No real personal information in test data
- Service role key should be restricted to test environment

## Extending the Tests

### Adding New Table Tests
1. Add table to `database.ts` types
2. Create test data in `db-test-utils.ts`
3. Add RLS tests in appropriate test file
4. Include in cleanup procedures

### Adding New User Roles
1. Update `testUsers` in `db-test-utils.ts`
2. Add role-specific permission tests
3. Update security attack tests
4. Verify tenant isolation

### Adding New Attack Scenarios
1. Add to `rls-security-attacks.test.ts`
2. Document expected behavior
3. Verify with security team
4. Include in CI/CD pipeline

## CI/CD Integration

### GitHub Actions
```yaml
- name: Run Database Tests
  run: |
    npm test -- --testPathPattern=database --ci --coverage
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.TEST_SUPABASE_SERVICE_KEY }}
```

### Test Reporting
- Coverage reports include database test coverage
- Performance metrics logged in CI environment
- Security test results reported to security dashboard

## Maintenance

### Regular Tasks
- **Weekly**: Review test performance metrics
- **Monthly**: Update test data to reflect schema changes
- **Release**: Run full security test suite
- **Quarterly**: Review and update attack scenarios

### Schema Changes
When database schema changes:
1. Update `database.ts` types
2. Update test data generators
3. Update RLS policy tests
4. Verify all tests pass

This comprehensive test suite ensures the security and reliability of the PPD Candidate Polling Platform's database layer. The tests serve as both verification tools and documentation of expected security behavior.