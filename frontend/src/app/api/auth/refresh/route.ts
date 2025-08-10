import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Refresh the session
    const { data: { session }, error } = await supabase.auth.refreshSession()

    if (error) {
      console.error('Token refresh error:', error)
      return NextResponse.json(
        { error: 'Error al renovar la sesión' },
        { status: 401 }
      )
    }

    if (!session) {
      return NextResponse.json(
        { error: 'No se pudo renovar la sesión' },
        { status: 401 }
      )
    }

    // Update auth cookies with new tokens
    const cookieStore = await cookies()
    
    cookieStore.set('sb-access-token', session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: session.expires_in,
      path: '/',
    })

    cookieStore.set('sb-refresh-token', session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })

    return NextResponse.json({
      success: true,
      session: {
        access_token: session.access_token,
        expires_in: session.expires_in,
        expires_at: session.expires_at
      }
    })

  } catch (error) {
    console.error('Refresh API error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}