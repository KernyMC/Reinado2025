import { pool } from '@/config/database.js';

export interface Event {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  start_time?: Date;
  end_time?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export class EventService {
  
  // Get all active events
  async getAllActive(): Promise<Event[]> {
    try {
      const query = `
        SELECT id, name, description, is_active, start_time, end_time, created_at, updated_at
        FROM events 
        WHERE is_active = true 
        ORDER BY start_time ASC, name ASC
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error getting events:', error);
      throw new Error('Error al obtener eventos');
    }
  }

  // Get all events (including inactive)
  async getAll(): Promise<Event[]> {
    try {
      const query = `
        SELECT id, name, description, is_active, start_time, end_time, created_at, updated_at
        FROM events 
        ORDER BY start_time ASC, name ASC
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error getting all events:', error);
      throw new Error('Error al obtener todos los eventos');
    }
  }

  // Get event by ID
  async getById(id: string): Promise<Event | null> {
    try {
      const query = `
        SELECT id, name, description, is_active, start_time, end_time, created_at, updated_at
        FROM events 
        WHERE id = $1
      `;
      
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting event by ID:', error);
      throw new Error('Error al obtener evento');
    }
  }
}

export const eventService = new EventService(); 