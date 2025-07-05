import { Router } from 'express';
import { EventController } from '../controllers/eventController.js';
import { AuthService } from '../services/authService.js';

const router = Router();

// Public routes
router.get('/', EventController.getAllEvents);
router.get('/active', EventController.getActiveEvents);
router.get('/:id', EventController.getEventById);

// Admin-only routes
router.post('/', 
  AuthService.requireAuth(['admin']), 
  EventController.createEvent
);

router.put('/:id', 
  AuthService.requireAuth(['admin']), 
  EventController.updateEvent
);

router.put('/:id/weight', 
  AuthService.requireAuth(['admin']), 
  EventController.updateEventWeight
);

router.put('/:id/status', 
  AuthService.requireAuth(['admin']), 
  EventController.updateEventStatus
);

router.delete('/:id', 
  AuthService.requireAuth(['admin']), 
  EventController.deleteEvent
);

export default router; 