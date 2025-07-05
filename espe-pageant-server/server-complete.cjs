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
  
  // Handle user joining specific rooms (e.g., judge-specific rooms)
  socket.on('join_room', (roomName) => {
    socket.join(roomName);
    console.log(`📡 Cliente ${socket.id} se unió a sala: ${roomName}`);
  });
  
  socket.on('disconnect', (reason) => {
    console.log(`🔌 Cliente WebSocket desconectado: ${socket.id}, razón: ${reason}`);
  });
  
  // Send welcome message
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

// Middleware
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
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
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

// Function to generate PDF reports using jsPDF
async function generatePDF(reportData, format = 'pdf') {
  if (format !== 'pdf') {
    return null;
  }

  try {
    console.log('🔄 Starting PDF generation with new ESPE format...');
    
    // Enhanced error handling for report data
    const safeReportData = {
      generatedAt: reportData?.generatedAt || new Date().toISOString(),
      generatedBy: reportData?.generatedBy || 'Sistema Automático',
      totalCandidates: Number(reportData?.totalCandidates) || 0,
      totalScores: Number(reportData?.totalScores) || 0,
      top3Rankings: Array.isArray(reportData?.top3Rankings) ? reportData.top3Rankings : [],
      allRankings: Array.isArray(reportData?.allRankings) ? reportData.allRankings : [],
      events: Array.isArray(reportData?.events) ? reportData.events : []
    };

    console.log('📊 Report data prepared:', {
      totalCandidates: safeReportData.totalCandidates,
      totalScores: safeReportData.totalScores,
      top3Count: safeReportData.top3Rankings.length,
      allRankingsCount: safeReportData.allRankings.length
    });

    // Debug: Log rankings data
    console.log('🔍 Top 3 Rankings:', safeReportData.top3Rankings.map(r => ({
      name: r.candidate?.name || 'Unknown',
      score: r.finalScore || r.averageScore || 0
    })));

    console.log('🔍 All Rankings count:', safeReportData.allRankings.length);
    if (safeReportData.allRankings.length > 0) {
      console.log('🔍 First few rankings:', safeReportData.allRankings.slice(0, 3).map(r => ({
        name: r.candidate?.name || 'Unknown',
        score: r.finalScore || r.averageScore || 0
      })));
    }

    // Helper function to load image from file system
    async function loadImageAsBase64(imagePath) {
      try {
        if (!imagePath) return null;
        
        // Construct full path - remove leading slash and use path.join
        const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
        const fullPath = path.join(__dirname, cleanPath);
        
        console.log(`📷 Loading image: ${fullPath}`);
        
        // Check if file exists
        if (!fs.existsSync(fullPath)) {
          console.log(`❌ Image not found: ${fullPath}`);
          return null;
        }
        
        // Read file and convert to base64
        const imageBuffer = fs.readFileSync(fullPath);
        const base64Image = imageBuffer.toString('base64');
        
        // Determine image type from extension
        const ext = path.extname(fullPath).toLowerCase();
        let imageType = 'JPEG'; // default
        if (ext === '.png') imageType = 'PNG';
        else if (ext === '.jpg' || ext === '.jpeg') imageType = 'JPEG';
        
        console.log(`✅ Image loaded: ${fullPath} (${imageType}, ${imageBuffer.length} bytes)`);
        
        return {
          data: base64Image,
          type: imageType,
          path: fullPath
        };
      } catch (error) {
        console.log(`❌ Error loading image ${imagePath}:`, error.message);
        return null;
      }
    }

    // Create new jsPDF instance
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Date formatting
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-ES', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    });
    const timeStr = now.toLocaleTimeString('es-ES', { 
      hour: '2-digit', minute: '2-digit' 
    });

    // ================== PÁGINA 1 - INFORME DE RESULTADOS ==================
    
    // Top divider line
    doc.setLineWidth(0.5);
    doc.line(20, 20, 190, 20);
    
    // Header
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Sistema de Votación – Reina ESPE 2024 – ${dateStr}, ${timeStr}`, 105, 30, { align: 'center' });
    doc.text(`Sangolquí, ${dateStr}`, 105, 38, { align: 'center' });
    
    // Logo placeholder (you can add actual logo here)
    doc.setFontSize(14);
    doc.setTextColor(128, 0, 128); // Purple for logo placeholder
    doc.text('[LOGO ESPE REINA centrado]', 105, 55, { align: 'center' });
    
    // Main title
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('INFORME DE RESULTADOS', 105, 70, { align: 'center' });
    
    // Subtitle
    doc.setFontSize(11);
    doc.text('Puntajes arrojados por el sistema informático', 105, 78, { align: 'center' });
    doc.text(`Hora de corte del sistema (GMT-05): ${timeStr} ${now.toLocaleDateString('es-ES')}`, 105, 86, { align: 'center' });
    
    // Divider line
    doc.setLineWidth(0.5);
    doc.line(20, 95, 190, 95);
    
    let yPos = 110;
    
    // Use allRankings if available, otherwise fall back to top3Rankings
    const rankings = safeReportData.allRankings.length > 0 ? safeReportData.allRankings : safeReportData.top3Rankings;
    
    if (rankings.length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      
      rankings.forEach((candidate, index) => {
        const rank = candidate.rank || index + 1;
        const name = String(candidate.candidate?.name || candidate.name || 'Sin nombre');
        const score = Number(candidate.finalScore || candidate.averageScore || 0);
        const maxScore = 150; // Assuming 150 is max based on format
        
        let title = '';
        if (rank === 1) title = 'Reina ESPE 2024';
        else if (rank === 2) title = 'Srta. Confraternidad';
        else if (rank === 3) title = 'Srta. Simpatía';
        
        // Title for top 3
        if (title) {
          doc.setFontSize(11);
          doc.setTextColor(0, 0, 0);
          doc.text(title, 25, yPos);
          yPos += 6;
        }
        
        // Ranking line with dots
        doc.setFontSize(10);
        const scoreText = `${score.toFixed(1)}/10.0 pts`; // Show real score over 10
        const baseLine = `Lugar ${rank}:  ${name}`;
        const dots = '.'.repeat(Math.max(5, 60 - baseLine.length - scoreText.length));
        
        doc.text(`${baseLine} ${dots} ${scoreText}`, 25, yPos);
        yPos += 8;
        
        // Add some spacing after top 3
        if (rank === 3) yPos += 5;
      });
    } else {
      doc.text('No hay resultados disponibles', 105, yPos, { align: 'center' });
    }
    
    // Bottom section - Veedor signature
    yPos = 250;
    doc.setLineWidth(0.5);
    doc.line(20, yPos, 190, yPos);
    
    yPos += 15;
    doc.setFontSize(10);
    doc.text('____________________', 105, yPos, { align: 'center' });
    yPos += 8;
    doc.text('Veedor', 105, yPos, { align: 'center' });
    yPos += 8;
    doc.text('Dr. Marcelo Mejía Mena', 105, yPos, { align: 'center' });
    yPos += 6;
    doc.text('CI 1803061033', 105, yPos, { align: 'center' });
    
    // Bottom divider and page number
    yPos += 10;
    doc.setLineWidth(0.5);
    doc.line(20, yPos, 190, yPos);
    doc.setFontSize(9);
    doc.text('Página 1 de 2', 190, yPos + 8, { align: 'right' });
    
    // ================== PÁGINA 2+ - PROCLAMACIÓN MEJORADA ==================
    doc.addPage();
    let currentPage = 2;
    
    // Function to add header on new page
    function addPageHeader(pageTitle = 'PROCLAMACIÓN DE GANADORAS') {
      // Top divider line
      doc.setLineWidth(0.5);
      doc.line(20, 20, 190, 20);
      
      // Header
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Sistema de Votación – Reina ESPE 2024 – ${dateStr}, ${timeStr}`, 105, 30, { align: 'center' });
      doc.text(`Sangolquí, ${dateStr}`, 105, 38, { align: 'center' });
      
      // Logo placeholder
      doc.setFontSize(14);
      doc.setTextColor(128, 0, 128);
      doc.text('[LOGO ESPE REINA centrado]', 105, 55, { align: 'center' });
      
      // Main title
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text(pageTitle, 105, 70, { align: 'center' });
      
      // Subtitle
      doc.setFontSize(11);
      doc.text(`Hora de corte del sistema (GMT-05): ${timeStr} ${now.toLocaleDateString('es-ES')}`, 105, 78, { align: 'center' });
      
      // Divider line
      doc.setLineWidth(0.5);
      doc.line(20, 85, 190, 85);
    }
    
    addPageHeader();
    yPos = 100;
    
    // Top 3 detailed proclamations with REAL PHOTOS (ALL IN ONE PAGE)
    if (rankings.length >= 3) {
      const winners = rankings.slice(0, 3);
      const titles = ['REINA ESPE 2024', 'SRTA. CONFRATERNIDAD', 'SRTA. SIMPATÍA'];
      
      for (let index = 0; index < winners.length; index++) {
        const winner = winners[index];
        const name = String(winner.candidate?.name || winner.name || 'Sin nombre');
        const career = String(winner.candidate?.career || winner.candidate?.major || winner.candidate?.department || 'Sin departamento');
        const score = Number(winner.finalScore || winner.averageScore || 0);
        const photoUrl = winner.candidate?.photo_url || winner.candidate?.image_url;
        
        // Title in BOLD and CENTERED
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(titles[index], 105, yPos, { align: 'center' });
        yPos += 6;
        
        // Name in normal font, centered
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(name, 105, yPos, { align: 'center' });
        yPos += 5;
        
        // Career and score centered
        doc.setFontSize(9);
        doc.text(`${career} – ${score.toFixed(1)}/10.0 pts`, 105, yPos, { align: 'center' });
        yPos += 8;
        
        // Load and add REAL PHOTO (compact size for single page)
        console.log(`📷 Loading photo for ${name}: ${photoUrl}`);
        const imageData = await loadImageAsBase64(photoUrl);
        
        if (imageData) {
          try {
            // Compact image size to fit all 3 on one page
            const imageWidth = 20; // Even smaller: 20mm
            const imageHeight = 25; // Even smaller: 25mm
            const imageX = (210 - imageWidth) / 2; // Center horizontally
            
            doc.addImage(
              `data:image/${imageData.type.toLowerCase()};base64,${imageData.data}`,
              imageData.type,
              imageX,
              yPos,
              imageWidth,
              imageHeight
            );
            
            console.log(`✅ Photo added to PDF for ${name} (${imageWidth}x${imageHeight}mm)`);
            yPos += imageHeight + 8; // Minimal spacing after image
          } catch (error) {
            console.log(`❌ Error adding image to PDF for ${name}:`, error.message);
            // Fallback to text
            doc.setFontSize(9);
            doc.setTextColor(128, 128, 128);
            doc.text(`[FOTO: ${name}]`, 105, yPos, { align: 'center' });
            yPos += 10;
          }
        } else {
          // Fallback to text if image couldn't be loaded
          doc.setFontSize(9);
          doc.setTextColor(128, 128, 128);
          doc.text(`[FOTO: ${name}]`, 105, yPos, { align: 'center' });
          yPos += 10;
        }
        
        // Separator line between winners (except last one)
        if (index < winners.length - 1) {
          doc.setLineWidth(0.2);
          doc.setDrawColor(220, 220, 220);
          doc.line(40, yPos, 170, yPos);
          yPos += 8;
        }
      }
    }
    
    // Bottom section - Veedor signature (on last page)
    // Ensure we're at the bottom of the page
    const finalYPos = Math.max(yPos + 20, 220);
    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 0, 0);
    doc.line(20, finalYPos, 190, finalYPos);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('____________________', 105, finalYPos + 15, { align: 'center' });
    doc.text('Veedor', 105, finalYPos + 23, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text('Dr. Marcelo Mejía Mena', 105, finalYPos + 31, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text('CI 1803061033', 105, finalYPos + 37, { align: 'center' });
    
    // Final page number
    doc.setLineWidth(0.5);
    doc.line(20, finalYPos + 47, 190, finalYPos + 47);
    doc.setFontSize(9);
    doc.text(`Página ${currentPage} de ${currentPage}`, 190, finalYPos + 55, { align: 'right' });
    
    // Convert to buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    if (pdfBuffer && Buffer.isBuffer(pdfBuffer) && pdfBuffer.length > 0) {
      console.log(`✅ PDF generated successfully: ${pdfBuffer.length} bytes`);
      return pdfBuffer;
    } else {
      throw new Error('PDF buffer is invalid or empty');
    }

  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    throw new Error(`PDF generation failed: ${error.message}`);
  }
}

// Simple session storage (in production use Redis or similar)
const activeSessions = new Map();

// Middleware to extract user from token
function extractUserFromToken(req, res, next) {
  const authHeader = req.headers.authorization;
  console.log(`🔐 Auth middleware - URL: ${req.method} ${req.url}`);
  console.log(`🔐 Auth header: ${authHeader ? authHeader.substring(0, 30) + '...' : 'NO HEADER'}`);
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    console.log(`🎫 Extracting token: ${token.substring(0, 30)}...`);
    
    const session = activeSessions.get(token);
    if (session) {
      req.user = session.user;
      console.log(`✅ User authenticated: ${req.user.email} (${req.user.role}) [ID: ${req.user.id}]`);
      
      // Update last activity
      session.lastActivity = new Date();
      console.log(`🕐 Session updated for user: ${req.user.email}`);
    } else {
      console.log(`❌ Session not found for token: ${token.substring(0, 30)}...`);
      console.log(`🔍 Active sessions count: ${activeSessions.size}`);
      
      // Log first few sessions for debugging
      let sessionCount = 0;
      for (const [sessionToken, sessionData] of activeSessions) {
        if (sessionCount < 3) {
          console.log(`  - Session ${sessionCount + 1}: ${sessionToken.substring(0, 20)}... -> ${sessionData.user.email} (${sessionData.user.role})`);
        }
        sessionCount++;
      }
      
      // For admin endpoints, return 401 if no valid session
      if (req.url.includes('/api/admin/')) {
        console.log(`❌ Admin endpoint requires authentication: ${req.url}`);
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado. Por favor, inicia sesión nuevamente.'
        });
      }
    }
  } else {
    console.log(`❌ No authorization header or invalid format for: ${req.url}`);
    
    // For admin endpoints, return 401 if no auth header
    if (req.url.includes('/api/admin/')) {
      console.log(`❌ Admin endpoint requires authentication header: ${req.url}`);
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
// Removed '/api/users' middleware - will handle auth inside each endpoint

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
    
    console.log('🔐 Login attempt:', { email, providedPassword: password, storedHash: user.password_hash });
    
    // Simple password check - multiple formats supported
    const isValidPassword = 
      user.password_hash === password || // Direct match (simple passwords)
      user.password_hash === `$2b$10$hashed_${password}` || // Hashed format
      user.password_hash === `$2b$10$example_hash_for_judge`; // For existing judges
    
    console.log('🔍 Password validation:', { isValidPassword });
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }
    
    // Remove password_hash from response
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
    console.log('🎫 Session created:', token);
    
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
    // Check if user is a judge
    if (!req.user || req.user.role !== 'judge') {
      return res.status(403).json({
        success: false,
        error: 'Solo los jueces pueden acceder a eventos activos'
      });
    }

    console.log(`🔍 Getting active events for judge: ${req.user.email}`);
    
    const result = await executeQuery(
      'SELECT * FROM events WHERE is_active = true ORDER BY created_at DESC'
    );
    
    console.log(`📊 Found ${result.rows.length} active events for judge ${req.user.email}`);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error getting active events:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Validate events weights
app.get('/api/events/validate-weights', async (req, res) => {
  try {
    console.log('🔍 Validating events weights...');
    
    // Get all mandatory events
    const mandatoryEvents = await executeQuery(
      'SELECT id, name, weight FROM events WHERE is_mandatory = true'
    );
    
    // Calculate total weight
    const totalWeight = mandatoryEvents.rows.reduce((sum, event) => {
      return sum + parseFloat(event.weight || 0);
    }, 0);
    
    // Get optional events
    const optionalEvents = await executeQuery(
      'SELECT id, name, bonus_percentage FROM events WHERE is_mandatory = false'
    );
    
    const validation = {
      mandatory: {
        events: mandatoryEvents.rows,
        totalWeight: totalWeight,
        isValid: Math.abs(totalWeight - 100) < 0.01 // Allow small floating point differences
      },
      optional: {
        events: optionalEvents.rows,
        count: optionalEvents.rows.length
      }
    };
    
    console.log('📊 Weight validation result:', validation);
    
    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('❌ Error validating weights:', error);
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

// Update event status
app.put('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, event_type, description, status, weight, is_mandatory, bonus_percentage, is_active } = req.body;
    
    // ============ NUEVO: Obtener estado anterior antes de actualizar ============
    const previousEventResult = await executeQuery('SELECT * FROM events WHERE id = $1', [id]);
    if (previousEventResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evento no encontrado'
      });
    }
    const previousEvent = previousEventResult.rows[0];
    const previousStatus = previousEvent.is_active;
    
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
    
    console.log('🔧 Datos de actualización validados:', updateData);
    // ===========================================================================
    
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
    
    const updatedEvent = result.rows[0];
    
    console.log('✅ Evento actualizado:', updatedEvent);
    
    // ============ NUEVO: Notificación WebSocket en tiempo real ============
    if (io) {
      // ============ NUEVO: Información detallada del cambio ============
      const statusChanged = is_active !== undefined && is_active !== previousStatus;
      
      console.log(`🔍 Status change detection: is_active=${is_active}, previousStatus=${previousStatus}, changed=${statusChanged}`);
      
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
          newStatus: is_active,
          processingTime: Date.now() // Para simular tiempo de procesamiento
        }
      };
      
      // Enviar notificación inmediata de inicio de procesamiento
      io.emit('event_updating_start', {
        type: 'event_updating',
        data: {
          eventId: updatedEvent.id,
          eventName: updatedEvent.name,
          action: statusChanged ? 'changing_status' : 'updating',
          timestamp: new Date().toISOString()
        }
      });
      
      console.log(`📡 WebSocket: Sent event_updating_start for ${updatedEvent.name}`);
      
      // Delay para simular procesamiento y hacer visible el cambio
      setTimeout(() => {
        // Enviar notificación de finalización
        io.emit('event_updated', notification);
        
        // Notificación especial si se cambió el estado activo
        if (statusChanged) {
          io.emit('system_notification', {
            type: is_active ? 'success' : 'warning',
            message: `📅 Evento "${updatedEvent.name}" ${is_active ? '✅ ACTIVADO' : '❌ DESACTIVADO'} por administrador`,
            eventId: updatedEvent.id,
            timestamp: new Date().toISOString(),
            changeDetails: {
              from: previousStatus ? 'ACTIVO' : 'INACTIVO',
              to: is_active ? 'ACTIVO' : 'INACTIVO'
            }
          });
        }
        
        console.log(`📡 WebSocket: Event updated - ${updatedEvent.name} (${statusChanged ? 'status changed' : 'general update'})`);
      }, 300); // 300ms delay para notificación visible
      // =================================================================
    }
    // =========================================================================
    
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
    console.log('📝 POST /api/events - Creando evento...');
    const { name, description, weight, is_mandatory, bonus_percentage, is_active } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Nombre del evento es requerido'
      });
    }

    // Validar peso si es obligatorio
    if (is_mandatory && (weight === undefined || weight <= 0)) {
      return res.status(400).json({
        success: false,
        error: 'Los eventos obligatorios deben tener un peso mayor a 0'
      });
    }

    // Validar que el peso esté en rango válido
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
    console.error('❌ Error en POST /api/events:', error);
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
    console.log('🔍 GET /api/candidates - Buscando candidatas...');
    const result = await executeQuery('SELECT * FROM candidates WHERE is_active = true ORDER BY name');
    console.log(`📊 Candidatas encontradas: ${result.rows.length}`);
    console.log('📋 Datos:', result.rows.map(c => ({ id: c.id, name: c.name, image_url: c.image_url })));
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error en GET /api/candidates:', error);
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
    console.log(`🔍 GET /api/candidates/${id}`);
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
    console.error(`❌ Error en GET /api/candidates/${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create candidate with photo upload
app.post('/api/candidates', upload.single('image'), async (req, res) => {
  try {
    console.log('📝 POST /api/candidates - Creando candidata...');
    console.log('📋 Body:', req.body);
    console.log('📷 File:', req.file ? { filename: req.file.filename, path: req.file.path, size: req.file.size } : 'No file');
    
    const { name, major, department, biography } = req.body;
    
    if (!name || !major || !department) {
      console.log('❌ Datos requeridos faltantes');
      return res.status(400).json({
        success: false,
        error: 'Nombre, carrera y departamento son requeridos'
      });
    }
    
    let image_url = null;
    if (req.file) {
      image_url = `/uploads/candidates/${req.file.filename}`;
      console.log(`📷 Imagen guardada: ${image_url}`);
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
    console.error('❌ Error en POST /api/candidates:', error);
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
    
    // Get current candidate to handle image update
    const currentResult = await executeQuery('SELECT * FROM candidates WHERE id = $1', [id]);
    
    if (currentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Candidata no encontrada'
      });
    }
    
    let image_url = currentResult.rows[0].image_url;
    
    // If new image is uploaded, update the image_url
    if (req.file) {
      image_url = `/uploads/candidates/${req.file.filename}`;
      
      // Optionally delete old image file
      if (currentResult.rows[0].image_url) {
        const oldImagePath = path.join(__dirname, currentResult.rows[0].image_url);
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
    
    // Get candidate to delete image file
    const candidateResult = await executeQuery('SELECT * FROM candidates WHERE id = $1', [id]);
    
    if (candidateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Candidata no encontrada'
      });
    }
    
    // Delete image file if exists
    if (candidateResult.rows[0].image_url) {
      const imagePath = path.join(__dirname, candidateResult.rows[0].image_url);
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
    
    console.log(`📝 POST /api/scores - Request from: ${req.ip}`);
    console.log(`📝 Request body:`, { candidate_id, event_id, score });
    console.log(`📝 Auth header:`, req.headers.authorization?.substring(0, 50) + '...');
    
    // Check if user is authenticated and is a judge
    if (!req.user) {
      console.log(`❌ No user in request - authentication failed`);
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }
    
    console.log(`👤 Authenticated user:`, {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      full_name: req.user.full_name
    });
    
    if (req.user.role !== 'judge') {
      console.log(`❌ User role "${req.user.role}" is not judge`);
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
    
    console.log('📝 Submitting score:', { 
      judge_id, 
      judge_name: req.user.full_name, 
      judge_email: req.user.email,
      candidate_id, 
      event_id, 
      score 
    });
    
    // Check if judge already scored this candidate for this event
    const existingScore = await executeQuery(
      'SELECT id, score FROM judge_scores WHERE judge_id = $1 AND candidate_id = $2 AND event_id = $3',
      [judge_id, candidate_id, event_id]
    );
    
    console.log(`🔍 Existing score check:`, existingScore.rows.length > 0 ? 
      `Found existing score: ${existingScore.rows[0].score}` : 
      'No existing score found'
    );
    
    if (existingScore.rows.length > 0) {
      // Update existing score
      const result = await executeQuery(
        'UPDATE judge_scores SET score = $1, updated_at = NOW() WHERE judge_id = $2 AND candidate_id = $3 AND event_id = $4 RETURNING *',
        [score, judge_id, candidate_id, event_id]
      );
      
      console.log('✅ Score updated:', {
        id: result.rows[0].id,
        judge_id: result.rows[0].judge_id,
        candidate_id: result.rows[0].candidate_id,
        event_id: result.rows[0].event_id,
        score: result.rows[0].score,
        updated_at: result.rows[0].updated_at
      });

      // ============ NUEVO: Notificación WebSocket para monitoreo en tiempo real ============
      if (io) {
        // Obtener información adicional para la notificación
        const candidateInfo = await executeQuery(
          'SELECT name FROM candidates WHERE id = $1',
          [candidate_id]
        );
        
        const eventInfo = await executeQuery(
          'SELECT name FROM events WHERE id = $1',
          [event_id]
        );

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
        
        // Enviar a notarios específicamente
        io.emit('judge_vote_update', notification);
        
        console.log(`📡 WebSocket: Judge vote updated - ${req.user.full_name} scored ${score} for ${candidateInfo.rows[0]?.name} in ${eventInfo.rows[0]?.name}`);
      }
      // ========================================================================================
      
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
      
      console.log('✅ Score created:', {
        id: result.rows[0].id,
        judge_id: result.rows[0].judge_id,
        candidate_id: result.rows[0].candidate_id,
        event_id: result.rows[0].event_id,
        score: result.rows[0].score,
        created_at: result.rows[0].created_at
      });

      // ============ NUEVO: Notificación WebSocket para monitoreo en tiempo real ============
      if (io) {
        // Obtener información adicional para la notificación
        const candidateInfo = await executeQuery(
          'SELECT name FROM candidates WHERE id = $1',
          [candidate_id]
        );
        
        const eventInfo = await executeQuery(
          'SELECT name FROM events WHERE id = $1',
          [event_id]
        );

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
        
        // Enviar a notarios específicamente
        io.emit('judge_vote_update', notification);
        
        console.log(`📡 WebSocket: Judge vote created - ${req.user.full_name} scored ${score} for ${candidateInfo.rows[0]?.name} in ${eventInfo.rows[0]?.name}`);
      }
      // ========================================================================================
      
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

// Get scores by event
app.get('/api/scores/event/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const result = await executeQuery(
      'SELECT js.*, c.name as candidate_name FROM judge_scores js JOIN candidates c ON js.candidate_id = c.id WHERE js.event_id = $1 ORDER BY js.created_at DESC',
      [eventId]
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

// Get my scores (for current judge)
app.get('/api/scores/my-scores', async (req, res) => {
  try {
    // Check if user is authenticated and is a judge
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
    
    console.log(`🔍 GET /api/scores/my-scores - Getting scores for judge: ${judge_id} (${req.user.full_name})`);
    
    const result = await executeQuery(
      'SELECT js.*, c.name as candidate_name, e.name as event_name FROM judge_scores js JOIN candidates c ON js.candidate_id = c.id JOIN events e ON js.event_id = e.id WHERE js.judge_id = $1 ORDER BY js.created_at DESC',
      [judge_id]
    );
    
    console.log(`📊 Found ${result.rows.length} scores for judge ${req.user.full_name}`);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error getting my scores:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== VOTES ENDPOINTS ====================

// Submit vote
app.post('/api/votes', async (req, res) => {
  try {
    const { candidate_id } = req.body;
    const voter_ip = req.ip;
    const voter_session = 'mock-session-' + Date.now();
    
    if (!candidate_id) {
      return res.status(400).json({
        success: false,
        error: 'candidate_id es requerido'
      });
    }
    
    const result = await executeQuery(
      'INSERT INTO public_votes (voter_ip, voter_session, candidate_id) VALUES ($1, $2, $3) RETURNING *',
      [voter_ip, voter_session, candidate_id]
    );
    
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

// Get voting results
app.get('/api/votes/results', async (req, res) => {
  try {
    const result = await executeQuery(`
      SELECT 
        c.id as candidate_id,
        c.name as candidate_name,
        COUNT(pv.id) as vote_count
      FROM candidates c
      LEFT JOIN public_votes pv ON c.id = pv.candidate_id
      WHERE c.is_active = true
      GROUP BY c.id, c.name
      ORDER BY vote_count DESC
    `);
    
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

// Get all users (for superadmin)
app.get('/api/users', extractUserFromToken, async (req, res) => {
  try {
    // Check if user is authenticated and has admin privileges
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
    
    console.log('🔍 GET /api/users - Getting all users...');
    const result = await executeQuery(
      'SELECT id, email, full_name, role, is_active, created_at, updated_at FROM users ORDER BY created_at DESC'
    );
    
    console.log(`📊 Found ${result.rows.length} users`);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error getting users:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create user
app.post('/api/users', extractUserFromToken, async (req, res) => {
  try {
    // Check if user is authenticated and has admin privileges
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
    
    console.log('📝 Creating user:', { email, full_name, role });
    
    // Simple password storage (in production, use bcrypt properly)
    let password_hash;
    if (password) {
      password_hash = password; // Store simple password for easy testing
    } else {
      password_hash = '123456'; // Default simple password
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
    console.error('❌ Error creating user:', error);
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

// Update user
app.put('/api/users/:id', extractUserFromToken, async (req, res) => {
  try {
    // Check if user is authenticated and has admin privileges
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }
    
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Solo los administradores pueden actualizar usuarios'
      });
    }
    
    const { id } = req.params;
    const { email, full_name, role, is_active, password } = req.body;
    
    console.log('📝 Updating user:', { id, email, full_name, role, is_active, hasPassword: !!password });
    
    let updateQuery, updateParams;
    
    if (password) {
      // Update with password change
      updateQuery = 'UPDATE users SET email = $1, full_name = $2, role = $3, is_active = $4, password_hash = $5, updated_at = NOW() WHERE id = $6 RETURNING id, email, full_name, role, is_active, created_at, updated_at';
      updateParams = [email, full_name, role, is_active, password, id]; // Simple password storage for testing
    } else {
      // Update without password change
      updateQuery = 'UPDATE users SET email = $1, full_name = $2, role = $3, is_active = $4, updated_at = NOW() WHERE id = $5 RETURNING id, email, full_name, role, is_active, created_at, updated_at';
      updateParams = [email, full_name, role, is_active, id];
    }
    
    const result = await executeQuery(updateQuery, updateParams);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }
    
    console.log('✅ User updated:', result.rows[0]);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error updating user:', error);
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

// Delete user
app.delete('/api/users/:id', extractUserFromToken, async (req, res) => {
  try {
    // Check if user is authenticated and has admin privileges
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }
    
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Solo los administradores pueden eliminar usuarios'
      });
    }
    
    const { id } = req.params;
    
    console.log('🗑️ Deleting user:', id);
    
    const result = await executeQuery('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }
    
    console.log('✅ User deleted:', id);
    
    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    });
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== JUDGE MONITORING ENDPOINTS ====================

// Get all judges
app.get('/api/judges', async (req, res) => {
  try {
    console.log('🔍 GET /api/judges - Getting all judges...');
    const result = await executeQuery(
      'SELECT id, email, full_name, is_active, created_at FROM users WHERE role = $1 ORDER BY full_name',
      ['judge']
    );
    
    console.log(`📊 Found ${result.rows.length} judges`);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error getting judges:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get judge voting status for all events and candidates
app.get('/api/judges/voting-status', async (req, res) => {
  try {
    console.log('🔍 GET /api/judges/voting-status - Getting voting status...');
    
    // Get all judges
    const judges = await executeQuery(
      'SELECT id, full_name, email FROM users WHERE role = $1 AND is_active = true ORDER BY full_name',
      ['judge']
    );
    
    // Get all active events
    const events = await executeQuery(
      'SELECT id, name, event_type FROM events ORDER BY created_at'
    );
    
    // Get all active candidates
    const candidates = await executeQuery(
      'SELECT id, name FROM candidates WHERE is_active = true ORDER BY name'
    );
    
    // Get all existing scores
    const scores = await executeQuery(
      'SELECT judge_id, candidate_id, event_id, score, created_at FROM judge_scores'
    );
    
    // Build voting status matrix
    const votingStatus = judges.rows.map(judge => {
      const judgeStatus = {
        judge: {
          id: judge.id,
          name: judge.full_name,
          email: judge.email
        },
        events: events.rows.map(event => {
          const eventStatus = {
            event: {
              id: event.id,
              name: event.name,
              type: event.event_type
            },
            candidates: candidates.rows.map(candidate => {
              const score = scores.rows.find(s => 
                s.judge_id === judge.id && 
                s.candidate_id === candidate.id && 
                s.event_id === event.id
              );
              
              return {
                candidate: {
                  id: candidate.id,
                  name: candidate.name
                },
                hasVoted: !!score,
                score: score ? score.score : null,
                votedAt: score ? score.created_at : null
              };
            })
          };
          
          // Calculate progress for this event
          const totalCandidates = candidates.rows.length;
          const votedCount = eventStatus.candidates.filter(c => c.hasVoted).length;
          eventStatus.progress = {
            voted: votedCount,
            total: totalCandidates,
            percentage: totalCandidates > 0 ? Math.round((votedCount / totalCandidates) * 100) : 0
          };
          
          return eventStatus;
        })
      };
      
      // Calculate overall progress for this judge
      const totalVotes = events.rows.length * candidates.rows.length;
      const completedVotes = judgeStatus.events.reduce((sum, event) => sum + event.progress.voted, 0);
      judgeStatus.overallProgress = {
        voted: completedVotes,
        total: totalVotes,
        percentage: totalVotes > 0 ? Math.round((completedVotes / totalVotes) * 100) : 0
      };
      
      return judgeStatus;
    });
    
    console.log(`📊 Voting status calculated for ${judges.rows.length} judges, ${events.rows.length} events, ${candidates.rows.length} candidates`);
    
    res.json({
      success: true,
      data: {
        judges: votingStatus,
        summary: {
          totalJudges: judges.rows.length,
          totalEvents: events.rows.length,
          totalCandidates: candidates.rows.length,
          totalPossibleVotes: judges.rows.length * events.rows.length * candidates.rows.length,
          completedVotes: scores.rows.length
        }
      }
    });
  } catch (error) {
    console.error('❌ Error getting voting status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== ADMIN ENDPOINTS ====================

// Reset all votes/scores (Admin only)
app.delete('/api/admin/reset-votes', extractUserFromToken, async (req, res) => {
  try {
    // Check if user is authenticated and has admin privileges
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
    
    console.log(`🗑️ RESET VOTES - Admin ${req.user.email} is resetting all votes/scores`);
    
    // Begin transaction to ensure atomicity
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Get counts before deletion for logging
      const scoresResult = await client.query('SELECT COUNT(*) FROM judge_scores');
      const votesResult = await client.query('SELECT COUNT(*) FROM public_votes');
      
      const scoresCount = parseInt(scoresResult.rows[0].count);
      const votesCount = parseInt(votesResult.rows[0].count);
      
      // Delete all judge scores
      await client.query('DELETE FROM judge_scores');
      
      // Delete all public votes
      await client.query('DELETE FROM public_votes');
      
      // ============ NUEVO: Limpiar desempates activos ============
      console.log('🧹 Limpiando desempates activos...');
      
      // Eliminar desempate activo del sistema
      await client.query("DELETE FROM system_settings WHERE setting_key = 'active_tiebreaker'");
      
      // Eliminar tabla de votos de desempate si existe
      await client.query('DROP TABLE IF EXISTS tiebreaker_scores');
      
      console.log('✅ Desempates activos eliminados');
      // =========================================================
      
      await client.query('COMMIT');
      
      console.log(`✅ RESET COMPLETE - Deleted ${scoresCount} judge scores, ${votesCount} public votes, and cleared tiebreakers`);
      
      // Enviar notificación WebSocket para informar que se eliminó el tiebreaker
      if (io) {
        io.emit('tiebreaker_cleared', {
          type: 'tiebreaker_cleared',
          message: 'Desempates eliminados por reinicio del sistema',
          timestamp: new Date().toISOString(),
          clearedBy: req.user.email
        });
        console.log('📢 WebSocket notification sent: tiebreaker cleared');
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
    console.error('❌ Error resetting votes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== REPORTS ENDPOINTS ====================

// Generate comprehensive report with top rankings
app.post('/api/admin/reports/generate', extractUserFromToken, async (req, res) => {
  try {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
      return res.status(403).json({
        success: false,
        error: 'Solo los administradores pueden generar reportes'
      });
    }

    const { event, dateFrom, dateTo, format } = req.body;
    
    console.log(`📊 Generating report for event: ${event}, format: ${format}`);
    console.log(`📊 Request body:`, { event, dateFrom, dateTo, format });

    // Get candidates with their details (usando major en lugar de career)
    const candidatesQuery = `
      SELECT c.id, c.name, c.major as career, c.image_url as photo_url, c.department as faculty
      FROM candidates c 
      WHERE c.is_active = true 
      ORDER BY c.name
    `;
    const candidatesResult = await executeQuery(candidatesQuery);

    // Get events based on filter
    let eventsQuery = 'SELECT id, name FROM events ORDER BY created_at';
    const eventsResult = await executeQuery(eventsQuery);

    // Build scores query with proper event filtering
    let scoresQuery = `
      SELECT 
        js.candidate_id, 
        js.event_id, 
        js.score, 
        js.created_at,
        u.full_name as judge_name,
        e.name as event_name
      FROM judge_scores js
      JOIN users u ON js.judge_id = u.id
      JOIN events e ON js.event_id = e.id
      WHERE 1=1
    `;
    
    const scoresParams = [];
    let paramCounter = 1;

    // Add event filter if specific event is selected
    // Handle both '' and 'all' as no filter, and any specific event ID
    if (event && event !== 'all' && event !== '') {
      scoresQuery += ` AND js.event_id = $${paramCounter}`;
      scoresParams.push(parseInt(event)); // Asegurar que sea número
      paramCounter++;
      console.log(`🎯 Filtering by specific event: ${event}`);
    } else {
      console.log(`🎯 No event filter - showing all events (event value: "${event}")`);
    }

    if (dateFrom) {
      scoresQuery += ` AND js.created_at >= $${paramCounter}`;
      scoresParams.push(dateFrom);
      paramCounter++;
    }
    
    if (dateTo) {
      scoresQuery += ` AND js.created_at <= $${paramCounter}`;
      scoresParams.push(dateTo);
      paramCounter++;
    }

    scoresQuery += ' ORDER BY js.created_at DESC';

    console.log(`📊 Executing scores query with ${scoresParams.length} parameters:`, scoresParams);
    const scoresResult = await executeQuery(scoresQuery, scoresParams);
    console.log(`📊 Scores query returned ${scoresResult.rows.length} rows`);

    if (scoresResult.rows.length === 0) {
      console.log('⚠️ No scores found for the selected criteria');
      
      if (format === 'pdf') {
        // Generate empty PDF report
        const emptyReportData = {
          generatedAt: new Date().toISOString(),
          generatedBy: req.user.full_name,
          filters: { event, dateFrom, dateTo },
          events: eventsResult.rows,
          totalCandidates: candidatesResult.rows.length,
          totalScores: 0,
          top3Rankings: [],
          allRankings: [],
          eventBreakdown: []
        };
        
        const pdfBuffer = await generatePDF(emptyReportData, format);
        if (pdfBuffer) {
          const fileName = `Reporte_Sin_Datos_${new Date().toISOString().split('T')[0]}.pdf`;
          res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${fileName}"`,
            'Content-Length': pdfBuffer.length.toString()
          });
          return res.end(pdfBuffer);
        }
      }
      
      return res.json({
        success: true,
        data: {
          generatedAt: new Date().toISOString(),
          generatedBy: req.user.full_name,
          filters: { event, dateFrom, dateTo },
          events: eventsResult.rows,
          totalCandidates: candidatesResult.rows.length,
          totalScores: 0,
          top3Rankings: [],
          allRankings: [],
          eventBreakdown: []
        },
        message: `No se encontraron calificaciones para los criterios seleccionados`
      });
    }

    // Calculate rankings based on the filtered scores
    const candidateScores = {};
    
    candidatesResult.rows.forEach(candidate => {
      candidateScores[candidate.id] = {
        candidate: candidate,
        totalScore: 0,
        eventScores: {},
        averageScore: 0,
        judgeCount: 0
      };
    });

    // Process scores
    scoresResult.rows.forEach(score => {
      if (candidateScores[score.candidate_id]) {
        candidateScores[score.candidate_id].totalScore += parseFloat(score.score);
        candidateScores[score.candidate_id].judgeCount++;
        
        if (!candidateScores[score.candidate_id].eventScores[score.event_id]) {
          candidateScores[score.candidate_id].eventScores[score.event_id] = [];
        }
        candidateScores[score.candidate_id].eventScores[score.event_id].push({
          score: parseFloat(score.score),
          judge: score.judge_name,
          date: score.created_at
        });
      }
    });

    // Calculate averages and rank candidates
    const rankedCandidates = Object.values(candidateScores)
      .map(candidate => {
        candidate.averageScore = candidate.judgeCount > 0 
          ? candidate.totalScore / candidate.judgeCount 
          : 0;
        return candidate;
      })
      .filter(candidate => candidate.judgeCount > 0) // Only include candidates with scores
      .sort((a, b) => b.averageScore - a.averageScore);

    console.log(`📈 Ranked ${rankedCandidates.length} candidates with scores`);

    // Get top 3
    const top3 = rankedCandidates.slice(0, 3).map((candidate, index) => ({
      rank: index + 1,
      candidate: candidate.candidate,
      finalScore: Math.round(candidate.averageScore * 100) / 100,
      judgeCount: candidate.judgeCount
    }));

    const reportData = {
      generatedAt: new Date().toISOString(),
      generatedBy: req.user.full_name,
      filters: { event, dateFrom, dateTo },
      events: eventsResult.rows,
      totalCandidates: candidatesResult.rows.length,
      totalScores: scoresResult.rows.length,
      top3Rankings: top3,
      allRankings: rankedCandidates.map((candidate, index) => ({
        rank: index + 1,
        candidate: candidate.candidate,
        finalScore: Math.round(candidate.averageScore * 100) / 100,
        judgeCount: candidate.judgeCount
      })),
      eventBreakdown: eventsResult.rows.map(eventItem => {
        const eventCandidates = rankedCandidates
          .filter(candidate => candidate.eventScores[eventItem.id])
          .map(candidate => ({
            ...candidate.candidate,
            scores: candidate.eventScores[eventItem.id],
            averageForEvent: candidate.eventScores[eventItem.id].reduce((sum, s) => sum + s.score, 0) / candidate.eventScores[eventItem.id].length
          }))
          .sort((a, b) => b.averageForEvent - a.averageForEvent);

        return {
          event: eventItem,
          candidates: eventCandidates.slice(0, 10) // Top 10 per event
        };
      })
    };

    // If PDF format, generate and send the PDF file
    if (format === 'pdf') {
      console.log('🔄 Generating PDF...');
      const pdfBuffer = await generatePDF(reportData, format);
      
      if (pdfBuffer && Buffer.isBuffer(pdfBuffer) && pdfBuffer.length > 0) {
        const eventName = event === 'all' ? 'Completo' : eventsResult.rows.find(e => e.id.toString() === event)?.name || 'Evento';
        const fileName = `Reporte_${eventName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        
        res.writeHead(200, {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Content-Length': pdfBuffer.length.toString(),
          'Content-Transfer-Encoding': 'binary',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Accept-Ranges': 'bytes'
        });
        
        console.log(`✅ PDF generated successfully: ${fileName} (${pdfBuffer.length} bytes)`);
        return res.end(pdfBuffer);
      } else {
        throw new Error('PDF buffer is invalid or empty');
      }
    }

    console.log(`✅ Report generated with ${top3.length} top candidates`);

    res.json({
      success: true,
      data: reportData,
      message: `Reporte generado exitosamente con ${rankedCandidates.length} candidatas calificadas`
    });

  } catch (error) {
    console.error('❌ Error generating report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Quick PDF download endpoint
app.post('/api/admin/reports/download-pdf', extractUserFromToken, async (req, res) => {
  try {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
      return res.status(403).json({
        success: false,
        error: 'Solo los administradores pueden descargar reportes'
      });
    }

    // Generate report data first (reuse logic from generate endpoint)
    const candidatesQuery = `
      SELECT c.id, c.name, c.major as career, c.image_url as photo_url, c.department as faculty
      FROM candidates c 
      WHERE c.is_active = true 
      ORDER BY c.name
    `;
    const candidatesResult = await executeQuery(candidatesQuery);

    const eventsQuery = 'SELECT id, name, event_type FROM events ORDER BY created_at';
    const eventsResult = await executeQuery(eventsQuery);

    const scoresQuery = `
      SELECT 
        js.candidate_id, 
        js.event_id, 
        js.score, 
        js.created_at,
        u.full_name as judge_name
      FROM judge_scores js
      JOIN users u ON js.judge_id = u.id
    `;
    const scoresResult = await executeQuery(scoresQuery);

    // Calculate rankings (same logic as above)
    const candidateScores = {};
    
    candidatesResult.rows.forEach(candidate => {
      candidateScores[candidate.id] = {
        candidate: candidate,
        totalScore: 0,
        eventScores: {},
        averageScore: 0,
        judgeCount: 0
      };
    });

    scoresResult.rows.forEach(score => {
      if (candidateScores[score.candidate_id]) {
        candidateScores[score.candidate_id].totalScore += parseFloat(score.score);
        candidateScores[score.candidate_id].judgeCount++;
        
        if (!candidateScores[score.candidate_id].eventScores[score.event_id]) {
          candidateScores[score.candidate_id].eventScores[score.event_id] = [];
        }
        candidateScores[score.candidate_id].eventScores[score.event_id].push({
          score: parseFloat(score.score),
          judge: score.judge_name,
          date: score.created_at
        });
      }
    });

    const rankedCandidates = Object.values(candidateScores)
      .map(candidate => {
        candidate.averageScore = candidate.judgeCount > 0 
          ? candidate.totalScore / candidate.judgeCount 
          : 0;
        return candidate;
      })
      .filter(candidate => candidate.judgeCount > 0)
      .sort((a, b) => b.averageScore - a.averageScore);

    const top3 = rankedCandidates.slice(0, 3).map((candidate, index) => ({
      rank: index + 1,
      ...candidate,
      finalScore: Math.round(candidate.averageScore * 100) / 100
    }));

    const reportData = {
      generatedAt: new Date().toISOString(),
      generatedBy: req.user.full_name,
      filters: { event: 'all' },
      events: eventsResult.rows,
      totalCandidates: candidatesResult.rows.length,
      totalScores: scoresResult.rows.length,
      top3Rankings: top3,
      allRankings: rankedCandidates.map((candidate, index) => ({
        rank: index + 1,
        ...candidate,
        finalScore: Math.round(candidate.averageScore * 100) / 100
      }))
    };

    console.log('🔄 Generating PDF for download...');
    const pdfBuffer = await generatePDF(reportData, 'pdf');
    
    if (pdfBuffer && Buffer.isBuffer(pdfBuffer) && pdfBuffer.length > 0) {
      const fileName = `Reporte_Reina_ESPE_2025_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Set comprehensive headers for PDF
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Content-Transfer-Encoding': 'binary',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Accept-Ranges': 'bytes'
      });
      
      console.log(`✅ PDF download ready: ${fileName} (${pdfBuffer.length} bytes)`);
      
      // Send the buffer as binary data
      return res.end(pdfBuffer);
    } else {
      throw new Error('PDF buffer is invalid or empty');
    }

  } catch (error) {
    console.error('❌ Error downloading PDF:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get statistics for dashboard
app.get('/api/admin/reports/stats', extractUserFromToken, async (req, res) => {
  try {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
      return res.status(403).json({
        success: false,
        error: 'Solo los administradores pueden ver estadísticas'
      });
    }

    // Total votes (try public votes, fallback to 0)
    let totalVotes = 0;
    try {
      const votesResult = await executeQuery('SELECT COUNT(*) as count FROM public_votes');
      totalVotes = parseInt(votesResult.rows[0].count) || 0;
    } catch (e) {
      console.log('ℹ️ public_votes table not accessible, using 0');
    }

    // Total scores (judge scores) 
    const scoresResult = await executeQuery('SELECT COUNT(*) as count FROM judge_scores');
    const totalScores = parseInt(scoresResult.rows[0].count);

    // Active users (simplified - just count distinct judges in last 24 hours)
    let activeUsers = 0;
    try {
      const activeUsersResult = await executeQuery(`
        SELECT COUNT(DISTINCT judge_id) as count 
        FROM judge_scores 
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `);
      activeUsers = parseInt(activeUsersResult.rows[0].count) || 0;
    } catch (e) {
      console.log('ℹ️ Error getting active users, using 0');
    }

    // Participation rate (judges who have started scoring)
    const judgesResult = await executeQuery("SELECT COUNT(*) as count FROM users WHERE role = 'judge'");
    const totalJudges = parseInt(judgesResult.rows[0].count);
    
    const activeJudgesResult = await executeQuery(`
      SELECT COUNT(DISTINCT judge_id) as count FROM judge_scores
    `);
    const activeJudges = parseInt(activeJudgesResult.rows[0].count);
    
    const participationRate = totalJudges > 0 ? Math.round((activeJudges / totalJudges) * 100) : 0;

    // Reports generated (we'll track this in a simple way)
    const reportsGenerated = 5; // Simple counter

    res.json({
      success: true,
      data: {
        totalVotes,
        totalScores,
        activeUsers,
        participationRate: `${participationRate}%`,
        reportsGenerated
      }
    });

  } catch (error) {
    console.error('❌ Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== TIE-BREAKING ENDPOINTS ====================

// Get current tie situations - IMPROVED ALGORITHM
app.get('/api/admin/ties/current', extractUserFromToken, async (req, res) => {
  try {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
      return res.status(403).json({
        success: false,
        error: 'Solo los administradores pueden ver empates'
      });
    }

    console.log('🎯 IMPROVED: Checking ties for TOP 3 positions with enhanced algorithm...');

    // Calculate current rankings to detect ties
    const candidatesResult = await executeQuery(`
      SELECT c.id, c.name, c.major as career, c.image_url as photo_url 
      FROM candidates c 
      WHERE c.is_active = true
    `);

    const scoresResult = await executeQuery(`
      SELECT 
        candidate_id, 
        AVG(score) as average_score, 
        COUNT(*) as score_count,
        SUM(score) as total_score
      FROM judge_scores 
      GROUP BY candidate_id
      HAVING COUNT(*) > 0
    `);

    if (scoresResult.rows.length === 0) {
      console.log('ℹ️ No scores found, no ties to detect');
      return res.json({
        success: true,
        data: {
          ties: [],
          hasActiveTies: false,
          totalCandidatesInTies: 0,
          message: 'No hay calificaciones disponibles para detectar empates'
        }
      });
    }

    // ============ ENHANCED: Create ranking with improved scoring ============
    const rankings = scoresResult.rows
      .map(score => {
        const candidate = candidatesResult.rows.find(c => c.id === score.candidate_id);
        const averageScore = parseFloat(score.average_score);
        const totalScore = parseFloat(score.total_score);
        const scoreCount = parseInt(score.score_count);
        
        return {
          candidate,
          averageScore,
          totalScore,
          scoreCount,
          // Usar 3 decimales para mejor precisión en empates
          preciseScore: Math.round(averageScore * 1000) / 1000
        };
      })
      .filter(ranking => ranking.candidate) // Solo candidatas que existen
      .sort((a, b) => {
        // Ordenar por promedio primero, luego por total si hay empate
        if (b.preciseScore !== a.preciseScore) {
          return b.preciseScore - a.preciseScore;
        }
        return b.totalScore - a.totalScore;
      });

    console.log(`📊 Enhanced rankings calculated for ${rankings.length} candidates`);

    // ============ ENHANCED: Detectar empates con algoritmo mejorado ============
    const ties = [];
    const processedCandidates = new Set();

    // Analizar cada posición para detectar empates
    for (let position = 1; position <= 3 && position <= rankings.length; position++) {
      const currentCandidate = rankings[position - 1];
      
      if (processedCandidates.has(currentCandidate.candidate.id)) {
        continue; // Ya procesada en un empate anterior
      }

      // Buscar todas las candidatas con el mismo puntaje
      const tiedCandidates = rankings.filter(r => 
        !processedCandidates.has(r.candidate.id) &&
        Math.abs(r.preciseScore - currentCandidate.preciseScore) < 0.001 // Tolerancia de 0.001
      );

      if (tiedCandidates.length > 1) {
        // ============ ENHANCED: Calcular puntos de bonificación correctos ============
        let bonusPoints, tieDescription;
        
        switch (position) {
          case 1:
            bonusPoints = 2; // Bonificación para primer lugar
            tieDescription = 'Empate por el 1er lugar (Reina ESPE)';
            break;
          case 2:
            bonusPoints = 1.5; // Bonificación para segundo lugar
            tieDescription = 'Empate por el 2do lugar (Srta. Confraternidad)';
            break;
          case 3:
            bonusPoints = 1; // Bonificación para tercer lugar
            tieDescription = 'Empate por el 3er lugar (Srta. Simpatía)';
            break;
          default:
            continue; // No procesar empates fuera del TOP 3
        }

        // ============ ENHANCED: Proteger posiciones superiores ============
        // Si hay empate en posición 2 o 3, verificar que no afecte posiciones superiores
        const protectionBonus = position > 1 ? 0.5 : 0; // Bonificación de protección

        console.log(`🎯 Tie detected at position ${position}:`, {
          candidates: tiedCandidates.length,
          score: currentCandidate.preciseScore,
          bonusPoints,
          protectionBonus,
          description: tieDescription
        });

        ties.push({
          score: currentCandidate.preciseScore,
          position: position,
          description: tieDescription,
          candidates: tiedCandidates.map(tc => tc.candidate),
          candidateCount: tiedCandidates.length,
          bonusPoints: bonusPoints,
          protectionBonus: protectionBonus, // Para proteger posiciones superiores
          tieId: `enhanced_tie_${position}_${Date.now()}`,
          // ============ ENHANCED: Información adicional ============
          algorithm: 'enhanced_v2',
          totalAffectedPositions: tiedCandidates.length,
          winnerBonusPoints: bonusPoints,
          nonWinnerBonusPoints: protectionBonus,
          metadata: {
            originalScore: currentCandidate.averageScore,
            preciseScore: currentCandidate.preciseScore,
            candidates: tiedCandidates.map(tc => ({
              id: tc.candidate.id,
              name: tc.candidate.name,
              originalScore: tc.averageScore,
              totalScore: tc.totalScore,
              scoreCount: tc.scoreCount
            }))
          }
        });

        // Marcar todas las candidatas empatadas como procesadas
        tiedCandidates.forEach(tc => {
          processedCandidates.add(tc.candidate.id);
        });
      } else {
        // Marcar candidata sin empate como procesada
        processedCandidates.add(currentCandidate.candidate.id);
      }
    }

    // ============ ENHANCED: Log detallado del resultado ============
    console.log(`🎯 Enhanced tie detection complete: ${ties.length} ties found`);
    ties.forEach((tie, index) => {
      console.log(`  Tie ${index + 1}:`, {
        position: tie.position,
        candidates: tie.candidateCount,
        description: tie.description,
        bonusPoints: tie.bonusPoints,
        protectionBonus: tie.protectionBonus
      });
    });
    
    res.json({
      success: true,
      data: {
        ties,
        hasActiveTies: ties.length > 0,
        totalCandidatesInTies: ties.reduce((sum, tie) => sum + tie.candidateCount, 0),
        algorithm: 'enhanced_v2',
        top3Rankings: rankings.slice(0, 3).map((ranking, index) => ({
          position: index + 1,
          candidate: ranking.candidate,
          averageScore: ranking.averageScore,
          preciseScore: ranking.preciseScore,
          totalScore: ranking.totalScore,
          scoreCount: ranking.scoreCount
        })),
        // ============ ENHANCED: Información de algoritmo mejorado ============
        algorithmInfo: {
          version: '2.0',
          improvements: [
            'Precisión de 3 decimales para mejor detección',
            'Puntos de bonificación ajustados (2, 1.5, 1)',
            'Protección de posiciones superiores (+0.5)',
            'Ordenamiento por promedio + total como desempate',
            'Metadata completa para auditoria'
          ],
          bonusStructure: {
            position1: { winner: 2, protection: 0 },
            position2: { winner: 1.5, protection: 0.5 },
            position3: { winner: 1, protection: 0.5 }
          }
        }
      }
    });

  } catch (error) {
    console.error('❌ Error getting enhanced ties:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Activate tie-breaking mode
app.post('/api/admin/ties/activate', extractUserFromToken, async (req, res) => {
  try {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
      return res.status(403).json({
        success: false,
        error: 'Solo los administradores pueden activar desempates'
      });
    }

    const { tieId, candidates, position, description } = req.body;
    
    console.log(`🎯 Tie-breaking activated by ${req.user.email} for ${candidates.length} candidates`);
    console.log(`📍 Position: ${position}, Description: ${description}`);
    
    // Obtener datos completos de las candidatas con fotos
    const candidateIds = candidates.map(c => `'${c.id}'`).join(',');
    const candidatesData = await executeQuery(`
      SELECT id, name, major as career, image_url as photo_url 
      FROM candidates 
      WHERE id IN (${candidateIds}) AND is_active = true
    `);
    
    console.log(`📷 Candidatas con fotos obtenidas:`, candidatesData.rows.map(c => ({
      name: c.name, 
      photo_url: c.photo_url
    })));
    
    // Calcular bonificación por posición
    const getBonusPointsForPosition = (pos) => {
      switch (pos) {
        case 1: return 5; // Primer lugar (Reina): +5 puntos
        case 2: return 3; // Segundo lugar (Confraternidad): +3 puntos  
        case 3: return 1; // Tercer lugar (Simpatía): +1 punto
        default: return 0;
      }
    };
    
    const bonusPoints = getBonusPointsForPosition(position);
    
    // 1. Create a tiebreaker session record in database
    const tiebreakerData = {
      id: tieId,
      candidates: candidatesData.rows, // Usar datos completos con fotos
      status: 'active',
      created_by: req.user.id,
      created_at: new Date().toISOString(),
      positions_affected: candidates.map(c => c.position || position).join(','),
      position: position,
      description: description,
      bonus_points: bonusPoints,
      activated_by_name: req.user.full_name || req.user.email
    };
    
    // Store in system_settings for persistence
    await executeQuery(`
      INSERT INTO system_settings (setting_key, setting_value)
      VALUES ($1, $2)
      ON CONFLICT (setting_key) 
      DO UPDATE SET 
        setting_value = $2, 
        updated_at = CURRENT_TIMESTAMP
    `, [
      'active_tiebreaker',
      JSON.stringify(tiebreakerData)
    ]);
    
    // 2. Get all active judges to notify
    const judgesResult = await executeQuery(`
      SELECT id, email, full_name 
      FROM users 
      WHERE role = 'judge' AND is_active = true
    `);
    
    console.log(`📢 Notifying ${judgesResult.rows.length} judges about tiebreaker`);
    console.log(`🎯 Bonificación por posición ${position}: +${bonusPoints} puntos`);
    
    // 3. Send WebSocket notification to all judges
    if (io) {
      const notification = {
        type: 'tiebreaker_activated',
        data: {
          tieId,
          candidates,
          position,
          description,
          bonusPoints,
          activatedBy: req.user.full_name || req.user.email,
          activatedAt: new Date().toISOString(),
          message: `🚨 Se ha activado un desempate para ${description}. Bonificación: +${bonusPoints} puntos. Debes calificar ahora.`
        }
      };
      
      // Send to all judges
      judgesResult.rows.forEach(judge => {
        io.to(`judge_${judge.id}`).emit('tiebreaker_activated', notification);
      });
      
      // Also send general notification
      io.emit('system_notification', {
        type: 'warning',
        message: `🚨 Desempate activado: ${description} (+${bonusPoints} pts)`,
        timestamp: new Date().toISOString()
      });
      
      console.log('✅ WebSocket notifications sent to all judges');
    } else {
      console.log('⚠️ WebSocket not available, skipping real-time notifications');
    }
    
    res.json({
      success: true,
      message: 'Modo de desempate activado exitosamente',
      data: {
        tieId,
        candidates,
        position,
        description,
        bonusPoints,
        activatedBy: req.user.email,
        activatedAt: new Date().toISOString(),
        judgesNotified: judgesResult.rows.length
      }
    });

  } catch (error) {
    console.error('❌ Error activating tie-breaking:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get active tiebreaker for judges
app.get('/api/judge/tiebreaker/current', extractUserFromToken, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'judge') {
      return res.status(403).json({
        success: false,
        error: 'Solo los jueces pueden acceder a esta información'
      });
    }

    // Create table if it doesn't exist
    await executeQuery(`DROP TABLE IF EXISTS tiebreaker_scores`);
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS tiebreaker_scores (
        id SERIAL PRIMARY KEY,
        tiebreaker_id VARCHAR(255) NOT NULL,
        judge_id UUID NOT NULL,
        candidate_id UUID NOT NULL,
        score DECIMAL(3,1) NOT NULL CHECK (score >= 1 AND score <= 10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tiebreaker_id, judge_id, candidate_id)
      )
    `);

    // Get active tiebreaker from system_settings
    const tiebreakerResult = await executeQuery(`
      SELECT setting_value 
      FROM system_settings 
      WHERE setting_key = 'active_tiebreaker'
    `);
    
    if (tiebreakerResult.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          hasActiveTiebreaker: false,
          tiebreaker: null
        }
      });
    }
    
    const tiebreakerData = JSON.parse(tiebreakerResult.rows[0].setting_value);
    
    // Check if judge has already voted in this tiebreaker
    const existingVotes = await executeQuery(`
      SELECT candidate_id, score 
      FROM tiebreaker_scores 
      WHERE judge_id = $1 AND tiebreaker_id = $2
    `, [req.user.id, tiebreakerData.id]);
    
    const votedCandidates = existingVotes.rows.map(vote => vote.candidate_id);
    
    // Enriquecer datos para el frontend
    const enrichedTiebreaker = {
      ...tiebreakerData,
      votedCandidates,
      hasVoted: votedCandidates.length === tiebreakerData.candidates.length,
      activatedBy: tiebreakerData.activated_by_name || 'Administrador',
      // Asegurar que position y description están presentes
      position: tiebreakerData.position || 1,
      description: tiebreakerData.description || 'Desempate activo',
      bonusPoints: tiebreakerData.bonus_points || (tiebreakerData.position === 1 ? 5 : tiebreakerData.position === 2 ? 3 : 1)
    };
    
    console.log(`🔍 Tiebreaker data for judge ${req.user.email}:`, {
      id: enrichedTiebreaker.id,
      position: enrichedTiebreaker.position,
      description: enrichedTiebreaker.description,
      bonusPoints: enrichedTiebreaker.bonusPoints,
      hasVoted: enrichedTiebreaker.hasVoted,
      candidatesCount: enrichedTiebreaker.candidates.length
    });
    
    res.json({
      success: true,
      data: {
        hasActiveTiebreaker: true,
        tiebreaker: enrichedTiebreaker
      }
    });

  } catch (error) {
    console.error('❌ Error getting tiebreaker:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Submit tiebreaker score
app.post('/api/judge/tiebreaker/vote', extractUserFromToken, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'judge') {
      return res.status(403).json({
        success: false,
        error: 'Solo los jueces pueden votar en desempates'
      });
    }

    const { tiebreakerVotes } = req.body; // Array of { candidateId, score }
    
    if (!tiebreakerVotes || !Array.isArray(tiebreakerVotes)) {
      return res.status(400).json({
        success: false,
        error: 'Datos de votación inválidos'
      });
    }

    // Get active tiebreaker
    const tiebreakerResult = await executeQuery(`
      SELECT setting_value 
      FROM system_settings 
      WHERE setting_key = 'active_tiebreaker'
    `);
    
    if (tiebreakerResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No hay desempate activo'
      });
    }
    
    const tiebreakerData = JSON.parse(tiebreakerResult.rows[0].setting_value);
    
    // Create table if it doesn't exist
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS tiebreaker_scores (
        id SERIAL PRIMARY KEY,
        tiebreaker_id VARCHAR(255) NOT NULL,
        judge_id UUID NOT NULL,
        candidate_id UUID NOT NULL,
        score DECIMAL(3,1) NOT NULL CHECK (score >= 1 AND score <= 10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tiebreaker_id, judge_id, candidate_id)
      )
    `);
    
    // Insert/update tiebreaker votes
    for (const vote of tiebreakerVotes) {
      await executeQuery(`
        INSERT INTO tiebreaker_scores (tiebreaker_id, judge_id, candidate_id, score)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (tiebreaker_id, judge_id, candidate_id)
        DO UPDATE SET score = $4, created_at = CURRENT_TIMESTAMP
      `, [tiebreakerData.id, req.user.id, vote.candidateId, vote.score]);
    }
    
    console.log(`✅ Tiebreaker votes submitted by judge ${req.user.email}: ${tiebreakerVotes.length} votes`);
    
    // Check if all judges have voted
    const judgesCount = await executeQuery(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE role = 'judge' AND is_active = true
    `);
    
    const completedJudges = await executeQuery(`
      SELECT DISTINCT judge_id 
      FROM tiebreaker_scores 
      WHERE tiebreaker_id = $1
    `, [tiebreakerData.id]);
    
    const allJudgesVoted = completedJudges.rows.length >= judgesCount.rows[0].count;
    
    if (allJudgesVoted) {
      console.log('🎉 All judges have completed tiebreaker voting');
      
      // ✅ NUEVO: Finalizar desempate automáticamente
      console.log('🔄 Iniciando finalización automática del desempate...');
      
      try {
        const finalizationResult = await finalizeTiebreaker(tiebreakerData);
        
        if (finalizationResult.success) {
          console.log('✅ Desempate finalizado automáticamente');
          console.log(`🏆 Ganador: ${finalizationResult.winner.candidate_name}`);
          
          // Notificar a todos los jueces que el desempate ha terminado
          if (io) {
            const notification = {
              type: 'tiebreaker_completed',
              data: {
                tieId: tiebreakerData.id,
                winner: finalizationResult.winner,
                results: finalizationResult.results,
                message: `🎉 Desempate completado. Ganador: ${finalizationResult.winner.candidate_name}`
              }
            };
            
            // Enviar a todos los jueces
            io.emit('tiebreaker_completed', notification);
            
            // También enviar notificación general
            io.emit('system_notification', {
              type: 'success',
              message: `🎉 Desempate finalizado: ${finalizationResult.winner.candidate_name} ganó la posición ${tiebreakerData.position}`,
              timestamp: new Date().toISOString()
            });
          }
          
        } else {
          console.error('❌ Error en finalización automática:', finalizationResult.error);
        }
        
      } catch (error) {
        console.error('❌ Error crítico en finalización automática:', error);
      }
    }
    
    res.json({
      success: true,
      message: 'Votos de desempate guardados exitosamente',
      data: {
        votesSubmitted: tiebreakerVotes.length,
        allJudgesVoted
      }
    });

  } catch (error) {
    console.error('❌ Error submitting tiebreaker votes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== ADMIN EVENTS ENDPOINTS ====================

// Admin update event (with authorization)
app.put('/api/admin/events/:id', extractUserFromToken, async (req, res) => {
  try {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
      return res.status(403).json({
        success: false,
        error: 'Solo los administradores pueden modificar eventos'
      });
    }

    const { id } = req.params;
    const { name, event_type, description, status, weight, is_mandatory, bonus_percentage, is_active } = req.body;
    
    // Validar peso si es obligatorio
    if (is_mandatory && weight !== undefined && weight <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Los eventos obligatorios deben tener un peso mayor a 0'
      });
    }

    // Validar que el peso esté en rango válido
    if (weight !== undefined && (weight < 0 || weight > 100)) {
      return res.status(400).json({
        success: false,
        error: 'El peso debe estar entre 0 y 100'
      });
    }
    
    const result = await executeQuery(
      'UPDATE events SET name = $1, event_type = $2, description = $3, status = $4, weight = $5, is_mandatory = $6, bonus_percentage = $7, is_active = $8, updated_at = NOW() WHERE id = $9 RETURNING *',
      [name, event_type, description, status, weight, is_mandatory, bonus_percentage, is_active, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evento no encontrado'
      });
    }
    
    const updatedEvent = result.rows[0];
    
    console.log(`✅ Evento actualizado por admin ${req.user.email}:`, updatedEvent);
    
    // ============ NUEVO: Notificación WebSocket en tiempo real ============
    if (io) {
      const notification = {
        type: 'event_updated',
        data: {
          event: updatedEvent,
          updatedBy: req.user.full_name || req.user.email,
          updatedAt: new Date().toISOString(),
          message: `Evento "${updatedEvent.name}" actualizado por ${req.user.full_name || req.user.email}`
        }
      };
      
      // Enviar a todos los usuarios conectados
      io.emit('event_updated', notification);
      
      // Notificaciones específicas según los cambios
      if (status) {
        io.emit('system_notification', {
          type: status === 'active' ? 'success' : 'info',
          message: `📅 Estado del evento "${updatedEvent.name}": ${status}`,
          timestamp: new Date().toISOString()
        });
      }
      
      if (is_active !== undefined) {
        io.emit('system_notification', {
          type: is_active ? 'success' : 'warning',
          message: `📅 Evento "${updatedEvent.name}" ${is_active ? 'activado' : 'desactivado'} por administrador`,
          timestamp: new Date().toISOString()
        });
      }
      
      console.log(`📡 WebSocket: Admin event update - ${updatedEvent.name} by ${req.user.email}`);
    }
    // =========================================================================
    
    res.json({
      success: true,
      data: updatedEvent
    });
  } catch (error) {
    console.error('❌ Error updating event (admin):', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Admin delete event (with authorization)
app.delete('/api/admin/events/:id', extractUserFromToken, async (req, res) => {
  try {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
      return res.status(403).json({
        success: false,
        error: 'Solo los administradores pueden eliminar eventos'
      });
    }

    const { id } = req.params;
    
    const result = await executeQuery('DELETE FROM events WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evento no encontrado'
      });
    }
    
    console.log(`✅ Evento eliminado por admin ${req.user.email}:`, result.rows[0]);
    
    res.json({
      success: true,
      message: 'Evento eliminado exitosamente'
    });
  } catch (error) {
    console.error('❌ Error deleting event (admin):', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== TEST ENDPOINTS ====================

// Test endpoint for admin routes (temporary)
app.get('/api/admin/test', (req, res) => {
  res.json({
    success: true,
    message: 'Admin routes are working',
    timestamp: new Date().toISOString()
  });
}); 

// Test endpoint for admin authentication
app.get('/api/admin/test-auth', extractUserFromToken, (req, res) => {
  try {
    console.log('🧪 Test auth endpoint accessed');
    console.log('👤 Request user:', req.user ? { 
      id: req.user.id, 
      email: req.user.email, 
      role: req.user.role 
    } : 'NO USER');
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado',
        debug: 'No user found in request'
      });
    }
    
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Solo los administradores pueden acceder',
        debug: `User role: ${req.user.role}`
      });
    }

    res.json({
      success: true,
      message: 'Autenticación exitosa',
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
        full_name: req.user.full_name
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error in test-auth:', error);
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
  const os = require('os');
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
  
  console.log(`📊 Base de datos: reinas2025`);
  console.log(`🔗 CORS: Habilitado para TODAS las direcciones de red local`);
  console.log(`📁 Archivos estáticos: /uploads`);
  console.log(`📷 Fotos de candidatas: /uploads/candidates`);
  console.log(`🔌 WebSocket: Habilitado para notificaciones en tiempo real`);
  console.log(`⏰ Iniciado en: ${new Date().toISOString()}`);
  console.log(`🔧 Configuración de red:`);
  console.log(`   • Bind: 0.0.0.0:${PORT} (todas las interfaces)`);
  console.log(`   • CORS: Permitido para redes locales (192.168.x.x, 10.x.x.x, 172.16-31.x.x)`);
  console.log(`   • Credenciales: Habilitadas`);
  console.log(`   • WebSocket: Configurado para tiempo real`);
  console.log(`📱 Uso desde dispositivos móviles:`);
  console.log(`   • Asegúrate de estar en la misma red WiFi`);
  console.log(`   • Usa una de las IPs de red local mostradas arriba`);
  console.log(`────────────────────────────────────────────────────────────`);
});

process.on('SIGINT', () => {
  console.log('🛑 Cerrando servidor...');
  pool.end();
  process.exit(0);
}); 