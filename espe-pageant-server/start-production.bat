@echo off
echo ========================================
echo  ESPE PAGEANT - SERVIDOR DE PRODUCCION
echo ========================================
echo.

echo Verificando Node.js...
node --version
if %errorlevel% neq 0 (
    echo ERROR: Node.js no esta instalado
    pause
    exit /b 1
)

echo.
echo Verificando archivos...
if not exist "server-production-full.cjs" (
    echo ERROR: server-production-full.cjs no encontrado
    echo Ejecuta: node build-production.cjs
    pause
    exit /b 1
)

if not exist "..\espe-pageant-client\dist\index.html" (
    echo ERROR: Build del cliente no encontrado
    echo Ve al directorio del cliente y ejecuta: npm run build
    pause
    exit /b 1
)

echo.
echo Configurando variables de entorno...
set NODE_ENV=production
set PORT=3000

echo.
echo Iniciando servidor de produccion...
echo Puerto: %PORT%
echo Entorno: %NODE_ENV%
echo.

node server-production-full.cjs

echo.
echo Servidor terminado.
pause 