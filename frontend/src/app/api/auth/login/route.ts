import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

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
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: 401 }
      )
    }

    if (!authData.user || !authData.session) {
      return NextResponse.json(
        { error: 'Error de autenticación' },
        { status: 401 }
      )
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
      
      return NextResponse.json(
        { error: 'Usuario no encontrado o inactivo. Contacta al administrador.' },
        { status: 403 }
      )
    }

    // Update last login timestamp
    await supabase
      .from('users')
      .update({ 
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', authData.user.id)

    // Set auth cookies
    const cookieStore = await cookies()
    const sessionCookies = [
      {
        name: 'sb-access-token',
        value: authData.session.access_token,
        options: {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax' as const,
          maxAge: authData.session.expires_in,
          path: '/',
        }
      },
      {
        name: 'sb-refresh-token',
        value: authData.session.refresh_token,
        options: {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax' as const,
          maxAge: 60 * 60 * 24 * 30, // 30 days
          path: '/',
        }
      }
    ]

    // Set cookies
    sessionCookies.forEach(({ name, value, options }) => {
      cookieStore.set(name, value, options)
    })

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        profile: userProfile
      }
    })

  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor. Intenta nuevamente.' },
      { status: 500 }
    )
  }
}