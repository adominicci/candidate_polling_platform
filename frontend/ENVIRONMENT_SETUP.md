# Environment Setup Guide for PPD Candidate Polling Platform

This guide explains how to set up your local development environment and configure testing for the PPD Candidate Polling Platform.

## 📋 Prerequisites

- Node.js 18+ and npm
- Access to the Supabase project: `candidate_polling` (trkaoeexbzclyxulghyr)
- Supabase account with appropriate permissions

## 🔧 Environment Configuration

### Step 1: Copy Environment Template

```bash
cd frontend
cp .env.local.example .env.local
```

### Step 2: Configure Supabase Credentials

Edit `.env.local` and fill in the required values:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://trkaoeexbzclyxulghyr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Step 3: Get Supabase Keys

1. **Go to Supabase Dashboard**: https://app.supabase.com/project/trkaoeexbzclyxulghyr
2. **Navigate to**: Settings → API
3. **Copy the keys**:
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **SECURITY WARNING**: 
- The **anon key** is safe to use in client-side code
- The **service_role key** has full database access and must be kept secret
- Never commit the service_role key to version control
- Never expose the service_role key in client-side code

## 🧪 Testing Configuration

### Test Levels

The testing setup supports different levels of testing based on available credentials:

#### 1. **Unit Tests** (Always Available)
```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage
```

#### 2. **Integration Tests** (Requires anon key)
```bash
npm test -- --testPathPatterns="integration"
```

#### 3. **Database Tests** (Requires service_role key)
```bash
npm run test:db            # Database RLS tests
npm run test:rls           # RLS policy tests
npm run test:security      # Security attack tests
```

### Test Environment Variables

The testing framework uses these environment variables:

```bash
# Required for basic functionality
NEXT_PUBLIC_SUPABASE_URL=https://trkaoeexbzclyxulghyr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Required for database integration tests
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional test configuration
VERBOSE_TESTS=false         # Enable verbose test output
PERFORMANCE_TESTS=false     # Enable performance measurements
TEST_SKIP_DATABASE_TESTS=false  # Force skip database tests
```

## 🔍 Test Configuration Details

### Jest Configuration

- **moduleNameMapper**: Handles `@/` path aliases
- **testEnvironment**: Uses jsdom for React component testing
- **setupFilesAfterEnv**: Loads Jest DOM matchers and mocks
- **testMatch**: Finds test files in `__tests__` directories and `.test.{js,ts,tsx}` files

### Supabase Test Clients

The test suite uses two types of Supabase clients:

1. **Service Role Client**: 
   - Bypasses Row Level Security (RLS)
   - Used for test data setup/cleanup
   - Requires `SUPABASE_SERVICE_ROLE_KEY`

2. **User Test Client**:
   - Simulates authenticated users with different roles
   - Respects RLS policies
   - Uses anon key with JWT impersonation

### Test Data Management

- **Test Isolation**: Each test uses unique tenant IDs and prefixed data
- **Automatic Cleanup**: Test data is cleaned up after test runs
- **Safe Patterns**: Uses test-specific prefixes to avoid production data conflicts

## 🚀 Development Workflow

### Starting Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment**:
   ```bash
   cp .env.local.example .env.local
   # Fill in Supabase credentials
   ```

3. **Run tests to verify setup**:
   ```bash
   npm test -- --testPathPatterns="connection-test"
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

### Running Tests

- **Quick test**: `npm test -- --testPathPatterns="connection-test"`
- **Component tests**: `npm test -- --testPathPatterns="components"`
- **Database tests**: `npm run test:db` (requires service_role key)
- **All tests**: `npm test`

## 🛡️ Security Best Practices

### Environment Variables

1. **Never commit `.env.local`** - it's in `.gitignore`
2. **Use `.env.local.example`** for documentation only
3. **Rotate keys** if accidentally exposed
4. **Use different keys** for different environments

### Database Access

1. **Service Role Key**:
   - Only use for server-side operations and tests
   - Never expose to client-side code
   - Store securely in CI/CD environments

2. **Anon Key**:
   - Safe for client-side use
   - Always filtered by RLS policies
   - Limited to operations allowed for anonymous users

### RLS Policy Testing

The database tests verify:
- **Tenant Isolation**: Users can only access their tenant's data
- **Role-Based Access**: Different user roles have appropriate permissions
- **Attack Prevention**: SQL injection and privilege escalation attempts are blocked
- **Data Protection**: PII fields are properly restricted for analyst roles

## 🔧 Troubleshooting

### Common Issues

1. **"Invalid API key" error**:
   - Check that keys are correctly copied from Supabase dashboard
   - Ensure no extra spaces or quotes around keys
   - Verify the Supabase URL is correct

2. **"Database tests skipped"**:
   - This is expected if `SUPABASE_SERVICE_ROLE_KEY` is not set
   - Add the service_role key to run full database tests
   - Some tests require service_role access to set up test data

3. **Jest configuration warnings**:
   - Run `npm run test:debug` for detailed error information
   - Check that tsconfig.json paths match Jest moduleNameMapper

4. **Environment not loading**:
   - Ensure `.env.local` is in the `frontend/` directory
   - Restart the development server after changing environment variables
   - Check for syntax errors in `.env.local`

### Getting Help

1. **Check logs**: Run tests with `VERBOSE_TESTS=true npm test`
2. **Verify connection**: Use the connection test to debug setup
3. **Review RLS policies**: Check Supabase dashboard for policy errors
4. **Database logs**: Use Supabase dashboard logs for database issues

## 📊 CI/CD Configuration

### GitHub Actions

```yaml
env:
  NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

### Vercel Deployment

Add these environment variables in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Do NOT add** `SUPABASE_SERVICE_ROLE_KEY` to Vercel (server operations only)

## 🎯 Next Steps

Once your environment is set up:

1. **Run the connection test** to verify everything works
2. **Explore the test suite** to understand the RLS policies
3. **Start developing** with confidence in the security model
4. **Add new tests** following the existing patterns

For questions or issues, refer to the project documentation or create an issue in the repository.