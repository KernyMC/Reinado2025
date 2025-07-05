import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { AuthService } from '../services/authService.js';

const router = Router();

// Public routes
router.post('/login', AuthController.login);

// Protected routes
router.post('/logout', 
  AuthService.requireAuth(), 
  AuthController.logout
);

router.get('/profile', 
  AuthService.requireAuth(), 
  AuthController.getProfile
);

router.get('/sessions', 
  AuthService.requireAuth(['admin']), 
  AuthController.getActiveSessions
);

router.post('/validate', 
  AuthService.requireAuth(), 
  AuthController.validateToken
);

export default router; 