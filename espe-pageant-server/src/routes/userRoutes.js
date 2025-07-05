import { Router } from 'express';
import { UserController } from '../controllers/userController.js';
import { AuthService } from '../services/authService.js';

const router = Router();

// Todas las rutas requieren autenticación de admin
router.use(AuthService.extractUser);
router.use(AuthService.requireRole(['admin', 'superadmin']));

// Get all users (admin only)
router.get('/', UserController.getAllUsers);

// Create user (admin only)
router.post('/', UserController.createUser);

// Update user (admin only)
router.put('/:id', UserController.updateUser);

// Delete user (admin only)
router.delete('/:id', UserController.deleteUser);

export default router; 