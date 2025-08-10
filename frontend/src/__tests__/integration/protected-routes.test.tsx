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
  const mockUser = { role: 'volunteer' } // This would come from actual auth context
  
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
      expect(canAccessRoute('admin', '/admin')).toBe(true)
      expect(canAccessRoute('admin', '/dashboard')).toBe(true)
      expect(canAccessRoute('admin', '/analytics')).toBe(true)
      expect(canAccessRoute('admin', '/survey')).toBe(true)
      expect(canAccessRoute('admin', '/users')).toBe(true)
      expect(canAccessRoute('admin', '/walklists')).toBe(true)
      expect(canAccessRoute('admin', '/reports')).toBe(true)
    })

    test('Manager can access appropriate routes', () => {
      expect(canAccessRoute('manager', '/admin')).toBe(false)
      expect(canAccessRoute('manager', '/dashboard')).toBe(true)
      expect(canAccessRoute('manager', '/analytics')).toBe(true)
      expect(canAccessRoute('manager', '/survey')).toBe(true)
      expect(canAccessRoute('manager', '/users')).toBe(false)
      expect(canAccessRoute('manager', '/walklists')).toBe(true)
      expect(canAccessRoute('manager', '/reports')).toBe(true)
    })

    test('Analyst can access read-only routes', () => {
      expect(canAccessRoute('analyst', '/admin')).toBe(false)
      expect(canAccessRoute('analyst', '/dashboard')).toBe(true)
      expect(canAccessRoute('analyst', '/analytics')).toBe(true)
      expect(canAccessRoute('analyst', '/survey')).toBe(false)
      expect(canAccessRoute('analyst', '/users')).toBe(false)
      expect(canAccessRoute('analyst', '/walklists')).toBe(false)
      expect(canAccessRoute('analyst', '/reports')).toBe(true)
    })

    test('Volunteer has limited access', () => {
      expect(canAccessRoute('volunteer', '/admin')).toBe(false)
      expect(canAccessRoute('volunteer', '/dashboard')).toBe(false)
      expect(canAccessRoute('volunteer', '/analytics')).toBe(false)
      expect(canAccessRoute('volunteer', '/survey')).toBe(true)
      expect(canAccessRoute('volunteer', '/users')).toBe(false)
      expect(canAccessRoute('volunteer', '/walklists')).toBe(false)
      expect(canAccessRoute('volunteer', '/reports')).toBe(false)
    })

    test('Wildcard route patterns work correctly', () => {
      expect(canAccessRoute('admin', '/admin/users')).toBe(true)
      expect(canAccessRoute('admin', '/admin/settings')).toBe(true)
      expect(canAccessRoute('admin', '/dashboard/analytics')).toBe(true)
      expect(canAccessRoute('volunteer', '/survey/new')).toBe(true)
      expect(canAccessRoute('volunteer', '/survey/123')).toBe(true)
      expect(canAccessRoute('volunteer', '/admin/anything')).toBe(false)
    })
  })

  describe('Permission System', () => {
    test('Admin has full permissions on all resources', () => {
      expect(hasPermission('admin', 'users', 'create')).toBe(true)
      expect(hasPermission('admin', 'users', 'read')).toBe(true)
      expect(hasPermission('admin', 'users', 'update')).toBe(true)
      expect(hasPermission('admin', 'users', 'delete')).toBe(true)
      expect(hasPermission('admin', 'surveys', 'create')).toBe(true)
      expect(hasPermission('admin', 'analytics', 'export')).toBe(true)
    })

    test('Manager has operational permissions', () => {
      expect(hasPermission('manager', 'users', 'create')).toBe(false)
      expect(hasPermission('manager', 'users', 'read')).toBe(true)
      expect(hasPermission('manager', 'users', 'update')).toBe(true)
      expect(hasPermission('manager', 'users', 'delete')).toBe(false)
      expect(hasPermission('manager', 'surveys', 'create')).toBe(true)
      expect(hasPermission('manager', 'walklists', 'create')).toBe(true)
      expect(hasPermission('manager', 'analytics', 'export')).toBe(true)
    })

    test('Analyst has read-only permissions', () => {
      expect(hasPermission('analyst', 'users', 'create')).toBe(false)
      expect(hasPermission('analyst', 'users', 'read')).toBe(false)
      expect(hasPermission('analyst', 'surveys', 'read')).toBe(true)
      expect(hasPermission('analyst', 'surveys', 'create')).toBe(false)
      expect(hasPermission('analyst', 'analytics', 'read')).toBe(true)
      expect(hasPermission('analyst', 'analytics', 'export')).toBe(true)
      expect(hasPermission('analyst', 'reports', 'export')).toBe(true)
    })

    test('Volunteer has minimal permissions', () => {
      expect(hasPermission('volunteer', 'users', 'read')).toBe(false)
      expect(hasPermission('volunteer', 'surveys', 'create')).toBe(true)
      expect(hasPermission('volunteer', 'surveys', 'read')).toBe(true)
      expect(hasPermission('volunteer', 'surveys', 'update')).toBe(false)
      expect(hasPermission('volunteer', 'walklists', 'read')).toBe(true)
      expect(hasPermission('volunteer', 'walklists', 'create')).toBe(false)
      expect(hasPermission('volunteer', 'analytics', 'read')).toBe(false)
    })

    test('Invalid role returns false for all permissions', () => {
      // @ts-ignore - Testing with invalid role
      expect(hasPermission('invalid_role', 'surveys', 'read')).toBe(false)
      // @ts-ignore - Testing with invalid role
      expect(hasPermission('invalid_role', 'users', 'create')).toBe(false)
    })

    test('Invalid resource returns false', () => {
      expect(hasPermission('admin', 'invalid_resource', 'read')).toBe(false)
      expect(hasPermission('manager', 'invalid_resource', 'create')).toBe(false)
    })

    test('Invalid action returns false', () => {
      expect(hasPermission('admin', 'surveys', 'invalid_action')).toBe(false)
      expect(hasPermission('manager', 'users', 'invalid_action')).toBe(false)
    })
  })

  describe('Allowed Routes Helper', () => {
    test('Returns correct allowed routes for admin', () => {
      const allowedRoutes = getAllowedRoutes('admin')
      expect(allowedRoutes).toContain('/admin')
      expect(allowedRoutes).toContain('/dashboard')
      expect(allowedRoutes).toContain('/analytics')
      expect(allowedRoutes).toContain('/survey')
      expect(allowedRoutes).toContain('/users')
      expect(allowedRoutes).toContain('/walklists')
      expect(allowedRoutes).toContain('/reports')
    })

    test('Returns correct allowed routes for manager', () => {
      const allowedRoutes = getAllowedRoutes('manager')
      expect(allowedRoutes).not.toContain('/admin')
      expect(allowedRoutes).toContain('/dashboard')
      expect(allowedRoutes).toContain('/analytics')
      expect(allowedRoutes).toContain('/survey')
      expect(allowedRoutes).not.toContain('/users')
      expect(allowedRoutes).toContain('/walklists')
      expect(allowedRoutes).toContain('/reports')
    })

    test('Returns correct allowed routes for analyst', () => {
      const allowedRoutes = getAllowedRoutes('analyst')
      expect(allowedRoutes).not.toContain('/admin')
      expect(allowedRoutes).toContain('/dashboard')
      expect(allowedRoutes).toContain('/analytics')
      expect(allowedRoutes).not.toContain('/survey')
      expect(allowedRoutes).not.toContain('/users')
      expect(allowedRoutes).not.toContain('/walklists')
      expect(allowedRoutes).toContain('/reports')
    })

    test('Returns correct allowed routes for volunteer', () => {
      const allowedRoutes = getAllowedRoutes('volunteer')
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
        <ProtectedRoute allowedRoles={['volunteer', 'manager']}>
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
        <ProtectedRoute allowedRoles={['admin']}>
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
      const rules = getDataRedactionRules('admin')
      
      expect(rules.excludePersonalData).toBe(false)
      expect(rules.excludeContactInfo).toBe(false)
      expect(rules.excludeLocationData).toBe(false)
      expect(rules.limitToOwnData).toBe(false)
    })

    test('Manager has no data restrictions', () => {
      const { getDataRedactionRules } = require('@/lib/auth/permissions')
      const rules = getDataRedactionRules('manager')
      
      expect(rules.excludePersonalData).toBe(false)
      expect(rules.excludeContactInfo).toBe(false)
      expect(rules.excludeLocationData).toBe(false)
      expect(rules.limitToOwnData).toBe(false)
    })

    test('Analyst has personal data restrictions', () => {
      const { getDataRedactionRules } = require('@/lib/auth/permissions')
      const rules = getDataRedactionRules('analyst')
      
      expect(rules.excludePersonalData).toBe(true)
      expect(rules.excludeContactInfo).toBe(true)
      expect(rules.excludeLocationData).toBe(false)
      expect(rules.limitToOwnData).toBe(false)
    })

    test('Volunteer has strict data restrictions', () => {
      const { getDataRedactionRules } = require('@/lib/auth/permissions')
      const rules = getDataRedactionRules('volunteer')
      
      expect(rules.excludePersonalData).toBe(true)
      expect(rules.excludeContactInfo).toBe(true)
      expect(rules.excludeLocationData).toBe(true)
      expect(rules.limitToOwnData).toBe(true)
    })
  })

  describe('Role Display Helpers', () => {
    test('getRoleDisplayName returns Spanish names', () => {
      const { getRoleDisplayName } = require('@/lib/auth/permissions')
      
      expect(getRoleDisplayName('admin')).toBe('Administrador')
      expect(getRoleDisplayName('manager')).toBe('Gerente')
      expect(getRoleDisplayName('analyst')).toBe('Analista')
      expect(getRoleDisplayName('volunteer')).toBe('Voluntario')
    })

    test('getRoleDescription returns Spanish descriptions', () => {
      const { getRoleDescription } = require('@/lib/auth/permissions')
      
      expect(getRoleDescription('admin')).toBe('Acceso completo a todas las funciones del sistema')
      expect(getRoleDescription('manager')).toBe('Gestión operacional y asignación de usuarios')
      expect(getRoleDescription('analyst')).toBe('Acceso de solo lectura a datos de encuestas y análisis')
      expect(getRoleDescription('volunteer')).toBe('Acceso limitado para recopilar encuestas asignadas')
    })
  })

  describe('Permission Helper Functions', () => {
    test('canManageUsers works correctly', () => {
      const { canManageUsers } = require('@/lib/auth/permissions')
      
      expect(canManageUsers('admin')).toBe(true)
      expect(canManageUsers('manager')).toBe(true)
      expect(canManageUsers('analyst')).toBe(false)
      expect(canManageUsers('volunteer')).toBe(false)
    })

    test('canExportData works correctly', () => {
      const { canExportData } = require('@/lib/auth/permissions')
      
      expect(canExportData('admin')).toBe(true)
      expect(canExportData('manager')).toBe(true)
      expect(canExportData('analyst')).toBe(true)
      expect(canExportData('volunteer')).toBe(false)
    })

    test('canCreateSurveys works correctly', () => {
      const { canCreateSurveys } = require('@/lib/auth/permissions')
      
      expect(canCreateSurveys('admin')).toBe(true)
      expect(canCreateSurveys('manager')).toBe(true)
      expect(canCreateSurveys('analyst')).toBe(false)
      expect(canCreateSurveys('volunteer')).toBe(true)
    })

    test('canViewAnalytics works correctly', () => {
      const { canViewAnalytics } = require('@/lib/auth/permissions')
      
      expect(canViewAnalytics('admin')).toBe(true)
      expect(canViewAnalytics('manager')).toBe(true)
      expect(canViewAnalytics('analyst')).toBe(true)
      expect(canViewAnalytics('volunteer')).toBe(false)
    })
  })
})