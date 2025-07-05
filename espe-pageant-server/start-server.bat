@echo off
echo 🚀 Iniciando Servidor ESPE Pageant 2025...
echo ─────────────────────────────────────

cd /d "%~dp0"

echo 📍 Directorio actual: %cd%
echo 🔧 Verificando dependencias...

if not exist "node_modules" (
    echo ❌ node_modules no encontrado. Ejecutando npm install...
    npm install
)

echo ✅ Dependencias listas
echo 🌐 Iniciando servidor completo en puerto 3000...
echo.
echo 💡 INSTRUCCIONES:
echo    • Acceso local: http://localhost:3000
echo    • Para dispositivos móviles usa tu IP local
echo    • Presiona Ctrl+C para detener el servidor
echo.
echo ⏰ Iniciando...

node server-complete.cjs

pause 