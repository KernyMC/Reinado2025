# 🚀 ESPE Pageant Server - Guía Simple

## ✅ Uso Correcto (Sin Scripts .cjs)

### 📂 Desde el directorio correcto:
```bash
cd "D:\Reinas 2025\espe-pageant-server"
```

### 🎯 Comandos principales:

#### 🚀 **Iniciar servidor completo:**
```bash
npm start
```

#### 🔧 **Desarrollo con auto-reload:**
```bash
npm run dev
```

#### 🏗️ **Servidor simplificado:**
```bash
npm run dev:simple
```

#### 👤 **Crear usuarios admin/juez:**
```bash
npm run setup
```

#### 🧹 **Limpiar base de datos:**
```bash
npm run reset
```

#### 🏥 **Verificar estado:**
```bash
npm run health
```

## 🖱️ Inicio rápido con doble clic:
```
start.bat
```

## 🌐 Acceso al sistema:
- **URL**: http://localhost:3000
- **Admin**: admin@espe.edu.ec / 123456
- **Juez**: juez1@espe.edu.ec / 123456

## ❌ NO hagas esto:
```bash
# ❌ INCORRECTO - No ejecutar desde directorio raíz
D:\Reinas 2025> node server-complete.cjs

# ❌ INCORRECTO - No usar && en PowerShell
cd "..." && npm start

# ❌ INCORRECTO - No usar scripts .cjs manualmente
node test-*.cjs
```

## ✅ Haz esto en su lugar:
```bash
# ✅ CORRECTO
cd "D:\Reinas 2025\espe-pageant-server"
npm start

# ✅ CORRECTO - PowerShell
cd "D:\Reinas 2025\espe-pageant-server"
npm start

# ✅ CORRECTO - Usar scripts npm
npm run setup
npm run dev
```

## 🔧 Si algo se rompe:

1. **Verificar directorio:**
   ```bash
   pwd  # Debe mostrar: D:\Reinas 2025\espe-pageant-server
   ```

2. **Reinstalar dependencias:**
   ```bash
   npm install
   ```

3. **Reiniciar servidor:**
   ```bash
   npm start
   ```

4. **Recrear usuarios:**
   ```bash
   npm run setup
   ```

## 📋 Scripts disponibles:
- `npm start` - Servidor completo
- `npm run dev` - Desarrollo con nodemon
- `npm run setup` - Crear usuarios
- `npm run reset` - Limpiar DB
- `npm run health` - Verificar estado

**🎯 Regla de oro: Todo se hace con `npm` desde el directorio del servidor** 