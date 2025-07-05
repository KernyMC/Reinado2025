/**
 * Environment Configuration
 * @description Variables de entorno y configuración del sistema
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'production',
  PORT: process.env.PORT || 3000,
  
  // Database
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: process.env.DB_PORT || 5432,
  DB_NAME: process.env.DB_NAME || 'reinas2025',
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || 'admin',
  DB_SSL: process.env.DB_SSL === 'true',
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'espe-pageant-secret-2025',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  
  // Uploads
  UPLOAD_MAX_SIZE: parseInt(process.env.UPLOAD_MAX_SIZE) || 5 * 1024 * 1024, // 5MB
  UPLOAD_ALLOWED_TYPES: ['jpeg', 'jpg', 'png', 'gif'],
  
  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || true,
  
  // Paths
  CLIENT_BUILD_PATH: process.env.CLIENT_BUILD_PATH || '../espe-pageant-client/dist',
  UPLOADS_PATH: process.env.UPLOADS_PATH || 'uploads'
};

// Validation
export const validateEnvironment = () => {
  const required = ['DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  const missing = required.filter(key => !process.env[key] && !ENV.DB_NAME && !ENV.DB_USER && !ENV.DB_PASSWORD);
  
  if (missing.length > 0) {
    console.warn(`⚠️ Missing environment variables: ${missing.join(', ')}`);
    console.warn(`Using default values for development`);
  }

  console.log(`🔧 Environment: ${ENV.NODE_ENV}`);
  console.log(`🌐 Server: ${ENV.HOST}:${ENV.PORT}`);
  console.log(`🗄️ Database: ${ENV.DB_NAME}@${ENV.DB_HOST}:${ENV.DB_PORT}`);
  
  return true;
}; 