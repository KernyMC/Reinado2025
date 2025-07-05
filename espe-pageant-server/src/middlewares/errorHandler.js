export function errorHandler(err, req, res, next) {
  console.error('❌ Error:', err);
  
  // Error de validación
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
  
  // Error de autenticación
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      error: 'No autorizado'
    });
  }
  
  // Error de base de datos
  if (err.code === '23505') { // Unique violation
    return res.status(400).json({
      success: false,
      error: 'El registro ya existe'
    });
  }
  
  // Error por defecto
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor'
  });
} 