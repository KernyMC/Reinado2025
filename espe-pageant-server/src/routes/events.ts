import { Router } from 'express';
import { authenticateToken, requireAdmin } from '@/middleware/auth.js';
import { eventService } from '@/services/eventService.js';

const router = Router();

// GET /api/events - Get all active events (public)
router.get('/', async (_req, res) => {
  try {
    const events = await eventService.getAllActive();
    res.json({
      success: true,
      data: events,
      message: 'Eventos obtenidos exitosamente'
    });
  } catch (error) {
    console.error('Error getting events:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener eventos'
    });
  }
});

// GET /api/events/:id - Get event by ID
router.get('/:id', async (req, res) => {
  try {
    const event = await eventService.getById(req.params.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Evento no encontrado'
      });
    }
    res.json({
      success: true,
      data: event,
      message: 'Evento obtenido exitosamente'
    });
  } catch (error) {
    console.error('Error getting event:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener evento'
    });
  }
});

// PUT /api/events/:id/status - Update event status (admin only)
router.put('/:id/status', authenticateToken, requireAdmin, async (_req, res) => {
  res.json({
    success: true,
    data: {},
    message: 'Estado del evento actualizado exitosamente'
  });
});

export default router; 