import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateSession } from '@/lib/sessions';

export function middleware(request: NextRequest) {
  // Only protect /admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const token = request.cookies.get('admin_token')?.value;

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Middleware] Path:', request.nextUrl.pathname);
      console.log('[Middleware] Token exists:', !!token);
      console.log('[Middleware] Token valid:', token ? validateSession(token) : false);
    }

    // Verify token is a valid session
    if (!token || !validateSession(token)) {
      // Redirect to login page
      console.log('[Middleware] Redirecting to /login - invalid or missing token');
      return NextResponse.redirect(new URL('/login', request.url));
    }

    console.log('[Middleware] Access granted to:', request.nextUrl.pathname);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/admin']
};
