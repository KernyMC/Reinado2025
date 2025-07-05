/**
 * Authentication Middleware
 * @description Middleware para manejo de autenticación y autorización
 */

import { SessionService } from '../services/session.service.js';

/**
 * Middleware para extraer y validar token de usuario
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
export const extractUserFromToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  console.log(`🔐 Auth middleware - URL: ${req.method} ${req.url}`);
  console.log(`🔐 Auth header: ${authHeader ? authHeader.substring(0, 30) + '...' : 'NO HEADER'}`);
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    console.log(`🎫 Extracting token: ${token.substring(0, 30)}...`);
    
    const session = SessionService.getSession(token);
    if (session) {
      req.user = session.user;
      console.log(`✅ User authenticated: ${req.user.email} (${req.user.role}) [ID: ${req.user.id}]`);
      
      // Actualizar última actividad
      SessionService.updateActivity(token);
      console.log(`🕐 Session updated for user: ${req.user.email}`);
    } else {
      console.log(`❌ Session not found for token: ${token.substring(0, 30)}...`);
      console.log(`🔍 Active sessions count: ${SessionService.getActiveSessionCount()}`);
      
      // Para endpoints admin, retornar 401 si no hay sesión válida
      if (req.url.includes('/api/admin/')) {
        console.log(`❌ Admin endpoint requires authentication: ${req.url}`);
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado. Por favor, inicia sesión nuevamente.'
        });
      }
    }
  } else {
    console.log(`❌ No authorization header or invalid format for: ${req.url}`);
    
    // Para endpoints admin, retornar 401 si no hay header de auth
    if (req.url.includes('/api/admin/')) {
      console.log(`❌ Admin endpoint requires authentication header: ${req.url}`);
      return res.status(401).json({
        success: false,
        error: 'Token de autenticación requerido. Por favor, inicia sesión.'
      });
    }
  }
  
  next();
};

/**
 * Middleware para requerir autenticación
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
export const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Usuario no autenticado'
    });
  }
  next();
};

/**
 * Middleware para requerir rol específico
 * @param {string|Array} allowedRoles - Rol o roles permitidos
 */
export const requireRole = (allowedRoles) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Acceso denegado. Roles permitidos: ${roles.join(', ')}`
      });
    }
    
    next();
  };
};

/**
 * Middleware para requerir rol de admin
 */
export const requireAdmin = requireRole(['admin', 'superadmin']);

/**
 * Middleware para requerir rol de juez
 */
export const requireJudge = requireRole('judge');

/**
 * Middleware para requerir superadmin
 */
export const requireSuperAdmin = requireRole('superadmin');

/**
 * Middleware para verificar si el usuario está activo
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
export const requireActiveUser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Usuario no autenticado'
    });
  }
  
  if (!req.user.is_active) {
    return res.status(403).json({
      success: false,
      error: 'Usuario inactivo. Contacta al administrador.'
    });
  }
  
  next();
};

/**
 * Middleware opcional de autenticación (no falla si no hay token)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const session = SessionService.getSession(token);
    
    if (session) {
      req.user = session.user;
      SessionService.updateActivity(token);
    }
  }
  
  next();
}; 