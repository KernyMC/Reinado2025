import { executeQuery } from '../database/connection.js';

export class AdminController {
  
  static async resetVotes(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
      }
      
      if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({
          success: false,
          error: 'Solo los administradores pueden reiniciar las votaciones'
        });
      }
      
      console.log(`🗑️ RESET VOTES - Admin ${req.user.email} is resetting all votes/scores`);
      
      // Get counts before deletion for logging
      const scoresResult = await executeQuery('SELECT COUNT(*) FROM judge_scores');
      const votesResult = await executeQuery('SELECT COUNT(*) FROM public_votes');
      
      const scoresCount = parseInt(scoresResult.rows[0].count);
      const votesCount = parseInt(votesResult.rows[0].count);
      
      // Delete all judge scores and public votes
      await executeQuery('DELETE FROM judge_scores');
      await executeQuery('DELETE FROM public_votes');
      
      // Clear tiebreakers
      await executeQuery("DELETE FROM system_settings WHERE setting_key = 'active_tiebreaker'");
      await executeQuery('DROP TABLE IF EXISTS tiebreaker_scores');
      
      console.log(`✅ RESET COMPLETE - Deleted ${scoresCount} judge scores, ${votesCount} public votes, and cleared tiebreakers`);
      
      res.json({
        success: true,
        message: 'Todas las votaciones y desempates han sido reiniciados exitosamente',
        data: {
          deletedScores: scoresCount,
          deletedVotes: votesCount,
          clearedTiebreakers: true,
          resetBy: req.user.email,
          resetAt: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('❌ Error resetting votes:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async generateReport(req, res) {
    try {
      if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
        return res.status(403).json({
          success: false,
          error: 'Solo los administradores pueden generar reportes'
        });
      }

      const { event, dateFrom, dateTo, format } = req.body;
      
      console.log(`📊 Generating report for event: ${event}, format: ${format}`);
      
      // Get candidates with their details
      const candidatesQuery = `
        SELECT c.id, c.name, c.major as career, c.image_url as photo_url, c.department as faculty
        FROM candidates c 
        WHERE c.is_active = true 
        ORDER BY c.name
      `;
      const candidatesResult = await executeQuery(candidatesQuery);

      // Get events
      const eventsResult = await executeQuery('SELECT id, name FROM events ORDER BY created_at');

      // Build scores query with filtering
      let scoresQuery = `
        SELECT 
          js.candidate_id, 
          js.event_id, 
          js.score, 
          js.created_at,
          u.full_name as judge_name,
          e.name as event_name
        FROM judge_scores js
        JOIN users u ON js.judge_id = u.id
        JOIN events e ON js.event_id = e.id
        WHERE 1=1
      `;
      
      const scoresParams = [];
      let paramCounter = 1;

      if (event && event !== 'all' && event !== '') {
        scoresQuery += ` AND js.event_id = $${paramCounter}`;
        scoresParams.push(parseInt(event));
        paramCounter++;
      }

      if (dateFrom) {
        scoresQuery += ` AND js.created_at >= $${paramCounter}`;
        scoresParams.push(dateFrom);
        paramCounter++;
      }
      
      if (dateTo) {
        scoresQuery += ` AND js.created_at <= $${paramCounter}`;
        scoresParams.push(dateTo);
        paramCounter++;
      }

      scoresQuery += ' ORDER BY js.created_at DESC';

      const scoresResult = await executeQuery(scoresQuery, scoresParams);

      // Calculate rankings
      const candidateScores = {};
      
      candidatesResult.rows.forEach(candidate => {
        candidateScores[candidate.id] = {
          candidate: candidate,
          totalScore: 0,
          eventScores: {},
          averageScore: 0,
          judgeCount: 0
        };
      });

      scoresResult.rows.forEach(score => {
        if (candidateScores[score.candidate_id]) {
          candidateScores[score.candidate_id].totalScore += parseFloat(score.score);
          candidateScores[score.candidate_id].judgeCount++;
          
          if (!candidateScores[score.candidate_id].eventScores[score.event_id]) {
            candidateScores[score.candidate_id].eventScores[score.event_id] = [];
          }
          candidateScores[score.candidate_id].eventScores[score.event_id].push({
            score: parseFloat(score.score),
            judge: score.judge_name,
            date: score.created_at
          });
        }
      });

      const rankedCandidates = Object.values(candidateScores)
        .map(candidate => {
          candidate.averageScore = candidate.judgeCount > 0 
            ? candidate.totalScore / candidate.judgeCount 
            : 0;
          return candidate;
        })
        .filter(candidate => candidate.judgeCount > 0)
        .sort((a, b) => b.averageScore - a.averageScore);

      const top3 = rankedCandidates.slice(0, 3).map((candidate, index) => ({
        rank: index + 1,
        candidate: candidate.candidate,
        finalScore: Math.round(candidate.averageScore * 100) / 100,
        judgeCount: candidate.judgeCount
      }));

      const reportData = {
        generatedAt: new Date().toISOString(),
        generatedBy: req.user.full_name,
        filters: { event, dateFrom, dateTo },
        events: eventsResult.rows,
        totalCandidates: candidatesResult.rows.length,
        totalScores: scoresResult.rows.length,
        top3Rankings: top3,
        allRankings: rankedCandidates.map((candidate, index) => ({
          rank: index + 1,
          candidate: candidate.candidate,
          finalScore: Math.round(candidate.averageScore * 100) / 100,
          judgeCount: candidate.judgeCount
        }))
      };

      // For now, return JSON (PDF generation would require more setup)
      res.json({
        success: true,
        data: reportData,
        message: `Reporte generado exitosamente con ${rankedCandidates.length} candidatas calificadas`
      });

    } catch (error) {
      console.error('❌ Error generating report:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async downloadPDF(req, res) {
    try {
      if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
        return res.status(403).json({
          success: false,
          error: 'Solo los administradores pueden descargar reportes'
        });
      }

      // Simple response for now (full PDF implementation would require more setup)
      res.json({
        success: true,
        message: 'Funcionalidad de PDF disponible - requiere configuración adicional',
        data: {
          note: 'Para implementar PDF completo, usar server-complete.js'
        }
      });

    } catch (error) {
      console.error('❌ Error downloading PDF:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getStats(req, res) {
    try {
      if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
        return res.status(403).json({
          success: false,
          error: 'Solo los administradores pueden ver estadísticas'
        });
      }

      // Get basic stats
      let totalVotes = 0;
      try {
        const votesResult = await executeQuery('SELECT COUNT(*) as count FROM public_votes');
        totalVotes = parseInt(votesResult.rows[0].count) || 0;
      } catch (e) {
        console.log('ℹ️ public_votes table not accessible, using 0');
      }

      const scoresResult = await executeQuery('SELECT COUNT(*) as count FROM judge_scores');
      const totalScores = parseInt(scoresResult.rows[0].count);

      let activeUsers = 0;
      try {
        const activeUsersResult = await executeQuery(`
          SELECT COUNT(DISTINCT judge_id) as count 
          FROM judge_scores 
          WHERE created_at > NOW() - INTERVAL '24 hours'
        `);
        activeUsers = parseInt(activeUsersResult.rows[0].count) || 0;
      } catch (e) {
        console.log('ℹ️ Error getting active users, using 0');
      }

      const judgesResult = await executeQuery("SELECT COUNT(*) as count FROM users WHERE role = 'judge'");
      const totalJudges = parseInt(judgesResult.rows[0].count);
      
      const activeJudgesResult = await executeQuery(`
        SELECT COUNT(DISTINCT judge_id) as count FROM judge_scores
      `);
      const activeJudges = parseInt(activeJudgesResult.rows[0].count);
      
      const participationRate = totalJudges > 0 ? Math.round((activeJudges / totalJudges) * 100) : 0;

      res.json({
        success: true,
        data: {
          totalVotes,
          totalScores,
          activeUsers,
          participationRate: `${participationRate}%`,
          reportsGenerated: 5
        }
      });

    } catch (error) {
      console.error('❌ Error getting stats:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getCurrentTies(req, res) {
    try {
      if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
        return res.status(403).json({
          success: false,
          error: 'Solo los administradores pueden ver empates'
        });
      }

      console.log('🎯 Checking ties for TOP 3 positions...');

      // Calculate current rankings to detect ties
      const candidatesResult = await executeQuery(`
        SELECT c.id, c.name, c.major as career, c.image_url as photo_url 
        FROM candidates c 
        WHERE c.is_active = true
      `);

      const scoresResult = await executeQuery(`
        SELECT 
          candidate_id, 
          AVG(score) as average_score, 
          COUNT(*) as score_count,
          SUM(score) as total_score
        FROM judge_scores 
        GROUP BY candidate_id
        HAVING COUNT(*) > 0
      `);

      if (scoresResult.rows.length === 0) {
        return res.json({
          success: true,
          data: {
            ties: [],
            hasActiveTies: false,
            totalCandidatesInTies: 0,
            message: 'No hay calificaciones disponibles para detectar empates'
          }
        });
      }

      // Create ranking
      const rankings = scoresResult.rows
        .map(score => {
          const candidate = candidatesResult.rows.find(c => c.id === score.candidate_id);
          const averageScore = parseFloat(score.average_score);
          const totalScore = parseFloat(score.total_score);
          const scoreCount = parseInt(score.score_count);
          
          return {
            candidate,
            averageScore,
            totalScore,
            scoreCount,
            preciseScore: Math.round(averageScore * 1000) / 1000
          };
        })
        .filter(ranking => ranking.candidate)
        .sort((a, b) => {
          if (b.preciseScore !== a.preciseScore) {
            return b.preciseScore - a.preciseScore;
          }
          return b.totalScore - a.totalScore;
        });

      // Detect ties
      const ties = [];
      const processedCandidates = new Set();

      for (let position = 1; position <= 3 && position <= rankings.length; position++) {
        const currentCandidate = rankings[position - 1];
        
        if (processedCandidates.has(currentCandidate.candidate.id)) {
          continue;
        }

        const tiedCandidates = rankings.filter(r => 
          !processedCandidates.has(r.candidate.id) &&
          Math.abs(r.preciseScore - currentCandidate.preciseScore) < 0.001
        );

        if (tiedCandidates.length > 1) {
          let bonusPoints, tieDescription;
          
          switch (position) {
            case 1:
              bonusPoints = 2;
              tieDescription = 'Empate por el 1er lugar (Reina ESPE)';
              break;
            case 2:
              bonusPoints = 1.5;
              tieDescription = 'Empate por el 2do lugar (Srta. Confraternidad)';
              break;
            case 3:
              bonusPoints = 1;
              tieDescription = 'Empate por el 3er lugar (Srta. Simpatía)';
              break;
            default:
              continue;
          }

          ties.push({
            score: currentCandidate.preciseScore,
            position: position,
            description: tieDescription,
            candidates: tiedCandidates.map(tc => tc.candidate),
            candidateCount: tiedCandidates.length,
            bonusPoints: bonusPoints,
            tieId: `tie_${position}_${Date.now()}`
          });

          tiedCandidates.forEach(tc => {
            processedCandidates.add(tc.candidate.id);
          });
        } else {
          processedCandidates.add(currentCandidate.candidate.id);
        }
      }
      
      res.json({
        success: true,
        data: {
          ties,
          hasActiveTies: ties.length > 0,
          totalCandidatesInTies: ties.reduce((sum, tie) => sum + tie.candidateCount, 0),
          top3Rankings: rankings.slice(0, 3).map((ranking, index) => ({
            position: index + 1,
            candidate: ranking.candidate,
            averageScore: ranking.averageScore,
            preciseScore: ranking.preciseScore,
            totalScore: ranking.totalScore,
            scoreCount: ranking.scoreCount
          }))
        }
      });

    } catch (error) {
      console.error('❌ Error getting ties:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async activateTiebreaker(req, res) {
    try {
      if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
        return res.status(403).json({
          success: false,
          error: 'Solo los administradores pueden activar desempates'
        });
      }

      const { tieId, candidates, position, description } = req.body;
      
      console.log(`🎯 Tie-breaking activated by ${req.user.email} for ${candidates.length} candidates`);
      
      // Get full candidate data
      const candidateIds = candidates.map(c => `'${c.id}'`).join(',');
      const candidatesData = await executeQuery(`
        SELECT id, name, major as career, image_url as photo_url 
        FROM candidates 
        WHERE id IN (${candidateIds}) AND is_active = true
      `);
      
      // Calculate bonus points
      const getBonusPointsForPosition = (pos) => {
        switch (pos) {
          case 1: return 5;
          case 2: return 3;
          case 3: return 1;
          default: return 0;
        }
      };
      
      const bonusPoints = getBonusPointsForPosition(position);
      
      // Create tiebreaker data
      const tiebreakerData = {
        id: tieId,
        candidates: candidatesData.rows,
        status: 'active',
        created_by: req.user.id,
        created_at: new Date().toISOString(),
        positions_affected: candidates.map(c => c.position || position).join(','),
        position: position,
        description: description,
        bonus_points: bonusPoints,
        activated_by_name: req.user.full_name || req.user.email
      };
      
      // Store in system_settings
      await executeQuery(`
        INSERT INTO system_settings (setting_key, setting_value)
        VALUES ($1, $2)
        ON CONFLICT (setting_key) 
        DO UPDATE SET 
          setting_value = $2, 
          updated_at = CURRENT_TIMESTAMP
      `, [
        'active_tiebreaker',
        JSON.stringify(tiebreakerData)
      ]);
      
      console.log(`🎯 Bonificación por posición ${position}: +${bonusPoints} puntos`);
      
      res.json({
        success: true,
        message: 'Modo de desempate activado exitosamente',
        data: {
          tieId,
          candidates,
          position,
          description,
          bonusPoints,
          activatedBy: req.user.email,
          activatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Error activating tie-breaking:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async updateEvent(req, res) {
    try {
      if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
        return res.status(403).json({
          success: false,
          error: 'Solo los administradores pueden modificar eventos'
        });
      }

      const { id } = req.params;
      const { name, event_type, description, status, weight, is_mandatory, bonus_percentage, is_active } = req.body;
      
      const result = await executeQuery(
        'UPDATE events SET name = $1, event_type = $2, description = $3, status = $4, weight = $5, is_mandatory = $6, bonus_percentage = $7, is_active = $8, updated_at = NOW() WHERE id = $9 RETURNING *',
        [name, event_type, description, status, weight, is_mandatory, bonus_percentage, is_active, id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Evento no encontrado'
        });
      }
      
      console.log(`✅ Evento actualizado por admin ${req.user.email}:`, result.rows[0]);
      
      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('❌ Error updating event (admin):', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async deleteEvent(req, res) {
    try {
      if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
        return res.status(403).json({
          success: false,
          error: 'Solo los administradores pueden eliminar eventos'
        });
      }

      const { id } = req.params;
      
      const result = await executeQuery('DELETE FROM events WHERE id = $1 RETURNING *', [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Evento no encontrado'
        });
      }
      
      console.log(`✅ Evento eliminado por admin ${req.user.email}:`, result.rows[0]);
      
      res.json({
        success: true,
        message: 'Evento eliminado exitosamente'
      });
    } catch (error) {
      console.error('❌ Error deleting event (admin):', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Test endpoints
  static async testEndpoint(req, res) {
    res.json({
      success: true,
      message: 'Admin routes are working',
      timestamp: new Date().toISOString()
    });
  }

  static async testAuth(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
      }
      
      if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({
          success: false,
          error: 'Solo los administradores pueden acceder'
        });
      }

      res.json({
        success: true,
        message: 'Autenticación exitosa',
        user: {
          id: req.user.id,
          email: req.user.email,
          role: req.user.role,
          full_name: req.user.full_name
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
} 