// Generate or retrieve session ID for anonymous users
const SESSION_KEY = 'restaurant_session_id';

export function getSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  
  return sessionId;
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
