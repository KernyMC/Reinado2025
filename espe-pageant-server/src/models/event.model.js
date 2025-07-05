/**
 * Event Model
 * @description Modelo para gestión de eventos del reinado
 */

import { executeQuery, executeTransaction } from '../config/database.js';

export class EventModel {
  /**
   * Obtener todos los eventos
   * @param {Object} filters - Filtros opcionales
   * @returns {Promise<Array>} Lista de eventos
   */
  static async getAll(filters = {}) {
    let query = `
      SELECT id, name, event_type, description, status, weight, is_mandatory, 
             bonus_percentage, is_active, created_at, updated_at 
      FROM events 
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (filters.is_active !== undefined) {
      query += ` AND is_active = $${paramCount}`;
      params.push(filters.is_active);
      paramCount++;
    }

    if (filters.is_mandatory !== undefined) {
      query += ` AND is_mandatory = $${paramCount}`;
      params.push(filters.is_mandatory);
      paramCount++;
    }

    if (filters.event_type) {
      query += ` AND event_type = $${paramCount}`;
      params.push(filters.event_type);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await executeQuery(query, params);
    return result.rows;
  }

  /**
   * Obtener eventos activos
   * @returns {Promise<Array>} Lista de eventos activos
   */
  static async getActive() {
    const result = await executeQuery(
      'SELECT * FROM events WHERE is_active = true ORDER BY created_at DESC'
    );
    return result.rows;
  }

  /**
   * Obtener evento por ID
   * @param {string} id - ID del evento
   * @returns {Promise<Object|null>} Evento encontrado
   */
  static async getById(id) {
    const result = await executeQuery('SELECT * FROM events WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  /**
   * Crear nuevo evento
   * @param {Object} eventData - Datos del evento
   * @returns {Promise<Object>} Evento creado
   */
  static async create(eventData) {
    const {
      name,
      event_type = 'competition',
      description,
      status = 'active',
      weight = 0,
      is_mandatory = true,
      bonus_percentage = 0,
      is_active = true
    } = eventData;

    const result = await executeQuery(
      `INSERT INTO events (name, event_type, description, status, weight, is_mandatory, bonus_percentage, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [name, event_type, description, status, weight, is_mandatory, bonus_percentage, is_active]
    );

    return result.rows[0];
  }

  /**
   * Actualizar evento
   * @param {string} id - ID del evento
   * @param {Object} eventData - Datos a actualizar
   * @returns {Promise<Object>} Evento actualizado
   */
  static async update(id, eventData) {
    // Obtener evento actual para preservar valores existentes
    const currentEvent = await this.getById(id);
    if (!currentEvent) {
      throw new Error('Evento no encontrado');
    }

    const updateData = {
      name: eventData.name || currentEvent.name,
      event_type: eventData.event_type || currentEvent.event_type || 'competition',
      description: eventData.description !== undefined ? eventData.description : currentEvent.description,
      status: eventData.status || currentEvent.status || 'active',
      weight: eventData.weight !== undefined ? eventData.weight : currentEvent.weight,
      is_mandatory: eventData.is_mandatory !== undefined ? eventData.is_mandatory : currentEvent.is_mandatory,
      bonus_percentage: eventData.bonus_percentage !== undefined ? eventData.bonus_percentage : currentEvent.bonus_percentage,
      is_active: eventData.is_active !== undefined ? eventData.is_active : currentEvent.is_active
    };

    const result = await executeQuery(
      `UPDATE events 
       SET name = $1, event_type = $2, description = $3, status = $4, weight = $5, 
           is_mandatory = $6, bonus_percentage = $7, is_active = $8, updated_at = NOW() 
       WHERE id = $9 
       RETURNING *`,
      [
        updateData.name,
        updateData.event_type,
        updateData.description,
        updateData.status,
        updateData.weight,
        updateData.is_mandatory,
        updateData.bonus_percentage,
        updateData.is_active,
        id
      ]
    );

    return result.rows[0];
  }

  /**
   * Eliminar evento
   * @param {string} id - ID del evento
   * @returns {Promise<boolean>} True si se eliminó exitosamente
   */
  static async delete(id) {
    const result = await executeQuery('DELETE FROM events WHERE id = $1 RETURNING *', [id]);
    return result.rows.length > 0;
  }

  /**
   * Validar pesos de eventos obligatorios
   * @returns {Promise<Object>} Resultado de la validación
   */
  static async validateWeights() {
    // Obtener eventos obligatorios
    const mandatoryEvents = await executeQuery(
      'SELECT id, name, weight FROM events WHERE is_mandatory = true'
    );

    // Calcular peso total
    const totalWeight = mandatoryEvents.rows.reduce((sum, event) => {
      return sum + parseFloat(event.weight || 0);
    }, 0);

    // Obtener eventos opcionales
    const optionalEvents = await executeQuery(
      'SELECT id, name, bonus_percentage FROM events WHERE is_mandatory = false'
    );

    return {
      mandatory: {
        events: mandatoryEvents.rows,
        totalWeight: totalWeight,
        isValid: Math.abs(totalWeight - 100) < 0.01 // Permitir pequeñas diferencias de punto flotante
      },
      optional: {
        events: optionalEvents.rows,
        count: optionalEvents.rows.length
      }
    };
  }

  /**
   * Obtener eventos con estadísticas de participación
   * @returns {Promise<Array>} Eventos con estadísticas
   */
  static async getWithStats() {
    const result = await executeQuery(`
      SELECT 
        e.*,
        COUNT(DISTINCT js.judge_id) as judges_participated,
        COUNT(DISTINCT js.candidate_id) as candidates_scored,
        COUNT(js.id) as total_scores,
        COALESCE(AVG(js.score), 0) as average_score
      FROM events e
      LEFT JOIN judge_scores js ON e.id = js.event_id
      GROUP BY e.id
      ORDER BY e.created_at DESC
    `);

    return result.rows.map(row => ({
      ...row,
      judges_participated: parseInt(row.judges_participated),
      candidates_scored: parseInt(row.candidates_scored),
      total_scores: parseInt(row.total_scores),
      average_score: parseFloat(row.average_score)
    }));
  }

  /**
   * Verificar si el nombre del evento ya existe
   * @param {string} name - Nombre a verificar
   * @param {string} excludeId - ID a excluir de la verificación
   * @returns {Promise<boolean>} True si el nombre ya existe
   */
  static async nameExists(name, excludeId = null) {
    let query = 'SELECT id FROM events WHERE name ILIKE $1';
    const params = [name];

    if (excludeId) {
      query += ' AND id != $2';
      params.push(excludeId);
    }

    const result = await executeQuery(query, params);
    return result.rows.length > 0;
  }

  /**
   * Obtener estadísticas de eventos
   * @returns {Promise<Object>} Estadísticas de eventos
   */
  static async getStats() {
    const result = await executeQuery(`
      SELECT 
        COUNT(*) as total_events,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_events,
        COUNT(CASE WHEN is_mandatory = true THEN 1 END) as mandatory_events,
        COUNT(CASE WHEN is_mandatory = false THEN 1 END) as optional_events,
        COALESCE(SUM(CASE WHEN is_mandatory = true THEN weight ELSE 0 END), 0) as total_weight
      FROM events
    `);

    return {
      ...result.rows[0],
      total_events: parseInt(result.rows[0].total_events),
      active_events: parseInt(result.rows[0].active_events),
      mandatory_events: parseInt(result.rows[0].mandatory_events),
      optional_events: parseInt(result.rows[0].optional_events),
      total_weight: parseFloat(result.rows[0].total_weight)
    };
  }

  /**
   * Obtener tipos de eventos únicos
   * @returns {Promise<Array>} Lista de tipos de eventos
   */
  static async getEventTypes() {
    const result = await executeQuery(`
      SELECT DISTINCT event_type, COUNT(*) as count
      FROM events
      WHERE event_type IS NOT NULL
      GROUP BY event_type
      ORDER BY count DESC
    `);

    return result.rows.map(row => ({
      type: row.event_type,
      count: parseInt(row.count)
    }));
  }

  /**
   * Cambiar estado activo de múltiples eventos
   * @param {Array} eventIds - IDs de los eventos
   * @param {boolean} isActive - Nuevo estado activo
   * @returns {Promise<Array>} Eventos actualizados
   */
  static async bulkUpdateStatus(eventIds, isActive) {
    const placeholders = eventIds.map((_, index) => `$${index + 1}`).join(',');
    const params = [...eventIds, isActive];

    const result = await executeQuery(
      `UPDATE events 
       SET is_active = $${params.length}, updated_at = NOW() 
       WHERE id IN (${placeholders}) 
       RETURNING *`,
      params
    );

    return result.rows;
  }
} 