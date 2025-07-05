@echo off
echo Iniciando servidor ESPE Pageant...

:: Verificar si Node.js está instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Node.js no está instalado
    pause
    exit /b 1
)

:: Verificar si npm está instalado
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: npm no está instalado
    pause
    exit /b 1
)

:: Instalar dependencias si no existen
if not exist node_modules (
    echo Instalando dependencias...
    call npm install
    if %errorlevel% neq 0 (
        echo Error al instalar dependencias
        pause
        exit /b 1
    )
)

:: Iniciar el servidor
echo Iniciando servidor...
call npm start

:: Si el servidor se cierra, mostrar mensaje
echo.
echo El servidor se ha detenido
pause 