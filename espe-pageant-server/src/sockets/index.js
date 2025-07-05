/**
 * WebSocket Handlers
 * @description Configuración y manejo de WebSocket con Socket.IO
 */

/**
 * Registrar manejadores de WebSocket
 * @param {Object} io - Instancia de Socket.IO
 */
export function setupWebSocket(io, pool) {
  io.on('connection', (socket) => {
    console.log(`🔌 Cliente WebSocket conectado: ${socket.id}`);
    
    socket.on('join_room', (roomName) => {
      socket.join(roomName);
      console.log(`📡 Cliente ${socket.id} se unió a sala: ${roomName}`);
    });
    
    socket.on('disconnect', (reason) => {
      console.log(`🔌 Cliente WebSocket desconectado: ${socket.id}, razón: ${reason}`);
    });
    
    // Mensaje de bienvenida
    socket.emit('connected', {
      message: 'Conectado al servidor ESPE Pageant WebSocket',
      timestamp: new Date().toISOString()
    });
  });
  
  console.log('✅ WebSocket servidor configurado');
} 