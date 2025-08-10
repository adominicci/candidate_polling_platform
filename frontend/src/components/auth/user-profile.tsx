'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { getRoleDisplayName } from '@/lib/auth/permissions'
import { LogoutButton } from './logout-button'
import { Button } from '@/components/ui/button'
import { 
  UserCircleIcon, 
  BuildingOfficeIcon, 
  ClockIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'

interface UserProfileProps {
  showDropdown?: boolean
  compact?: boolean
}

export function UserProfile({ showDropdown = true, compact = false }: UserProfileProps) {
  const { profile, user, isLoading } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="animate-pulse flex items-center space-x-2">
        <div className="h-8 w-8 bg-gray-300 rounded-full"></div>
        <div className="h-4 w-24 bg-gray-300 rounded"></div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <UserCircleIcon className="h-6 w-6 text-gray-600" />
        <span className="text-sm font-medium text-gray-700 truncate">
          {profile.full_name}
        </span>
      </div>
    )
  }

  return (
    <div className="relative">
      {showDropdown ? (
        <>
          <Button
            variant="ghost"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-100 w-full"
          >
            <UserCircleIcon className="h-8 w-8 text-gray-600" />
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate">
                {profile.full_name}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {getRoleDisplayName(profile.role)}
              </p>
            </div>
            <ChevronDownIcon className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>

          {/* Dropdown Menu */}
          {isOpen && (
            <>
              {/* Overlay */}
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setIsOpen(false)}
              />
              
              {/* Menu */}
              <div className="absolute right-0 mt-1 w-64 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <UserCircleIcon className="h-10 w-10 text-gray-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {profile.full_name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center text-xs text-gray-500">
                      <BuildingOfficeIcon className="h-3 w-3 mr-1" />
                      <span className="capitalize">{getRoleDisplayName(profile.role)}</span>
                    </div>
                    {profile.last_login_at && (
                      <div className="flex items-center text-xs text-gray-500">
                        <ClockIcon className="h-3 w-3 mr-1" />
                        <span>
                          Último acceso: {new Date(profile.last_login_at).toLocaleDateString('es-PR')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start mb-1"
                    onClick={() => {
                      setIsOpen(false)
                      // Navigate to profile page when implemented
                    }}
                  >
                    <UserCircleIcon className="h-4 w-4 mr-2" />
                    Mi Perfil
                  </Button>
                  
                  <LogoutButton
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                  />
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        <div className="flex items-center space-x-3 p-3">
          <UserCircleIcon className="h-10 w-10 text-gray-600" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {profile.full_name}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user.email}
            </p>
            <p className="text-xs text-gray-500">
              {getRoleDisplayName(profile.role)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}