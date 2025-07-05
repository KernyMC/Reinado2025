import { executeQuery } from '../database/connection.js';
import { SessionManager } from '../utils/sessionManager.js';

export class AuthService {
  
  static extractUser(req, res, next) {
    const authHeader = req.headers.authorization;
    console.log(`🔐 Auth middleware - URL: ${req.method} ${req.url}`);
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const session = SessionManager.getSession(token);
      
      if (session) {
        req.user = session.user;
        console.log(`✅ User authenticated: ${req.user.email} (${req.user.role})`);
      } else {
        console.log(`❌ Session not found for token`);
        if (req.url.includes('/api/admin/')) {
          return res.status(401).json({
            success: false,
            error: 'Usuario no autenticado. Por favor, inicia sesión nuevamente.'
          });
        }
      }
    } else {
      if (req.url.includes('/api/admin/')) {
        return res.status(401).json({
          success: false,
          error: 'Token de autenticación requerido. Por favor, inicia sesión.'
        });
      }
    }
    next();
  }

  static requireAuth() {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
      }
      next();
    };
  }

  static requireRole(roles) {
    if (typeof roles === 'string') {
      roles = [roles];
    }
    
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
          error: `Acceso denegado. Roles requeridos: ${roles.join(', ')}`
        });
      }
      
      next();
    };
  }

  static async login(email, password) {
    try {
      const result = await executeQuery(
        'SELECT id, email, full_name, role, is_active, password_hash FROM users WHERE email = $1 AND is_active = true',
        [email]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Credenciales inválidas');
      }
      
      const user = result.rows[0];
      
      console.log('🔐 Login attempt:', { email, providedPassword: password, storedHash: user.password_hash });
      
      // Simple password check - multiple formats supported
      const isValidPassword = 
        user.password_hash === password || // Direct match (simple passwords)
        user.password_hash === `$2b$10$hashed_${password}` || // Hashed format
        user.password_hash === `$2b$10$example_hash_for_judge`; // For existing judges
      
      if (!isValidPassword) {
        throw new Error('Credenciales inválidas');
      }
      
      // Remove password_hash from response
      const { password_hash, ...userWithoutPassword } = user;
      
      // Create session token
      const token = SessionManager.generateToken(user.id);
      SessionManager.createSession(token, userWithoutPassword);
      
      console.log('✅ Login successful for user:', userWithoutPassword.email);
      
      return {
        token,
        user: userWithoutPassword
      };
    } catch (error) {
      console.error('❌ Error in login:', error);
      throw error;
    }
  }

  static logout(token) {
    return SessionManager.deleteSession(token);
  }
} 