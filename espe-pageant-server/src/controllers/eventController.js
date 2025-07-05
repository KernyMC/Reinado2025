import { EventModel } from '../models/eventModel.js';
import { SocketService } from '../services/socketService.js';

export class EventController {
  
  static setSocketService(socketService) {
    this.socketService = socketService;
  }

  static async getAllEvents(req, res) {
    try {
      const events = await EventModel.findAll();
      res.json({ data: events });
    } catch (error) {
      console.error('Error obteniendo eventos:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        details: error.message 
      });
    }
  }

  static async getEventById(req, res) {
    try {
      const { id } = req.params;
      const event = await EventModel.findById(id);
      
      if (!event) {
        return res.status(404).json({ error: 'Evento no encontrado' });
      }
      
      res.json(event);
    } catch (error) {
      console.error('Error obteniendo evento:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        details: error.message 
      });
    }
  }

  static async createEvent(req, res) {
    try {
      const { name, description, event_type = 'general', weight = 10 } = req.body;
      
      // Validación
      if (!name || !description) {
        return res.status(400).json({ 
          error: 'Nombre y descripción son requeridos' 
        });
      }

      const eventData = {
        name: name.trim(),
        description: description.trim(),
        event_type: event_type || 'general',
        weight: parseInt(weight) || 10
      };

      const newEvent = await EventModel.create(eventData);
      
      // Broadcast update
      if (this.socketService) {
        this.socketService.broadcast('event_created', newEvent);
      }
      
      res.status(201).json(newEvent);
    } catch (error) {
      console.error('Error creando evento:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        details: error.message 
      });
    }
  }

  static async updateEvent(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Fix: Ensure event_type is never null
      if (updateData.event_type === null || updateData.event_type === undefined) {
        updateData.event_type = 'general';
      }
      
      console.log(`🔄 Actualizando evento ${id}:`, updateData);
      
      const updatedEvent = await EventModel.update(id, updateData);
      
      if (!updatedEvent) {
        return res.status(404).json({ error: 'Evento no encontrado' });
      }
      
      console.log(`✅ Evento actualizado:`, updatedEvent);
      
      // Broadcast update
      if (this.socketService) {
        this.socketService.broadcast('event_updated', updatedEvent);
      }
      
      res.json(updatedEvent);
    } catch (error) {
      console.error('❌ Error actualizando evento:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        details: error.message 
      });
    }
  }

  static async updateEventWeight(req, res) {
    try {
      const { id } = req.params;
      const { weight } = req.body;
      
      if (weight === undefined || weight === null) {
        return res.status(400).json({ 
          error: 'Peso es requerido' 
        });
      }

      const numericWeight = parseInt(weight);
      if (isNaN(numericWeight) || numericWeight < 0) {
        return res.status(400).json({ 
          error: 'Peso debe ser un número válido mayor o igual a 0' 
        });
      }
      
      const updatedEvent = await EventModel.updateWeight(id, numericWeight);
      
      if (!updatedEvent) {
        return res.status(404).json({ error: 'Evento no encontrado' });
      }
      
      // Broadcast weight change
      if (this.socketService) {
        this.socketService.broadcastEventWeightChange(id, numericWeight);
      }
      
      res.json(updatedEvent);
    } catch (error) {
      console.error('Error actualizando peso de evento:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        details: error.message 
      });
    }
  }

  static async updateEventStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const validStatuses = ['draft', 'active', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          error: 'Estado inválido. Debe ser: ' + validStatuses.join(', ')
        });
      }
      
      const updatedEvent = await EventModel.updateStatus(id, status);
      
      if (!updatedEvent) {
        return res.status(404).json({ error: 'Evento no encontrado' });
      }
      
      // Broadcast status change
      if (this.socketService) {
        this.socketService.broadcastEventStatusChange(id, status);
      }
      
      res.json(updatedEvent);
    } catch (error) {
      console.error('Error actualizando estado de evento:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        details: error.message 
      });
    }
  }

  static async deleteEvent(req, res) {
    try {
      const { id } = req.params;
      const deletedEvent = await EventModel.delete(id);
      
      if (!deletedEvent) {
        return res.status(404).json({ error: 'Evento no encontrado' });
      }
      
      // Broadcast deletion
      if (this.socketService) {
        this.socketService.broadcast('event_deleted', { eventId: id });
      }
      
      res.json({ message: 'Evento eliminado exitosamente', event: deletedEvent });
    } catch (error) {
      console.error('Error eliminando evento:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        details: error.message 
      });
    }
  }

  static async getActiveEvents(req, res) {
    try {
      const events = await EventModel.getActiveEvents();
      res.json(events);
    } catch (error) {
      console.error('Error obteniendo eventos activos:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        details: error.message 
      });
    }
  }
} 