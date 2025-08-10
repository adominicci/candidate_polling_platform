'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/use-auth'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

interface LoginFormData {
  email: string
  password: string
  remember: boolean
}

export function LoginForm() {
  const router = useRouter()
  const { signIn, isLoading } = useAuth()
  
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    remember: false,
  })
  
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    
    // Clear error when user starts typing
    if (error) setError(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (isSubmitting || isLoading) return

    // Basic validation
    if (!formData.email.trim()) {
      setError('El email es requerido')
      return
    }
    
    if (!formData.password) {
      setError('La contraseña es requerida')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const { error: signInError } = await signIn(formData.email, formData.password)
      
      if (signInError) {
        setError(signInError.message)
        setIsSubmitting(false)
        return
      }

      // Success - redirect will happen automatically via auth context
      // The redirect is handled by the middleware based on user role
      router.push('/dashboard')
      
    } catch (err) {
      console.error('Login error:', err)
      setError('Error inesperado. Intenta nuevamente.')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Email Field */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          Correo Electrónico *
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleInputChange}
          autoComplete="email"
          required
          placeholder="tu.email@example.com"
          className={error && !formData.email.trim() ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
          disabled={isSubmitting || isLoading}
        />
      </div>

      {/* Password Field */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
          Contraseña *
        </label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleInputChange}
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className={error && !formData.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500 pr-10' : 'pr-10'}
            disabled={isSubmitting || isLoading}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center pr-3"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isSubmitting || isLoading}
          >
            {showPassword ? (
              <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            ) : (
              <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Remember Me & Forgot Password */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <input
            id="remember"
            name="remember"
            type="checkbox"
            checked={formData.remember}
            onChange={handleInputChange}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            disabled={isSubmitting || isLoading}
          />
          <label htmlFor="remember" className="ml-2 block text-sm text-gray-700">
            Recordarme
          </label>
        </div>

        <div className="text-sm">
          <a
            href="/auth/forgot-password"
            className="text-primary-600 hover:text-primary-500 font-medium"
            tabIndex={isSubmitting || isLoading ? -1 : 0}
          >
            ¿Olvidaste tu contraseña?
          </a>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <div className="text-sm text-red-700">
            {error}
          </div>
        </div>
      )}

      {/* Submit Button */}
      <Button 
        type="submit" 
        className="w-full" 
        size="lg"
        disabled={isSubmitting || isLoading}
      >
        {isSubmitting || isLoading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin -ml-1 mr-3 h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
            Iniciando sesión...
          </div>
        ) : (
          'Iniciar Sesión'
        )}
      </Button>

      {/* Demo Accounts (for development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <p className="text-xs font-medium text-gray-700 mb-2">Cuentas de prueba:</p>
          <div className="text-xs text-gray-600 space-y-1">
            <div>Admin: admin@ppd.pr</div>
            <div>Voluntario: volunteer@ppd.pr</div>
            <div>Contraseña: password123</div>
          </div>
        </div>
      )}
    </form>
  )
}