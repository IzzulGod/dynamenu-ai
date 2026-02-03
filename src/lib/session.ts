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
    // Generate a cryptographically secure session ID using crypto.randomUUID()
    const uuid = crypto.randomUUID();
    const timestamp = Date.now();
    sessionId = `session_${timestamp}_${uuid}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  
  cachedSessionId = sessionId;
  return sessionId;
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
  cachedSessionId = null;
}

// Validate session ID format - supports both legacy and new UUID format
export function isValidSessionId(sessionId: string): boolean {
  // New UUID format: session_timestamp_uuid
  const uuidPattern = /^session_\d+_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  // Legacy format: session_timestamp_randomstring (for backward compatibility)
  const legacyPattern = /^session_\d+_[a-z0-9]+$/i;
  
  return uuidPattern.test(sessionId) || legacyPattern.test(sessionId);
}
