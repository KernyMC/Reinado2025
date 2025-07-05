/**
 * User Model
 * @description Modelo para gestión de usuarios (jueces, admins)
 */

import { executeQuery, executeTransaction } from '../config/database.js';

export class UserModel {
  /**
   * Obtener todos los usuarios
   * @param {Object} filters - Filtros opcionales
   * @returns {Promise<Array>} Lista de usuarios
   */
  static async getAll(filters = {}) {
    let query = `
      SELECT id, email, full_name, role, is_active, created_at, updated_at 
      FROM users 
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (filters.role) {
      query += ` AND role = $${paramCount}`;
      params.push(filters.role);
      paramCount++;
    }

    if (filters.is_active !== undefined) {
      query += ` AND is_active = $${paramCount}`;
      params.push(filters.is_active);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await executeQuery(query, params);
    return result.rows;
  }

  /**
   * Obtener usuario por ID
   * @param {string} id - ID del usuario
   * @returns {Promise<Object|null>} Usuario encontrado
   */
  static async getById(id) {
    const result = await executeQuery(
      'SELECT id, email, full_name, role, is_active, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Obtener usuario por email
   * @param {string} email - Email del usuario
   * @returns {Promise<Object|null>} Usuario encontrado
   */
  static async getByEmail(email) {
    const result = await executeQuery(
      'SELECT id, email, full_name, role, is_active, password_hash, created_at FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  /**
   * Crear nuevo usuario
   * @param {Object} userData - Datos del usuario
   * @returns {Promise<Object>} Usuario creado
   */
  static async create(userData) {
    const { email, password_hash, full_name, role = 'judge', is_active = true } = userData;
    
    const result = await executeQuery(
      `INSERT INTO users (email, password_hash, full_name, role, is_active) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, email, full_name, role, is_active, created_at, updated_at`,
      [email, password_hash, full_name, role, is_active]
    );
    
    return result.rows[0];
  }

  /**
   * Actualizar usuario
   * @param {string} id - ID del usuario
   * @param {Object} userData - Datos a actualizar
   * @returns {Promise<Object>} Usuario actualizado
   */
  static async update(id, userData) {
    const { email, full_name, role, is_active, password_hash } = userData;
    
    let query, params;
    
    if (password_hash) {
      query = `
        UPDATE users 
        SET email = $1, full_name = $2, role = $3, is_active = $4, password_hash = $5, updated_at = NOW() 
        WHERE id = $6 
        RETURNING id, email, full_name, role, is_active, created_at, updated_at
      `;
      params = [email, full_name, role, is_active, password_hash, id];
    } else {
      query = `
        UPDATE users 
        SET email = $1, full_name = $2, role = $3, is_active = $4, updated_at = NOW() 
        WHERE id = $5 
        RETURNING id, email, full_name, role, is_active, created_at, updated_at
      `;
      params = [email, full_name, role, is_active, id];
    }
    
    const result = await executeQuery(query, params);
    return result.rows[0];
  }

  /**
   * Eliminar usuario
   * @param {string} id - ID del usuario
   * @returns {Promise<boolean>} True si se eliminó exitosamente
   */
  static async delete(id) {
    const result = await executeQuery('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    return result.rows.length > 0;
  }

  /**
   * Obtener jueces activos
   * @returns {Promise<Array>} Lista de jueces activos
   */
  static async getActiveJudges() {
    const result = await executeQuery(
      `SELECT id, email, full_name, is_active, created_at 
       FROM users 
       WHERE role = 'judge' AND is_active = true 
       ORDER BY full_name`
    );
    return result.rows;
  }

  /**
   * Verificar si email ya existe
   * @param {string} email - Email a verificar
   * @param {string} excludeId - ID a excluir de la verificación
   * @returns {Promise<boolean>} True si el email ya existe
   */
  static async emailExists(email, excludeId = null) {
    let query = 'SELECT id FROM users WHERE email = $1';
    const params = [email];
    
    if (excludeId) {
      query += ' AND id != $2';
      params.push(excludeId);
    }
    
    const result = await executeQuery(query, params);
    return result.rows.length > 0;
  }

  /**
   * Obtener estadísticas de usuarios
   * @returns {Promise<Object>} Estadísticas de usuarios
   */
  static async getStats() {
    const result = await executeQuery(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'judge' THEN 1 END) as total_judges,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as total_admins,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
        COUNT(CASE WHEN role = 'judge' AND is_active = true THEN 1 END) as active_judges
      FROM users
    `);
    return result.rows[0];
  }
} 