'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database'

type UserProfile = Database['public']['Tables']['users']['Row']

export interface AuthFormData {
  email: string
  password: string
  remember?: boolean
}

export interface AuthResponse {
  success: boolean
  error?: string
  user?: UserProfile
}

/**
 * Server action for user authentication
 * Handles login with email/password and validates against users table
 */
export async function signInAction(formData: AuthFormData): Promise<AuthResponse> {
  const { email, password } = formData
  
  if (!email || !password) {
    return {
      success: false,
      error: 'Email y contraseña son requeridos'
    }
  }

  const supabase = await createClient()

  try {
    // Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    })

    if (authError) {
      console.error('Auth error:', authError)
      
      // Provide user-friendly error messages in Spanish
      let errorMessage = 'Error de autenticación'
      
      if (authError.message.includes('Invalid login credentials')) {
        errorMessage = 'Credenciales incorrectas. Verifica tu email y contraseña.'
      } else if (authError.message.includes('Email not confirmed')) {
        errorMessage = 'Email no confirmado. Contacta al administrador.'
      } else if (authError.message.includes('Too many requests')) {
        errorMessage = 'Demasiados intentos. Espera unos minutos antes de intentar nuevamente.'
      } else if (authError.message.includes('User not found')) {
        errorMessage = 'Usuario no encontrado. Contacta al administrador.'
      }

      return {
        success: false,
        error: errorMessage
      }
    }

    if (!authData.user) {
      return {
        success: false,
        error: 'Error de autenticación'
      }
    }

    // Verify user exists in our users table and is active
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .eq('is_active', true)
      .single()

    if (profileError || !userProfile) {
      console.error('Profile error:', profileError)
      
      // Sign out the user from auth since they don't have a valid profile
      await supabase.auth.signOut()
      
      return {
        success: false,
        error: 'Usuario no encontrado o inactivo. Contacta al administrador.'
      }
    }

    // Update last login timestamp
    await supabase
      .from('users')
      .update({ 
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', authData.user.id)

    revalidatePath('/', 'layout')

    return {
      success: true,
      user: userProfile
    }

  } catch (error) {
    console.error('SignIn action error:', error)
    return {
      success: false,
      error: 'Error interno del servidor. Intenta nuevamente.'
    }
  }
}

/**
 * Server action for user sign out
 */
export async function signOutAction(): Promise<void> {
  const supabase = await createClient()
  
  try {
    await supabase.auth.signOut()
  } catch (error) {
    console.error('SignOut error:', error)
  }
  
  revalidatePath('/', 'layout')
  redirect('/login')
}

/**
 * Get current authenticated user profile
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  const supabase = await createClient()

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return null
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .eq('is_active', true)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      return null
    }

    return userProfile

  } catch (error) {
    console.error('Error in getCurrentUser:', error)
    return null
  }
}

/**
 * Check if current user has specific role
 */
export async function hasRole(role: Database['public']['Enums']['user_role'] | Database['public']['Enums']['user_role'][]): Promise<boolean> {
  const user = await getCurrentUser()
  
  if (!user) return false
  
  if (Array.isArray(role)) {
    return role.includes(user.rol)
  }
  
  return user.rol === role
}

/**
 * Check if current user has access to specific tenant
 */
export async function hasTenantAccess(tenantId: string): Promise<boolean> {
  const user = await getCurrentUser()
  
  if (!user) return false
  
  return user.tenant_id === tenantId
}

/**
 * Redirect based on user role
 */
export async function getRedirectPath(): Promise<string> {
  const user = await getCurrentUser()
  
  if (!user) return '/login'
  
  // Redirect based on role
  switch (user.rol) {
    case 'Admin':
      return '/admin'
    case 'Manager':
      return '/dashboard'
    case 'Analyst':
      return '/analytics'
    case 'Volunteer':
      return '/survey'
    default:
      return '/dashboard'
  }
}