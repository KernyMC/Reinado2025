/**
 * Session Service
 * @description Servicio para gestión de sesiones de usuario
 */

import { ENV } from '../config/environment.js';

/**
 * Almacenamiento en memoria para sesiones activas
 * TODO: En producción, usar Redis o base de datos para escalabilidad
 */
const activeSessions = new Map();

export class SessionService {
  /**
   * Crear nueva sesión
   * @param {Object} user - Datos del usuario
   * @returns {string} Token de sesión
   */
  static createSession(user) {
    // Limpiar sesiones expiradas antes de crear una nueva
    this.cleanExpiredSessions();
    
    // Generar token único
    const token = this.generateSessionToken(user.id);
    
    // Crear objeto de sesión
    const session = {
      user: this.sanitizeUser(user),
      createdAt: new Date(),
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + ENV.SYSTEM.SESSION_TIMEOUT)
    };
    
    // Guardar sesión
    activeSessions.set(token, session);
    
    console.log(`🎫 Session created for user: ${user.email} (${token.substring(0, 20)}...)`);
    console.log(`🕐 Session expires at: ${session.expiresAt.toISOString()}`);
    
    // Verificar límite de sesiones
    if (activeSessions.size > ENV.SYSTEM.MAX_SESSIONS) {
      this.cleanOldestSessions(ENV.SYSTEM.MAX_SESSIONS * 0.8); // Limpiar 20% de sesiones más antiguas
    }
    
    return token;
  }

  /**
   * Obtener sesión por token
   * @param {string} token - Token de sesión
   * @returns {Object|null} Datos de sesión
   */
  static getSession(token) {
    const session = activeSessions.get(token);
    
    if (!session) {
      return null;
    }
    
    // Verificar si la sesión ha expirado
    if (new Date() > session.expiresAt) {
      this.deleteSession(token);
      console.log(`⏰ Session expired for token: ${token.substring(0, 20)}...`);
      return null;
    }
    
    return session;
  }

  /**
   * Actualizar actividad de sesión
   * @param {string} token - Token de sesión
   * @returns {boolean} True si se actualizó correctamente
   */
  static updateActivity(token) {
    const session = activeSessions.get(token);
    
    if (!session) {
      return false;
    }
    
    // Actualizar última actividad y extender expiración
    session.lastActivity = new Date();
    session.expiresAt = new Date(Date.now() + ENV.SYSTEM.SESSION_TIMEOUT);
    
    return true;
  }

  /**
   * Eliminar sesión
   * @param {string} token - Token de sesión
   * @returns {boolean} True si se eliminó correctamente
   */
  static deleteSession(token) {
    const deleted = activeSessions.delete(token);
    
    if (deleted) {
      console.log(`🚪 Session deleted: ${token.substring(0, 20)}...`);
    }
    
    return deleted;
  }

  /**
   * Eliminar todas las sesiones de un usuario
   * @param {string} userId - ID del usuario
   * @returns {number} Número de sesiones eliminadas
   */
  static deleteUserSessions(userId) {
    let deletedCount = 0;
    
    for (const [token, session] of activeSessions) {
      if (session.user.id === userId) {
        activeSessions.delete(token);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      console.log(`🧹 Deleted ${deletedCount} sessions for user: ${userId}`);
    }
    
    return deletedCount;
  }

  /**
   * Limpiar sesiones expiradas
   * @returns {number} Número de sesiones eliminadas
   */
  static cleanExpiredSessions() {
    const now = new Date();
    let cleanedCount = 0;
    
    for (const [token, session] of activeSessions) {
      if (now > session.expiresAt) {
        activeSessions.delete(token);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned ${cleanedCount} expired sessions`);
    }
    
    return cleanedCount;
  }

  /**
   * Limpiar sesiones más antiguas
   * @param {number} keepCount - Número de sesiones a mantener
   * @returns {number} Número de sesiones eliminadas
   */
  static cleanOldestSessions(keepCount) {
    const sessions = Array.from(activeSessions.entries())
      .sort((a, b) => a[1].lastActivity - b[1].lastActivity);
    
    const toDelete = sessions.slice(0, sessions.length - keepCount);
    
    toDelete.forEach(([token]) => {
      activeSessions.delete(token);
    });
    
    if (toDelete.length > 0) {
      console.log(`🧹 Cleaned ${toDelete.length} oldest sessions to maintain limit`);
    }
    
    return toDelete.length;
  }

  /**
   * Obtener estadísticas de sesiones
   * @returns {Object} Estadísticas de sesiones
   */
  static getSessionStats() {
    const now = new Date();
    let activeCount = 0;
    let expiredCount = 0;
    const userRoles = {};
    
    for (const [token, session] of activeSessions) {
      if (now > session.expiresAt) {
        expiredCount++;
      } else {
        activeCount++;
        const role = session.user.role;
        userRoles[role] = (userRoles[role] || 0) + 1;
      }
    }
    
    return {
      total: activeSessions.size,
      active: activeCount,
      expired: expiredCount,
      byRole: userRoles,
      oldestSession: this.getOldestSession(),
      newestSession: this.getNewestSession()
    };
  }

  /**
   * Obtener número de sesiones activas
   * @returns {number} Número de sesiones activas
   */
  static getActiveSessionCount() {
    return activeSessions.size;
  }

  /**
   * Obtener todas las sesiones activas (para admin)
   * @returns {Array} Lista de sesiones activas
   */
  static getAllActiveSessions() {
    const now = new Date();
    const sessions = [];
    
    for (const [token, session] of activeSessions) {
      if (now <= session.expiresAt) {
        sessions.push({
          token: token.substring(0, 20) + '...', // Token parcial por seguridad
          user: session.user,
          createdAt: session.createdAt,
          lastActivity: session.lastActivity,
          expiresAt: session.expiresAt,
          isExpired: false
        });
      }
    }
    
    return sessions.sort((a, b) => b.lastActivity - a.lastActivity);
  }

  /**
   * Generar token de sesión único
   * @param {string} userId - ID del usuario
   * @returns {string} Token generado
   */
  static generateSessionToken(userId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `session-${timestamp}-${userId}-${random}`;
  }

  /**
   * Sanitizar datos de usuario (remover información sensible)
   * @param {Object} user - Datos del usuario
   * @returns {Object} Usuario sanitizado
   */
  static sanitizeUser(user) {
    const { password_hash, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Obtener sesión más antigua
   * @returns {Object|null} Sesión más antigua
   */
  static getOldestSession() {
    let oldest = null;
    
    for (const session of activeSessions.values()) {
      if (!oldest || session.createdAt < oldest.createdAt) {
        oldest = session;
      }
    }
    
    return oldest ? {
      user: oldest.user.email,
      createdAt: oldest.createdAt,
      lastActivity: oldest.lastActivity
    } : null;
  }

  /**
   * Obtener sesión más nueva
   * @returns {Object|null} Sesión más nueva
   */
  static getNewestSession() {
    let newest = null;
    
    for (const session of activeSessions.values()) {
      if (!newest || session.createdAt > newest.createdAt) {
        newest = session;
      }
    }
    
    return newest ? {
      user: newest.user.email,
      createdAt: newest.createdAt,
      lastActivity: newest.lastActivity
    } : null;
  }

  /**
   * Limpiar todas las sesiones (emergency cleanup)
   * @returns {number} Número de sesiones eliminadas
   */
  static clearAllSessions() {
    const count = activeSessions.size;
    activeSessions.clear();
    console.log(`🚨 Emergency cleanup: ${count} sessions cleared`);
    return count;
  }
}

// Ejecutar limpieza automática cada 5 minutos
setInterval(() => {
  SessionService.cleanExpiredSessions();
}, 5 * 60 * 1000);

// Ejecutar limpieza al inicio
setTimeout(() => {
  SessionService.cleanExpiredSessions();
}, 1000); 