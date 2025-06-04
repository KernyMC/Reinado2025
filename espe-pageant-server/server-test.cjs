const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = 3000;

// Database connection
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'reinas2025',
  user: 'postgres',
  password: 'admin',
  ssl: false,
});

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8081'],
  credentials: true,
}));
app.use(express.json());

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
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time');
    client.release();
    
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

// Get events
app.get('/api/events', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM events ORDER BY created_at DESC');
    client.release();
    
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

// Get candidates
app.get('/api/candidates', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM candidates WHERE is_active = true ORDER BY name');
    client.release();
    
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

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email y contraseña son requeridos'
    });
  }
  
  try {
    const client = await pool.connect();
    const result = await client.query(
      'SELECT id, email, full_name, role, is_active FROM users WHERE email = $1 AND is_active = true',
      [email]
    );
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }
    
    const user = result.rows[0];
    
    // For testing, accept admin123 as password for admin user
    if (email === 'admin@espe.edu.ec' && password === 'admin123') {
      res.json({
        success: true,
        data: {
          token: 'mock-jwt-token-' + Date.now(),
          user: user
        }
      });
    } else {
      res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(`📊 Base de datos: reinas2025`);
  console.log(`🔗 CORS habilitado para: http://localhost:5173, http://localhost:3000, http://localhost:8081`);
  console.log(`⏰ Iniciado en: ${new Date().toISOString()}`);
});

process.on('SIGINT', () => {
  console.log('🛑 Cerrando servidor...');
  pool.end();
  process.exit(0);
}); 