import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthenticatedRequest, ApiResponse, LoginRequest } from '@/types/api.js';
import { userService } from '@/services/userService.js';
import { generateToken } from '@/middleware/auth.js';

export class AuthController {
  // Login validation rules
  static loginValidation = [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Email válido requerido'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Contraseña debe tener al menos 6 caracteres')
  ];

  // Login endpoint
  async login(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Datos inválidos',
          data: errors.array()
        });
        return;
      }

      const { email, password }: LoginRequest = req.body;

      // Find user by email
      const user = await userService.findByEmail(email);
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Credenciales inválidas'
        });
        return;
      }

      // Check if user is active
      if (!user.is_active) {
        res.status(401).json({
          success: false,
          error: 'Usuario inactivo. Contacta al administrador.'
        });
        return;
      }

      // Validate password
      const isValidPassword = await userService.validatePassword(user, password);
      if (!isValidPassword) {
        res.status(401).json({
          success: false,
          error: 'Credenciales inválidas'
        });
        return;
      }

      // Generate JWT token
      const token = generateToken(user);

      // Remove password from response
      const { password_hash, ...userWithoutPassword } = user;

      res.json({
        success: true,
        data: {
          token,
          user: userWithoutPassword
        },
        message: 'Inicio de sesión exitoso'
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Get current user endpoint
  async me(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }

      // Remove password from response
      const { password_hash, ...userWithoutPassword } = req.user;

      res.json({
        success: true,
        data: userWithoutPassword
      });

    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Logout endpoint (client-side token removal)
  async logout(_req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      // In a JWT implementation, logout is typically handled client-side
      // by removing the token from storage. Here we just confirm the logout.
      
      res.json({
        success: true,
        message: 'Sesión cerrada exitosamente'
      });

    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Refresh token endpoint (optional)
  async refreshToken(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }

      // Generate new token
      const token = generateToken(req.user);

      res.json({
        success: true,
        data: { token },
        message: 'Token renovado exitosamente'
      });

    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
}

export const authController = new AuthController(); 