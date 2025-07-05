import { Router } from 'express';
import { ScoreController } from '../controllers/scoreController.js';
import { AuthService } from '../services/authService.js';

const router = Router();

// Todas las rutas requieren autenticación de juez
router.use(AuthService.extractUser);

// Submit score (judges only)
router.post('/', 
  AuthService.requireRole('judge'),
  ScoreController.submitScore
);

// Get scores by event
router.get('/event/:eventId', ScoreController.getScoresByEvent);

// Get my scores (current judge)
router.get('/my-scores', 
  AuthService.requireRole('judge'),
  ScoreController.getMyScores
);

export default router; 