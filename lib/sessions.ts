// In-memory session store (simple for single-instance deployment)
const activeSessions = new Set<string>();

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
