// In-memory session store (simple for single-instance deployment)
// Use globalThis to persist sessions across Next.js hot reloads in development
const globalForSessions = globalThis as unknown as {
  activeSessions: Set<string>;
};

if (!globalForSessions.activeSessions) {
  globalForSessions.activeSessions = new Set<string>();
}

const activeSessions = globalForSessions.activeSessions;

export function createSession(): string {
  const token = crypto.randomUUID();
  activeSessions.add(token);
  if (process.env.NODE_ENV === 'development') {
    console.log('[Sessions] Created session:', token.substring(0, 8) + '...');
    console.log('[Sessions] Total active sessions:', activeSessions.size);
  }
  return token;
}

export function validateSession(token: string): boolean {
  const isValid = activeSessions.has(token);
  if (process.env.NODE_ENV === 'development') {
    console.log('[Sessions] Validating:', token.substring(0, 8) + '...', '→', isValid);
    console.log('[Sessions] Active sessions count:', activeSessions.size);
  }
  return isValid;
}

export function destroySession(token: string): void {
  activeSessions.delete(token);
  if (process.env.NODE_ENV === 'development') {
    console.log('[Sessions] Destroyed session:', token.substring(0, 8) + '...');
    console.log('[Sessions] Remaining active sessions:', activeSessions.size);
  }
}
