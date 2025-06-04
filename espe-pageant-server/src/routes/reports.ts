import { Router } from 'express';
import { authenticateToken, requireAdmin } from '@/middleware/auth.js';

const router = Router();

// GET /api/reports/results - Get consolidated results
router.get('/results', authenticateToken, async (_req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Resultados consolidados obtenidos exitosamente'
  });
});

// POST /api/reports/generate - Generate report (admin only)
router.post('/generate', authenticateToken, requireAdmin, async (_req, res) => {
  res.json({
    success: true,
    data: { reportUrl: 'mock-report-url' },
    message: 'Reporte generado exitosamente'
  });
});

export default router; 