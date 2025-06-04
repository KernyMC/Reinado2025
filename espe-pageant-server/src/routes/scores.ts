import { Router } from 'express';
import { authenticateToken, requireJudge } from '@/middleware/auth.js';

const router = Router();

// POST /api/scores - Submit judge score
router.post('/', authenticateToken, requireJudge, async (_req, res) => {
  res.json({
    success: true,
    data: {},
    message: 'Puntuación guardada exitosamente'
  });
});

// GET /api/scores/:eventType - Get scores by event type
router.get('/:eventType', authenticateToken, async (_req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Puntuaciones obtenidas exitosamente'
  });
});

// GET /api/scores/candidate/:id - Get scores for specific candidate
router.get('/candidate/:id', authenticateToken, async (_req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Puntuaciones de candidata obtenidas exitosamente'
  });
});

export default router; 