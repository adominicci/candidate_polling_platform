import { render, screen } from '@testing-library/react'
import { useRouter, usePathname } from 'next/navigation'
import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { canAccessRoute, hasPermission, getAllowedRoutes } from '@/lib/auth/permissions'
import { mockUserProfiles } from '@/__tests__/utils/auth-test-utils'

// Mock Next.js navigation
jest.mock('next/navigation')
jest.mock('next/server')

// Mock Supabase middleware dependencies
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}))

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>

// Mock ProtectedRoute component for testing
const ProtectedRoute = ({ children, allowedRoles }: { 
  children: React.ReactNode, 
  allowedRoles: string[] 
}) => {
  const pathname = usePathname()
  const router = useRouter()
  
  // This would normally use useAuth, but we'll mock the behavior
  const mockUser = { role: 'Volunteer' } // This would come from actual auth context
  
  if (!allowedRoles.includes(mockUser.role)) {
    router.push('/unauthorized')
    return <div>Redirecting to unauthorized...</div>
  }
  
  return <div data-testid="protected-content">{children}</div>
}

describe('Protected Routes and Access Control Tests', () => {
  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    })
    mockUsePathname.mockReturnValue('/dashboard')
    jest.clearAllMocks()
  })

  describe('Route Access Permission Checks', () => {
    test('Admin can access all routes', () => {
      expect(canAccessRoute('Admin', '/admin')).toBe(true)
      expect(canAccessRoute('Admin', '/dashboard')).toBe(true)
      expect(canAccessRoute('Admin', '/analytics')).toBe(true)
      expect(canAccessRoute('Admin', '/survey')).toBe(true)
      expect(canAccessRoute('Admin', '/users')).toBe(true)
      expect(canAccessRoute('Admin', '/walklists')).toBe(true)
      expect(canAccessRoute('Admin', '/reports')).toBe(true)
    })

    test('Manager can access appropriate routes', () => {
      expect(canAccessRoute('Manager', '/admin')).toBe(false)
      expect(canAccessRoute('Manager', '/dashboard')).toBe(true)
      expect(canAccessRoute('Manager', '/analytics')).toBe(true)
      expect(canAccessRoute('Manager', '/survey')).toBe(true)
      expect(canAccessRoute('Manager', '/users')).toBe(false)
      expect(canAccessRoute('Manager', '/walklists')).toBe(true)
      expect(canAccessRoute('Manager', '/reports')).toBe(true)
    })

    test('Analyst can access read-only routes', () => {
      expect(canAccessRoute('Analyst', '/admin')).toBe(false)
      expect(canAccessRoute('Analyst', '/dashboard')).toBe(true)
      expect(canAccessRoute('Analyst', '/analytics')).toBe(true)
      expect(canAccessRoute('Analyst', '/survey')).toBe(false)
      expect(canAccessRoute('Analyst', '/users')).toBe(false)
      expect(canAccessRoute('Analyst', '/walklists')).toBe(false)
      expect(canAccessRoute('Analyst', '/reports')).toBe(true)
    })

    test('Volunteer has limited access', () => {
      expect(canAccessRoute('Volunteer', '/admin')).toBe(false)
      expect(canAccessRoute('Volunteer', '/dashboard')).toBe(false)
      expect(canAccessRoute('Volunteer', '/analytics')).toBe(false)
      expect(canAccessRoute('Volunteer', '/survey')).toBe(true)
      expect(canAccessRoute('Volunteer', '/users')).toBe(false)
      expect(canAccessRoute('Volunteer', '/walklists')).toBe(false)
      expect(canAccessRoute('Volunteer', '/reports')).toBe(false)
    })

    test('Wildcard route patterns work correctly', () => {
      expect(canAccessRoute('Admin', '/admin/users')).toBe(true)
      expect(canAccessRoute('Admin', '/admin/settings')).toBe(true)
      expect(canAccessRoute('Admin', '/dashboard/analytics')).toBe(true)
      expect(canAccessRoute('Volunteer', '/survey/new')).toBe(true)
      expect(canAccessRoute('Volunteer', '/survey/123')).toBe(true)
      expect(canAccessRoute('Volunteer', '/admin/anything')).toBe(false)
    })
  })

  describe('Permission System', () => {
    test('Admin has full permissions on all resources', () => {
      expect(hasPermission('Admin', 'users', 'create')).toBe(true)
      expect(hasPermission('Admin', 'users', 'read')).toBe(true)
      expect(hasPermission('Admin', 'users', 'update')).toBe(true)
      expect(hasPermission('Admin', 'users', 'delete')).toBe(true)
      expect(hasPermission('Admin', 'surveys', 'create')).toBe(true)
      expect(hasPermission('Admin', 'analytics', 'export')).toBe(true)
    })

    test('Manager has operational permissions', () => {
      expect(hasPermission('Manager', 'users', 'create')).toBe(false)
      expect(hasPermission('Manager', 'users', 'read')).toBe(true)
      expect(hasPermission('Manager', 'users', 'update')).toBe(true)
      expect(hasPermission('Manager', 'users', 'delete')).toBe(false)
      expect(hasPermission('Manager', 'surveys', 'create')).toBe(true)
      expect(hasPermission('Manager', 'walklists', 'create')).toBe(true)
      expect(hasPermission('Manager', 'analytics', 'export')).toBe(true)
    })

    test('Analyst has read-only permissions', () => {
      expect(hasPermission('Analyst', 'users', 'create')).toBe(false)
      expect(hasPermission('Analyst', 'users', 'read')).toBe(false)
      expect(hasPermission('Analyst', 'surveys', 'read')).toBe(true)
      expect(hasPermission('Analyst', 'surveys', 'create')).toBe(false)
      expect(hasPermission('Analyst', 'analytics', 'read')).toBe(true)
      expect(hasPermission('Analyst', 'analytics', 'export')).toBe(true)
      expect(hasPermission('Analyst', 'reports', 'export')).toBe(true)
    })

    test('Volunteer has minimal permissions', () => {
      expect(hasPermission('Volunteer', 'users', 'read')).toBe(false)
      expect(hasPermission('Volunteer', 'surveys', 'create')).toBe(true)
      expect(hasPermission('Volunteer', 'surveys', 'read')).toBe(true)
      expect(hasPermission('Volunteer', 'surveys', 'update')).toBe(false)
      expect(hasPermission('Volunteer', 'walklists', 'read')).toBe(true)
      expect(hasPermission('Volunteer', 'walklists', 'create')).toBe(false)
      expect(hasPermission('Volunteer', 'analytics', 'read')).toBe(false)
    })

    test('Invalid role returns false for all permissions', () => {
      // @ts-ignore - Testing with invalid role
      expect(hasPermission('invalid_role', 'surveys', 'read')).toBe(false)
      // @ts-ignore - Testing with invalid role
      expect(hasPermission('invalid_role', 'users', 'create')).toBe(false)
    })

    test('Invalid resource returns false', () => {
      expect(hasPermission('Admin', 'invalid_resource', 'read')).toBe(false)
      expect(hasPermission('Manager', 'invalid_resource', 'create')).toBe(false)
    })

    test('Invalid action returns false', () => {
      expect(hasPermission('Admin', 'surveys', 'invalid_action')).toBe(false)
      expect(hasPermission('Manager', 'users', 'invalid_action')).toBe(false)
    })
  })

  describe('Allowed Routes Helper', () => {
    test('Returns correct allowed routes for admin', () => {
      const allowedRoutes = getAllowedRoutes('Admin')
      expect(allowedRoutes).toContain('/admin')
      expect(allowedRoutes).toContain('/dashboard')
      expect(allowedRoutes).toContain('/analytics')
      expect(allowedRoutes).toContain('/survey')
      expect(allowedRoutes).toContain('/users')
      expect(allowedRoutes).toContain('/walklists')
      expect(allowedRoutes).toContain('/reports')
    })

    test('Returns correct allowed routes for manager', () => {
      const allowedRoutes = getAllowedRoutes('Manager')
      expect(allowedRoutes).not.toContain('/admin')
      expect(allowedRoutes).toContain('/dashboard')
      expect(allowedRoutes).toContain('/analytics')
      expect(allowedRoutes).toContain('/survey')
      expect(allowedRoutes).not.toContain('/users')
      expect(allowedRoutes).toContain('/walklists')
      expect(allowedRoutes).toContain('/reports')
    })

    test('Returns correct allowed routes for analyst', () => {
      const allowedRoutes = getAllowedRoutes('Analyst')
      expect(allowedRoutes).not.toContain('/admin')
      expect(allowedRoutes).toContain('/dashboard')
      expect(allowedRoutes).toContain('/analytics')
      expect(allowedRoutes).not.toContain('/survey')
      expect(allowedRoutes).not.toContain('/users')
      expect(allowedRoutes).not.toContain('/walklists')
      expect(allowedRoutes).toContain('/reports')
    })

    test('Returns correct allowed routes for volunteer', () => {
      const allowedRoutes = getAllowedRoutes('Volunteer')
      expect(allowedRoutes).not.toContain('/admin')
      expect(allowedRoutes).not.toContain('/dashboard')
      expect(allowedRoutes).not.toContain('/analytics')
      expect(allowedRoutes).toContain('/survey')
      expect(allowedRoutes).not.toContain('/users')
      expect(allowedRoutes).not.toContain('/walklists')
      expect(allowedRoutes).not.toContain('/reports')
    })
  })

  describe('ProtectedRoute Component', () => {
    test('Renders protected content for authorized role', () => {
      render(
        <ProtectedRoute allowedRoles={['Volunteer', 'Manager']}>
          <div>Protected Content</div>
        </ProtectedRoute>
      )

      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })

    test('Redirects unauthorized users', () => {
      const mockPush = jest.fn()
      mockUseRouter.mockReturnValue({
        push: mockPush,
        replace: jest.fn(),
        back: jest.fn(),
        forward: jest.fn(),
        refresh: jest.fn(),
        prefetch: jest.fn(),
      })

      render(
        <ProtectedRoute allowedRoles={['Admin']}>
          <div>Admin Only Content</div>
        </ProtectedRoute>
      )

      expect(screen.getByText('Redirecting to unauthorized...')).toBeInTheDocument()
      expect(mockPush).toHaveBeenCalledWith('/unauthorized')
    })
  })

  describe('Data Redaction Rules', () => {
    test('Admin has no data restrictions', () => {
      const { getDataRedactionRules } = require('@/lib/auth/permissions')
      const rules = getDataRedactionRules('Admin')
      
      expect(rules.excludePersonalData).toBe(false)
      expect(rules.excludeContactInfo).toBe(false)
      expect(rules.excludeLocationData).toBe(false)
      expect(rules.limitToOwnData).toBe(false)
    })

    test('Manager has no data restrictions', () => {
      const { getDataRedactionRules } = require('@/lib/auth/permissions')
      const rules = getDataRedactionRules('Manager')
      
      expect(rules.excludePersonalData).toBe(false)
      expect(rules.excludeContactInfo).toBe(false)
      expect(rules.excludeLocationData).toBe(false)
      expect(rules.limitToOwnData).toBe(false)
    })

    test('Analyst has personal data restrictions', () => {
      const { getDataRedactionRules } = require('@/lib/auth/permissions')
      const rules = getDataRedactionRules('Analyst')
      
      expect(rules.excludePersonalData).toBe(true)
      expect(rules.excludeContactInfo).toBe(true)
      expect(rules.excludeLocationData).toBe(false)
      expect(rules.limitToOwnData).toBe(false)
    })

    test('Volunteer has strict data restrictions', () => {
      const { getDataRedactionRules } = require('@/lib/auth/permissions')
      const rules = getDataRedactionRules('Volunteer')
      
      expect(rules.excludePersonalData).toBe(true)
      expect(rules.excludeContactInfo).toBe(true)
      expect(rules.excludeLocationData).toBe(true)
      expect(rules.limitToOwnData).toBe(true)
    })
  })

  describe('Role Display Helpers', () => {
    test('getRoleDisplayName returns Spanish names', () => {
      const { getRoleDisplayName } = require('@/lib/auth/permissions')
      
      expect(getRoleDisplayName('Admin')).toBe('Administrador')
      expect(getRoleDisplayName('Manager')).toBe('Gerente')
      expect(getRoleDisplayName('Analyst')).toBe('Analista')
      expect(getRoleDisplayName('Volunteer')).toBe('Voluntario')
    })

    test('getRoleDescription returns Spanish descriptions', () => {
      const { getRoleDescription } = require('@/lib/auth/permissions')
      
      expect(getRoleDescription('Admin')).toBe('Acceso completo a todas las funciones del sistema')
      expect(getRoleDescription('Manager')).toBe('Gestión operacional y asignación de usuarios')
      expect(getRoleDescription('Analyst')).toBe('Acceso de solo lectura a datos de encuestas y análisis')
      expect(getRoleDescription('Volunteer')).toBe('Acceso limitado para recopilar encuestas asignadas')
    })
  })

  describe('Permission Helper Functions', () => {
    test('canManageUsers works correctly', () => {
      const { canManageUsers } = require('@/lib/auth/permissions')
      
      expect(canManageUsers('Admin')).toBe(true)
      expect(canManageUsers('Manager')).toBe(true)
      expect(canManageUsers('Analyst')).toBe(false)
      expect(canManageUsers('Volunteer')).toBe(false)
    })

    test('canExportData works correctly', () => {
      const { canExportData } = require('@/lib/auth/permissions')
      
      expect(canExportData('Admin')).toBe(true)
      expect(canExportData('Manager')).toBe(true)
      expect(canExportData('Analyst')).toBe(true)
      expect(canExportData('Volunteer')).toBe(false)
    })

    test('canCreateSurveys works correctly', () => {
      const { canCreateSurveys } = require('@/lib/auth/permissions')
      
      expect(canCreateSurveys('Admin')).toBe(true)
      expect(canCreateSurveys('Manager')).toBe(true)
      expect(canCreateSurveys('Analyst')).toBe(false)
      expect(canCreateSurveys('Volunteer')).toBe(true)
    })

    test('canViewAnalytics works correctly', () => {
      const { canViewAnalytics } = require('@/lib/auth/permissions')
      
      expect(canViewAnalytics('Admin')).toBe(true)
      expect(canViewAnalytics('Manager')).toBe(true)
      expect(canViewAnalytics('Analyst')).toBe(true)
      expect(canViewAnalytics('Volunteer')).toBe(false)
    })
  })
})