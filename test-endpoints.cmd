@echo off
echo 🧪 Probando endpoints del servidor...
echo.

echo 📡 Verificando servidor en puerto 3000...
curl -s http://localhost:3000/api/health

echo.
echo 👥 Verificando endpoint de usuarios...
curl -s http://localhost:3000/api/users

echo.
echo 📊 Verificando endpoint de voting-status...
curl -s http://localhost:3000/api/judges/voting-status

echo.
echo ✅ Pruebas completadas 