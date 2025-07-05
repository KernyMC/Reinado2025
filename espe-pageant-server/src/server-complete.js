/**
 * ESPE Pageant Server - Servidor Completo en ES6 Modules
 * @description Servidor completo con toda la funcionalidad del sistema
 * @version 2.0.0 - ES6 Modules
 */

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import pkg from 'pg';
const { Pool } = pkg;
import { jsPDF } from 'jspdf';

// ES Module directory setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Create HTTP server and Socket.IO instance
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

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

// Database connection
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'reinas2025',
  user: 'postgres',
  password: 'admin',
  ssl: false,
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const candidatesDir = path.join(uploadsDir, 'candidates');
if (!fs.existsSync(candidatesDir)) {
  fs.mkdirSync(candidatesDir, { recursive: true });
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, candidatesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'candidate-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen (jpeg, jpg, png, gif)'));
    }
  }
});

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    const localNetworkRegex = /^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3})(:\d{1,5})?$/;
    if (localNetworkRegex.test(origin)) {
      return callback(null, true);
    }
    
    console.log(`🌐 CORS: Allowing origin: ${origin}`);
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Helper function to execute queries
async function executeQuery(query, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result;
  } finally {
    client.release();
  }
}

// Simple session storage
const activeSessions = new Map();

// Middleware to extract user from token
function extractUserFromToken(req, res, next) {
  const authHeader = req.headers.authorization;
  console.log(`🔐 Auth middleware - URL: ${req.method} ${req.url}`);
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const session = activeSessions.get(token);
    
    if (session) {
      req.user = session.user;
      console.log(`✅ User authenticated: ${req.user.email} (${req.user.role})`);
      session.lastActivity = new Date();
    } else {
      console.log(`❌ Session not found for token`);
      if (req.url.includes('/api/admin/')) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado. Por favor, inicia sesión nuevamente.'
        });
      }
    }
  } else {
    if (req.url.includes('/api/admin/')) {
      return res.status(401).json({
        success: false,
        error: 'Token de autenticación requerido. Por favor, inicia sesión.'
      });
    }
  }
  next();
}

// Apply auth middleware to protected routes
app.use('/api/scores', extractUserFromToken);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'ESPE Pageant Server is running',
    timestamp: new Date().toISOString()
  });
});

// Test database
app.get('/api/test-db', async (req, res) => {
  try {
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

// ==================== AUTH ENDPOINTS ====================

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email y contraseña son requeridos'
    });
  }
  
  try {
    const result = await executeQuery(
      'SELECT id, email, full_name, role, is_active, password_hash FROM users WHERE email = $1 AND is_active = true',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }
    
    const user = result.rows[0];
    
    // Simple password check
    const isValidPassword = 
      user.password_hash === password ||
      user.password_hash === `$2b$10$hashed_${password}` ||
      user.password_hash === `$2b$10$example_hash_for_judge`;
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }
    
    const { password_hash, ...userWithoutPassword } = user;
    
    // Create session token
    const token = 'session-' + Date.now() + '-' + user.id + '-' + Math.random().toString(36).substr(2, 9);
    
    // Store session
    activeSessions.set(token, {
      user: userWithoutPassword,
      createdAt: new Date(),
      lastActivity: new Date()
    });
    
    console.log('✅ Login successful for user:', userWithoutPassword.email);
    
    res.json({
      success: true,
      data: {
        token: token,
        user: userWithoutPassword
      }
    });
  } catch (error) {
    console.error('❌ Error in login:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Logout
app.post('/api/auth/logout', extractUserFromToken, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (activeSessions.has(token)) {
        activeSessions.delete(token);
        console.log('🚪 Session terminated:', token);
      }
    }
    
    res.json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });
  } catch (error) {
    console.error('❌ Error in logout:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== EVENTS ENDPOINTS ====================

// Get all events
app.get('/api/events', async (req, res) => {
  try {
    const result = await executeQuery('SELECT * FROM events ORDER BY created_at DESC');
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get active events only (for judges)
app.get('/api/events/active', extractUserFromToken, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'judge') {
      return res.status(403).json({
        success: false,
        error: 'Solo los jueces pueden acceder a eventos activos'
      });
    }

    const result = await executeQuery(
      'SELECT * FROM events WHERE is_active = true ORDER BY created_at DESC'
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get event by ID
app.get('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await executeQuery('SELECT * FROM events WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evento no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update event
app.put('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, event_type, description, status, weight, is_mandatory, bonus_percentage, is_active } = req.body;
    
    const previousEventResult = await executeQuery('SELECT * FROM events WHERE id = $1', [id]);
    if (previousEventResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evento no encontrado'
      });
    }
    
    const previousEvent = previousEventResult.rows[0];
    const previousStatus = previousEvent.is_active;
    
    const updateData = {
      name: name || previousEvent.name,
      event_type: event_type || previousEvent.event_type || 'competition',
      description: description !== undefined ? description : previousEvent.description,
      status: status || previousEvent.status || 'active',
      weight: weight !== undefined ? weight : previousEvent.weight,
      is_mandatory: is_mandatory !== undefined ? is_mandatory : previousEvent.is_mandatory,
      bonus_percentage: bonus_percentage !== undefined ? bonus_percentage : previousEvent.bonus_percentage,
      is_active: is_active !== undefined ? is_active : previousEvent.is_active
    };
    
    const result = await executeQuery(
      'UPDATE events SET name = $1, event_type = $2, description = $3, status = $4, weight = $5, is_mandatory = $6, bonus_percentage = $7, is_active = $8, updated_at = NOW() WHERE id = $9 RETURNING *',
      [updateData.name, updateData.event_type, updateData.description, updateData.status, updateData.weight, updateData.is_mandatory, updateData.bonus_percentage, updateData.is_active, id]
    );
    
    const updatedEvent = result.rows[0];
    
    // WebSocket notification
    if (io) {
      const statusChanged = is_active !== undefined && is_active !== previousStatus;
      
      const notification = {
        type: 'event_updated',
        data: {
          event: updatedEvent,
          updatedBy: 'Sistema',
          updatedAt: new Date().toISOString(),
          message: statusChanged 
            ? `Evento "${updatedEvent.name}" ${is_active ? 'activado' : 'desactivado'} por administrador`
            : `Evento "${updatedEvent.name}" ha sido actualizado`,
          changeType: statusChanged ? 'status_change' : 'general_update',
          previousStatus: previousStatus,
          newStatus: is_active
        }
      };
      
      io.emit('event_updating_start', {
        type: 'event_updating',
        data: {
          eventId: updatedEvent.id,
          eventName: updatedEvent.name,
          action: statusChanged ? 'changing_status' : 'updating',
          timestamp: new Date().toISOString()
        }
      });
      
      setTimeout(() => {
        io.emit('event_updated', notification);
        
        if (statusChanged) {
          io.emit('system_notification', {
            type: is_active ? 'success' : 'warning',
            message: `📅 Evento "${updatedEvent.name}" ${is_active ? '✅ ACTIVADO' : '❌ DESACTIVADO'} por administrador`,
            eventId: updatedEvent.id,
            timestamp: new Date().toISOString()
          });
        }
        
        console.log(`📡 WebSocket: Event updated - ${updatedEvent.name}`);
      }, 300);
    }
    
    res.json({
      success: true,
      data: updatedEvent
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create event
app.post('/api/events', async (req, res) => {
  try {
    const { name, description, weight, is_mandatory, bonus_percentage, is_active } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Nombre del evento es requerido'
      });
    }

    if (is_mandatory && (weight === undefined || weight <= 0)) {
      return res.status(400).json({
        success: false,
        error: 'Los eventos obligatorios deben tener un peso mayor a 0'
      });
    }

    if (weight && (weight < 0 || weight > 100)) {
      return res.status(400).json({
        success: false,
        error: 'El peso debe estar entre 0 y 100'
      });
    }
    
    const result = await executeQuery(
      'INSERT INTO events (name, description, weight, is_mandatory, bonus_percentage, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [
        name, 
        description || null, 
        weight || 0, 
        is_mandatory !== undefined ? is_mandatory : true,
        bonus_percentage || 0,
        is_active !== undefined ? is_active : true
      ]
    );
    
    console.log('✅ Evento creado:', result.rows[0]);
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete event
app.delete('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await executeQuery('DELETE FROM events WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evento no encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Evento eliminado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== CANDIDATES ENDPOINTS ====================

// Get all candidates
app.get('/api/candidates', async (req, res) => {
  try {
    const result = await executeQuery('SELECT * FROM candidates WHERE is_active = true ORDER BY name');
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get candidate by ID
app.get('/api/candidates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await executeQuery('SELECT * FROM candidates WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Candidata no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create candidate with photo upload
app.post('/api/candidates', upload.single('image'), async (req, res) => {
  try {
    const { name, major, department, biography } = req.body;
    
    if (!name || !major || !department) {
      return res.status(400).json({
        success: false,
        error: 'Nombre, carrera y departamento son requeridos'
      });
    }
    
    let image_url = null;
    if (req.file) {
      image_url = `/uploads/candidates/${req.file.filename}`;
    }
    
    const result = await executeQuery(
      'INSERT INTO candidates (name, major, department, image_url, biography) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, major, department, image_url, biography]
    );
    
    console.log('✅ Candidata creada:', result.rows[0]);
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update candidate
app.put('/api/candidates/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, major, department, biography, is_active } = req.body;
    
    const currentResult = await executeQuery('SELECT * FROM candidates WHERE id = $1', [id]);
    
    if (currentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Candidata no encontrada'
      });
    }
    
    let image_url = currentResult.rows[0].image_url;
    
    if (req.file) {
      image_url = `/uploads/candidates/${req.file.filename}`;
      
      if (currentResult.rows[0].image_url) {
        const oldImagePath = path.join(__dirname, '..', currentResult.rows[0].image_url);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    }
    
    const result = await executeQuery(
      'UPDATE candidates SET name = $1, major = $2, department = $3, image_url = $4, biography = $5, is_active = $6, updated_at = NOW() WHERE id = $7 RETURNING *',
      [name, major, department, image_url, biography, is_active !== undefined ? is_active : true, id]
    );
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete candidate
app.delete('/api/candidates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const candidateResult = await executeQuery('SELECT * FROM candidates WHERE id = $1', [id]);
    
    if (candidateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Candidata no encontrada'
      });
    }
    
    if (candidateResult.rows[0].image_url) {
      const imagePath = path.join(__dirname, '..', candidateResult.rows[0].image_url);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    await executeQuery('DELETE FROM candidates WHERE id = $1', [id]);
    
    res.json({
      success: true,
      message: 'Candidata eliminada exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== SCORES ENDPOINTS ====================

// Submit score
app.post('/api/scores', async (req, res) => {
  try {
    const { candidate_id, event_id, score } = req.body;
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }
    
    if (req.user.role !== 'judge') {
      return res.status(403).json({
        success: false,
        error: 'Solo los jueces pueden enviar calificaciones'
      });
    }
    
    const judge_id = req.user.id;
    
    if (!candidate_id || !event_id || score === undefined) {
      return res.status(400).json({
        success: false,
        error: 'candidate_id, event_id y score son requeridos'
      });
    }
    
    if (score < 0 || score > 10) {
      return res.status(400).json({
        success: false,
        error: 'La puntuación debe estar entre 0 y 10'
      });
    }
    
    const existingScore = await executeQuery(
      'SELECT id, score FROM judge_scores WHERE judge_id = $1 AND candidate_id = $2 AND event_id = $3',
      [judge_id, candidate_id, event_id]
    );
    
    if (existingScore.rows.length > 0) {
      const result = await executeQuery(
        'UPDATE judge_scores SET score = $1, updated_at = NOW() WHERE judge_id = $2 AND candidate_id = $3 AND event_id = $4 RETURNING *',
        [score, judge_id, candidate_id, event_id]
      );
      
      console.log('✅ Score updated:', result.rows[0]);

      // WebSocket notification for judges
      if (io) {
        const candidateInfo = await executeQuery('SELECT name FROM candidates WHERE id = $1', [candidate_id]);
        const eventInfo = await executeQuery('SELECT name FROM events WHERE id = $1', [event_id]);

        const notification = {
          type: 'judge_vote_updated',
          data: {
            judge: {
              id: req.user.id,
              name: req.user.full_name,
              email: req.user.email
            },
            candidate: {
              id: candidate_id,
              name: candidateInfo.rows[0]?.name || 'Desconocida'
            },
            event: {
              id: event_id,
              name: eventInfo.rows[0]?.name || 'Evento desconocido'
            },
            score: score,
            action: 'updated',
            timestamp: new Date().toISOString()
          }
        };
        
        io.emit('judge_vote_update', notification);
      }
      
      res.json({
        success: true,
        data: result.rows[0]
      });
    } else {
      const result = await executeQuery(
        'INSERT INTO judge_scores (judge_id, candidate_id, event_id, score) VALUES ($1, $2, $3, $4) RETURNING *',
        [judge_id, candidate_id, event_id, score]
      );
      
      console.log('✅ Score created:', result.rows[0]);

      // WebSocket notification
      if (io) {
        const candidateInfo = await executeQuery('SELECT name FROM candidates WHERE id = $1', [candidate_id]);
        const eventInfo = await executeQuery('SELECT name FROM events WHERE id = $1', [event_id]);

        const notification = {
          type: 'judge_vote_created',
          data: {
            judge: {
              id: req.user.id,
              name: req.user.full_name,
              email: req.user.email
            },
            candidate: {
              id: candidate_id,
              name: candidateInfo.rows[0]?.name || 'Desconocida'
            },
            event: {
              id: event_id,
              name: eventInfo.rows[0]?.name || 'Evento desconocido'
            },
            score: score,
            action: 'created',
            timestamp: new Date().toISOString()
          }
        };
        
        io.emit('judge_vote_update', notification);
      }
      
      res.status(201).json({
        success: true,
        data: result.rows[0]
      });
    }
  } catch (error) {
    console.error('❌ Error submitting score:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get my scores (for current judge)
app.get('/api/scores/my-scores', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }
    
    if (req.user.role !== 'judge') {
      return res.status(403).json({
        success: false,
        error: 'Solo los jueces pueden ver sus calificaciones'
      });
    }
    
    const judge_id = req.user.id;
    
    const result = await executeQuery(
      'SELECT js.*, c.name as candidate_name, e.name as event_name FROM judge_scores js JOIN candidates c ON js.candidate_id = c.id JOIN events e ON js.event_id = e.id WHERE js.judge_id = $1 ORDER BY js.created_at DESC',
      [judge_id]
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== USERS ENDPOINTS ====================

// Get all users (for admin)
app.get('/api/users', extractUserFromToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }
    
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Solo los administradores pueden ver usuarios'
      });
    }
    
    const result = await executeQuery(
      'SELECT id, email, full_name, role, is_active, created_at, updated_at FROM users ORDER BY created_at DESC'
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create user
app.post('/api/users', extractUserFromToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }
    
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Solo los administradores pueden crear usuarios'
      });
    }
    
    const { email, full_name, role, password } = req.body;
    
    if (!email || !full_name || !role) {
      return res.status(400).json({
        success: false,
        error: 'email, full_name y role son requeridos'
      });
    }
    
    let password_hash;
    if (password) {
      password_hash = password;
    } else {
      password_hash = '123456';
    }
    
    const result = await executeQuery(
      'INSERT INTO users (email, password_hash, full_name, role, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, full_name, role, is_active, created_at, updated_at',
      [email, password_hash, full_name, role, true]
    );
    
    console.log('✅ User created:', result.rows[0]);
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      res.status(400).json({
        success: false,
        error: 'El email ya está en uso'
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
});

// ==================== ADMIN ENDPOINTS ====================

// Reset all votes/scores (Admin only)
app.delete('/api/admin/reset-votes', extractUserFromToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }
    
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Solo los administradores pueden reiniciar las votaciones'
      });
    }
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const scoresResult = await client.query('SELECT COUNT(*) FROM judge_scores');
      const votesResult = await client.query('SELECT COUNT(*) FROM public_votes');
      
      const scoresCount = parseInt(scoresResult.rows[0].count);
      const votesCount = parseInt(votesResult.rows[0].count);
      
      await client.query('DELETE FROM judge_scores');
      await client.query('DELETE FROM public_votes');
      
      console.log('🧹 Limpiando desempates activos...');
      await client.query("DELETE FROM system_settings WHERE setting_key = 'active_tiebreaker'");
      await client.query('DROP TABLE IF EXISTS tiebreaker_scores');
      
      await client.query('COMMIT');
      
      console.log(`✅ RESET COMPLETE - Deleted ${scoresCount} judge scores, ${votesCount} public votes`);
      
      if (io) {
        io.emit('tiebreaker_cleared', {
          type: 'tiebreaker_cleared',
          message: 'Desempates eliminados por reinicio del sistema',
          timestamp: new Date().toISOString(),
          clearedBy: req.user.email
        });
      }
      
      res.json({
        success: true,
        message: 'Todas las votaciones y desempates han sido reiniciados exitosamente',
        data: {
          deletedScores: scoresCount,
          deletedVotes: votesCount,
          clearedTiebreakers: true,
          resetBy: req.user.email,
          resetAt: new Date().toISOString()
        }
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Error interno del servidor'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint no encontrado'
  });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor ESPE Pageant ejecutándose en puerto ${PORT}`);
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`🌐 Red: http://0.0.0.0:${PORT}`);
  console.log(`🔌 WebSocket: Habilitado`);
  console.log(`📊 Base de datos: reinas2025`);
  console.log(`⏰ Iniciado: ${new Date().toISOString()}`);
});

process.on('SIGINT', () => {
  console.log('🛑 Cerrando servidor...');
  pool.end();
  process.exit(0);
});

export default app; 