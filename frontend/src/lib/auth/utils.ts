/**
 * Authentication utility functions
 */

import { Database } from '@/types/database'

type UserRole = Database['public']['Enums']['user_role']
type UserProfile = Database['public']['Tables']['users']['Row']

/**
 * Format user display name
 */
export function formatUserName(profile: UserProfile): string {
  if (!profile) return 'Usuario'
  return profile.nombre_completo || profile.email || 'Usuario'
}

/**
 * Get user initials for avatar
 */
export function getUserInitials(profile: UserProfile): string {
  if (!profile) return 'U'
  
  const name = profile.nombre_completo || profile.email || 'Usuario'
  const words = name.trim().split(' ')
  
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase()
  }
  
  return name[0]?.toUpperCase() || 'U'
}

/**
 * Check if user profile is complete
 */
export function isProfileComplete(profile: UserProfile): boolean {
  return !!(
    profile?.nombre_completo &&
    profile?.email &&
    profile?.rol &&
    profile?.tenant_id
  )
}

/**
 * Get user status
 */
export function getUserStatus(profile: UserProfile): {
  status: 'active' | 'inactive' | 'pending'
  message: string
} {
  if (!profile) {
    return { status: 'inactive', message: 'Perfil no encontrado' }
  }
  
  if (!profile.activo) {
    return { status: 'inactive', message: 'Cuenta inactiva' }
  }
  
  if (!isProfileComplete(profile)) {
    return { status: 'pending', message: 'Perfil incompleto' }
  }
  
  return { status: 'active', message: 'Activo' }
}

/**
 * Format last login date
 */
export function formatLastLogin(lastLogin: string | null): string {
  if (!lastLogin) return 'Nunca'
  
  const date = new Date(lastLogin)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffMinutes < 1) {
    return 'Ahora mismo'
  } else if (diffMinutes < 60) {
    return `Hace ${diffMinutes} minuto${diffMinutes !== 1 ? 's' : ''}`
  } else if (diffHours < 24) {
    return `Hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`
  } else if (diffDays < 7) {
    return `Hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`
  } else {
    return date.toLocaleDateString('es-PR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('La contraseña debe tener al menos 8 caracteres')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('La contraseña debe contener al menos una letra minúscula')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('La contraseña debe contener al menos una letra mayúscula')
  }
  
  if (!/\d/.test(password)) {
    errors.push('La contraseña debe contener al menos un número')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Get role badge color
 */
export function getRoleBadgeColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    Admin: 'bg-red-100 text-red-800 border-red-200',
    Manager: 'bg-blue-100 text-blue-800 border-blue-200',
    Analyst: 'bg-purple-100 text-purple-800 border-purple-200',
    Volunteer: 'bg-green-100 text-green-800 border-green-200',
  }
  
  return colors[role] || 'bg-gray-100 text-gray-800 border-gray-200'
}

/**
 * Get role icon (using Heroicons class names)
 */
export function getRoleIcon(role: UserRole): string {
  const icons: Record<UserRole, string> = {
    Admin: 'shield-check',
    Manager: 'user-group',
    Analyst: 'chart-bar',
    Volunteer: 'user',
  }
  
  return icons[role] || 'user'
}

/**
 * Sort users by role hierarchy
 */
export function sortUsersByRole(users: UserProfile[]): UserProfile[] {
  const roleOrder: Record<UserRole, number> = {
    Admin: 0,
    Manager: 1,
    Analyst: 2,
    Volunteer: 3,
  }
  
  return [...users].sort((a, b) => {
    const roleComparison = roleOrder[a.rol] - roleOrder[b.rol]
    if (roleComparison !== 0) return roleComparison
    
    // If same role, sort by name
    return a.nombre_completo.localeCompare(b.nombre_completo, 'es-PR')
  })
}

/**
 * Generate secure session identifier
 */
export function generateSessionId(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 15)
  return `${timestamp}-${randomPart}`
}

/**
 * Clean sensitive data for logging
 */
export function sanitizeUserData(profile: UserProfile): Partial<UserProfile> {
  return {
    id: profile.id,
    email: profile.email?.replace(/(.{2})[^@]*(@.*)/, '$1***$2'),
    nombre_completo: profile.nombre_completo,
    rol: profile.rol,
    activo: profile.activo,
    tenant_id: profile.tenant_id,
    ultimo_acceso: profile.ultimo_acceso,
  }
}

/**
 * Check if user can access tenant data
 */
export function canAccessTenant(userProfile: UserProfile, targetTenantId: string): boolean {
  // Admins can access any tenant data for their organization
  if (userProfile.rol === 'Admin') {
    return userProfile.tenant_id === targetTenantId
  }
  
  // All other roles can only access their own tenant
  return userProfile.tenant_id === targetTenantId
}

/**
 * Get navigation items based on user role
 */
export function getNavigationItems(role: UserRole) {
  const baseItems = [
    { name: 'Dashboard', href: '/dashboard', icon: 'home' }
  ]
  
  switch (role) {
    case 'Admin':
      return [
        ...baseItems,
        { name: 'Administración', href: '/admin', icon: 'cog-6-tooth' },
        { name: 'Usuarios', href: '/admin/users', icon: 'users' },
        { name: 'Analíticas', href: '/analytics', icon: 'chart-bar' },
        { name: 'Encuestas', href: '/surveys', icon: 'clipboard-document-list' },
        { name: 'Reportes', href: '/reports', icon: 'document-arrow-down' },
      ]
    
    case 'Manager':
      return [
        ...baseItems,
        { name: 'Analíticas', href: '/analytics', icon: 'chart-bar' },
        { name: 'Listas de Trabajo', href: '/walklists', icon: 'queue-list' },
        { name: 'Encuestas', href: '/surveys', icon: 'clipboard-document-list' },
        { name: 'Reportes', href: '/reports', icon: 'document-arrow-down' },
      ]
    
    case 'Analyst':
      return [
        ...baseItems,
        { name: 'Analíticas', href: '/analytics', icon: 'chart-bar' },
        { name: 'Reportes', href: '/reports', icon: 'document-arrow-down' },
      ]
    
    case 'Volunteer':
      return [
        ...baseItems,
        { name: 'Mis Encuestas', href: '/survey', icon: 'clipboard-document-list' },
      ]
    
    default:
      return baseItems
  }
}