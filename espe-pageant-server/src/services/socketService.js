export class SocketService {
  
  constructor(io) {
    this.io = io;
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 Cliente WebSocket conectado: ${socket.id}`);
      
      // Join room
      socket.on('join_room', (roomName) => {
        socket.join(roomName);
        console.log(`📡 Cliente ${socket.id} se unió a sala: ${roomName}`);
      });
      
      // Leave room
      socket.on('leave_room', (roomName) => {
        socket.leave(roomName);
        console.log(`📡 Cliente ${socket.id} salió de sala: ${roomName}`);
      });
      
      // Disconnect
      socket.on('disconnect', (reason) => {
        console.log(`🔌 Cliente WebSocket desconectado: ${socket.id}, razón: ${reason}`);
      });
      
      // Send connection confirmation
      socket.emit('connected', {
        message: 'Conectado al servidor ESPE Pageant WebSocket',
        timestamp: new Date().toISOString(),
        socketId: socket.id
      });
    });
    
    console.log('✅ WebSocket servidor configurado');
  }

  // Broadcast to all connected clients
  broadcast(event, data) {
    this.io.emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  // Broadcast to specific room
  broadcastToRoom(room, event, data) {
    this.io.to(room).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  // Send vote update
  broadcastVoteUpdate(eventId, voteData) {
    this.broadcastToRoom('admin', 'vote_update', {
      eventId,
      vote: voteData
    });
    
    this.broadcastToRoom('public', 'vote_update', {
      eventId,
      candidateId: voteData.candidate_id,
      totalScore: voteData.total_score
    });
  }

  // Send event status change
  broadcastEventStatusChange(eventId, status) {
    this.broadcast('event_status_change', {
      eventId,
      status
    });
  }

  // Send event weight change
  broadcastEventWeightChange(eventId, weight) {
    this.broadcastToRoom('admin', 'event_weight_change', {
      eventId,
      weight
    });
  }

  // Send final results update
  broadcastResultsUpdate(results) {
    this.broadcast('results_update', {
      results
    });
  }

  // Send system notification
  broadcastNotification(message, type = 'info') {
    this.broadcast('notification', {
      message,
      type
    });
  }

  // Get connection stats
  getStats() {
    const sockets = this.io.sockets.sockets;
    return {
      connectedClients: sockets.size,
      rooms: Array.from(this.io.sockets.adapter.rooms.keys())
        .filter(room => !sockets.has(room)), // Filter out socket IDs
      timestamp: new Date().toISOString()
    };
  }
} 