import { Router } from 'express';
import authRoutes from './authRoutes.js';
import eventRoutes from './eventRoutes.js';
import candidateRoutes from './candidateRoutes.js';
import scoreRoutes from './scoreRoutes.js';
import voteRoutes from './voteRoutes.js';
import userRoutes from './userRoutes.js';
import judgeRoutes from './judgeRoutes.js';
import adminRoutes from './adminRoutes.js';

export function setupRoutes(app) {
  const router = Router();
  
  // Rutas de autenticación
  router.use('/auth', authRoutes);
  
  // Rutas de eventos
  router.use('/events', eventRoutes);
  
  // Rutas de candidatas
  router.use('/candidates', candidateRoutes);
  
  // Rutas de calificaciones
  router.use('/scores', scoreRoutes);
  
  // Rutas de votación
  router.use('/votes', voteRoutes);
  
  // Rutas de usuarios
  router.use('/users', userRoutes);
  
  // Rutas de jueces (plural)
  router.use('/judges', judgeRoutes);
  
  // Rutas de juez individual (singular) - para compatibilidad con frontend
  router.use('/judge', judgeRoutes);
  
  // Rutas de administración (incluye reportes y desempates)
  router.use('/admin', adminRoutes);
  
  // Ruta de salud
  router.get('/health', (req, res) => {
    res.json({ 
      status: 'OK', 
      message: 'ESPE Pageant Server is running',
      timestamp: new Date().toISOString()
    });
  });

  // Test database
  router.get('/test-db', async (req, res) => {
    try {
      const { executeQuery } = await import('../database/connection.js');
      const result = await executeQuery('SELECT NOW() as current_time');
      res.json({
        success: true,
        message: 'Database connection successful',
        data: result.rows[0]
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  
  // Aplicar rutas a la aplicación
  app.use('/api', router);
  
  // Manejador 404
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      error: 'Endpoint no encontrado'
    });
  });
} 