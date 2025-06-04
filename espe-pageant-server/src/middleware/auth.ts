import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '@/config/env.js';
import { AuthenticatedRequest, ApiResponse } from '@/types/api.js';
import { User } from '@/types/database.js';
import { userService } from '@/services/userService.js';

export interface JWTPayload {
  userId: string;
  email: string;
  role: User['role'];
  iat?: number;
  exp?: number;
}

// Middleware to verify JWT token
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Token de acceso requerido'
      });
      return;
    }

    const decoded = jwt.verify(token, config.JWT_SECRET) as JWTPayload;
    
    // Get user from database to ensure they still exist and are active
    const user = await userService.findById(decoded.userId);
    
    if (!user || !user.is_active) {
      res.status(401).json({
        success: false,
        error: 'Usuario no válido o inactivo'
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: 'Token inválido'
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Middleware to check user roles
export const requireRole = (...roles: User['role'][]) => {
  return (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Permisos insuficientes'
      });
      return;
    }

    next();
  };
};

// Specific role middlewares
export const requireAdmin = requireRole('admin', 'superadmin');
export const requireSuperAdmin = requireRole('superadmin');
export const requireJudge = requireRole('judge', 'admin', 'superadmin');
export const requireNotary = requireRole('notary', 'admin', 'superadmin');

// Generate JWT token
export const generateToken = (user: User): string => {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };

  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN
  } as jwt.SignOptions);
};

// Generate refresh token
export const generateRefreshToken = (user: User): string => {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };

  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRES_IN
  } as jwt.SignOptions);
}; 