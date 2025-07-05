/**
 * Score Model
 * @description Modelo para gestión de puntuaciones de jueces
 */

import { executeQuery, executeTransaction } from '../config/database.js';

export class ScoreModel {
  /**
   * Crear o actualizar puntuación
   * @param {Object} scoreData - Datos de la puntuación
   * @returns {Promise<Object>} Puntuación creada o actualizada
   */
  static async upsert(scoreData) {
    const { judge_id, candidate_id, event_id, score } = scoreData;

    // Verificar si ya existe una puntuación
    const existingScore = await this.getByJudgeCandidateEvent(judge_id, candidate_id, event_id);

    if (existingScore) {
      // Actualizar puntuación existente
      const result = await executeQuery(
        `UPDATE judge_scores 
         SET score = $1, updated_at = NOW() 
         WHERE judge_id = $2 AND candidate_id = $3 AND event_id = $4 
         RETURNING *`,
        [score, judge_id, candidate_id, event_id]
      );
      return { ...result.rows[0], action: 'updated' };
    } else {
      // Crear nueva puntuación
      const result = await executeQuery(
        `INSERT INTO judge_scores (judge_id, candidate_id, event_id, score) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [judge_id, candidate_id, event_id, score]
      );
      return { ...result.rows[0], action: 'created' };
    }
  }

  /**
   * Obtener puntuación específica
   * @param {string} judgeId - ID del juez
   * @param {string} candidateId - ID de la candidata
   * @param {string} eventId - ID del evento
   * @returns {Promise<Object|null>} Puntuación encontrada
   */
  static async getByJudgeCandidateEvent(judgeId, candidateId, eventId) {
    const result = await executeQuery(
      'SELECT * FROM judge_scores WHERE judge_id = $1 AND candidate_id = $2 AND event_id = $3',
      [judgeId, candidateId, eventId]
    );
    return result.rows[0] || null;
  }

  /**
   * Obtener todas las puntuaciones de un juez
   * @param {string} judgeId - ID del juez
   * @returns {Promise<Array>} Lista de puntuaciones del juez
   */
  static async getByJudge(judgeId) {
    const result = await executeQuery(
      `SELECT js.*, c.name as candidate_name, e.name as event_name 
       FROM judge_scores js 
       JOIN candidates c ON js.candidate_id = c.id 
       JOIN events e ON js.event_id = e.id 
       WHERE js.judge_id = $1 
       ORDER BY js.created_at DESC`,
      [judgeId]
    );
    return result.rows;
  }

  /**
   * Obtener puntuaciones por evento
   * @param {string} eventId - ID del evento
   * @returns {Promise<Array>} Lista de puntuaciones del evento
   */
  static async getByEvent(eventId) {
    const result = await executeQuery(
      `SELECT js.*, c.name as candidate_name, u.full_name as judge_name 
       FROM judge_scores js 
       JOIN candidates c ON js.candidate_id = c.id 
       JOIN users u ON js.judge_id = u.id 
       WHERE js.event_id = $1 
       ORDER BY js.created_at DESC`,
      [eventId]
    );
    return result.rows;
  }

  /**
   * Obtener puntuaciones por candidata
   * @param {string} candidateId - ID de la candidata
   * @returns {Promise<Array>} Lista de puntuaciones de la candidata
   */
  static async getByCandidate(candidateId) {
    const result = await executeQuery(
      `SELECT js.*, e.name as event_name, u.full_name as judge_name 
       FROM judge_scores js 
       JOIN events e ON js.event_id = e.id 
       JOIN users u ON js.judge_id = u.id 
       WHERE js.candidate_id = $1 
       ORDER BY js.created_at DESC`,
      [candidateId]
    );
    return result.rows;
  }

  /**
   * Calcular rankings generales
   * @param {Object} filters - Filtros opcionales
   * @returns {Promise<Array>} Rankings calculados
   */
  static async calculateRankings(filters = {}) {
    let query = `
      SELECT 
        c.id as candidate_id,
        c.name as candidate_name,
        c.major as candidate_career,
        c.department as candidate_department,
        c.image_url as candidate_photo,
        AVG(js.score) as average_score,
        SUM(js.score) as total_score,
        COUNT(js.id) as score_count,
        COUNT(DISTINCT js.judge_id) as judge_count,
        COUNT(DISTINCT js.event_id) as event_count
      FROM candidates c
      LEFT JOIN judge_scores js ON c.id = js.candidate_id
      WHERE c.is_active = true
    `;

    const params = [];
    let paramCount = 1;

    // Filtro por evento específico
    if (filters.event_id) {
      query += ` AND js.event_id = $${paramCount}`;
      params.push(filters.event_id);
      paramCount++;
    }

    // Filtro por rango de fechas
    if (filters.date_from) {
      query += ` AND js.created_at >= $${paramCount}`;
      params.push(filters.date_from);
      paramCount++;
    }

    if (filters.date_to) {
      query += ` AND js.created_at <= $${paramCount}`;
      params.push(filters.date_to);
      paramCount++;
    }

    query += `
      GROUP BY c.id, c.name, c.major, c.department, c.image_url
      HAVING COUNT(js.id) > 0
      ORDER BY average_score DESC, total_score DESC
    `;

    const result = await executeQuery(query, params);

    return result.rows.map((row, index) => ({
      rank: index + 1,
      candidate: {
        id: row.candidate_id,
        name: row.candidate_name,
        career: row.candidate_career,
        department: row.candidate_department,
        photo_url: row.candidate_photo
      },
      averageScore: parseFloat(row.average_score) || 0,
      totalScore: parseFloat(row.total_score) || 0,
      scoreCount: parseInt(row.score_count) || 0,
      judgeCount: parseInt(row.judge_count) || 0,
      eventCount: parseInt(row.event_count) || 0
    }));
  }

  /**
   * Obtener estadísticas de votación por juez
   * @returns {Promise<Array>} Estadísticas de participación de jueces
   */
  static async getJudgeVotingStats() {
    // Obtener información de jueces y su participación
    const result = await executeQuery(`
      SELECT 
        u.id as judge_id,
        u.full_name as judge_name,
        u.email as judge_email,
        u.is_active as judge_active,
        COUNT(js.id) as total_scores,
        COUNT(DISTINCT js.candidate_id) as candidates_scored,
        COUNT(DISTINCT js.event_id) as events_participated,
        COALESCE(AVG(js.score), 0) as average_score_given,
        MAX(js.created_at) as last_activity
      FROM users u
      LEFT JOIN judge_scores js ON u.id = js.judge_id
      WHERE u.role = 'judge'
      GROUP BY u.id, u.full_name, u.email, u.is_active
      ORDER BY total_scores DESC, u.full_name
    `);

    // Obtener totales para calcular porcentajes
    const totalsResult = await executeQuery(`
      SELECT 
        COUNT(DISTINCT c.id) as total_candidates,
        COUNT(DISTINCT e.id) as total_events
      FROM candidates c, events e
      WHERE c.is_active = true AND e.is_active = true
    `);

    const totals = totalsResult.rows[0];
    const expectedScoresPerJudge = parseInt(totals.total_candidates) * parseInt(totals.total_events);

    return result.rows.map(row => ({
      judge: {
        id: row.judge_id,
        name: row.judge_name,
        email: row.judge_email,
        isActive: row.judge_active
      },
      stats: {
        totalScores: parseInt(row.total_scores) || 0,
        candidatesScored: parseInt(row.candidates_scored) || 0,
        eventsParticipated: parseInt(row.events_participated) || 0,
        averageScoreGiven: parseFloat(row.average_score_given) || 0,
        lastActivity: row.last_activity,
        completionPercentage: expectedScoresPerJudge > 0 
          ? Math.round((parseInt(row.total_scores) / expectedScoresPerJudge) * 100) 
          : 0
      },
      progress: {
        expected: expectedScoresPerJudge,
        completed: parseInt(row.total_scores) || 0,
        remaining: Math.max(0, expectedScoresPerJudge - (parseInt(row.total_scores) || 0))
      }
    }));
  }

  /**
   * Eliminar todas las puntuaciones (reset del sistema)
   * @returns {Promise<Object>} Resultado de la operación
   */
  static async deleteAll() {
    const countResult = await executeQuery('SELECT COUNT(*) as count FROM judge_scores');
    const totalScores = parseInt(countResult.rows[0].count);

    const result = await executeQuery('DELETE FROM judge_scores RETURNING id');
    const deletedCount = result.rows.length;

    return {
      totalScores,
      deletedCount,
      success: deletedCount === totalScores
    };
  }

  /**
   * Obtener resumen de puntuaciones por evento
   * @returns {Promise<Array>} Resumen por evento
   */
  static async getEventSummary() {
    const result = await executeQuery(`
      SELECT 
        e.id as event_id,
        e.name as event_name,
        e.is_active as event_active,
        e.weight as event_weight,
        e.is_mandatory as event_mandatory,
        COUNT(js.id) as total_scores,
        COUNT(DISTINCT js.judge_id) as judges_participated,
        COUNT(DISTINCT js.candidate_id) as candidates_scored,
        COALESCE(AVG(js.score), 0) as average_score,
        COALESCE(MIN(js.score), 0) as min_score,
        COALESCE(MAX(js.score), 0) as max_score
      FROM events e
      LEFT JOIN judge_scores js ON e.id = js.event_id
      GROUP BY e.id, e.name, e.is_active, e.weight, e.is_mandatory
      ORDER BY e.created_at
    `);

    return result.rows.map(row => ({
      event: {
        id: row.event_id,
        name: row.event_name,
        isActive: row.event_active,
        weight: parseFloat(row.event_weight) || 0,
        isMandatory: row.event_mandatory
      },
      stats: {
        totalScores: parseInt(row.total_scores) || 0,
        judgesParticipated: parseInt(row.judges_participated) || 0,
        candidatesScored: parseInt(row.candidates_scored) || 0,
        averageScore: parseFloat(row.average_score) || 0,
        minScore: parseFloat(row.min_score) || 0,
        maxScore: parseFloat(row.max_score) || 0
      }
    }));
  }

  /**
   * Detectar empates en el TOP 3
   * @param {number} precision - Precisión decimal para detección de empates (default: 3)
   * @returns {Promise<Object>} Información sobre empates detectados
   */
  static async detectTies(precision = 3) {
    const rankings = await this.calculateRankings();
    
    if (rankings.length < 2) {
      return { ties: [], hasActiveTies: false };
    }

    const ties = [];
    const processedCandidates = new Set();

    // Analizar posiciones 1, 2 y 3
    for (let position = 1; position <= 3 && position <= rankings.length; position++) {
      const currentCandidate = rankings[position - 1];
      
      if (processedCandidates.has(currentCandidate.candidate.id)) {
        continue;
      }

      // Buscar candidatas con el mismo puntaje (con precisión especificada)
      const currentScore = Math.round(currentCandidate.averageScore * Math.pow(10, precision)) / Math.pow(10, precision);
      
      const tiedCandidates = rankings.filter(r => 
        !processedCandidates.has(r.candidate.id) &&
        Math.abs(Math.round(r.averageScore * Math.pow(10, precision)) / Math.pow(10, precision) - currentScore) < 0.001
      );

      if (tiedCandidates.length > 1) {
        ties.push({
          position,
          score: currentScore,
          candidates: tiedCandidates.map(tc => tc.candidate),
          candidateCount: tiedCandidates.length,
          description: position === 1 ? 'Empate por el 1er lugar (Reina ESPE)' :
                      position === 2 ? 'Empate por el 2do lugar (Srta. Confraternidad)' :
                      'Empate por el 3er lugar (Srta. Simpatía)',
          bonusPoints: position === 1 ? 2 : position === 2 ? 1.5 : 1
        });

        // Marcar candidatas como procesadas
        tiedCandidates.forEach(tc => {
          processedCandidates.add(tc.candidate.id);
        });
      } else {
        processedCandidates.add(currentCandidate.candidate.id);
      }
    }

    return {
      ties,
      hasActiveTies: ties.length > 0,
      totalCandidatesInTies: ties.reduce((sum, tie) => sum + tie.candidateCount, 0),
      rankings: rankings.slice(0, 3) // TOP 3 para referencia
    };
  }
} 