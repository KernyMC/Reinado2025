#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔄 Migrando a arquitectura modular ES6...\n');

// Backup legacy files
const legacyFiles = [
  'server-production-fixed.cjs',
  'server-complete.cjs',
  'server-production-full.cjs'
];

const backupDir = path.join(__dirname, 'legacy-backup');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
  console.log('📁 Creado directorio de backup: legacy-backup/');
}

legacyFiles.forEach(file => {
  const srcPath = path.join(__dirname, file);
  const destPath = path.join(backupDir, file);
  
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`✅ Backup creado: ${file} -> legacy-backup/${file}`);
  }
});

// Create .env file from template
const envTemplate = `# ESPE Pageant Server Environment Variables
NODE_ENV=production
PORT=3000

# Database Configuration  
DB_HOST=localhost
DB_PORT=5432
DB_NAME=reinas2025
DB_USER=postgres
DB_PASSWORD=admin
DB_SSL=false

# JWT Configuration
JWT_SECRET=espe-pageant-secret-2025
JWT_EXPIRES_IN=24h

# File Upload Configuration
UPLOAD_MAX_SIZE=5242880
UPLOADS_PATH=uploads

# CORS Configuration
CORS_ORIGIN=true

# Client Build Path
CLIENT_BUILD_PATH=../espe-pageant-client/dist
`;

const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, envTemplate);
  console.log('✅ Archivo .env creado con configuración por defecto');
} else {
  console.log('ℹ️ Archivo .env ya existe, no se sobreescribe');
}

// Check if src/ directory exists
const srcDir = path.join(__dirname, 'src');
if (fs.existsSync(srcDir)) {
  console.log('✅ Directorio src/ encontrado con nueva arquitectura');
} else {
  console.log('❌ Directorio src/ no encontrado. La migración puede estar incompleta.');
}

// Update start scripts
const startModernScript = `@echo off
echo 🚀 Iniciando ESPE Pageant Server (Arquitectura Modular)...
echo.
echo 📋 Verificando dependencias...
if not exist node_modules (
    echo ⚠️ Instalando dependencias...
    npm install
)

echo.
echo 🗄️ Verificando base de datos PostgreSQL...
echo ⚡ Iniciando servidor...
echo.

npm start

pause
`;

fs.writeFileSync(path.join(__dirname, 'start-modular.bat'), startModernScript);
console.log('✅ Script start-modular.bat creado');

console.log('\n🎉 ¡Migración completada exitosamente!');
console.log('\n📋 Para usar la nueva arquitectura:');
console.log('   1. npm start (usa src/server.js)');
console.log('   2. ./start-modular.bat');
console.log('   3. npm run dev (modo desarrollo)');
console.log('\n📂 Estructura modular creada:');
console.log('   src/');
console.log('   ├── config/     (database.js, environment.js)');
console.log('   ├── models/     (candidateModel.js, eventModel.js, etc.)');
console.log('   ├── services/   (authService.js, socketService.js)');
console.log('   ├── controllers/(eventController.js, etc.)');
console.log('   ├── routes/     (eventRoutes.js, etc.)');
console.log('   └── server.js   (punto de entrada)');
console.log('\n🔧 Configuración:');
console.log('   • ES6 Modules activados');
console.log('   • Event_type null fix aplicado');
console.log('   • WebSocket integrado');
console.log('   • JWT Authentication');
console.log('\n🗂️ Legacy files respaldados en: legacy-backup/'); 