/**
 * ESPE Pageant Server - Main Entry Point
 * @description Servidor principal del sistema de votación ESPE Pageant 2025
 * @version 2.0.0 - ES6 Modules Architecture
 */

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config/config.js';
import { setupDatabase } from './database/connection.js';
import { setupRoutes } from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { AuthService } from './services/authService.js';

// ES Module directory setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(`🚀 Starting ESPE Pageant Server in production mode...`);

const app = express();
const PORT = config.port || 3000;

// Create HTTP server and Socket.IO instance
const server = createServer(app);
const io = new Server(server, config.socket);

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Cliente WebSocket conectado: ${socket.id}`);
  
  socket.on('join_room', (roomName) => {
    socket.join(roomName);
    console.log(`📡 Cliente ${socket.id} se unió a sala: ${roomName}`);
  });
  
  socket.on('disconnect', (reason) => {
    console.log(`🔌 Cliente WebSocket desconectado: ${socket.id}, razón: ${reason}`);
  });
  
  socket.emit('connected', {
    message: 'Conectado al servidor ESPE Pageant WebSocket',
    timestamp: new Date().toISOString()
  });
});

console.log('✅ WebSocket servidor configurado');

// Setup database
const pool = await setupDatabase();

// Create upload directories
const uploadsDir = path.join(__dirname, '..', 'uploads');
const candidatesDir = path.join(uploadsDir, 'candidates');

[uploadsDir, candidatesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, candidatesDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'candidate-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: config.upload.limits,
  fileFilter: (req, file, cb) => {
    const allowedTypes = config.upload.allowedTypes;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen (jpeg, jpg, png, gif)'));
    }
  }
});

// Middleware setup
app.use(cors(config.cors));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));

// Extract user middleware for protected routes
app.use('/api/scores', AuthService.extractUser);
app.use('/api/admin', AuthService.extractUser);
app.use('/api/users', AuthService.extractUser);

// Setup routes
setupRoutes(app);

// Error handling
app.use(errorHandler);

// Start server
server.listen(PORT, '0.0.0.0', () => {
  const networkInterfaces = os.networkInterfaces();
  
  // Get local IP addresses
  const localIPs = [];
  Object.keys(networkInterfaces).forEach(interfaceName => {
    const addresses = networkInterfaces[interfaceName];
    addresses.forEach(address => {
      if (address.family === 'IPv4' && !address.internal) {
        localIPs.push(address.address);
      }
    });
  });

  console.log(`🚀 Servidor ESPE Pageant ejecutándose en TODAS las interfaces de red`);
  console.log(`📍 Puerto: ${PORT}`);
  console.log(`🌐 Accesible desde:`);
  console.log(`   • http://localhost:${PORT} (local)`);
  console.log(`   • http://127.0.0.1:${PORT} (loopback)`);
  
  if (localIPs.length > 0) {
    localIPs.forEach(ip => {
      console.log(`   • http://${ip}:${PORT} (red local)`);
    });
  } else {
    console.log(`   • [No se detectaron IPs de red local]`);
  }
  
  console.log(`📊 Base de datos: ${config.database.database}`);
  console.log(`🔗 CORS: Habilitado para TODAS las direcciones de red local`);
  console.log(`📁 Archivos estáticos: /uploads`);
  console.log(`📷 Fotos de candidatas: /uploads/candidates`);
  console.log(`🔌 WebSocket: Habilitado para notificaciones en tiempo real`);
  console.log(`⏰ Iniciado en: ${new Date().toISOString()}`);
  console.log(`────────────────────────────────────────────────────────────`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Cerrando servidor...');
  await pool.end();
  process.exit(0);
});

export default app; 