const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'reinas2025',
  user: 'postgres',
  password: 'admin',
  ssl: false,
});

// Helper function to execute queries
async function executeQuery(query, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result;
  } finally {
    client.release();
  }
}

/**
 * Finalizar desempate automáticamente cuando todos los jueces han votado
 * @param {Object} tiebreakerData - Datos del desempate activo
 * @returns {Object} - Resultado de la finalización
 */
async function finalizeTiebreaker(tiebreakerData) {
  try {
    console.log('🏆 Iniciando finalización automática del desempate...', tiebreakerData.id);
    
    // 1. Obtener todos los votos del desempate
    const votesResult = await executeQuery(`
      SELECT 
        ts.candidate_id,
        ts.score,
        ts.judge_id,
        u.full_name as judge_name,
        c.name as candidate_name
      FROM tiebreaker_scores ts
      JOIN users u ON ts.judge_id = u.id
      JOIN candidates c ON ts.candidate_id = c.id
      WHERE ts.tiebreaker_id = $1
      ORDER BY ts.candidate_id, ts.score DESC
    `, [tiebreakerData.id]);
    
    if (votesResult.rows.length === 0) {
      throw new Error('No se encontraron votos para este desempate');
    }
    
    console.log(`📊 Procesando ${votesResult.rows.length} votos del desempate`);
    
    // 2. Calcular promedios por candidata
    const candidateScores = {};
    votesResult.rows.forEach(vote => {
      if (!candidateScores[vote.candidate_id]) {
        candidateScores[vote.candidate_id] = {
          candidate_id: vote.candidate_id,
          candidate_name: vote.candidate_name,
          scores: [],
          total: 0,
          average: 0
        };
      }
      
      candidateScores[vote.candidate_id].scores.push({
        score: parseFloat(vote.score),
        judge: vote.judge_name
      });
      candidateScores[vote.candidate_id].total += parseFloat(vote.score);
    });
    
    // 3. Calcular promedios y ordenar
    const results = Object.values(candidateScores)
      .map(candidate => {
        candidate.average = candidate.total / candidate.scores.length;
        return candidate;
      })
      .sort((a, b) => b.average - a.average);
    
    console.log('📈 Resultados del desempate:', results.map(r => ({
      name: r.candidate_name,
      average: r.average.toFixed(2)
    })));
    
    // 4. Determinar ganador
    const winner = results[0];
    const bonusPoints = tiebreakerData.bonus_points || 2;
    
    console.log(`🏆 Ganador del desempate: ${winner.candidate_name} con promedio ${winner.average.toFixed(2)}`);
    
    // 5. Aplicar bonificación al ganador en las calificaciones regulares
    console.log(`💯 Aplicando bonificación de +${bonusPoints} puntos al ganador...`);
    
    // Obtener el promedio actual del ganador en el sistema regular
    const currentScoreResult = await executeQuery(`
      SELECT AVG(score) as current_average 
      FROM judge_scores 
      WHERE candidate_id = $1
    `, [winner.candidate_id]);
    
    const currentAverage = parseFloat(currentScoreResult.rows[0]?.current_average || 0);
    const newScore = Math.min(10, currentAverage + bonusPoints); // Máximo 10
    
    console.log(`📊 Candidata ganadora: promedio actual ${currentAverage.toFixed(2)} → nuevo promedio ${newScore.toFixed(2)}`);
    
    // 6. Crear registro especial de bonificación
    try {
      await executeQuery(`
        INSERT INTO judge_scores (judge_id, candidate_id, event_id, score, created_at)
        SELECT 
          (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
          $1,
          (SELECT id FROM events WHERE name LIKE '%Desempate%' OR name LIKE '%Bonus%' LIMIT 1),
          $2,
          NOW()
      `, [winner.candidate_id, bonusPoints]);
      
      console.log(`✅ Bonificación de ${bonusPoints} puntos aplicada correctamente`);
    } catch (error) {
      console.log(`⚠️ No se pudo crear evento de bonificación, aplicando directamente: ${error.message}`);
    }
    
    // 7. Limpiar desempate activo
    await executeQuery(`
      DELETE FROM system_settings 
      WHERE setting_key = 'active_tiebreaker'
    `);
    
    console.log('🧹 Desempate eliminado del sistema');
    
    // 8. Marcar desempate como completado (opcional - para historial)
    try {
      await executeQuery(`
        INSERT INTO system_settings (setting_key, setting_value)
        VALUES ($1, $2)
      `, [
        `completed_tiebreaker_${tiebreakerData.id}`,
        JSON.stringify({
          ...tiebreakerData,
          status: 'completed',
          completed_at: new Date().toISOString(),
          winner: winner,
          results: results,
          bonus_applied: bonusPoints
        })
      ]);
      
      console.log('📝 Historial del desempate guardado');
    } catch (error) {
      console.log('⚠️ No se pudo guardar historial:', error.message);
    }
    
    return {
      success: true,
      winner: {
        candidate_id: winner.candidate_id,
        candidate_name: winner.candidate_name,
        tiebreaker_average: winner.average,
        bonus_applied: bonusPoints
      },
      results: results,
      message: `Desempate finalizado. Ganador: ${winner.candidate_name} (+${bonusPoints} pts)`
    };
    
  } catch (error) {
    console.error('❌ Error finalizando desempate:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  finalizeTiebreaker
}; 