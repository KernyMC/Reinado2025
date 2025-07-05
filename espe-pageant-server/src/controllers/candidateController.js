import { executeQuery } from '../database/connection.js';
import path from 'path';
import fs from 'fs';

export class CandidateController {
  
  static async getAllCandidates(req, res) {
    try {
      console.log('🔍 GET /api/candidates - Buscando candidatas...');
      const result = await executeQuery('SELECT * FROM candidates WHERE is_active = true ORDER BY name');
      console.log(`📊 Candidatas encontradas: ${result.rows.length}`);
      console.log('📋 Datos:', result.rows.map(c => ({ id: c.id, name: c.name, image_url: c.image_url })));
      
      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('❌ Error en GET /api/candidates:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getCandidatesWithVotes(req, res) {
    try {
      const { eventId } = req.params;
      console.log(`🔍 GET /api/candidates/with-votes/${eventId}`);
      
      const result = await executeQuery(`
        SELECT 
          c.id, c.name, c.major, c.department, c.image_url,
          COALESCE(SUM(js.score), 0) as total_score,
          COALESCE(AVG(js.score), 0) as average_score,
          COUNT(js.id) as vote_count
        FROM candidates c
        LEFT JOIN judge_scores js ON c.id = js.candidate_id AND js.event_id = $1
        WHERE c.is_active = true
        GROUP BY c.id, c.name, c.major, c.department, c.image_url
        ORDER BY average_score DESC, c.name
      `, [eventId]);
      
      const candidates = result.rows.map(row => ({
        ...row,
        total_score: parseFloat(row.total_score),
        average_score: parseFloat(row.average_score),
        vote_count: parseInt(row.vote_count)
      }));
      
      console.log(`📊 Candidatas con votos: ${candidates.length}`);
      
      res.json({
        success: true,
        data: candidates
      });
    } catch (error) {
      console.error('❌ Error en getCandidatesWithVotes:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getCandidateById(req, res) {
    try {
      const { id } = req.params;
      console.log(`🔍 GET /api/candidates/${id}`);
      const result = await executeQuery('SELECT * FROM candidates WHERE id = $1', [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Candidata no encontrada'
        });
      }
      
      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error(`❌ Error en GET /api/candidates/${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async createCandidate(req, res) {
    try {
      console.log('📝 POST /api/candidates - Creando candidata...');
      console.log('📋 Body:', req.body);
      console.log('📷 File:', req.file ? { filename: req.file.filename, path: req.file.path, size: req.file.size } : 'No file');
      
      const { name, major, department, biography } = req.body;
      
      if (!name || !major || !department) {
        console.log('❌ Datos requeridos faltantes');
        return res.status(400).json({
          success: false,
          error: 'Nombre, carrera y departamento son requeridos'
        });
      }
      
      let image_url = null;
      if (req.file) {
        image_url = `/uploads/candidates/${req.file.filename}`;
        console.log(`📷 Imagen guardada: ${image_url}`);
      }
      
      const result = await executeQuery(
        'INSERT INTO candidates (name, major, department, image_url, biography) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [name, major, department, image_url, biography]
      );
      
      console.log('✅ Candidata creada:', result.rows[0]);
      
      res.status(201).json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('❌ Error en POST /api/candidates:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async updateCandidate(req, res) {
    try {
      const { id } = req.params;
      const { name, major, department, biography, is_active } = req.body;
      
      // Get current candidate to handle image update
      const currentResult = await executeQuery('SELECT * FROM candidates WHERE id = $1', [id]);
      
      if (currentResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Candidata no encontrada'
        });
      }
      
      let image_url = currentResult.rows[0].image_url;
      
      // If new image is uploaded, update the image_url
      if (req.file) {
        image_url = `/uploads/candidates/${req.file.filename}`;
        
        // Optionally delete old image file
        if (currentResult.rows[0].image_url) {
          const oldImagePath = path.join(__dirname, '..', '..', currentResult.rows[0].image_url);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
      }
      
      const result = await executeQuery(
        'UPDATE candidates SET name = $1, major = $2, department = $3, image_url = $4, biography = $5, is_active = $6, updated_at = NOW() WHERE id = $7 RETURNING *',
        [name, major, department, image_url, biography, is_active !== undefined ? is_active : true, id]
      );
      
      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async deleteCandidate(req, res) {
    try {
      const { id } = req.params;
      
      // Get candidate to delete image file
      const candidateResult = await executeQuery('SELECT * FROM candidates WHERE id = $1', [id]);
      
      if (candidateResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Candidata no encontrada'
        });
      }
      
      // Delete image file if exists
      if (candidateResult.rows[0].image_url) {
        const imagePath = path.join(__dirname, '..', '..', candidateResult.rows[0].image_url);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }
      
      await executeQuery('DELETE FROM candidates WHERE id = $1', [id]);
      
      res.json({
        success: true,
        message: 'Candidata eliminada exitosamente'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
} 