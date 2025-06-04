const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);

// Configuración
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const isProduction = process.env.NODE_ENV === 'production';
const frontendPath = path.join(__dirname, '../espe-pageant-client/dist');

console.log(`🚀 Iniciando servidor ESPE Pageant - ${isProduction ? 'PRODUCCIÓN' : 'DESARROLLO'}`);
console.log(`📁 Frontend path: ${frontendPath}`);

// CORS permisivo para desarrollo
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Socket.IO con CORS permisivo
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware básico
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'ESPE Pageant Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API básica de eventos (mock para testing)
app.get('/api/events', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        name: 'Preguntas',
        event_type: 'qa',
        status: 'active',
        start_time: new Date().toISOString(),
        end_time: null
      },
      {
        id: '2', 
        name: 'Traje de Baño',
        event_type: 'swimsuit',
        status: 'pending',
        start_time: null,
        end_time: null
      }
    ]
  });
});

// API básica de usuarios (mock para testing login)
app.post('/api/users', (req, res) => {
  const { username, password } = req.body;
  
  // Mock de autenticación básica
  if (username && password) {
    res.json({
      success: true,
      data: {
        id: '1',
        username: username,
        role: 'admin',
        token: 'mock-jwt-token-' + Date.now()
      }
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Credenciales inválidas'
    });
  }
});

// Servir archivos estáticos del frontend en producción
if (isProduction) {
  if (fs.existsSync(frontendPath)) {
    console.log('✅ Frontend build encontrado. Sirviendo archivos estáticos...');
    app.use(express.static(frontendPath));
    
    // SPA routing - debe ir al final
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
        return res.status(404).json({ 
          success: false,
          error: 'API endpoint not found' 
        });
      }
      res.sendFile(path.join(frontendPath, 'index.html'));
    });
  } else {
    console.log('❌ Frontend build no encontrado. Solo API disponible.');
  }
} else {
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ 
        success: false,
        error: 'API endpoint not found' 
      });
    }
    res.json({ 
      message: 'Servidor en desarrollo. Frontend en puerto separado.',
      frontend_url: 'http://localhost:5173'
    });
  });
}

// Iniciar servidor
server.listen(PORT, HOST, () => {
  const os = require('os');
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

  console.log(`🚀 Servidor ESPE Pageant - ${isProduction ? 'PRODUCCIÓN' : 'DESARROLLO'}`);
  console.log(`📍 Puerto: ${PORT}`);
  
  if (isProduction) {
    console.log(`📱 ACCESO UNIFICADO (Frontend + API + WebSocket):`);
    console.log(`   • http://localhost:${PORT} (local)`);
    if (localIPs.length > 0) {
      localIPs.forEach(ip => {
        console.log(`   • http://${ip}:${PORT} (red)`);
      });
    }
  } else {
    console.log(`🔧 API únicamente:`);
    console.log(`   • http://localhost:${PORT}/api (local)`);
    console.log(`   • Frontend separado en puerto 5173`);
  }
  
  console.log(`✅ Servidor iniciado exitosamente en ${new Date().toLocaleString()}`);
}); 