import { executeQuery } from '../database/connection.js';

export class VoteController {
  
  static async submitVote(req, res) {
    try {
      const { candidate_id } = req.body;
      const voter_ip = req.ip;
      const voter_session = 'mock-session-' + Date.now();
      
      if (!candidate_id) {
        return res.status(400).json({
          success: false,
          error: 'candidate_id es requerido'
        });
      }
      
      console.log('🗳️ Public vote submission:', { candidate_id, voter_ip, voter_session });
      
      const result = await executeQuery(
        'INSERT INTO public_votes (voter_ip, voter_session, candidate_id) VALUES ($1, $2, $3) RETURNING *',
        [voter_ip, voter_session, candidate_id]
      );
      
      console.log('✅ Public vote created:', result.rows[0]);
      
      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Voto registrado exitosamente'
      });
    } catch (error) {
      console.error('❌ Error submitting public vote:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getResults(req, res) {
    try {
      console.log('📊 Getting public voting results...');
      
      const result = await executeQuery(`
        SELECT 
          c.id as candidate_id,
          c.name as candidate_name,
          c.major as candidate_career,
          c.department as candidate_department,
          c.image_url as candidate_photo,
          COUNT(pv.id) as vote_count
        FROM candidates c
        LEFT JOIN public_votes pv ON c.id = pv.candidate_id
        WHERE c.is_active = true
        GROUP BY c.id, c.name, c.major, c.department, c.image_url
        ORDER BY vote_count DESC, c.name ASC
      `);
      
      console.log(`📊 Public voting results: ${result.rows.length} candidates with votes`);
      
      res.json({
        success: true,
        data: result.rows,
        summary: {
          totalCandidates: result.rows.length,
          totalVotes: result.rows.reduce((sum, row) => sum + parseInt(row.vote_count), 0)
        }
      });
    } catch (error) {
      console.error('❌ Error getting voting results:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
} 