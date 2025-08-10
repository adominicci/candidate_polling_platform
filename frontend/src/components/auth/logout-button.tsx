'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'

interface LogoutButtonProps {
  className?: string
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  showIcon?: boolean
  children?: React.ReactNode
}

export function LogoutButton({ 
  className,
  variant = 'ghost',
  size = 'default',
  showIcon = true,
  children 
}: LogoutButtonProps) {
  const router = useRouter()
  const { signOut } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    if (isLoggingOut) return

    setIsLoggingOut(true)

    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      // Even if there's an error, redirect to login to clear state
      router.push('/login')
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <Button
      onClick={handleLogout}
      variant={variant}
      size={size}
      className={className}
      disabled={isLoggingOut}
    >
      {isLoggingOut ? (
        <div className="flex items-center">
          <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
          Cerrando...
        </div>
      ) : (
        <div className="flex items-center">
          {showIcon && <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />}
          {children || 'Cerrar Sesión'}
        </div>
      )}
    </Button>
  )
}