# PPD Candidate Polling Platform - Test Suite Documentation

## Overview

This document describes the comprehensive test suite implemented for the PPD Candidate Polling Platform frontend application. The test suite follows React Testing Library best practices and provides extensive coverage for components, hooks, and user interactions.

> **📋 Quick Start**: For environment setup and configuration, see [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)

## Testing Stack

- **Jest**: Test runner and assertion library
- **React Testing Library**: Component testing utilities
- **@testing-library/user-event**: User interaction simulation
- **@testing-library/jest-dom**: Additional Jest matchers
- **Next.js Jest Integration**: Optimized configuration for Next.js apps

## Test Structure

```
frontend/src/
├── __tests__/
│   ├── integration/           # Integration tests for user flows
│   ├── setup/                # Test environment configuration
│   └── utils/                # Testing utilities and mocks
├── components/
│   ├── ui/__tests__/         # UI component unit tests
│   └── auth/__tests__/       # Authentication component tests
└── hooks/__tests__/          # Custom hook tests
```

## Available Test Scripts

```bash
# Run all tests once
npm run test

# Run tests in watch mode (development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests in CI mode with coverage
npm run test:ci

# Debug tests with Node inspector
npm run test:debug

# Database integration tests (requires SUPABASE_SERVICE_ROLE_KEY)
npm run test:db
npm run test:rls
npm run test:security

# Test connection and environment setup
npm test -- --testPathPatterns="connection-test"
```

## Test Categories

### 1. Unit Tests

#### UI Components (`src/components/ui/__tests__/`)
- **Button Component**: Variants, sizes, loading states, accessibility
- **Input Component**: Input types, validation, error states, accessibility
- **Additional UI components** as they are developed

#### Authentication Components (`src/components/auth/__tests__/`)
- **LoginForm**: Form validation, submission, error handling, accessibility
- **Additional auth components** as they are developed

#### Custom Hooks (`src/hooks/__tests__/`)
- **useAuth**: Authentication state management, user profile handling, role-based access

### 2. Integration Tests (`src/__tests__/integration/`)

#### Authentication Flow
- Complete login process from form submission to dashboard redirect
- Error handling for invalid credentials and inactive users
- Loading states and user feedback
- Form validation and error recovery

#### Database Integration Tests (RLS Testing)
- **Tenant Isolation**: Verify users can only access their tenant's data
- **Role-Based Access**: Test permissions for Admin, Manager, Analyst, and Volunteer roles
- **Security Attacks**: Test SQL injection and privilege escalation prevention
- **Cross-Tenant Prevention**: Ensure no data leakage between tenants
- **Performance Testing**: Verify RLS policies don't cause significant overhead

*Note: Database tests require `SUPABASE_SERVICE_ROLE_KEY` and will be skipped if not available.*

### 3. Testing Utilities (`src/__tests__/utils/`)

#### Mock Implementations
- **Supabase Client**: Complete mock with configurable responses
- **Next.js Router**: Navigation and routing mocks
- **Authentication Context**: Flexible auth state mocking
- **Local/Session Storage**: Browser storage mocks

#### Test Data
- **User Profiles**: Mock user data for different roles (admin, volunteer, analyst, manager)
- **Form Data**: Common form input scenarios
- **Error Scenarios**: Network errors, validation failures, API errors

#### Test Helpers
- **Custom Render**: Pre-configured render with providers
- **Event Utilities**: Form events, input changes, user interactions
- **Mock Server**: HTTP request/response simulation

## Configuration

### Jest Configuration (`jest.config.js`)
- Next.js integration with proper babel presets
- TypeScript support
- Module path mapping for `@/` imports
- Coverage collection and thresholds
- Test environment setup

### Coverage Thresholds
- **Statements**: 50%
- **Branches**: 50%
- **Functions**: 50%
- **Lines**: 50%

*Note: Thresholds are set conservatively for initial implementation and should be increased as the codebase matures.*

### Files Excluded from Coverage
- TypeScript declaration files (`*.d.ts`)
- Storybook stories (`*.stories.*`)
- App layout files
- Type definitions
- Configuration files

## CI/CD Integration

### GitHub Actions Workflow (`.github/workflows/test.yml`)

The test suite runs automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches
- Changes to `frontend/**` files only

#### Workflow Jobs

1. **Test**: Runs on Node.js 18.x and 20.x
   - Type checking with TypeScript
   - Linting with ESLint
   - Unit and integration tests with coverage
   - Coverage reporting to Codecov and Codacy

2. **Build**: Verifies application builds successfully
   - Production build generation
   - Bundle size analysis

3. **E2E**: End-to-end testing (placeholder for future implementation)
   - Playwright integration ready
   - Cross-browser testing capability

4. **Security**: Security scanning
   - npm audit for vulnerability detection
   - Snyk security analysis

5. **Accessibility**: Accessibility testing
   - axe-core integration for a11y compliance
   - WCAG guideline validation

## Writing Tests

### Component Testing Example

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../button'

describe('Button Component', () => {
  it('handles click events', async () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    const button = screen.getByRole('button', { name: /click me/i })
    await userEvent.click(button)
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### Hook Testing Example

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { useAuth, AuthProvider } from '../use-auth'

describe('useAuth Hook', () => {
  it('signs in successfully', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider
    })

    await act(async () => {
      const response = await result.current.signIn('admin@ppd.pr', 'password123')
      expect(response.error).toBeNull()
    })
  })
})
```

### Integration Testing Example

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from '@/hooks/use-auth'
import { LoginForm } from '@/components/auth/login-form'

describe('Authentication Flow', () => {
  it('allows user to login and redirects to dashboard', async () => {
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    )

    await userEvent.type(screen.getByLabelText(/email/i), 'admin@ppd.pr')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /login/i }))

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard')
    })
  })
})
```

## Best Practices

### 1. Test Structure
- **Arrange, Act, Assert**: Clear test organization
- **Descriptive test names**: Behavior-focused descriptions
- **Focused assertions**: One concept per test

### 2. User-Centric Testing
- **Test user interactions**: Click, type, navigate
- **Test what users see**: Screen reader compatible queries
- **Avoid implementation details**: Don't test internal state

### 3. Accessibility Testing
- **Screen reader compatibility**: Use semantic queries
- **Keyboard navigation**: Test tab order and keyboard events
- **ARIA attributes**: Verify proper labeling and descriptions

### 4. Mock Strategy
- **Mock external dependencies**: APIs, routing, storage
- **Keep mocks simple**: Focus on behavior, not implementation
- **Reset mocks**: Clean state between tests

### 5. Coverage Goals
- **Focus on critical paths**: Authentication, data submission
- **Edge cases**: Error states, loading states, validation
- **User workflows**: End-to-end scenarios

## Debugging Tests

### Running Specific Tests
```bash
# Run specific test file
npm test -- --testPathPatterns="button.test"

# Run specific test suite
npm test -- --testNamePattern="Button Component"

# Run with verbose output
npm test -- --verbose
```

### Debug Mode
```bash
# Run with Node debugger
npm run test:debug

# Then connect with Chrome DevTools at:
# chrome://inspect/#devices
```

### Test Output
```bash
# Show coverage report in browser
npx serve coverage/lcov-report
```

## Future Enhancements

### Planned Additions
1. **Visual Regression Testing**: Screenshot comparison tests
2. **Performance Testing**: Bundle size and runtime performance
3. **End-to-End Testing**: Complete user journey automation
4. **API Testing**: Backend integration tests
5. **Mobile Testing**: Responsive design validation

### Test Expansion Areas
1. **Survey Components**: Form builders and data collection
2. **Dashboard Analytics**: Data visualization components  
3. **User Management**: Role-based access and permissions
4. **Data Export**: CSV generation and formatting
5. **Real-time Features**: WebSocket connections and updates

## Troubleshooting

### Common Issues

1. **Module Resolution**: Ensure `@/` path mapping is correct
2. **Mock Conflicts**: Check for conflicting mock implementations
3. **Async Operations**: Use `waitFor` for asynchronous updates
4. **Context Providers**: Wrap components with necessary providers
5. **Environment Variables**: Set test-specific env vars in jest.setup.js

### Getting Help

- Review test logs for specific error messages
- Check Jest and React Testing Library documentation
- Validate mock implementations match real API behavior
- Ensure proper cleanup in test teardown

---

This test suite provides a solid foundation for maintaining code quality and preventing regressions as the PPD Candidate Polling Platform evolves. Regular updates to tests should accompany new feature development.