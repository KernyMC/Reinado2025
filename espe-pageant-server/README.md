# ESPE Pageant Server 2025

Sistema de votación para el concurso de belleza ESPE 2025 con arquitectura ES6 modules.

## 🚀 Estado del Proyecto

### ✅ Funcional (Usando server-complete.js)
- **Servidor principal**: `src/server-complete.js`
- **Base de datos**: PostgreSQL conectada
- **WebSocket**: Notificaciones en tiempo real
- **Autenticación**: Sistema de sesiones
- **API REST**: Todas las rutas funcionando
- **Generación PDF**: Reportes completos
- **Sistema de desempates**: Funcional

### 🔄 En desarrollo (Estructura modular)
- **Estructura**: `/src` con arquitectura modular
- **Estado**: Parcialmente implementada
- **Falta**: Algunos controladores y servicios

## 📁 Estructura del Proyecto

```
espe-pageant-server/
├── src/
│   ├── server-complete.js      ✅ SERVIDOR FUNCIONAL
│   ├── server.js              🔄 Modular (en desarrollo)
│   ├── config/                ✅ Configuraciones
│   ├── controllers/           🔄 Parcial
│   ├── database/              ✅ Conexión DB
│   ├── middlewares/           ✅ Middlewares
│   ├── routes/                🔄 Parcial
│   ├── services/              🔄 Parcial
│   └── utils/                 ✅ Utilidades
├── uploads/                   📁 Fotos candidatas
├── package.json              ✅ Configurado
└── README.md                 📄 Este archivo
```

## 🛠️ Scripts Disponibles

```bash
# Servidor principal (funcional)
npm start                # server-complete.js
npm run dev             # server-complete.js con nodemon

# Estructura modular (desarrollo)
npm run start:modular   # server.js modular
npm run dev:modular     # server.js con nodemon

# Utilidades
npm run health          # Check servidor
npm test               # Ejecutar tests
```

## 🚀 Inicio Rápido

### Windows
```batch
# Opción 1: Archivo batch
start-modular.bat

# Opción 2: PowerShell
npm start
```

### Verificar Funcionamiento
```bash
# Check salud del servidor
curl http://localhost:3000/health

# Test base de datos
curl http://localhost:3000/api/test-db
```

## 🌐 Acceso de Red

El servidor está configurado para ser accesible desde:
- `http://localhost:3000` (local)
- `http://192.168.x.x:3000` (red local)
- WebSocket habilitado para tiempo real

## 📊 Base de Datos

- **Motor**: PostgreSQL
- **Base**: `reinas2025`
- **Usuario**: `postgres`
- **Password**: `admin`
- **Puerto**: `5432`

## 🔐 Autenticación

### Usuarios de prueba:
```javascript
// Admin
email: "admin@espe.edu.ec"
password: "admin123"

// Juez
email: "judge1@espe.edu.ec" 
password: "judge123"
```

## 📡 API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión

### Eventos
- `GET /api/events` - Listar eventos
- `GET /api/events/active` - Eventos activos (jueces)
- `POST /api/events` - Crear evento (admin)
- `PUT /api/events/:id` - Actualizar evento

### Candidatas
- `GET /api/candidates` - Listar candidatas
- `POST /api/candidates` - Crear candidata (con foto)
- `PUT /api/candidates/:id` - Actualizar candidata

### Calificaciones
- `POST /api/scores` - Enviar calificación (jueces)
- `GET /api/scores/my-scores` - Mis calificaciones

### Administración
- `GET /api/admin/reports/stats` - Estadísticas
- `POST /api/admin/reports/generate` - Generar reporte
- `DELETE /api/admin/reset-votes` - Reiniciar votaciones

### Desempates
- `GET /api/admin/ties/current` - Empates actuales
- `POST /api/admin/ties/activate` - Activar desempate
- `GET /api/judge/tiebreaker/current` - Desempate activo (jueces)

## 📄 Generación de PDFs

El sistema genera reportes en PDF con:
- Rankings finales
- Top 3 con fotos
- Firmas de verificación
- Formato oficial ESPE

## 🔧 Desarrollo

### Completar estructura modular:

1. **Falta implementar**:
   - `VoteController.js`
   - `UserController.js`
   - `AdminController.js`
   - `JudgeController.js`
   - Servicios de PDF
   - Manejo de archivos estático

2. **Prioridades**:
   - Migrar lógica de `server-complete.js` a controladores
   - Implementar servicios faltantes
   - Pruebas de integración

### Contribuir:
```bash
git clone [repo]
cd espe-pageant-server
npm install
npm run dev
```

## 🐛 Troubleshooting

### Errores comunes:
1. **Puerto 3000 ocupado**: Cambiar PORT en config
2. **DB no conecta**: Verificar PostgreSQL corriendo
3. **CORS errors**: Revisar configuración de red
4. **PowerShell &&**: Usar comandos separados

### Logs importantes:
- `✅ WebSocket servidor configurado`
- `✅ Conexión a base de datos establecida`
- `🚀 Servidor ESPE Pageant ejecutándose...`

## 📝 Notas de Desarrollo

- **ES6 Modules**: Todo el proyecto usa `import/export`
- **Top-level await**: Soportado en server principal
- **Sessions**: Almacenadas en memoria (considerar Redis)
- **CORS**: Configurado para red local completa
- **Upload**: Multer con límite 5MB para fotos

## ✨ Funcionalidades Destacadas

- 🔄 **Tiempo real**: WebSocket para actualizaciones instantáneas
- 📱 **Responsive**: Accesible desde móviles en red local
- 🏆 **Desempates**: Sistema automático de tie-breaking
- 📊 **Reportes**: PDFs oficiales con fotos
- 🔐 **Seguridad**: Autenticación por roles (admin, judge)
- 📈 **Monitoreo**: Dashboard para seguimiento de votaciones

---

**Desarrollado para Universidad de las Fuerzas Armadas ESPE**  
**Concurso Reina ESPE 2025** 🌟 