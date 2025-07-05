# Script de PowerShell para iniciar el sistema completo ESPE Pageant 2025
# Uso: .\start-full-system.ps1

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "🚀 INICIANDO SISTEMA ESPE PAGEANT 2025" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

# Verificar Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js detectado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR: Node.js no está instalado" -ForegroundColor Red
    Write-Host "   Instala Node.js desde: https://nodejs.org" -ForegroundColor Yellow
    Read-Host "Presiona Enter para salir"
    exit 1
}

# Verificar directorios
if (!(Test-Path "espe-pageant-server")) {
    Write-Host "❌ ERROR: Carpeta 'espe-pageant-server' no encontrada" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

if (!(Test-Path "espe-pageant-client")) {
    Write-Host "❌ ERROR: Carpeta 'espe-pageant-client' no encontrada" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

Write-Host "✅ Estructura de directorios verificada" -ForegroundColor Green
Write-Host ""

# Iniciar servidor
Write-Host "📡 Iniciando SERVIDOR (Puerto 3000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd espe-pageant-server; `$env:PORT='3000'; cd src; node server.js" -WindowStyle Normal

# Esperar un poco
Write-Host "⏳ Esperando 3 segundos para que el servidor inicie..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Iniciar cliente
Write-Host "🌐 Iniciando CLIENTE (Puerto 5173)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd espe-pageant-client; npm start" -WindowStyle Normal

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "✅ SISTEMA INICIADO EXITOSAMENTE" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 URLs de acceso:" -ForegroundColor White
Write-Host "   • Servidor: http://localhost:3000" -ForegroundColor Cyan
Write-Host "   • Cliente:  http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Para detener el sistema:" -ForegroundColor White
Write-Host "   • Cierra ambas ventanas de PowerShell" -ForegroundColor Yellow
Write-Host "   • O presiona Ctrl+C en cada una" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  MANTÉN ESTA VENTANA ABIERTA como referencia" -ForegroundColor Yellow
Write-Host ""

Read-Host "Presiona Enter para cerrar esta ventana de control" 