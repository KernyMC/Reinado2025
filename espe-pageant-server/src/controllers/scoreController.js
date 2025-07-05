import { executeQuery } from '../database/connection.js';

export class ScoreController {
  
  static async submitScore(req, res) {
    try {
      const { candidate_id, event_id, score } = req.body;
      
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
      }
      
      if (req.user.role !== 'judge') {
        return res.status(403).json({
          success: false,
          error: 'Solo los jueces pueden enviar calificaciones'
        });
      }
      
      const judge_id = req.user.id;
      
      if (!candidate_id || !event_id || score === undefined) {
        return res.status(400).json({
          success: false,
          error: 'candidate_id, event_id y score son requeridos'
        });
      }
      
      if (score < 0 || score > 10) {
        return res.status(400).json({
          success: false,
          error: 'La puntuación debe estar entre 0 y 10'
        });
      }
      
      console.log('📝 Submitting score:', { 
        judge_id, 
        judge_name: req.user.full_name, 
        candidate_id, 
        event_id, 
        score 
      });
      
      // Check if judge already scored this candidate for this event
      const existingScore = await executeQuery(
        'SELECT id, score FROM judge_scores WHERE judge_id = $1 AND candidate_id = $2 AND event_id = $3',
        [judge_id, candidate_id, event_id]
      );
      
      if (existingScore.rows.length > 0) {
        // Update existing score
        const result = await executeQuery(
          'UPDATE judge_scores SET score = $1, updated_at = NOW() WHERE judge_id = $2 AND candidate_id = $3 AND event_id = $4 RETURNING *',
          [score, judge_id, candidate_id, event_id]
        );
        
        console.log('✅ Score updated:', result.rows[0]);
        
        res.json({
          success: true,
          data: result.rows[0]
        });
      } else {
        // Create new score
        const result = await executeQuery(
          'INSERT INTO judge_scores (judge_id, candidate_id, event_id, score) VALUES ($1, $2, $3, $4) RETURNING *',
          [judge_id, candidate_id, event_id, score]
        );
        
        console.log('✅ Score created:', result.rows[0]);
        
        res.status(201).json({
          success: true,
          data: result.rows[0]
        });
      }
    } catch (error) {
      console.error('❌ Error submitting score:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getScoresByEvent(req, res) {
    try {
      const { eventId } = req.params;
      const result = await executeQuery(
        'SELECT js.*, c.name as candidate_name FROM judge_scores js JOIN candidates c ON js.candidate_id = c.id WHERE js.event_id = $1 ORDER BY js.created_at DESC',
        [eventId]
      );
      
      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getMyScores(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
      }
      
      if (req.user.role !== 'judge') {
        return res.status(403).json({
          success: false,
          error: 'Solo los jueces pueden ver sus calificaciones'
        });
      }
      
      const judge_id = req.user.id;
      
      const result = await executeQuery(
        'SELECT js.*, c.name as candidate_name, e.name as event_name FROM judge_scores js JOIN candidates c ON js.candidate_id = c.id JOIN events e ON js.event_id = e.id WHERE js.judge_id = $1 ORDER BY js.created_at DESC',
        [judge_id]
      );
      
      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('❌ Error getting my scores:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
} 