// JWT-based auth using signed tokens
// This works across Next.js workers without requiring shared state
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default-secret-change-in-production'
);

export async function createSession(): Promise<string> {
  const token = await new SignJWT({ admin: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);

  if (process.env.NODE_ENV === 'development') {
    console.log('[Sessions] Created JWT session');
  }
  return token;
}

export async function validateSession(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const isValid = payload.admin === true;

    if (process.env.NODE_ENV === 'development') {
      console.log('[Sessions] Validating JWT:', isValid);
    }

    return isValid;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Sessions] JWT validation failed:', error);
    }
    return false;
  }
}

export async function destroySession(token: string): Promise<void> {
  // With JWT, we just remove the cookie client-side
  // The token will expire naturally
  if (process.env.NODE_ENV === 'development') {
    console.log('[Sessions] Session destroyed (cookie will be removed)');
  }
}
