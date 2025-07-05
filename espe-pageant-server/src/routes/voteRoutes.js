import { Router } from 'express';
import { VoteController } from '../controllers/voteController.js';

const router = Router();

// Submit public vote
router.post('/', VoteController.submitVote);

// Get voting results
router.get('/results', VoteController.getResults);

export default router; 