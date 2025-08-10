import React, { ReactElement, ReactNode } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { AuthProvider } from '@/hooks/use-auth'

// Mock providers for testing
interface MockAuthContextValue {
  user: any
  profile: any
  isLoading: boolean
  signIn: jest.Mock
  signOut: jest.Mock
  hasRole: jest.Mock
  hasTenantAccess: jest.Mock
  refreshProfile: jest.Mock
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authContext?: Partial<MockAuthContextValue>
  initialRoute?: string
}

// Create a custom render function that includes providers
const customRender = (
  ui: ReactElement,
  {
    authContext = {},
    initialRoute = '/',
    ...renderOptions
  }: CustomRenderOptions = {}
) => {
  // Mock auth context values
  const mockAuthContext: MockAuthContextValue = {
    user: null,
    profile: null,
    isLoading: false,
    signIn: jest.fn(),
    signOut: jest.fn(),
    hasRole: jest.fn(),
    hasTenantAccess: jest.fn(),
    refreshProfile: jest.fn(),
    ...authContext,
  }

  // Mock the useAuth hook to return our mock context
  const originalAuth = require('@/hooks/use-auth')
  jest.spyOn(originalAuth, 'useAuth').mockReturnValue(mockAuthContext)

  const Wrapper = ({ children }: { children: ReactNode }) => {
    return (
      <div data-testid="test-wrapper">
        {children}
      </div>
    )
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    // Return the mock context for easy access in tests
    mockAuthContext,
  }
}

// Re-export everything from React Testing Library
export * from '@testing-library/react'
export { customRender as render }