'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { canAccessRoute } from '@/lib/auth/permissions'
import { Database } from '@/types/database'

type UserRole = Database['public']['Enums']['user_role']

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
  requiredRole?: UserRole
  fallback?: React.ReactNode
  redirectTo?: string
}

export function ProtectedRoute({
  children,
  allowedRoles,
  requiredRole,
  fallback = null,
  redirectTo
}: ProtectedRouteProps) {
  const router = useRouter()
  const { user, profile, isLoading } = useAuth()

  useEffect(() => {
    if (isLoading) return

    // Redirect to login if not authenticated
    if (!user || !profile) {
      router.push('/login')
      return
    }

    // Check specific role requirement
    if (requiredRole && profile.role !== requiredRole) {
      router.push(redirectTo || '/unauthorized')
      return
    }

    // Check allowed roles
    if (allowedRoles && !allowedRoles.includes(profile.role)) {
      router.push(redirectTo || '/unauthorized')
      return
    }

    // Check route access permissions
    const currentPath = window.location.pathname
    if (!canAccessRoute(profile.role, currentPath)) {
      router.push(redirectTo || '/unauthorized')
      return
    }

  }, [user, profile, isLoading, requiredRole, allowedRoles, redirectTo, router])

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando acceso...</p>
        </div>
      </div>
    )
  }

  // Show fallback if not authenticated or authorized
  if (!user || !profile) {
    return fallback
  }

  // Check role-based access
  if (requiredRole && profile.role !== requiredRole) {
    return fallback
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return fallback
  }

  // Check route permissions
  const currentPath = window.location.pathname
  if (!canAccessRoute(profile.role, currentPath)) {
    return fallback
  }

  return <>{children}</>
}

/**
 * Higher-order component for protecting pages
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<ProtectedRouteProps, 'children'>
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    )
  }
}

/**
 * Role-based content rendering
 */
interface RoleGuardProps {
  role: UserRole | UserRole[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RoleGuard({ role, children, fallback = null }: RoleGuardProps) {
  const { profile } = useAuth()

  if (!profile) return fallback

  const hasRole = Array.isArray(role) 
    ? role.includes(profile.role)
    : profile.role === role

  return hasRole ? <>{children}</> : <>{fallback}</>
}