import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { cronManager } from '@/lib/cron-manager'

export async function middleware(request: NextRequest) {
  // Check for persona rotation on chat API calls
  if (request.nextUrl.pathname.startsWith('/api/chat')) {
    await cronManager.checkAndRotatePersona()
  }

  // Allow public API endpoints
  if (
    request.nextUrl.pathname.startsWith('/api/admin/login') ||
    request.nextUrl.pathname.startsWith('/api/admin/check-auth')
  ) {
    return NextResponse.next()
  }

  // Protect all admin routes and admin API routes
  if (
    request.nextUrl.pathname.startsWith('/admin') ||
    request.nextUrl.pathname.startsWith('/api/admin')
  ) {
    const isAuthenticated = request.cookies.get('admin_token')?.value === process.env.ADMIN_PASSWORD

    if (!isAuthenticated) {
      if (request.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      // For non-API routes, let the client-side handle the authentication
      return NextResponse.next()
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/api/chat/:path*']
}
