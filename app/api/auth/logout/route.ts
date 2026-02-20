import { NextRequest, NextResponse } from 'next/server';
import { destroySession } from '@/lib/sessions';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value;

    // Destroy the session if it exists
    if (token) {
      await destroySession(token);
    }

    const response = NextResponse.json({ success: true });

    // Clear the cookie
    response.cookies.set('admin_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    // Don't expose error details to client
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
