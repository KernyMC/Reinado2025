# 👑 Sistema de Votación Reina ESPE 2025

Sistema completo de votación para la elección de Reina ESPE 2025, desarrollado con tecnologías modernas y optimizado para uso en tiempo real.

## 🏗️ Arquitectura del Sistema

### 📁 Estructura del Proyecto
```
Reinas 2025/
├── espe-pageant-client/     # Frontend - React + TypeScript + Vite
├── espe-pageant-server/     # Backend - Node.js + Express + PostgreSQL
├── README.md               # Documentación principal
└── .gitignore              # Exclusiones de Git
```

## 🚀 Características Principales

### ✨ **Frontend (Cliente)**
- **React 18** con TypeScript
- **Vite** para build rápido y desarrollo
- **Tailwind CSS** para diseño moderno
- **Responsive Design** - Compatible con móviles y tablets
- **WebSocket** para actualizaciones en tiempo real
- **PWA Ready** - Funciona como aplicación móvil

### ⚡ **Backend (Servidor)**
- **Node.js + Express** - API REST robusta
- **PostgreSQL** - Base de datos relacional
- **WebSocket** - Comunicación en tiempo real
- **Multer** - Subida de archivos (fotos candidatas)
- **jsPDF** - Generación de reportes en PDF
- **Session Management** - Autenticación segura

### 🔐 **Seguridad y Roles**
- **Administradores**: Gestión completa del sistema
- **Jueces**: Panel de votación especializado
- **Autenticación**: Sistema de tokens y sesiones
- **CORS**: Configurado para redes locales

## 🛠️ Instalación y Configuración

### 📋 Requisitos Previos
- **Node.js** v18 o superior
- **PostgreSQL** v12 o superior
- **Git** (para desarrollo)

### 🚀 Instalación Rápida

#### 1️⃣ **Clonar el Repositorio**
\`\`\`bash
git clone https://github.com/KernyMC/Reinado2025.git
cd Reinado2025
\`\`\`

#### 2️⃣ **Configurar la Base de Datos**
\`\`\`sql
-- Crear base de datos PostgreSQL
CREATE DATABASE reinas2025;
-- Configurar usuario (usar credenciales por defecto o ajustar)
\`\`\`

#### 3️⃣ **Instalar Dependencias del Servidor**
\`\`\`bash
cd espe-pageant-server
npm install
\`\`\`

#### 4️⃣ **Instalar Dependencias del Cliente**
\`\`\`bash
cd ../espe-pageant-client
npm install
\`\`\`

#### 5️⃣ **Construir el Cliente para Producción**
\`\`\`bash
npm run build
\`\`\`

#### 6️⃣ **Crear Usuarios de Prueba**
\`\`\`bash
cd ../espe-pageant-server
node create-admin-quick.cjs
\`\`\`

#### 7️⃣ **Iniciar el Servidor de Producción**
\`\`\`bash
node server-production-fixed.cjs
\`\`\`

## 🌐 Acceso al Sistema

### 💻 **URLs de Acceso**
- **Local**: http://localhost:3000
- **Red Local**: http://[IP-LOCAL]:3000

### 🔑 **Credenciales de Prueba**
**Administrador:**
- Email: \`admin@espe.edu.ec\`
- Password: \`123456\`

**Juez:**
- Email: \`juez1@espe.edu.ec\`
- Password: \`123456\`

## 📱 Funcionalidades del Sistema

### 👨‍💼 **Panel de Administración**
- ✅ Gestión de candidatas (CRUD completo)
- ✅ Configuración de eventos de votación
- ✅ Monitoreo de jueces en tiempo real
- ✅ Generación de reportes en PDF
- ✅ Sistema de desempates automático
- ✅ Control de usuarios y permisos

### ⚖️ **Panel de Jueces**
- ✅ Votación intuitiva por eventos
- ✅ Sistema de calificación 1-10
- ✅ Actualización en tiempo real
- ✅ Historial de votaciones
- ✅ Notificaciones de desempates

### 📊 **Sistema de Reportes**
- ✅ Rankings en tiempo real
- ✅ Exportación a PDF profesional
- ✅ Filtros por evento y fecha
- ✅ Estadísticas detalladas
- ✅ Fotos incluidas en reportes

### 🏆 **Sistema de Desempates**
- ✅ Detección automática de empates
- ✅ Votación de desempate en tiempo real
- ✅ Bonificaciones por posición
- ✅ Finalización automática

## 🔧 Desarrollo

### 🛠️ **Desarrollo del Cliente**
\`\`\`bash
cd espe-pageant-client
npm run dev
\`\`\`

### 🛠️ **Desarrollo del Servidor**
\`\`\`bash
cd espe-pageant-server
npm run dev
\`\`\`

### 📦 **Build de Producción**
\`\`\`bash
# Cliente
cd espe-pageant-client
npm run build

# Servidor (ya incluye cliente)
cd ../espe-pageant-server
node server-production-fixed.cjs
\`\`\`

## 📈 Tecnologías Utilizadas

### **Frontend**
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Axios
- Socket.io-client

### **Backend**
- Node.js
- Express.js
- PostgreSQL
- Socket.io
- Multer
- jsPDF

## 🎯 Características Especiales

### ⚡ **Tiempo Real**
- Notificaciones instantáneas de votaciones
- Actualizaciones de estado en vivo
- Monitoreo de jueces en tiempo real

### 📱 **Mobile First**
- Diseño completamente responsive
- Optimizado para tablets y móviles
- Acceso desde cualquier dispositivo en la red

### 🔒 **Seguridad**
- Autenticación basada en sesiones
- Validación de roles y permisos
- CORS configurado para redes locales

### 📊 **Reportes Profesionales**
- PDFs con logos y formato oficial
- Fotos de candidatas incluidas
- Múltiples formatos de exportación

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama feature (\`git checkout -b feature/nueva-funcionalidad\`)
3. Commit tus cambios (\`git commit -m 'Agregar nueva funcionalidad'\`)
4. Push a la rama (\`git push origin feature/nueva-funcionalidad\`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 👥 Equipo de Desarrollo

- **Desarrollo Principal**: Sistema ESPE Pageant 2025
- **Universidad**: ESPE (Escuela Politécnica del Ejército)
- **Año**: 2025

## 📞 Soporte

Para soporte técnico o preguntas sobre el sistema, contactar al equipo de desarrollo.

---

**🎊 ¡Sistema listo para la elección de Reina ESPE 2025! 👑** 