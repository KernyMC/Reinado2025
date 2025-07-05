import { executeQuery } from '../config/database.js';

export class EventModel {
  
  static async findAll() {
    const query = `
      SELECT 
        id, name, description, event_type, weight, status, 
        start_time, end_time, created_at 
      FROM events 
      ORDER BY created_at ASC
    `;
    const result = await executeQuery(query);
    return result.rows;
  }

  static async findById(id) {
    const query = `
      SELECT 
        id, name, description, event_type, weight, status, 
        start_time, end_time, created_at 
      FROM events 
      WHERE id = $1
    `;
    const result = await executeQuery(query, [id]);
    return result.rows[0];
  }

  static async create(eventData) {
    const { name, description, event_type = 'general', weight = 10 } = eventData;
    const query = `
      INSERT INTO events (name, description, event_type, weight)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await executeQuery(query, [name, description, event_type, weight]);
    return result.rows[0];
  }

  static async update(id, eventData) {
    const { name, description, event_type, weight, status } = eventData;
    
    // Fix: Ensure event_type is never null
    const safeEventType = event_type || 'general';
    
    const query = `
      UPDATE events 
      SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        event_type = COALESCE($3, event_type),
        weight = COALESCE($4, weight),
        status = COALESCE($5, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `;
    const result = await executeQuery(query, [name, description, safeEventType, weight, status, id]);
    return result.rows[0];
  }

  static async updateWeight(id, weight) {
    const query = `
      UPDATE events 
      SET weight = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await executeQuery(query, [weight, id]);
    return result.rows[0];
  }

  static async updateStatus(id, status) {
    const query = `
      UPDATE events 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await executeQuery(query, [status, id]);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM events WHERE id = $1 RETURNING *';
    const result = await executeQuery(query, [id]);
    return result.rows[0];
  }

  static async getActiveEvents() {
    const query = `
      SELECT 
        id, name, description, event_type, weight, status 
      FROM events 
      WHERE status = 'active' 
      ORDER BY created_at ASC
    `;
    const result = await executeQuery(query);
    return result.rows;
  }
} 