import { Router } from 'express';
import { authenticateToken, requireAdmin } from '@/middleware/auth.js';

const router = Router();

// GET /api/settings - Get system settings
router.get('/', authenticateToken, async (_req, res) => {
  res.json({
    success: true,
    data: {},
    message: 'Configuraciones obtenidas exitosamente'
  });
});

// PUT /api/settings - Update system settings (admin only)
router.put('/', authenticateToken, requireAdmin, async (_req, res) => {
  res.json({
    success: true,
    data: {},
    message: 'Configuraciones actualizadas exitosamente'
  });
});

export default router; 