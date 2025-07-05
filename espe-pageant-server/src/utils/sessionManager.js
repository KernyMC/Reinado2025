// Simple session storage (in production use Redis or similar)
export const activeSessions = new Map();

export class SessionManager {
  static createSession(token, user) {
    activeSessions.set(token, {
      user,
      createdAt: new Date(),
      lastActivity: new Date()
    });
    console.log(`🎫 Session created: ${token} for ${user.email}`);
  }

  static getSession(token) {
    const session = activeSessions.get(token);
    if (session) {
      session.lastActivity = new Date();
    }
    return session;
  }

  static deleteSession(token) {
    const deleted = activeSessions.delete(token);
    if (deleted) {
      console.log(`🚪 Session terminated: ${token}`);
    }
    return deleted;
  }

  static generateToken(userId) {
    return 'session-' + Date.now() + '-' + userId + '-' + Math.random().toString(36).substr(2, 9);
  }

  static getSessionCount() {
    return activeSessions.size;
  }

  static cleanExpiredSessions(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
    const now = new Date();
    let cleaned = 0;
    
    for (const [token, session] of activeSessions) {
      if (now - session.lastActivity > maxAge) {
        activeSessions.delete(token);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired sessions`);
    }
    
    return cleaned;
  }
} 