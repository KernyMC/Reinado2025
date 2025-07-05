const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const { jsPDF } = require('jspdf');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { finalizeTiebreaker } = require('./finish-tiebreaker-auto.cjs');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'production';

console.log(`🚀 Starting ESPE Pageant Server in ${NODE_ENV} mode...`);

// Create HTTP server and Socket.IO instance
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: true, // Allow all origins in production for local network access
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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

// Test database connection
pool.connect()
  .then(client => {
    console.log('✅ Base de datos conectada exitosamente');
    client.release();
  })
  .catch(err => {
    console.error('❌ Error conectando a la base de datos:', err.message);
  });

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
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

// ============ PRODUCTION: Serve React Client ============
// Serve static files from the client build
const clientDistPath = path.join(__dirname, '..', 'espe-pageant-client', 'dist');
console.log(`📁 Looking for client files at: ${clientDistPath}`);

if (fs.existsSync(clientDistPath)) {
  console.log('✅ Client build encontrado, sirviendo archivos estáticos');
  app.use(express.static(clientDistPath));
} else {
  console.log('⚠️ Client build no encontrado en:', clientDistPath);
  console.log('💡 Para resolver: cd ../espe-pageant-client && npm run build');
}

// ============ MIDDLEWARE ============
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost in any port
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // Allow local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    const localNetworkRegex = /^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3})(:\d{1,5})?$/;
    if (localNetworkRegex.test(origin)) {
      return callback(null, true);
    }
    
    // Allow any origin in development (you can restrict this in production)
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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const session = activeSessions.get(token);
    if (session) {
      req.user = session.user;
      session.lastActivity = new Date();
    }
  }
  next();
}

// ============ API ROUTES ============

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'ESPE Pageant Server is running',
    timestamp: new Date().toISOString(),
    mode: NODE_ENV
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'ESPE Pageant API is running',
    timestamp: new Date().toISOString(),
    mode: NODE_ENV
  });
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

// Update event (Admin only)
app.put('/api/events/:id', extractUserFromToken, async (req, res) => {
  try {
    // Check if user is authenticated and has admin privileges
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
      return res.status(403).json({
        success: false,
        error: 'Solo los administradores pueden modificar eventos'
      });
    }

    const { id } = req.params;
    const { name, event_type, description, status, weight, is_mandatory, bonus_percentage, is_active } = req.body;
    
    // ============ FIX: Obtener evento actual para validar campos ============
    const previousEventResult = await executeQuery('SELECT * FROM events WHERE id = $1', [id]);
    if (previousEventResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evento no encontrado'
      });
    }
    const previousEvent = previousEventResult.rows[0];
    
    // ============ FIX: Validar y usar valores por defecto ============
    const updateData = {
      name: name || previousEvent.name,
      event_type: event_type || previousEvent.event_type || 'competition', // Valor por defecto
      description: description !== undefined ? description : previousEvent.description,
      status: status || previousEvent.status || 'active',
      weight: weight !== undefined ? weight : previousEvent.weight,
      is_mandatory: is_mandatory !== undefined ? is_mandatory : previousEvent.is_mandatory,
      bonus_percentage: bonus_percentage !== undefined ? bonus_percentage : previousEvent.bonus_percentage,
      is_active: is_active !== undefined ? is_active : previousEvent.is_active
    };
    
    // Validar peso si es obligatorio
    if (updateData.is_mandatory && updateData.weight !== undefined && updateData.weight <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Los eventos obligatorios deben tener un peso mayor a 0'
      });
    }

    // Validar que el peso esté en rango válido
    if (updateData.weight !== undefined && (updateData.weight < 0 || updateData.weight > 100)) {
      return res.status(400).json({
        success: false,
        error: 'El peso debe estar entre 0 y 100'
      });
    }
    
    console.log('🔧 Datos de actualización validados:', updateData);
    // ========================================================================
    
    const result = await executeQuery(
      'UPDATE events SET name = $1, event_type = $2, description = $3, status = $4, weight = $5, is_mandatory = $6, bonus_percentage = $7, is_active = $8, updated_at = NOW() WHERE id = $9 RETURNING *',
      [updateData.name, updateData.event_type, updateData.description, updateData.status, updateData.weight, updateData.is_mandatory, updateData.bonus_percentage, updateData.is_active, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evento no encontrado'
      });
    }
    
    console.log(`✅ Evento actualizado por admin ${req.user.email}:`, result.rows[0]);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error updating event:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== SCORES ENDPOINTS ====================

// Submit score
app.post('/api/scores', extractUserFromToken, async (req, res) => {
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
    
    // Check if judge already scored this candidate for this event
    const existingScore = await executeQuery(
      'SELECT id, score FROM judge_scores WHERE judge_id = $1 AND candidate_id = $2 AND event_id = $3',
      [judge_id, candidate_id, event_id]
    );
    
    if (existingScore.rows.length > 0) {
      // Update existing score
      const result = await executeQuery(
        'UPDATE judge_scores SET score = $1, updated_at = NOW() WHERE judge_id = $2 AND candidate_id = $3 AND event_id = $4 RETURNING *',
        [score, judge_id, candidate_id, event_id]
      );
      
      res.json({
        success: true,
        data: result.rows[0]
      });
    } else {
      // Create new score
      const result = await executeQuery(
        'INSERT INTO judge_scores (judge_id, candidate_id, event_id, score) VALUES ($1, $2, $3, $4) RETURNING *',
        [judge_id, candidate_id, event_id, score]
      );
      
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

// ============ PRODUCTION: Serve React App for all non-API routes ============
app.get('*', (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
    return res.status(404).json({
      success: false,
      error: 'Endpoint no encontrado'
    });
  }
  
  const indexPath = path.join(clientDistPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({
      success: false,
      error: 'Cliente no encontrado. Ejecuta: npm run build en el directorio del cliente'
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

  console.log(`🚀 ESPE Pageant Server (${NODE_ENV}) ejecutándose en TODAS las interfaces`);
  console.log(`📍 Puerto: ${PORT}`);
  console.log(`🌐 Accesible desde:`);
  console.log(`   • http://localhost:${PORT} (local)`);
  console.log(`   • http://127.0.0.1:${PORT} (loopback)`);
  
  if (localIPs.length > 0) {
    localIPs.forEach(ip => {
      console.log(`   • http://${ip}:${PORT} (red local)`);
    });
  }
  
  console.log(`📊 Base de datos: reinas2025`);
  console.log(`🔗 CORS: Habilitado para redes locales`);
  console.log(`📁 Cliente React: ${fs.existsSync(clientDistPath) ? '✅ Servido' : '❌ No encontrado'}`);
  console.log(`📷 Uploads: /uploads`);
  console.log(`🔌 WebSocket: Habilitado`);
  console.log(`⏰ Iniciado: ${new Date().toISOString()}`);
  console.log(`────────────────────────────────────────────────────────────`);
});

process.on('SIGINT', () => {
  console.log('🛑 Cerrando servidor...');
  pool.end();
  process.exit(0);
}); 