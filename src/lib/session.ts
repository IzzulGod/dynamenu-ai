// Generate or retrieve session ID for anonymous users
const SESSION_KEY = 'restaurant_session_id';

// Cache session ID to avoid repeated sessionStorage access
let cachedSessionId: string | null = null;

export function getSessionId(): string {
  // Return cached value if available
  if (cachedSessionId) {
    return cachedSessionId;
  }
  
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  
  if (!sessionId) {
    // Generate a secure session ID
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substring(2, 15);
    sessionId = `session_${timestamp}_${randomPart}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  
  cachedSessionId = sessionId;
  return sessionId;
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
  cachedSessionId = null;
}

// Validate session ID format
export function isValidSessionId(sessionId: string): boolean {
  return /^session_\d+_[a-z0-9]+$/i.test(sessionId);
}
