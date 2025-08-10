import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { canAccessRoute } from '@/lib/auth/permissions'
import { Database } from '@/types/database'

type UserRole = Database['public']['Enums']['user_role']

/**
 * Creates a Supabase client for use in Middleware
 * This client will automatically refresh expired Auth tokens and store them
 */
export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const currentPath = request.nextUrl.pathname

  // Get user profile for role-based access control
  let userProfile = null
  if (user) {
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', user.id)
        .eq('activo', true)
        .single()
      
      userProfile = data
    } catch (error) {
      console.error('Error fetching user profile in middleware:', error)
    }
  }

  // Define protected routes
  const protectedRoutes = [
    '/dashboard',
    '/admin', 
    '/analytics',
    '/survey',
    '/reports',
    '/users',
    '/walklists'
  ]

  const isProtectedRoute = protectedRoutes.some(route => 
    currentPath.startsWith(route)
  )

  // Redirect unauthenticated users to login
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', currentPath)
    return NextResponse.redirect(url)
  }

  // Handle authenticated users
  if (user && userProfile) {
    // Redirect authenticated users away from auth pages to their appropriate dashboard
    if (currentPath.startsWith('/login') || currentPath.startsWith('/auth/register')) {
      const url = request.nextUrl.clone()
      url.pathname = getRoleBasedRedirect(userProfile.rol)
      return NextResponse.redirect(url)
    }

    // Check role-based access control for protected routes
    if (isProtectedRoute) {
      if (!canAccessRoute(userProfile.rol, currentPath)) {
        const url = request.nextUrl.clone()
        url.pathname = '/unauthorized'
        return NextResponse.redirect(url)
      }
    }

    // Redirect root path to appropriate dashboard
    if (currentPath === '/') {
      const url = request.nextUrl.clone()
      url.pathname = getRoleBasedRedirect(userProfile.rol)
      return NextResponse.redirect(url)
    }
  }

  // Handle authenticated users without valid profile
  if (user && !userProfile && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('error', 'profile_not_found')
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely.

  return supabaseResponse
}

/**
 * Get the appropriate redirect path based on user role
 */
function getRoleBasedRedirect(role: UserRole): string {
  switch (role) {
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