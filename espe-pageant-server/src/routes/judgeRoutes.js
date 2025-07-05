import { Router } from 'express';
import { JudgeController } from '../controllers/judgeController.js';
import { AuthService } from '../services/authService.js';

const router = Router();

// Get all judges (public)
router.get('/', JudgeController.getAllJudges);

// Get voting status
router.get('/voting-status', JudgeController.getVotingStatus);

// Tiebreaker routes (require judge auth)
router.get('/tiebreaker/current', 
  AuthService.extractUser,
  AuthService.requireRole('judge'),
  JudgeController.getCurrentTiebreaker
);

router.post('/tiebreaker/vote', 
  AuthService.extractUser,
  AuthService.requireRole('judge'),
  JudgeController.submitTiebreakerVote
);

export default router; 