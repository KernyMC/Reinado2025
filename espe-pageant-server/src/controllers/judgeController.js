import { executeQuery } from '../database/connection.js';

export class JudgeController {
  
  static async getAllJudges(req, res) {
    try {
      console.log('🔍 GET /api/judges - Getting all judges...');
      const result = await executeQuery(
        'SELECT id, email, full_name, is_active, created_at FROM users WHERE role = $1 ORDER BY full_name',
        ['judge']
      );
      
      console.log(`📊 Found ${result.rows.length} judges`);
      
      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('❌ Error getting judges:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getVotingStatus(req, res) {
    try {
      console.log('🔍 GET /api/judges/voting-status - Getting voting status...');
      
      // Get all judges
      const judges = await executeQuery(
        'SELECT id, full_name, email FROM users WHERE role = $1 AND is_active = true ORDER BY full_name',
        ['judge']
      );
      
      // Get all active events
      const events = await executeQuery(
        'SELECT id, name, event_type FROM events ORDER BY created_at'
      );
      
      // Get all active candidates
      const candidates = await executeQuery(
        'SELECT id, name FROM candidates WHERE is_active = true ORDER BY name'
      );
      
      // Get all existing scores
      const scores = await executeQuery(
        'SELECT judge_id, candidate_id, event_id, score, created_at FROM judge_scores'
      );
      
      // Build voting status matrix
      const votingStatus = judges.rows.map(judge => {
        const judgeStatus = {
          judge: {
            id: judge.id,
            name: judge.full_name,
            email: judge.email
          },
          events: events.rows.map(event => {
            const eventStatus = {
              event: {
                id: event.id,
                name: event.name,
                type: event.event_type
              },
              candidates: candidates.rows.map(candidate => {
                const score = scores.rows.find(s => 
                  s.judge_id === judge.id && 
                  s.candidate_id === candidate.id && 
                  s.event_id === event.id
                );
                
                return {
                  candidate: {
                    id: candidate.id,
                    name: candidate.name
                  },
                  hasVoted: !!score,
                  score: score ? score.score : null,
                  votedAt: score ? score.created_at : null
                };
              })
            };
            
            // Calculate progress for this event
            const totalCandidates = candidates.rows.length;
            const votedCount = eventStatus.candidates.filter(c => c.hasVoted).length;
            eventStatus.progress = {
              voted: votedCount,
              total: totalCandidates,
              percentage: totalCandidates > 0 ? Math.round((votedCount / totalCandidates) * 100) : 0
            };
            
            return eventStatus;
          })
        };
        
        // Calculate overall progress for this judge
        const totalVotes = events.rows.length * candidates.rows.length;
        const completedVotes = judgeStatus.events.reduce((sum, event) => sum + event.progress.voted, 0);
        judgeStatus.overallProgress = {
          voted: completedVotes,
          total: totalVotes,
          percentage: totalVotes > 0 ? Math.round((completedVotes / totalVotes) * 100) : 0
        };
        
        return judgeStatus;
      });
      
      console.log(`📊 Voting status calculated for ${judges.rows.length} judges, ${events.rows.length} events, ${candidates.rows.length} candidates`);
      
      res.json({
        success: true,
        data: {
          judges: votingStatus,
          summary: {
            totalJudges: judges.rows.length,
            totalEvents: events.rows.length,
            totalCandidates: candidates.rows.length,
            totalPossibleVotes: judges.rows.length * events.rows.length * candidates.rows.length,
            completedVotes: scores.rows.length
          }
        }
      });
    } catch (error) {
      console.error('❌ Error getting voting status:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getCurrentTiebreaker(req, res) {
    try {
      if (!req.user || req.user.role !== 'judge') {
        return res.status(403).json({
          success: false,
          error: 'Solo los jueces pueden acceder a esta información'
        });
      }

      // Create table if it doesn't exist
      await executeQuery(`DROP TABLE IF EXISTS tiebreaker_scores`);
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS tiebreaker_scores (
          id SERIAL PRIMARY KEY,
          tiebreaker_id VARCHAR(255) NOT NULL,
          judge_id UUID NOT NULL,
          candidate_id UUID NOT NULL,
          score DECIMAL(3,1) NOT NULL CHECK (score >= 1 AND score <= 10),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(tiebreaker_id, judge_id, candidate_id)
        )
      `);

      // Get active tiebreaker from system_settings
      const tiebreakerResult = await executeQuery(`
        SELECT setting_value 
        FROM system_settings 
        WHERE setting_key = 'active_tiebreaker'
      `);
      
      if (tiebreakerResult.rows.length === 0) {
        return res.json({
          success: true,
          data: {
            hasActiveTiebreaker: false,
            tiebreaker: null
          }
        });
      }
      
      const tiebreakerData = JSON.parse(tiebreakerResult.rows[0].setting_value);
      
      // Check if judge has already voted in this tiebreaker
      const existingVotes = await executeQuery(`
        SELECT candidate_id, score 
        FROM tiebreaker_scores 
        WHERE judge_id = $1 AND tiebreaker_id = $2
      `, [req.user.id, tiebreakerData.id]);
      
      const votedCandidates = existingVotes.rows.map(vote => vote.candidate_id);
      
      // Enriquecer datos para el frontend
      const enrichedTiebreaker = {
        ...tiebreakerData,
        votedCandidates,
        hasVoted: votedCandidates.length === tiebreakerData.candidates.length,
        activatedBy: tiebreakerData.activated_by_name || 'Administrador',
        // Asegurar que position y description están presentes
        position: tiebreakerData.position || 1,
        description: tiebreakerData.description || 'Desempate activo',
        bonusPoints: tiebreakerData.bonus_points || (tiebreakerData.position === 1 ? 5 : tiebreakerData.position === 2 ? 3 : 1)
      };
      
      console.log(`🔍 Tiebreaker data for judge ${req.user.email}:`, {
        id: enrichedTiebreaker.id,
        position: enrichedTiebreaker.position,
        description: enrichedTiebreaker.description,
        bonusPoints: enrichedTiebreaker.bonusPoints,
        hasVoted: enrichedTiebreaker.hasVoted,
        candidatesCount: enrichedTiebreaker.candidates.length
      });
      
      res.json({
        success: true,
        data: {
          hasActiveTiebreaker: true,
          tiebreaker: enrichedTiebreaker
        }
      });

    } catch (error) {
      console.error('❌ Error getting tiebreaker:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async submitTiebreakerVote(req, res) {
    try {
      if (!req.user || req.user.role !== 'judge') {
        return res.status(403).json({
          success: false,
          error: 'Solo los jueces pueden votar en desempates'
        });
      }

      const { tiebreakerVotes } = req.body; // Array of { candidateId, score }
      
      if (!tiebreakerVotes || !Array.isArray(tiebreakerVotes)) {
        return res.status(400).json({
          success: false,
          error: 'Datos de votación inválidos'
        });
      }

      // Get active tiebreaker
      const tiebreakerResult = await executeQuery(`
        SELECT setting_value 
        FROM system_settings 
        WHERE setting_key = 'active_tiebreaker'
      `);
      
      if (tiebreakerResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No hay desempate activo'
        });
      }
      
      const tiebreakerData = JSON.parse(tiebreakerResult.rows[0].setting_value);
      
      // Create table if it doesn't exist
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS tiebreaker_scores (
          id SERIAL PRIMARY KEY,
          tiebreaker_id VARCHAR(255) NOT NULL,
          judge_id UUID NOT NULL,
          candidate_id UUID NOT NULL,
          score DECIMAL(3,1) NOT NULL CHECK (score >= 1 AND score <= 10),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(tiebreaker_id, judge_id, candidate_id)
        )
      `);
      
      // Insert/update tiebreaker votes
      for (const vote of tiebreakerVotes) {
        await executeQuery(`
          INSERT INTO tiebreaker_scores (tiebreaker_id, judge_id, candidate_id, score)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (tiebreaker_id, judge_id, candidate_id)
          DO UPDATE SET score = $4, created_at = CURRENT_TIMESTAMP
        `, [tiebreakerData.id, req.user.id, vote.candidateId, vote.score]);
      }
      
      console.log(`✅ Tiebreaker votes submitted by judge ${req.user.email}: ${tiebreakerVotes.length} votes`);
      
      // Check if all judges have voted
      const judgesCount = await executeQuery(`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE role = 'judge' AND is_active = true
      `);
      
      const completedJudges = await executeQuery(`
        SELECT DISTINCT judge_id 
        FROM tiebreaker_scores 
        WHERE tiebreaker_id = $1
      `, [tiebreakerData.id]);
      
      const allJudgesVoted = completedJudges.rows.length >= judgesCount.rows[0].count;
      
      if (allJudgesVoted) {
        console.log('🎉 All judges have completed tiebreaker voting');
      }
      
      res.json({
        success: true,
        message: 'Votos de desempate guardados exitosamente',
        data: {
          votesSubmitted: tiebreakerVotes.length,
          allJudgesVoted
        }
      });

    } catch (error) {
      console.error('❌ Error submitting tiebreaker votes:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
} 