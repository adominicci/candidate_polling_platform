/**
 * Role-based permission system for Candidate Polling Platform
 * Defines what each role can access and perform
 */

import { Database } from '@/types/database'

type UserRole = Database['public']['Enums']['user_role']

export interface Permission {
  resource: string
  actions: string[]
}

export interface RolePermissions {
  [key: string]: Permission[]
}

/**
 * Define permissions for each role
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  Admin: [
    // Full access to everything
    { resource: 'users', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'tenants', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'questionnaires', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'surveys', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'analytics', actions: ['read', 'export'] },
    { resource: 'precincts', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'walklists', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'reports', actions: ['read', 'export', 'share'] },
  ],
  
  Manager: [
    // Operational management, user assignment
    { resource: 'users', actions: ['read', 'update'] },
    { resource: 'questionnaires', actions: ['read', 'update'] },
    { resource: 'surveys', actions: ['create', 'read', 'update'] },
    { resource: 'analytics', actions: ['read', 'export'] },
    { resource: 'precincts', actions: ['read'] },
    { resource: 'walklists', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'reports', actions: ['read', 'export'] },
  ],
  
  Analyst: [
    // Read-only access to survey data and analytics
    { resource: 'surveys', actions: ['read'] },
    { resource: 'analytics', actions: ['read', 'export'] },
    { resource: 'precincts', actions: ['read'] },
    { resource: 'questionnaires', actions: ['read'] },
    { resource: 'reports', actions: ['read', 'export'] },
  ],
  
  Volunteer: [
    // Limited access to assigned walklists and survey submission
    { resource: 'surveys', actions: ['create', 'read'] },
    { resource: 'walklists', actions: ['read'] },
    { resource: 'questionnaires', actions: ['read'] },
  ],
}

/**
 * Route access control based on roles
 */
export const ROUTE_ACCESS: Record<string, UserRole[]> = {
  // Admin routes
  '/admin': ['Admin'],
  '/admin/*': ['Admin'],
  
  // Manager routes
  '/dashboard': ['Admin', 'Manager', 'Analyst'],
  '/dashboard/*': ['Admin', 'Manager', 'Analyst'],
  
  // Analytics routes
  '/analytics': ['Admin', 'Manager', 'Analyst'],
  '/analytics/*': ['Admin', 'Manager', 'Analyst'],
  
  // Survey routes
  '/survey': ['Admin', 'Manager', 'Volunteer'],
  '/survey/*': ['Admin', 'Manager', 'Volunteer'],
  
  // Walklist management
  '/walklists': ['Admin', 'Manager'],
  '/walklists/*': ['Admin', 'Manager'],
  
  // User management
  '/users': ['Admin'],
  '/users/*': ['Admin'],
  
  // Reports
  '/reports': ['Admin', 'Manager', 'Analyst'],
  '/reports/*': ['Admin', 'Manager', 'Analyst'],
}

/**
 * Check if a role has permission to perform an action on a resource
 */
export function hasPermission(
  userRole: UserRole,
  resource: string,
  action: string
): boolean {
  const permissions = ROLE_PERMISSIONS[userRole]
  
  if (!permissions) return false
  
  const resourcePermission = permissions.find(p => p.resource === resource)
  
  if (!resourcePermission) return false
  
  return resourcePermission.actions.includes(action)
}

/**
 * Check if a role can access a specific route
 */
export function canAccessRoute(userRole: UserRole, route: string): boolean {
  // Check exact route match first
  if (ROUTE_ACCESS[route]) {
    return ROUTE_ACCESS[route].includes(userRole)
  }
  
  // Check for wildcard matches
  for (const [routePattern, allowedRoles] of Object.entries(ROUTE_ACCESS)) {
    if (routePattern.endsWith('/*')) {
      const baseRoute = routePattern.slice(0, -2)
      if (route.startsWith(baseRoute)) {
        return allowedRoles.includes(userRole)
      }
    }
  }
  
  return false
}

/**
 * Get allowed routes for a role
 */
export function getAllowedRoutes(userRole: UserRole): string[] {
  const allowedRoutes: string[] = []
  
  for (const [route, allowedRoles] of Object.entries(ROUTE_ACCESS)) {
    if (allowedRoles.includes(userRole)) {
      allowedRoutes.push(route)
    }
  }
  
  return allowedRoutes
}

/**
 * Get role display name in Spanish
 */
export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    Admin: 'Administrador',
    Manager: 'Gerente',
    Analyst: 'Analista',
    Volunteer: 'Voluntario',
  }
  
  return roleNames[role] || role
}

/**
 * Get role description in Spanish
 */
export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    Admin: 'Acceso completo a todas las funciones del sistema',
    Manager: 'Gestión operacional y asignación de usuarios',
    Analyst: 'Acceso de solo lectura a datos de encuestas y análisis',
    Volunteer: 'Acceso limitado para recopilar encuestas asignadas',
  }
  
  return descriptions[role] || ''
}

/**
 * Check if role can manage users
 */
export function canManageUsers(role: UserRole): boolean {
  return hasPermission(role, 'users', 'create') || hasPermission(role, 'users', 'update')
}

/**
 * Check if role can export data
 */
export function canExportData(role: UserRole): boolean {
  return hasPermission(role, 'analytics', 'export') || hasPermission(role, 'reports', 'export')
}

/**
 * Check if role can create surveys
 */
export function canCreateSurveys(role: UserRole): boolean {
  return hasPermission(role, 'surveys', 'create')
}

/**
 * Check if role can view analytics
 */
export function canViewAnalytics(role: UserRole): boolean {
  return hasPermission(role, 'analytics', 'read')
}

/**
 * Data redaction rules based on role
 */
export interface RedactionRules {
  excludePersonalData: boolean
  excludeContactInfo: boolean
  excludeLocationData: boolean
  limitToOwnData: boolean
}

export function getDataRedactionRules(role: UserRole): RedactionRules {
  switch (role) {
    case 'Admin':
      return {
        excludePersonalData: false,
        excludeContactInfo: false,
        excludeLocationData: false,
        limitToOwnData: false,
      }
    
    case 'Manager':
      return {
        excludePersonalData: false,
        excludeContactInfo: false,
        excludeLocationData: false,
        limitToOwnData: false,
      }
    
    case 'Analyst':
      return {
        excludePersonalData: true,
        excludeContactInfo: true,
        excludeLocationData: false,
        limitToOwnData: false,
      }
    
    case 'Volunteer':
      return {
        excludePersonalData: true,
        excludeContactInfo: true,
        excludeLocationData: true,
        limitToOwnData: true,
      }
    
    default:
      return {
        excludePersonalData: true,
        excludeContactInfo: true,
        excludeLocationData: true,
        limitToOwnData: true,
      }
  }
}