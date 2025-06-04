import { Router } from 'express';

const router = Router();

// POST /api/votes - Submit public vote
router.post('/', async (_req, res) => {
  res.json({
    success: true,
    data: {},
    message: 'Voto registrado exitosamente'
  });
});

// GET /api/votes/results - Get voting results
router.get('/results', async (_req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Resultados de votación obtenidos exitosamente'
  });
});

export default router; 