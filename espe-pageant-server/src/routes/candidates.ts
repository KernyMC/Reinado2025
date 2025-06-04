import { Router } from 'express';
import { authenticateToken, requireAdmin } from '@/middleware/auth.js';
import { candidateService } from '@/services/candidateService.js';

const router = Router();

// GET /api/candidates - Get all candidates (public)
router.get('/', async (_req, res) => {
  try {
    const candidates = await candidateService.getAllActive();
    res.json({
      success: true,
      data: candidates,
      message: 'Candidatas obtenidas exitosamente'
    });
  } catch (error) {
    console.error('Error getting candidates:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener candidatas'
    });
  }
});

// GET /api/candidates/all - Get all candidates including inactive (admin only)
router.get('/all', authenticateToken, requireAdmin, async (_req, res) => {
  try {
    const candidates = await candidateService.getAll();
    res.json({
      success: true,
      data: candidates,
      message: 'Todas las candidatas obtenidas exitosamente'
    });
  } catch (error) {
    console.error('Error getting all candidates:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener todas las candidatas'
    });
  }
});

// GET /api/candidates/:id - Get candidate by ID
router.get('/:id', async (req, res) => {
  try {
    const candidate = await candidateService.getById(req.params.id);
    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidata no encontrada'
      });
    }
    res.json({
      success: true,
      data: candidate,
      message: 'Candidata obtenida exitosamente'
    });
  } catch (error) {
    console.error('Error getting candidate:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener candidata'
    });
  }
});

// POST /api/candidates - Create candidate (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const candidate = await candidateService.create(req.body);
    res.status(201).json({
      success: true,
      data: candidate,
      message: 'Candidata creada exitosamente'
    });
  } catch (error) {
    console.error('Error creating candidate:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear candidata'
    });
  }
});

// PUT /api/candidates/:id - Update candidate (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const candidate = await candidateService.update(req.params.id, req.body);
    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidata no encontrada'
      });
    }
    res.json({
      success: true,
      data: candidate,
      message: 'Candidata actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error updating candidate:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar candidata'
    });
  }
});

// DELETE /api/candidates/:id - Delete candidate (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const deleted = await candidateService.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Candidata no encontrada'
      });
    }
    res.json({
      success: true,
      message: 'Candidata eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error deleting candidate:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar candidata'
    });
  }
});

export default router; 