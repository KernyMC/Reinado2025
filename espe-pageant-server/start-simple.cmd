@echo off
echo 🚀 Iniciando servidor ESPE Pageant...
echo.

:: Configurar variables de entorno
set PORT=3000
set NODE_ENV=development

:: Mostrar información
echo 📡 Puerto: %PORT%
echo 🌍 Entorno: %NODE_ENV%
echo.

:: Cambiar al directorio src e iniciar servidor
cd src
node server.js 