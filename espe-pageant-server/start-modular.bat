@echo off
echo Iniciando ESPE Pageant Server (Modular)...

:: Verificar Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Node.js no esta instalado
    echo Por favor instala Node.js desde https://nodejs.org
    pause
    exit /b 1
)

:: Verificar npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: npm no esta instalado
    echo Por favor instala Node.js desde https://nodejs.org
    pause
    exit /b 1
)

:: Instalar dependencias si no existen
if not exist node_modules (
    echo Instalando dependencias...
    call npm install
)

:: Iniciar servidor
echo Iniciando servidor...
call npm start

pause 