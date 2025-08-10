'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, AuthError } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'

type UserProfile = Database['public']['Tables']['users']['Row']
type UserRole = Database['public']['Enums']['user_role']

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  hasRole: (role: UserRole | UserRole[]) => boolean
  hasTenantAccess: (tenantId: string) => boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Validate environment variables in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        console.error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
      }
      if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
      }
    }
  }, [])
  
  const supabase = createClient()

  // Fetch user profile from our custom users table
  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', userId)
        .eq('activo', true)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
        return null
      }

      // Update ultimo_acceso 
      await supabase
        .from('users')
        .update({ ultimo_acceso: new Date().toISOString() })
        .eq('auth_user_id', userId)

      return data
    } catch (error) {
      console.error('Error in fetchUserProfile:', error)
      return null
    }
  }

  // Sign in function
  const signIn = async (email: string, password: string) => {
    setIsLoading(true)
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    })

    if (error) {
      setIsLoading(false)
      return { error }
    }

    if (data.user) {
      const userProfile = await fetchUserProfile(data.user.id)
      if (!userProfile) {
        // User exists in auth but not in our users table or is inactive
        await supabase.auth.signOut()
        setIsLoading(false)
        return { 
          error: {
            message: 'Usuario no encontrado o inactivo. Contacta al administrador.',
            name: 'UserNotFound',
            status: 403
          } as AuthError 
        }
      }
      
      setUser(data.user)
      setProfile(userProfile)
    }

    setIsLoading(false)
    return { error: null }
  }

  // Sign out function
  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  // Check if user has specific role(s)
  const hasRole = (role: UserRole | UserRole[]): boolean => {
    if (!profile) return false
    
    if (Array.isArray(role)) {
      return role.includes(profile.rol)
    }
    
    return profile.rol === role
  }

  // Check if user has access to specific tenant
  const hasTenantAccess = (tenantId: string): boolean => {
    if (!profile) return false
    return profile.tenant_id === tenantId
  }

  // Refresh profile data
  const refreshProfile = async () => {
    if (!user) return
    
    const userProfile = await fetchUserProfile(user.id)
    if (userProfile) {
      setProfile(userProfile)
    }
  }

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      const { data: { user: initialUser } } = await supabase.auth.getUser()
      
      if (initialUser) {
        const userProfile = await fetchUserProfile(initialUser.id)
        if (userProfile) {
          setUser(initialUser)
          setProfile(userProfile)
        } else {
          // User exists in auth but not in users table - sign them out
          await supabase.auth.signOut()
        }
      }
      
      setIsLoading(false)
    }

    initAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const userProfile = await fetchUserProfile(session.user.id)
          if (userProfile) {
            setUser(session.user)
            setProfile(userProfile)
          } else {
            await supabase.auth.signOut()
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
        }
        setIsLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const value: AuthContextType = {
    user,
    profile,
    isLoading,
    signIn,
    signOut,
    hasRole,
    hasTenantAccess,
    refreshProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider')
  }
  return context
}