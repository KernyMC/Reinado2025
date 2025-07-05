import { executeQuery } from '../config/database.js';

export class VoteModel {
  
  static async findByEventAndJudge(eventId, judgeId) {
    const query = `
      SELECT v.*, c.name as candidate_name 
      FROM votes v
      JOIN candidates c ON v.candidate_id = c.id
      WHERE v.event_id = $1 AND v.judge_id = $2
      ORDER BY v.created_at DESC
    `;
    const result = await executeQuery(query, [eventId, judgeId]);
    return result.rows;
  }

  static async create(voteData) {
    const { judge_id, candidate_id, event_id, score } = voteData;
    
    // Check if vote already exists
    const existingVote = await this.findExisting(judge_id, candidate_id, event_id);
    
    if (existingVote) {
      // Update existing vote
      return await this.update(existingVote.id, { score });
    }
    
    // Create new vote
    const query = `
      INSERT INTO votes (judge_id, candidate_id, event_id, score)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await executeQuery(query, [judge_id, candidate_id, event_id, score]);
    return result.rows[0];
  }

  static async update(id, voteData) {
    const { score } = voteData;
    const query = `
      UPDATE votes 
      SET score = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await executeQuery(query, [score, id]);
    return result.rows[0];
  }

  static async findExisting(judgeId, candidateId, eventId) {
    const query = `
      SELECT * FROM votes 
      WHERE judge_id = $1 AND candidate_id = $2 AND event_id = $3
    `;
    const result = await executeQuery(query, [judgeId, candidateId, eventId]);
    return result.rows[0];
  }

  static async getEventResults(eventId) {
    const query = `
      SELECT 
        c.id, c.name, c.photo_url,
        COALESCE(SUM(v.score), 0) as total_score,
        COUNT(v.id) as vote_count,
        ROUND(AVG(v.score), 2) as average_score
      FROM candidates c
      LEFT JOIN votes v ON c.id = v.candidate_id AND v.event_id = $1
      GROUP BY c.id, c.name, c.photo_url
      ORDER BY total_score DESC, c.name
    `;
    const result = await executeQuery(query, [eventId]);
    return result.rows;
  }

  static async getDetailedResults(eventId) {
    const query = `
      SELECT 
        c.id as candidate_id, c.name as candidate_name,
        u.id as judge_id, u.username as judge_name,
        v.score, v.created_at as voted_at
      FROM candidates c
      CROSS JOIN users u
      LEFT JOIN votes v ON c.id = v.candidate_id AND u.id = v.judge_id AND v.event_id = $1
      WHERE u.role = 'judge' AND u.active = true
      ORDER BY c.name, u.username
    `;
    const result = await executeQuery(query, [eventId]);
    return result.rows;
  }

  static async getFinalResults() {
    const query = `
      SELECT 
        c.id, c.name, c.photo_url,
        SUM(v.score * e.weight) as weighted_total,
        COUNT(DISTINCT v.event_id) as events_participated
      FROM candidates c
      LEFT JOIN votes v ON c.id = v.candidate_id
      LEFT JOIN events e ON v.event_id = e.id
      GROUP BY c.id, c.name, c.photo_url
      ORDER BY weighted_total DESC NULLS LAST, c.name
    `;
    const result = await executeQuery(query);
    return result.rows;
  }

  static async delete(id) {
    const query = 'DELETE FROM votes WHERE id = $1 RETURNING *';
    const result = await executeQuery(query, [id]);
    return result.rows[0];
  }
} 