'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import { cx } from '@/lib/utils/cx'
import { Button } from '@/components/ui/button'

export interface HeaderProps {
  user?: {
    full_name: string
    email: string
    role: string
  }
  onSignOut?: () => void
}

const Header = ({ user, onSignOut }: HeaderProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const pathname = usePathname()

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', roles: ['admin', 'manager', 'analyst'] },
    { name: 'Encuestas', href: '/survey', roles: ['admin', 'manager', 'volunteer'] },
    { name: 'Analíticas', href: '/analytics', roles: ['admin', 'manager', 'analyst'] },
    { name: 'Administración', href: '/admin', roles: ['admin'] },
  ]

  const filteredNavigation = user 
    ? navigation.filter(item => item.roles.includes(user.role))
    : []

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Top">
        <div className="flex w-full items-center justify-between py-4">
          {/* Logo */}
          <div className="flex items-center">
            <Link href={user ? "/dashboard" : "/"} className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">PPD</span>
                </div>
                <span className="ml-3 text-lg font-semibold text-gray-900 hidden sm:block">
                  Consulta Electoral
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-6">
            {filteredNavigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cx(
                  'text-sm font-medium transition-colors duration-200',
                  pathname.startsWith(item.href)
                    ? 'text-primary border-b-2 border-primary pb-1'
                    : 'text-gray-600 hover:text-primary'
                )}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <div className="hidden sm:flex sm:flex-col sm:items-end">
                  <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSignOut}
                  className="text-gray-600 hover:text-gray-900"
                >
                  Cerrar Sesión
                </Button>
              </div>
            ) : (
              <Button asChild>
                <Link href="/login">Iniciar Sesión</Link>
              </Button>
            )}

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Abrir menú principal"
              >
                {mobileMenuOpen ? (
                  <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                ) : (
                  <Bars3Icon className="h-6 w-6" aria-hidden="true" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="space-y-1">
              {filteredNavigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cx(
                    'block px-3 py-2 text-base font-medium rounded-md transition-colors duration-200',
                    pathname.startsWith(item.href)
                      ? 'text-primary bg-primary/10'
                      : 'text-gray-600 hover:text-primary hover:bg-gray-50'
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </div>
            
            {/* Mobile user info */}
            {user && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="px-3 py-2">
                  <p className="text-base font-medium text-gray-900">{user.full_name}</p>
                  <p className="text-sm text-gray-500 capitalize">{user.role}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </nav>
    </header>
  )
}

export { Header }