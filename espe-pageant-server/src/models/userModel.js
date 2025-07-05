import { executeQuery } from '../config/database.js';
import bcrypt from 'bcrypt';

export class UserModel {
  
  static async findAll() {
    const query = `
      SELECT id, username, role, active, created_at 
      FROM users 
      ORDER BY created_at DESC
    `;
    const result = await executeQuery(query);
    return result.rows;
  }

  static async findById(id) {
    const query = `
      SELECT id, username, role, active, created_at 
      FROM users 
      WHERE id = $1
    `;
    const result = await executeQuery(query, [id]);
    return result.rows[0];
  }

  static async findByUsername(username) {
    const query = `
      SELECT id, username, password_hash, role, active, created_at 
      FROM users 
      WHERE username = $1
    `;
    const result = await executeQuery(query, [username]);
    return result.rows[0];
  }

  static async create(userData) {
    const { username, password, role = 'judge' } = userData;
    const password_hash = await bcrypt.hash(password, 10);
    
    const query = `
      INSERT INTO users (username, password_hash, role)
      VALUES ($1, $2, $3)
      RETURNING id, username, role, active, created_at
    `;
    const result = await executeQuery(query, [username, password_hash, role]);
    return result.rows[0];
  }

  static async updatePassword(id, newPassword) {
    const password_hash = await bcrypt.hash(newPassword, 10);
    const query = `
      UPDATE users 
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, username, role, active
    `;
    const result = await executeQuery(query, [password_hash, id]);
    return result.rows[0];
  }

  static async toggleActive(id) {
    const query = `
      UPDATE users 
      SET active = NOT active, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, username, role, active
    `;
    const result = await executeQuery(query, [id]);
    return result.rows[0];
  }

  static async verifyPassword(user, password) {
    return await bcrypt.compare(password, user.password_hash);
  }

  static async getJudges() {
    const query = `
      SELECT id, username, active, created_at 
      FROM users 
      WHERE role = 'judge' 
      ORDER BY username
    `;
    const result = await executeQuery(query);
    return result.rows;
  }

  static async delete(id) {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING id, username';
    const result = await executeQuery(query, [id]);
    return result.rows[0];
  }
} 