# 🚀 CÓMO EJECUTAR EL SISTEMA ESPE PAGEANT 2025

## 🎯 **OPCIÓN 1: AUTOMÁTICA (RECOMENDADA)**

### Para Windows CMD:
```cmd
start-full-system.cmd
```

### Para PowerShell:
```powershell
.\start-full-system.ps1
```

---

## 🔧 **OPCIÓN 2: MANUAL (PASO A PASO)**

### 1️⃣ **Iniciar el SERVIDOR:**

**Opción A - Windows CMD:**
```cmd
cd espe-pageant-server
set PORT=3000
cd src
node server.js
```

**Opción B - PowerShell:**
```powershell
cd espe-pageant-server
$env:PORT = "3000"
cd src
node server.js
```

**Opción C - Scripts creados:**
```cmd
cd espe-pageant-server
start-simple.cmd
```

### 2️⃣ **Iniciar el CLIENTE (en otra ventana):**
```cmd
cd espe-pageant-client
npm start
```

---

## 📋 **URLs DE ACCESO:**

- **🖥️ Cliente (Frontend):** http://localhost:5173
- **⚙️ Servidor (API):** http://localhost:3000
- **📊 API Status:** http://localhost:3000/api/health

---

## 🎯 **SCRIPTS DISPONIBLES EN EL CLIENTE:**

```cmd
npm start    # Inicia el servidor de desarrollo (RECOMENDADO)
npm run dev  # Alternativa a npm start
npm run build # Construir para producción
npm run preview # Vista previa de la build
```

---

## 🔧 **SOLUCIÓN DE PROBLEMAS:**

### ❌ **Error: "El token '&&' no es un separador válido"**
**Solución:** Usar los scripts `.cmd` o `.ps1` que creamos, NO comandos con `&&`

### ❌ **Error: "Puerto ocupado"**
**Solución:** 
```cmd
netstat -ano | findstr :3000
taskkill /PID <numero_pid> /F
```

### ❌ **Error: "Node.js no encontrado"**
**Solución:** Instalar Node.js desde https://nodejs.org

### ❌ **Error: "npm no encontrado"**
**Solución:** Reinstalar Node.js con npm incluido

---

## 📝 **ORDEN DE INICIO RECOMENDADO:**

1. **PRIMERO:** Servidor (espe-pageant-server)
2. **SEGUNDO:** Cliente (espe-pageant-client)
3. **ACCEDER:** http://localhost:5173

---

## 🛑 **PARA DETENER EL SISTEMA:**

- Presiona `Ctrl + C` en cada ventana del terminal
- O cierra las ventanas de CMD/PowerShell

---

## 🎯 **COMANDOS RÁPIDOS:**

```cmd
:: Verificar que Node.js funciona
node --version
npm --version

:: Ver procesos en puerto 3000
netstat -ano | findstr :3000

:: Ver procesos en puerto 5173  
netstat -ano | findstr :5173
``` 