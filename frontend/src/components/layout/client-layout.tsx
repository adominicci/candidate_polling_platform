'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { useAuth } from '@/hooks/use-auth'

interface ClientLayoutProps {
  children: React.ReactNode
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const { profile, signOut, isLoading } = useAuth()
  const [hasMounted, setHasMounted] = useState(false)

  // Prevent hydration mismatch by waiting for client-side mount
  useEffect(() => {
    setHasMounted(true)
  }, [])

  // Transform profile data to match Header's expected user prop
  const user = profile ? {
    full_name: profile.nombre_completo || profile.email,
    email: profile.email,
    role: profile.rol
  } : undefined

  // During SSR and initial hydration, render without user data
  if (!hasMounted) {
    return (
      <>
        <Header user={undefined} onSignOut={signOut} />
        <main className="flex-1">
          {children}
        </main>
      </>
    )
  }

  return (
    <>
      <Header user={user} onSignOut={signOut} />
      <main className="flex-1">
        {children}
      </main>
    </>
  )
}