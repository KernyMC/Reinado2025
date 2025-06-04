# 🚀 Guía de Deployment - ESPE Pageant System

## 📋 Requisitos Previos

### Sistema
- ✅ Windows 10/11
- ✅ Node.js v18+ instalado
- ✅ PostgreSQL 12+ instalado y ejecutándose
- ✅ Git (opcional)

### Red
- ✅ Conectado a red WiFi/LAN
- ✅ Puerto 3000 disponible
- ✅ Acceso a base de datos PostgreSQL

## 🏗️ Proceso de Build y Deployment

### Paso 1: Preparar el Cliente (Frontend)
```bash
# Ir al directorio del cliente
cd "D:\Reinas 2025\espe-pageant-client"

# Instalar dependencias (si es necesario)
npm install

# Construir versión de producción
npm run build
```

### Paso 2: Generar Servidor de Producción
```bash
# Ir al directorio del servidor
cd "D:\Reinas 2025\espe-pageant-server"

# Generar servidor de producción optimizado
node build-production.cjs
```

### Paso 3: Iniciar en Producción

#### Opción A: Script de Windows (Recomendado)
```bash
# Ejecutar script de inicio
start-production.bat
```

#### Opción B: Comando manual
```bash
# Configurar entorno
set NODE_ENV=production
set PORT=3000

# Iniciar servidor
node server-production-full.cjs
```

#### Opción C: NPM Scripts
```bash
# Build completo + inicio
npm run deploy

# Solo iniciar (si ya está construido)
npm start
```

## 🌐 URLs de Acceso

Una vez iniciado, el servidor mostrará las URLs disponibles:

### Local
- `http://localhost:3000`
- `http://127.0.0.1:3000`

### Red Local (ejemplos)
- `http://192.168.1.100:3000` ⭐
- `http://192.168.0.50:3000` ⭐
- `http://10.0.0.25:3000` ⭐

*Las IPs exactas dependen de tu configuración de red*

## 📱 Acceso desde Dispositivos Móviles

### Para Jueces y Administradores:
1. **Conectar a la misma red WiFi** que el servidor
2. **Abrir navegador** en el dispositivo móvil
3. **Usar cualquier IP marcada con ⭐** del servidor
4. **Acceso directo:** La aplicación web se carga automáticamente

### Ejemplo de uso:
```
Servidor ejecutándose en: 192.168.1.100:3000

Desde móvil:
1. Conectar a WiFi "MiRed"
2. Abrir Chrome/Safari
3. Ir a: http://192.168.1.100:3000
4. ¡Listo! La aplicación se carga
```

## 🔧 Configuración de Red

### Windows Firewall
Si tienes problemas de conexión:

```bash
# Permitir Node.js en firewall (ejecutar como administrador)
netsh advfirewall firewall add rule name="ESPE Pageant Server" dir=in action=allow protocol=TCP localport=3000
```

### Verificar IP de la máquina:
```bash
# Ver IPs disponibles
ipconfig
```

## 🗄️ Base de Datos

### Configuración por defecto:
- **Host:** localhost
- **Puerto:** 5432
- **Base de datos:** reinas2025
- **Usuario:** postgres
- **Contraseña:** admin

### Verificar conexión:
```bash
# Probar conexión a BD
node check-db.cjs
```

## 📊 Características del Deployment

### ✅ Funcionalidades Incluidas:
- **🌐 Servidor web completo** (cliente + API)
- **📱 Totalmente responsive** (móviles, tablets, desktop)
- **🔄 WebSocket tiempo real** (notificaciones instantáneas)
- **📸 Subida de archivos** (fotos de candidatas)
- **📋 Sistema de votación** (jueces + público)
- **📊 Reportes PDF** con fotos
- **🎯 Sistema de desempates** automático
- **👥 Gestión de usuarios** (admin, jueces)
- **🔐 Autenticación** y autorización

### ✅ Optimizaciones de Producción:
- **CORS abierto** para máxima compatibilidad
- **Archivos estáticos** servidos eficientemente
- **Manejo de errores** robusto
- **Logs detallados** para monitoreo
- **Graceful shutdown** para cierre seguro

## 🛠️ Troubleshooting

### Problema: "No se puede conectar"
```bash
# Verificar que el servidor esté ejecutándose
netstat -ano | findstr :3000

# Verificar firewall
# Deshabilitar temporalmente Windows Firewall para probar
```

### Problema: "Base de datos no conecta"
```bash
# Verificar PostgreSQL
services.msc
# Buscar "postgresql" y verificar que esté iniciado

# Probar conexión manual
psql -h localhost -p 5432 -U postgres -d reinas2025
```

### Problema: "Cliente no carga"
```bash
# Verificar que existe el build del cliente
dir "..\espe-pageant-client\dist\index.html"

# Reconstruir cliente si es necesario
cd "..\espe-pageant-client"
npm run build
```

## 📈 Monitoreo

### Logs del servidor:
El servidor muestra logs detallados incluyendo:
- ✅ Conexiones de clientes
- 📊 Actividad de votación en tiempo real
- 🔄 Eventos de WebSocket
- ❌ Errores y debugging

### Endpoints de salud:
- **GET** `/api/health` - Estado del servidor
- **GET** `/api/test-db` - Estado de la base de datos

## 🔒 Seguridad

### Para red local (desarrollo/demostración):
- ✅ CORS abierto para facilidad de acceso
- ✅ Autenticación simple para testing rápido

### Para producción real:
- 🔒 Configurar CORS específico
- 🔒 Usar HTTPS con certificados SSL
- 🔒 Passwords robustos en base de datos
- 🔒 Variables de entorno seguras

## 📞 Soporte

### Archivos importantes:
- `server-production-full.cjs` - Servidor principal
- `start-production.bat` - Script de inicio
- `build-production.cjs` - Script de build
- `finish-tiebreaker-auto.cjs` - Sistema de desempates

### Comandos útiles:
```bash
# Rebuild completo
npm run build:all

# Solo cliente
npm run build:client

# Solo servidor
npm run build

# Iniciar con logging detallado
node server-production-full.cjs
```

---

## 🎉 ¡Deployment Exitoso!

Una vez que veas el mensaje:
```
🎉 SERVIDOR ESPE PAGEANT - PRODUCCIÓN
📍 Puerto: 3000
✅ API Backend
✅ Cliente Frontend
✅ WebSocket tiempo real
```

¡Tu aplicación está lista y funcionando! 🚀 