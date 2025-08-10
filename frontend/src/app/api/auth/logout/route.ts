import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Sign out from Supabase
    await supabase.auth.signOut()
    
    // Clear auth cookies
    const cookieStore = await cookies()
    
    // Clear all auth-related cookies
    const cookiesToClear = [
      'sb-access-token',
      'sb-refresh-token',
      'sb-auth-token',
      'supabase-auth-token',
      'supabase.auth.token',
    ]
    
    cookiesToClear.forEach(cookieName => {
      cookieStore.delete(cookieName)
    })

    return NextResponse.json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    })

  } catch (error) {
    console.error('Logout API error:', error)
    
    // Even if there's an error, we should still clear cookies and return success
    // since the user wants to log out
    const cookieStore = await cookies()
    
    const cookiesToClear = [
      'sb-access-token',
      'sb-refresh-token',
      'sb-auth-token',
      'supabase-auth-token',
      'supabase.auth.token',
    ]
    
    cookiesToClear.forEach(cookieName => {
      cookieStore.delete(cookieName)
    })

    return NextResponse.json({
      success: true,
      message: 'Sesión cerrada'
    })
  }
}