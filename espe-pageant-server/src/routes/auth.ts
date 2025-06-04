import { Router } from 'express';
import { authController, AuthController } from '@/controllers/authController.js';
import { authenticateToken } from '@/middleware/auth.js';

const router = Router();

// POST /api/auth/login - User login
router.post('/login', AuthController.loginValidation, authController.login.bind(authController));

// GET /api/auth/me - Get current user
router.get('/me', authenticateToken, authController.me.bind(authController));

// POST /api/auth/logout - User logout
router.post('/logout', authenticateToken, authController.logout.bind(authController));

// POST /api/auth/refresh - Refresh token
router.post('/refresh', authenticateToken, authController.refreshToken.bind(authController));

export default router; 