import { Router } from 'express';
import { authenticateToken, requireAdmin } from '@/middleware/auth.js';

const router = Router();

// GET /api/users - Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, async (_req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Usuarios obtenidos exitosamente'
  });
});

// POST /api/users - Create user (admin only)
router.post('/', authenticateToken, requireAdmin, async (_req, res) => {
  res.json({
    success: true,
    data: {},
    message: 'Usuario creado exitosamente'
  });
});

// PUT /api/users/:id - Update user (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (_req, res) => {
  res.json({
    success: true,
    data: {},
    message: 'Usuario actualizado exitosamente'
  });
});

export default router; 