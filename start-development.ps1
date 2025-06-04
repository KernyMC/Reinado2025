#!/usr/bin/env pwsh

Write-Host "🚀 Iniciando Sistema Reina ESPE 2025..." -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# Función para verificar si un puerto está en uso
function Test-Port {
    param([int]$Port)
    $connection = Test-NetConnection -ComputerName "localhost" -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
    return $connection
}

# Verificar si el servidor ya está corriendo
if (Test-Port -Port 3000) {
    Write-Host "✅ Servidor backend ya está corriendo en puerto 3000" -ForegroundColor Green
} else {
    Write-Host "🔄 Iniciando servidor backend..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'espe-pageant-server'; node server-complete.cjs"
    Start-Sleep 3
    
    if (Test-Port -Port 3000) {
        Write-Host "✅ Servidor backend iniciado exitosamente en puerto 3000" -ForegroundColor Green
    } else {
        Write-Host "❌ Error iniciando servidor backend" -ForegroundColor Red
    }
}

# Verificar si el cliente ya está corriendo en algún puerto común
$clientPorts = @(5173, 8080, 8081, 8082)
$clientRunning = $false

foreach ($port in $clientPorts) {
    if (Test-Port -Port $port) {
        Write-Host "✅ Cliente frontend ya está corriendo en puerto $port" -ForegroundColor Green
        $clientRunning = $true
        break
    }
}

if (-not $clientRunning) {
    Write-Host "🔄 Iniciando cliente frontend..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'espe-pageant-client'; npm run dev"
    Start-Sleep 5
    
    # Verificar nuevamente después de iniciar
    $started = $false
    foreach ($port in $clientPorts) {
        if (Test-Port -Port $port) {
            Write-Host "✅ Cliente frontend iniciado exitosamente en puerto $port" -ForegroundColor Green
            $started = $true
            break
        }
    }
    
    if (-not $started) {
        Write-Host "❌ Error iniciando cliente frontend" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🎯 ESTADO DEL SISTEMA:" -ForegroundColor Magenta
Write-Host "=====================" -ForegroundColor Magenta

# Mostrar estado final
if (Test-Port -Port 3000) {
    Write-Host "✅ Backend: http://localhost:3000" -ForegroundColor Green
} else {
    Write-Host "❌ Backend: No disponible" -ForegroundColor Red
}

foreach ($port in $clientPorts) {
    if (Test-Port -Port $port) {
        Write-Host "✅ Frontend: http://localhost:$port" -ForegroundColor Green
        break
    }
}

Write-Host ""
Write-Host "📋 URLs importantes:" -ForegroundColor Cyan
Write-Host "  • Admin Panel: http://localhost:[puerto]/admin" -ForegroundColor White
Write-Host "  • Panel Jueces: http://localhost:[puerto]/judge-votes" -ForegroundColor White
Write-Host "  • API Health: http://localhost:3000/health" -ForegroundColor White

Write-Host ""
Write-Host "🔧 Para detener los servicios:" -ForegroundColor Yellow
Write-Host "  • Cierra las ventanas de PowerShell que se abrieron" -ForegroundColor White
Write-Host "  • O usa Ctrl+C en cada ventana" -ForegroundColor White

Write-Host ""
Write-Host "✅ Script completado. ¡Sistema listo para usar!" -ForegroundColor Green 