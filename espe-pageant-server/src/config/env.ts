import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  PORT: parseInt(process.env['PORT'] || '3000'),
  NODE_ENV: process.env['NODE_ENV'] || 'development',
  HOST: process.env['HOST'] || '0.0.0.0',

  // Database
  DATABASE_URL: process.env['DATABASE_URL'],
  DB_HOST: process.env['DB_HOST'] || 'localhost',
  DB_PORT: parseInt(process.env['DB_PORT'] || '5432'),
  DB_NAME: process.env['DB_NAME'] || 'reinas2025',
  DB_USER: process.env['DB_USER'] || 'postgres',
  DB_PASSWORD: process.env['DB_PASSWORD'] || 'admin',
  DB_SSL: process.env['DB_SSL'] === 'true',

  // JWT
  JWT_SECRET: process.env['JWT_SECRET'] || 'your-super-secret-jwt-key',
  JWT_EXPIRES_IN: process.env['JWT_EXPIRES_IN'] || '24h',
  JWT_REFRESH_EXPIRES_IN: process.env['JWT_REFRESH_EXPIRES_IN'] || '7d',

  // CORS
  CORS_ORIGIN: process.env['CORS_ORIGIN']?.split(',') || [
    'http://localhost:3000',
    'http://localhost:5173', 
    'http://localhost:8080',
    'http://localhost:8081',
    'http://localhost:4200',
    'http://127.0.0.1:8081',
    'http://127.0.0.1:5173'
  ],
  CORS_CREDENTIALS: process.env['CORS_CREDENTIALS'] === 'true' || true,

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100'),

  // File Upload
  UPLOAD_MAX_SIZE: parseInt(process.env['UPLOAD_MAX_SIZE'] || '5242880'), // 5MB
  UPLOAD_ALLOWED_TYPES: process.env['UPLOAD_ALLOWED_TYPES']?.split(',') || [
    'image/jpeg',
    'image/png',
    'image/webp'
  ],

  // WebSocket
  WS_CORS_ORIGIN: process.env['WS_CORS_ORIGIN'] || 'http://localhost:8081,http://localhost:5173,http://localhost:3000',

  // Security
  BCRYPT_ROUNDS: parseInt(process.env['BCRYPT_ROUNDS'] || '12'),
  SESSION_SECRET: process.env['SESSION_SECRET'] || 'your-session-secret',

  // Logging
  LOG_LEVEL: process.env['LOG_LEVEL'] || 'info',
  LOG_FILE: process.env['LOG_FILE'] || 'logs/app.log',
} as const;

// Validate required environment variables
const requiredEnvVars: string[] = [];

export const validateEnv = (): void => {
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('Please check your .env file');
    process.exit(1);
  }
  
  console.log('✅ Environment variables validated');
}; 