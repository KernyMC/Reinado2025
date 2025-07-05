# ESPE Pageant Server - Arquitectura Modular ES6

## 🚀 Migración Completada

El servidor ha sido migrado exitosamente a una **arquitectura modular ES6** con separación clara de responsabilidades.

## 📁 Estructura del Proyecto

```
espe-pageant-server/
├── src/
│   ├── config/
│   │   ├── database.js      # Configuración PostgreSQL + Pool
│   │   └── environment.js   # Variables de entorno centralizadas
│   ├── models/
│   │   ├── candidateModel.js # Modelo de candidatos
│   │   ├── eventModel.js     # Modelo de eventos (con fix event_type)
│   │   ├── userModel.js      # Modelo de usuarios + bcrypt
│   │   └── voteModel.js      # Modelo de votos y resultados
│   ├── services/
│   │   ├── authService.js    # JWT + Sesiones + Middleware
│   │   └── socketService.js  # WebSocket management
│   ├── controllers/
│   │   ├── authController.js     # Login/logout/profile
│   │   ├── candidateController.js # CRUD candidatos
│   │   └── eventController.js    # CRUD eventos + fix event_type
│   ├── routes/
│   │   ├── authRoutes.js         # /api/auth/*
│   │   ├── candidateRoutes.js    # /api/candidates/*
│   │   └── eventRoutes.js        # /api/events/*
│   └── server.js            # Punto de entrada principal
├── .env                     # Variables de entorno
├── package.json            # Scripts npm + "type": "module"
└── legacy-backup/          # Respaldo de archivos .cjs
```

## 🔧 Configuración

### Variables de Entorno (.env)
```env
NODE_ENV=production
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=reinas2025
DB_USER=postgres
DB_PASSWORD=admin
DB_SSL=false

# JWT
JWT_SECRET=espe-pageant-secret-2025
JWT_EXPIRES_IN=24h

# Uploads
UPLOAD_MAX_SIZE=5242880
UPLOADS_PATH=uploads
```

## 🚀 Scripts de Inicio

### Opción 1: NPM Scripts
```bash
npm start              # Producción (src/server.js)
npm run dev            # Desarrollo con nodemon
npm run build          # Verificación
```

### Opción 2: Batch Scripts
```bash
./start-modular.bat    # Windows con verificaciones
./start.bat            # Script original actualizado
```

## 🔒 Autenticación

### JWT + Sesiones en Memoria
- **Login**: `POST /api/auth/login`
- **Logout**: `POST /api/auth/logout`
- **Profile**: `GET /api/auth/profile`
- **Validate**: `POST /api/auth/validate`

### Middleware de Autenticación
```javascript
// Rutas públicas - sin auth
router.get('/api/events', EventController.getAllEvents);

// Rutas protegidas - requiere auth
router.post('/api/events', 
  AuthService.requireAuth(['admin']), 
  EventController.createEvent
);
```

## 📡 WebSocket Real-time

### Eventos Automáticos
- `event_created` - Nuevo evento creado
- `event_updated` - Evento actualizado (incluye weight)
- `event_deleted` - Evento eliminado
- `vote_update` - Nueva votación
- `results_update` - Resultados actualizados

### Salas WebSocket
- `admin` - Administradores
- `public` - Vista pública
- `judge_${judgeId}` - Juez específico

## 🐛 Fixes Aplicados

### ✅ Event_type Null Fix
```javascript
// En EventModel.update()
const safeEventType = event_type || 'general';

// En EventController.updateEvent()
if (updateData.event_type === null || updateData.event_type === undefined) {
  updateData.event_type = 'general';
}
```

### ✅ Separación de Responsabilidades
- **Models**: Queries SQL puras
- **Services**: Lógica de negocio
- **Controllers**: HTTP + validaciones
- **Routes**: Definición de endpoints + middleware

### ✅ ES6 Modules
- `import/export` en lugar de `require/module.exports`
- `"type": "module"` en package.json
- `import.meta.url` para __dirname

## 🔄 Migración desde Legacy

### Archivos Respaldados
- `server-production-fixed.cjs` → `legacy-backup/`
- `server-complete.cjs` → `legacy-backup/`
- `server-production-full.cjs` → `legacy-backup/`

### Compatibilidad
- **Base de datos**: Sin cambios
- **Endpoints**: Mismas URLs
- **Cliente**: Sin cambios necesarios
- **WebSocket**: Mejorada con SocketService

## 🚨 Solución de Problemas

### Error: Cannot use import statement
```bash
# Verificar package.json
"type": "module"  # ← Debe estar presente
```

### Error: event_type constraint violation
```bash
# Fix automático aplicado en EventModel.update()
# Garantiza event_type nunca sea null
```

### Error: WebSocket connection issues
```bash
# Verificar puerto y CORS
# SocketService maneja conexiones automáticamente
```

## 📈 Beneficios de la Nueva Arquitectura

### ✅ Mantenibilidad
- Código organizado por responsabilidades
- Fácil testing individual de componentes
- Imports explícitos

### ✅ Escalabilidad
- Fácil agregar nuevos modelos/controladores
- Servicios reutilizables
- Middleware modular

### ✅ Debugging
- Stack traces más claros
- Logs específicos por capa
- Error handling centralizado

### ✅ Desarrollo
- Hot reload con nodemon
- TypeScript ready (si se necesita)
- Jest testing configurado

## 🛠️ Próximos Pasos

1. **Testing**: Implementar tests unitarios
2. **Validation**: Añadir joi/yup para validación robusta
3. **Logging**: Implementar winston/morgan
4. **Caching**: Redis para resultados
5. **Rate Limiting**: Protección DDoS
6. **Documentation**: Swagger/OpenAPI

---

**✅ ¡Migración completada exitosamente!**
*El servidor ESPE Pageant ahora utiliza arquitectura modular ES6 manteniendo compatibilidad total.* 