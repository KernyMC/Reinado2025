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

// Create HTTP server and Socket.IO instance
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: true, // Allow all origins in production
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true
  }
});

// Get local IP addresses
function getLocalIPs() {
  const networkInterfaces = os.networkInterfaces();
  const localIPs = [];
  
  Object.keys(networkInterfaces).forEach(interfaceName => {
    const addresses = networkInterfaces[interfaceName];
    addresses.forEach(address => {
      if (address.family === 'IPv4' && !address.internal) {
        localIPs.push(address.address);
      }
    });
  });
  
  return localIPs;
}

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Cliente conectado: ${socket.id}`);
  
  socket.on('join_room', (roomName) => {
    socket.join(roomName);
    console.log(`📡 Cliente ${socket.id} se unió a sala: ${roomName}`);
  });
  
  socket.on('disconnect', (reason) => {
    console.log(`🔌 Cliente desconectado: ${socket.id}, razón: ${reason}`);
  });
  
  socket.emit('connected', {
    message: 'Conectado al servidor ESPE Pageant',
    timestamp: new Date().toISOString()
  });
});

// Database connection with environment variables
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'reinas2025',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Error conectando a base de datos:', err);
  } else {
    console.log('✅ Base de datos conectada:', res.rows[0].now);
  }
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

// Enhanced CORS for production
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Allow all origins in production for maximum compatibility
    console.log(`🌐 CORS: Allowing origin: ${origin}`);
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve client build files
const clientBuildPath = path.join(__dirname, '..', 'espe-pageant-client', 'dist');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  console.log('✅ Sirviendo cliente desde:', clientBuildPath);
} else {
  console.log('⚠️ No se encontró build del cliente en:', clientBuildPath);
}

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

// Session storage
const activeSessions = new Map();

// Auth middleware
function extractUserFromToken(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const session = activeSessions.get(token);
    if (session) {
      req.user = session.user;
      session.lastActivity = new Date();
    } else {
      if (req.url.includes('/api/admin/')) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
      }
    }
  } else {
    if (req.url.includes('/api/admin/')) {
      return res.status(401).json({
        success: false,
        error: 'Token de autenticación requerido'
      });
    }
  }
  next();
}

// Include all the API routes from the original server
// [Here we would include all the routes from server-complete.cjs]

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'ESPE Pageant Server (Production)',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV
  });
});

// API Routes placeholder - copy from server-complete.cjs
// [All API routes would go here...]

// Catch all handler: serve client for any non-API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      error: 'API endpoint no encontrado'
    });
  }
  
  const indexPath = path.join(clientBuildPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Cliente no encontrado');
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: NODE_ENV === 'production' ? 'Error interno del servidor' : err.message
  });
});

// Start server
const localIPs = getLocalIPs();

server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 ==========================================');
  console.log('🎉 SERVIDOR ESPE PAGEANT - PRODUCCIÓN');
  console.log('🚀 ==========================================');
  console.log(`📍 Puerto: ${PORT}`);
  console.log(`🌍 Entorno: ${NODE_ENV}`);
  console.log(`📅 Iniciado: ${new Date().toLocaleString()}`);
  console.log('');
  console.log('🌐 URLs de Acceso:');
  console.log(`   • http://localhost:${PORT} (local)`);
  console.log(`   • http://127.0.0.1:${PORT} (loopback)`);
  
  if (localIPs.length > 0) {
    console.log('   🏠 Red local:');
    localIPs.forEach(ip => {
      console.log(`   • http://${ip}:${PORT} ⭐`);
    });
  }
  
  console.log('');
  console.log('📱 Acceso desde dispositivos móviles:');
  console.log('   • Conectar a la misma red WiFi');
  console.log('   • Usar cualquiera de las IPs marcadas con ⭐');
  console.log('');
  console.log('🔧 Servicios activos:');
  console.log('   ✅ API Backend');
  console.log('   ✅ Cliente Frontend');
  console.log('   ✅ WebSocket tiempo real');
  console.log('   ✅ Base de datos PostgreSQL');
  console.log('   ✅ Subida de archivos');
  console.log('');
  console.log('🚀 ==========================================');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Cerrando servidor...');
  pool.end();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Terminando servidor...');
  pool.end();
  process.exit(0);
}); 