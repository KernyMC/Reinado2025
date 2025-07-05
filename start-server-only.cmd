@echo off
title ESPE Pageant - Servidor
color 0C

echo.
echo ========================================
echo 🚀 INICIANDO SERVIDOR ESPE PAGEANT 2025
echo ========================================
echo.

:: Verificar Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ERROR: Node.js no está instalado
    pause
    exit /b 1
)

echo ✅ Node.js detectado
echo.

:: Configurar variables
set PORT=3000
set NODE_ENV=development

echo 📡 Iniciando servidor en puerto %PORT%...
echo 🌐 URL: http://localhost:%PORT%
echo 📊 API: http://localhost:%PORT%/api/health
echo.
echo ⚠️  Para detener: Presiona Ctrl+C
echo.

cd espe-pageant-server\src
node server.js 