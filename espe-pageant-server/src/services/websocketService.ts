import { Server as SocketIOServer, Socket } from 'socket.io';
import { VoteUpdateEvent, ScoreUpdateEvent, EventStatusUpdateEvent } from '@/types/api.js';

let io: SocketIOServer;

export const setupWebSocketHandlers = (socketServer: SocketIOServer): void => {
  io = socketServer;

  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Cliente conectado: ${socket.id}`);

    // Join room for real-time updates
    socket.on('join_room', (room: string) => {
      socket.join(room);
      console.log(`📡 Cliente ${socket.id} se unió a la sala: ${room}`);
    });

    // Leave room
    socket.on('leave_room', (room: string) => {
      socket.leave(room);
      console.log(`📡 Cliente ${socket.id} salió de la sala: ${room}`);
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`🔌 Cliente desconectado: ${socket.id}, razón: ${reason}`);
    });

    // Send initial connection confirmation
    socket.emit('connected', {
      message: 'Conectado al servidor ESPE Pageant',
      timestamp: new Date().toISOString()
    });
  });

  console.log('✅ WebSocket handlers configurados');
};

// Broadcast vote update to all clients
export const broadcastVoteUpdate = (data: VoteUpdateEvent['data']): void => {
  if (!io) return;

  const event: VoteUpdateEvent = {
    type: 'vote_update',
    data,
    timestamp: new Date()
  };

  io.emit('vote_update', event);
  console.log(`📊 Voto actualizado broadcast: candidata ${data.candidate_id}`);
};

// Broadcast score update to all clients
export const broadcastScoreUpdate = (data: ScoreUpdateEvent['data']): void => {
  if (!io) return;

  const event: ScoreUpdateEvent = {
    type: 'score_update',
    data,
    timestamp: new Date()
  };

  io.emit('score_update', event);
  console.log(`📊 Puntuación actualizada broadcast: candidata ${data.candidate_id}, evento ${data.event_id}`);
};

// Broadcast event status update
export const broadcastEventStatusUpdate = (data: EventStatusUpdateEvent['data']): void => {
  if (!io) return;

  const event: EventStatusUpdateEvent = {
    type: 'event_status_update',
    data,
    timestamp: new Date()
  };

  io.emit('event_status_update', event);
  console.log(`📊 Estado de evento actualizado broadcast: ${data.event_id} -> ${data.status}`);
};

// Send notification to specific room
export const sendToRoom = (room: string, event: string, data: any): void => {
  if (!io) return;

  io.to(room).emit(event, {
    ...data,
    timestamp: new Date().toISOString()
  });
};

// Send notification to specific user (if they have a room with their user ID)
export const sendToUser = (userId: string, event: string, data: any): void => {
  sendToRoom(`user_${userId}`, event, data);
};

// Get connected clients count
export const getConnectedClientsCount = (): number => {
  if (!io) return 0;
  return io.engine.clientsCount;
};

// Send system notification to all clients
export const broadcastSystemNotification = (message: string, type: 'info' | 'warning' | 'error' = 'info'): void => {
  if (!io) return;

  io.emit('system_notification', {
    type,
    message,
    timestamp: new Date().toISOString()
  });

  console.log(`📢 Notificación del sistema broadcast: ${message}`);
}; 