# Script para iniciar el Sistema Reina ESPE 2025 en Windows
Write-Host "🚀 Iniciando Sistema Reina ESPE 2025..." -ForegroundColor Green

# Verificar si Node.js está instalado
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js detectado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Node.js no está instalado o no está en el PATH" -ForegroundColor Red
    exit 1
}

# Verificar si npm está instalado
try {
    $npmVersion = npm --version
    Write-Host "✅ npm detectado: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: npm no está instalado" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📂 Directorio de trabajo: $(Get-Location)" -ForegroundColor Cyan
Write-Host ""

# Función para iniciar el servidor backend
function Start-Backend {
    Write-Host "🔧 Iniciando servidor backend..." -ForegroundColor Yellow
    $backendPath = "espe-pageant-server"
    
    if (Test-Path $backendPath) {
        Set-Location $backendPath
        Write-Host "📍 Cambiando a directorio: $backendPath" -ForegroundColor Cyan
        
        # Verificar que server-complete.cjs existe
        if (Test-Path "server-complete.cjs") {
            Write-Host "✅ Archivo server-complete.cjs encontrado" -ForegroundColor Green
            Write-Host "🌐 Iniciando servidor en puerto 3000..." -ForegroundColor Yellow
            Start-Process -FilePath "node" -ArgumentList "server-complete.cjs" -WindowStyle Normal
            Write-Host "✅ Servidor backend iniciado" -ForegroundColor Green
        } else {
            Write-Host "❌ Error: server-complete.cjs no encontrado" -ForegroundColor Red
            exit 1
        }
        Set-Location ..
    } else {
        Write-Host "❌ Error: Directorio espe-pageant-server no encontrado" -ForegroundColor Red
        exit 1
    }
}

# Función para iniciar el frontend
function Start-Frontend {
    Write-Host "🎨 Iniciando frontend..." -ForegroundColor Yellow
    $frontendPath = "espe-pageant-client"
    
    if (Test-Path $frontendPath) {
        Set-Location $frontendPath
        Write-Host "📍 Cambiando a directorio: $frontendPath" -ForegroundColor Cyan
        
        # Verificar que package.json existe
        if (Test-Path "package.json") {
            Write-Host "✅ package.json encontrado" -ForegroundColor Green
            Write-Host "🎯 Iniciando Vite dev server..." -ForegroundColor Yellow
            Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WindowStyle Normal
            Write-Host "✅ Frontend iniciado (se abrirá en el navegador)" -ForegroundColor Green
        } else {
            Write-Host "❌ Error: package.json no encontrado" -ForegroundColor Red
            exit 1
        }
        Set-Location ..
    } else {
        Write-Host "❌ Error: Directorio espe-pageant-client no encontrado" -ForegroundColor Red
        exit 1
    }
}

# Verificar estructura de directorios
if (-not (Test-Path "espe-pageant-server") -or -not (Test-Path "espe-pageant-client")) {
    Write-Host "❌ Error: Estructura de directorios no válida" -ForegroundColor Red
    Write-Host "   Asegúrate de estar en el directorio raíz del proyecto" -ForegroundColor Yellow
    Write-Host "   Estructura esperada:" -ForegroundColor Yellow
    Write-Host "   📁 Reinas 2025/" -ForegroundColor Cyan
    Write-Host "   ├── 📁 espe-pageant-server/" -ForegroundColor Cyan
    Write-Host "   └── 📁 espe-pageant-client/" -ForegroundColor Cyan
    exit 1
}

Write-Host "🔍 Estructura de directorios verificada ✅" -ForegroundColor Green
Write-Host ""

# Iniciar servicios
Start-Backend
Start-Sleep -Seconds 3
Start-Frontend

Write-Host ""
Write-Host "🎉 ¡Sistema iniciado exitosamente!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 URLs del sistema:" -ForegroundColor Cyan
Write-Host "   Backend:  http://localhost:3000" -ForegroundColor White
Write-Host "   Frontend: http://localhost:8080 (o puerto disponible)" -ForegroundColor White
Write-Host ""
Write-Host "👥 Usuarios de prueba:" -ForegroundColor Cyan
Write-Host "   📧 admin@espe.edu.ec / 🔑 admin123 (Admin)" -ForegroundColor White
Write-Host "   📧 judge@espe.edu.ec / 🔑 juez123 (Juez)" -ForegroundColor White
Write-Host ""
Write-Host "⚡ Presiona Ctrl+C en cualquier ventana para detener los servicios" -ForegroundColor Yellow 