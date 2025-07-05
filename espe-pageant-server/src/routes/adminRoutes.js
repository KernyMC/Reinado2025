import { Router } from 'express';
import { AdminController } from '../controllers/adminController.js';
import { AuthService } from '../services/authService.js';

const router = Router();

// Todas las rutas requieren autenticación de admin
router.use(AuthService.extractUser);
router.use(AuthService.requireRole(['admin', 'superadmin']));

// Reset votes/scores
router.delete('/reset-votes', AdminController.resetVotes);

// Reports
router.post('/reports/generate', AdminController.generateReport);
router.post('/reports/download-pdf', AdminController.downloadPDF);
router.get('/reports/stats', AdminController.getStats);

// Tie-breaking
router.get('/ties/current', AdminController.getCurrentTies);
router.post('/ties/activate', AdminController.activateTiebreaker);

// Events management
router.put('/events/:id', AdminController.updateEvent);
router.delete('/events/:id', AdminController.deleteEvent);

// Test endpoints
router.get('/test', AdminController.testEndpoint);
router.get('/test-auth', AdminController.testAuth);

export default router; 