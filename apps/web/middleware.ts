import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|public).*)'],
}

export default auth((req) => {
  const { nextUrl, auth: session } = req
  const isAuthenticated = !!session?.user

  if (nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', nextUrl))
  }

  if (nextUrl.pathname === '/login') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', nextUrl))
    }
    return NextResponse.next()
  }

  if (nextUrl.pathname.startsWith('/dashboard')) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', nextUrl)
      loginUrl.searchParams.set('callbackUrl', nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
    }

    if (nextUrl.pathname.startsWith('/dashboard/admin')) {
      if (session.user.role !== 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/dashboard?error=forbidden', nextUrl))
      }
    }
  }

  return NextResponse.next()
})
