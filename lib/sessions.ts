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
  return token;
}

export function validateSession(token: string): boolean {
  return activeSessions.has(token);
}

export function destroySession(token: string): void {
  activeSessions.delete(token);
}
