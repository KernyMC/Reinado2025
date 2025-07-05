/**
 * Candidate Model
 * @description Modelo para gestión de candidatas del reinado
 */

import { executeQuery, executeTransaction } from '../config/database.js';

export class CandidateModel {
  /**
   * Obtener todas las candidatas
   * @param {Object} filters - Filtros opcionales
   * @returns {Promise<Array>} Lista de candidatas
   */
  static async getAll(filters = {}) {
    let query = `
      SELECT id, name, major, department, image_url, biography, is_active, created_at, updated_at 
      FROM candidates 
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (filters.is_active !== undefined) {
      query += ` AND is_active = $${paramCount}`;
      params.push(filters.is_active);
      paramCount++;
    }

    if (filters.department) {
      query += ` AND department ILIKE $${paramCount}`;
      params.push(`%${filters.department}%`);
      paramCount++;
    }

    query += ' ORDER BY name';

    const result = await executeQuery(query, params);
    return result.rows;
  }

  /**
   * Obtener candidatas activas
   * @returns {Promise<Array>} Lista de candidatas activas
   */
  static async getActive() {
    const result = await executeQuery(
      'SELECT id, name, major, department, image_url, biography FROM candidates WHERE is_active = true ORDER BY name'
    );
    return result.rows;
  }

  /**
   * Obtener candidata por ID
   * @param {string} id - ID de la candidata
   * @returns {Promise<Object|null>} Candidata encontrada
   */
  static async getById(id) {
    const result = await executeQuery(
      'SELECT * FROM candidates WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Crear nueva candidata
   * @param {Object} candidateData - Datos de la candidata
   * @returns {Promise<Object>} Candidata creada
   */
  static async create(candidateData) {
    const { name, major, department, image_url, biography, is_active = true } = candidateData;
    
    const result = await executeQuery(
      `INSERT INTO candidates (name, major, department, image_url, biography, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [name, major, department, image_url, biography, is_active]
    );
    
    return result.rows[0];
  }

  /**
   * Actualizar candidata
   * @param {string} id - ID de la candidata
   * @param {Object} candidateData - Datos a actualizar
   * @returns {Promise<Object>} Candidata actualizada
   */
  static async update(id, candidateData) {
    const { name, major, department, image_url, biography, is_active } = candidateData;
    
    const result = await executeQuery(
      `UPDATE candidates 
       SET name = $1, major = $2, department = $3, image_url = $4, biography = $5, is_active = $6, updated_at = NOW() 
       WHERE id = $7 
       RETURNING *`,
      [name, major, department, image_url, biography, is_active, id]
    );
    
    return result.rows[0];
  }

  /**
   * Eliminar candidata
   * @param {string} id - ID de la candidata
   * @returns {Promise<boolean>} True si se eliminó exitosamente
   */
  static async delete(id) {
    const result = await executeQuery('DELETE FROM candidates WHERE id = $1 RETURNING id', [id]);
    return result.rows.length > 0;
  }

  /**
   * Obtener candidatas con sus puntajes
   * @returns {Promise<Array>} Candidatas con puntajes calculados
   */
  static async getWithScores() {
    const result = await executeQuery(`
      SELECT 
        c.id,
        c.name,
        c.major,
        c.department,
        c.image_url,
        COALESCE(AVG(js.score), 0) as average_score,
        COALESCE(SUM(js.score), 0) as total_score,
        COUNT(js.id) as score_count
      FROM candidates c
      LEFT JOIN judge_scores js ON c.id = js.candidate_id
      WHERE c.is_active = true
      GROUP BY c.id, c.name, c.major, c.department, c.image_url
      ORDER BY average_score DESC
    `);
    
    return result.rows.map(row => ({
      ...row,
      average_score: parseFloat(row.average_score),
      total_score: parseFloat(row.total_score),
      score_count: parseInt(row.score_count)
    }));
  }

  /**
   * Obtener candidatas con puntajes por evento
   * @param {string} eventId - ID del evento
   * @returns {Promise<Array>} Candidatas con puntajes del evento específico
   */
  static async getWithScoresByEvent(eventId) {
    const result = await executeQuery(`
      SELECT 
        c.id,
        c.name,
        c.major,
        c.department,
        c.image_url,
        COALESCE(AVG(js.score), 0) as average_score,
        COUNT(js.id) as score_count,
        json_agg(
          json_build_object(
            'judge_id', js.judge_id,
            'score', js.score,
            'created_at', js.created_at
          ) ORDER BY js.created_at
        ) FILTER (WHERE js.id IS NOT NULL) as scores
      FROM candidates c
      LEFT JOIN judge_scores js ON c.id = js.candidate_id AND js.event_id = $1
      WHERE c.is_active = true
      GROUP BY c.id, c.name, c.major, c.department, c.image_url
      ORDER BY average_score DESC
    `, [eventId]);
    
    return result.rows.map(row => ({
      ...row,
      average_score: parseFloat(row.average_score),
      score_count: parseInt(row.score_count),
      scores: row.scores || []
    }));
  }

  /**
   * Verificar si el nombre de candidata ya existe
   * @param {string} name - Nombre a verificar
   * @param {string} excludeId - ID a excluir de la verificación
   * @returns {Promise<boolean>} True si el nombre ya existe
   */
  static async nameExists(name, excludeId = null) {
    let query = 'SELECT id FROM candidates WHERE name ILIKE $1';
    const params = [name];
    
    if (excludeId) {
      query += ' AND id != $2';
      params.push(excludeId);
    }
    
    const result = await executeQuery(query, params);
    return result.rows.length > 0;
  }

  /**
   * Obtener estadísticas de candidatas
   * @returns {Promise<Object>} Estadísticas de candidatas
   */
  static async getStats() {
    const result = await executeQuery(`
      SELECT 
        COUNT(*) as total_candidates,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_candidates,
        COUNT(DISTINCT department) as departments_count,
        COUNT(CASE WHEN image_url IS NOT NULL THEN 1 END) as candidates_with_photo
      FROM candidates
    `);
    
    return {
      ...result.rows[0],
      total_candidates: parseInt(result.rows[0].total_candidates),
      active_candidates: parseInt(result.rows[0].active_candidates),
      departments_count: parseInt(result.rows[0].departments_count),
      candidates_with_photo: parseInt(result.rows[0].candidates_with_photo)
    };
  }

  /**
   * Obtener candidatas por departamento
   * @returns {Promise<Array>} Candidatas agrupadas por departamento
   */
  static async getByDepartment() {
    const result = await executeQuery(`
      SELECT 
        department,
        COUNT(*) as candidate_count,
        json_agg(
          json_build_object(
            'id', id,
            'name', name,
            'major', major,
            'image_url', image_url
          ) ORDER BY name
        ) as candidates
      FROM candidates
      WHERE is_active = true
      GROUP BY department
      ORDER BY department
    `);
    
    return result.rows.map(row => ({
      ...row,
      candidate_count: parseInt(row.candidate_count)
    }));
  }
} 