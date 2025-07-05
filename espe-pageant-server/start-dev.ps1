# Script de PowerShell para iniciar el servidor de desarrollo
# Uso: .\start-dev.ps1

Write-Host "🚀 Iniciando servidor de desarrollo..." -ForegroundColor Green

# Configurar variables de entorno
$env:PORT = "3000"
$env:NODE_ENV = "development"

# Navegar al directorio src
Set-Location -Path "src"

# Iniciar servidor
Write-Host "📡 Puerto: $env:PORT" -ForegroundColor Cyan
Write-Host "🌍 Entorno: $env:NODE_ENV" -ForegroundColor Cyan

node server.js 