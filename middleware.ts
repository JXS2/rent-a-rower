import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateSession } from '@/lib/sessions';

export function middleware(request: NextRequest) {
  // Only protect /admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const token = request.cookies.get('admin_token')?.value;

    // Verify token is a valid session
    if (!token || !validateSession(token)) {
      // Redirect to login page
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/admin']
};
