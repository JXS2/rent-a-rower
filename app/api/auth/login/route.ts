import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { createSession } from '@/lib/sessions';

// Validate ADMIN_PASSWORD exists at module load
if (!process.env.ADMIN_PASSWORD) {
  throw new Error('ADMIN_PASSWORD environment variable is required');
}

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    // Validate input is a string
    if (typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Use timingSafeEqual to prevent timing attacks
    // Both strings must be the same length for comparison
    const passwordBuffer = Buffer.from(password);
    const adminPasswordBuffer = Buffer.from(ADMIN_PASSWORD);

    let isValid = false;
    if (passwordBuffer.length === adminPasswordBuffer.length) {
      isValid = timingSafeEqual(passwordBuffer, adminPasswordBuffer);
    }

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create a session token instead of storing password
    const sessionToken = createSession();

    const response = NextResponse.json({ success: true });

    // Set HTTP-only cookie with session token
    response.cookies.set('admin_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400, // 24 hours in seconds
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    // Don't expose error details to client
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
