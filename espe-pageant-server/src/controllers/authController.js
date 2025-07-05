import { AuthService } from '../services/authService.js';

export class AuthController {
  
  static async login(req, res) {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ 
          success: false,
          error: 'Email y contraseña son requeridos' 
        });
      }
      
      const result = await AuthService.login(email, password);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error en login:', error);
      res.status(401).json({ 
        success: false,
        error: error.message || 'Credenciales inválidas' 
      });
    }
  }

  static async logout(req, res) {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.substring(7);
      
      if (token) {
        AuthService.logout(token);
      }
      
      res.json({ 
        success: true,
        message: 'Sesión cerrada exitosamente' 
      });
    } catch (error) {
      console.error('Error en logout:', error);
      res.status(500).json({ 
        success: false,
        error: 'Error interno del servidor' 
      });
    }
  }

  static async getProfile(req, res) {
    try {
      res.json({
        user: req.user,
        message: 'Perfil obtenido exitosamente'
      });
    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor' 
      });
    }
  }

  static async validateToken(req, res) {
    try {
      res.json({
        valid: true,
        user: req.user,
        message: 'Token válido'
      });
    } catch (error) {
      console.error('Error validando token:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor' 
      });
    }
  }

  static async getActiveSessions(req, res) {
    try {
      const sessions = AuthService.getActiveSessions();
      
      res.json({
        sessions,
        total: sessions.length,
        message: 'Sesiones activas obtenidas'
      });
    } catch (error) {
      console.error('Error obteniendo sesiones:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor' 
      });
    }
  }
} 