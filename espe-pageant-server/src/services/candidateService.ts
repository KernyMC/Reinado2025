import { pool } from '@/config/database.js';

export interface Candidate {
  id: string;
  name: string;
  image_url?: string;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export class CandidateService {
  
  // Get all active candidates
  async getAllActive(): Promise<Candidate[]> {
    try {
      const query = `
        SELECT id, name, image_url, is_active, created_at, updated_at
        FROM candidates 
        WHERE is_active = true 
        ORDER BY name ASC
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error getting candidates:', error);
      throw new Error('Error al obtener candidatas');
    }
  }

  // Get all candidates (including inactive)
  async getAll(): Promise<Candidate[]> {
    try {
      const query = `
        SELECT id, name, image_url, is_active, created_at, updated_at
        FROM candidates 
        ORDER BY name ASC
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error getting all candidates:', error);
      throw new Error('Error al obtener todas las candidatas');
    }
  }

  // Get candidate by ID
  async getById(id: string): Promise<Candidate | null> {
    try {
      const query = `
        SELECT id, name, image_url, is_active, created_at, updated_at
        FROM candidates 
        WHERE id = $1
      `;
      
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting candidate by ID:', error);
      throw new Error('Error al obtener candidata');
    }
  }

  // Create new candidate
  async create(candidateData: Omit<Candidate, 'id' | 'created_at' | 'updated_at'>): Promise<Candidate> {
    try {
      const query = `
        INSERT INTO candidates (name, image_url, is_active)
        VALUES ($1, $2, $3)
        RETURNING id, name, image_url, is_active, created_at, updated_at
      `;
      
      const values = [
        candidateData.name,
        candidateData.image_url || null,
        candidateData.is_active !== false // default to true
      ];
      
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating candidate:', error);
      throw new Error('Error al crear candidata');
    }
  }

  // Update candidate
  async update(id: string, candidateData: Partial<Omit<Candidate, 'id' | 'created_at'>>): Promise<Candidate | null> {
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (candidateData.name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(candidateData.name);
      }

      if (candidateData.image_url !== undefined) {
        updates.push(`image_url = $${paramCount++}`);
        values.push(candidateData.image_url);
      }

      if (candidateData.is_active !== undefined) {
        updates.push(`is_active = $${paramCount++}`);
        values.push(candidateData.is_active);
      }

      updates.push(`updated_at = NOW()`);
      values.push(id);

      const query = `
        UPDATE candidates 
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id, name, image_url, is_active, created_at, updated_at
      `;

      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error updating candidate:', error);
      throw new Error('Error al actualizar candidata');
    }
  }

  // Delete candidate (soft delete)
  async delete(id: string): Promise<boolean> {
    try {
      const query = `
        UPDATE candidates 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
      `;
      
      const result = await pool.query(query, [id]);
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting candidate:', error);
      throw new Error('Error al eliminar candidata');
    }
  }
}

export const candidateService = new CandidateService(); 