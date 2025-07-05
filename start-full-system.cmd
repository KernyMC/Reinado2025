@echo off
title Sistema ESPE Pageant 2025
color 0A

echo.
echo ============================================
echo 🚀 INICIANDO SISTEMA ESPE PAGEANT 2025
echo ============================================
echo.

:: Verificar que Node.js esté instalado
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ERROR: Node.js no está instalado
    echo    Instala Node.js desde: https://nodejs.org
    pause
    exit /b 1
)

echo ✅ Node.js detectado
echo.

:: Verificar directorios
if not exist "espe-pageant-server" (
    echo ❌ ERROR: Carpeta 'espe-pageant-server' no encontrada
    pause
    exit /b 1
)

if not exist "espe-pageant-client" (
    echo ❌ ERROR: Carpeta 'espe-pageant-client' no encontrada
    pause
    exit /b 1
)

echo ✅ Estructura de directorios verificada
echo.

echo 📡 Iniciando SERVIDOR (Puerto 3000)...
start "ESPE Pageant - SERVIDOR" cmd /k "cd espe-pageant-server && set PORT=3000 && cd src && node server.js"

echo ⏳ Esperando 3 segundos para que el servidor inicie...
timeout /t 3 /nobreak >nul

echo 🌐 Iniciando CLIENTE (Puerto 5173)...
start "ESPE Pageant - CLIENTE" cmd /k "cd espe-pageant-client && npm start"

echo.
echo ============================================
echo ✅ SISTEMA INICIADO EXITOSAMENTE
echo ============================================
echo.
echo 📋 URLs de acceso:
echo    • Servidor: http://localhost:3000
echo    • Cliente:  http://localhost:5173
echo.
echo 📝 Para detener el sistema:
echo    • Cierra ambas ventanas del CMD
echo    • O presiona Ctrl+C en cada una
echo.
echo ⚠️  MANTÉN ESTA VENTANA ABIERTA
echo    como referencia del sistema
echo.
pause 