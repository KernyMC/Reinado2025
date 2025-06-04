const fs = require('fs');
const path = require('path');

console.log('🏗️ Generando servidor de producción...');

// Leer el servidor completo
const serverCompleteContent = fs.readFileSync('server-complete.cjs', 'utf8');

// Crear la versión de producción
const productionServer = `const express = require('express');
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
  console.log(\`🔌 Cliente conectado: \${socket.id}\`);
  
  socket.on('join_room', (roomName) => {
    socket.join(roomName);
    console.log(\`📡 Cliente \${socket.id} se unió a sala: \${roomName}\`);
  });
  
  socket.on('disconnect', (reason) => {
    console.log(\`🔌 Cliente desconectado: \${socket.id}, razón: \${reason}\`);
  });
  
  socket.emit('connected', {
    message: 'Conectado al servidor ESPE Pageant',
    timestamp: new Date().toISOString()
  });
});

console.log('✅ WebSocket servidor configurado');

// Database connection with environment variables
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'reinas2025',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
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
    console.log(\`🌐 CORS: Allowing origin: \${origin}\`);
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
`;

// Extraer las funciones y rutas del servidor original
const lines = serverCompleteContent.split('\n');
let insideHelperFunctions = false;
let insideRoutes = false;
let helperFunctionsAndRoutes = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Comenzar a capturar después de la configuración inicial
  if (line.includes('// Helper function to execute queries') || 
      line.includes('async function executeQuery')) {
    insideHelperFunctions = true;
  }
  
  // Capturar todo desde las funciones helper hasta antes del server.listen
  if (insideHelperFunctions && !line.includes('server.listen(PORT')) {
    helperFunctionsAndRoutes.push(line);
  }
  
  // Detener antes del server.listen
  if (line.includes('server.listen(PORT')) {
    break;
  }
}

// Crear el contenido del servidor de producción
const finalContent = productionServer + '\n' + helperFunctionsAndRoutes.join('\n') + `

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
  console.log(\`📍 Puerto: \${PORT}\`);
  console.log(\`🌍 Entorno: \${NODE_ENV}\`);
  console.log(\`📅 Iniciado: \${new Date().toLocaleString()}\`);
  console.log('');
  console.log('🌐 URLs de Acceso:');
  console.log(\`   • http://localhost:\${PORT} (local)\`);
  console.log(\`   • http://127.0.0.1:\${PORT} (loopback)\`);
  
  if (localIPs.length > 0) {
    console.log('   🏠 Red local:');
    localIPs.forEach(ip => {
      console.log(\`   • http://\${ip}:\${PORT} ⭐\`);
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
`;

// Escribir el archivo de producción
fs.writeFileSync('server-production-full.cjs', finalContent);

console.log('✅ Servidor de producción generado: server-production-full.cjs');
console.log('✅ Incluye todas las rutas API del servidor original');
console.log('✅ Configurado para servir el cliente construido');
console.log('✅ Optimizado para producción'); 