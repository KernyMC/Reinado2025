import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import rateLimit from 'express-rate-limit';

import { config, validateEnv } from '@/config/env.js';
import { testConnection } from '@/config/database.js';

// Routes
import authRoutes from '@/routes/auth.js';
import candidateRoutes from '@/routes/candidates.js';
import eventRoutes from '@/routes/events.js';
import scoreRoutes from '@/routes/scores.js';
import voteRoutes from '@/routes/votes.js';
import userRoutes from '@/routes/users.js';
import reportRoutes from '@/routes/reports.js';
import settingRoutes from '@/routes/settings.js';

// WebSocket handlers
import { setupWebSocketHandlers } from '@/services/websocketService.js';

// Error handling middleware
import { errorHandler } from '@/middleware/errorHandler.js';

async function startServer() {
  try {
    // Validate environment variables
    validateEnv();

    // Test database connection
    await testConnection();

    // Create Express app
    const app = express();
    const server = createServer(app);

    // Setup Socket.IO
    const io = new SocketIOServer(server, {
      cors: {
        origin: config.WS_CORS_ORIGIN.split(','),
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    // Setup WebSocket handlers
    setupWebSocketHandlers(io);

    // Security middleware
    app.use(helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' }
    }));

    // CORS configuration
    app.use(cors({
      origin: config.CORS_ORIGIN,
      credentials: config.CORS_CREDENTIALS,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.RATE_LIMIT_WINDOW_MS,
      max: config.RATE_LIMIT_MAX_REQUESTS,
      message: {
        success: false,
        error: 'Demasiadas solicitudes. Intenta nuevamente más tarde.'
      },
      standardHeaders: true,
      legacyHeaders: false
    });
    app.use('/api', limiter);

    // Logging
    if (config.NODE_ENV === 'development') {
      app.use(morgan('dev'));
    } else {
      app.use(morgan('combined'));
    }

    // Body parsing middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Health check endpoint
    app.get('/health', (_req, res) => {
      res.json({
        success: true,
        message: 'ESPE Pageant API Server is running',
        timestamp: new Date().toISOString(),
        environment: config.NODE_ENV
      });
    });

    // CORS test endpoint
    app.get('/cors-test', (_req, res) => {
      res.json({
        success: true,
        message: 'CORS está funcionando correctamente',
        allowedOrigins: config.CORS_ORIGIN,
        credentials: config.CORS_CREDENTIALS
      });
    });

    // OPTIONS for all routes (explicit CORS handling)
    app.options('*', cors({
      origin: config.CORS_ORIGIN,
      credentials: config.CORS_CREDENTIALS,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      preflightContinue: false,
      optionsSuccessStatus: 200
    }));

    // API Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/candidates', candidateRoutes);
    app.use('/api/events', eventRoutes);
    app.use('/api/scores', scoreRoutes);
    app.use('/api/votes', voteRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/reports', reportRoutes);
    app.use('/api/settings', settingRoutes);

    // 404 handler
    app.use('*', (_req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint no encontrado'
      });
    });

    // Error handling middleware (must be last)
    app.use(errorHandler);

    // Start server
    server.listen(config.PORT, config.HOST, () => {
      console.log(`
🚀 ESPE Pageant Server iniciado exitosamente!
📍 Servidor: http://${config.HOST}:${config.PORT}
🌐 Entorno: ${config.NODE_ENV}
🔌 WebSocket: Habilitado
📊 Base de datos: Conectada
⏰ ${new Date().toLocaleString()}
      `);
    });

    // Handle server errors
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.log(`❌ Puerto ${config.PORT} está en uso. Intentando puerto alternativo...`);
        const altPort = config.PORT + 1;
        server.listen(altPort, config.HOST, () => {
          console.log(`
🚀 ESPE Pageant Server iniciado en puerto alternativo!
📍 Servidor: http://${config.HOST}:${altPort}
🌐 Entorno: ${config.NODE_ENV}
🔌 WebSocket: Habilitado
📊 Base de datos: Conectada
⏰ ${new Date().toLocaleString()}
          `);
        });
      } else {
        console.error('❌ Error del servidor:', error);
        process.exit(1);
      }
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      console.log(`\n🛑 Recibida señal ${signal}. Cerrando servidor...`);
      
      server.close(() => {
        console.log('✅ Servidor HTTP cerrado');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        console.log('❌ Forzando cierre del servidor');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

// Start the server
startServer(); 