import bcrypt from 'bcryptjs';
import { pool } from '@/config/database.js';
import { config } from '@/config/env.js';
import { User } from '@/types/database.js';
import { CreateUserRequest, UpdateUserRequest } from '@/types/api.js';

export class UserService {
  async findById(id: string): Promise<User | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw new Error('Error al buscar usuario');
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw new Error('Error al buscar usuario por email');
    }
  }

  async findAll(page = 1, limit = 10): Promise<{ users: User[]; total: number }> {
    try {
      const offset = (page - 1) * limit;
      
      const [usersResult, countResult] = await Promise.all([
        pool.query(
          'SELECT id, email, full_name, role, is_active, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
          [limit, offset]
        ),
        pool.query('SELECT COUNT(*) FROM users')
      ]);

      return {
        users: usersResult.rows,
        total: parseInt(countResult.rows[0]?.count || '0')
      };
    } catch (error) {
      console.error('Error finding all users:', error);
      throw new Error('Error al obtener usuarios');
    }
  }

  async create(userData: CreateUserRequest): Promise<User> {
    try {
      const { email, full_name, role, password } = userData;
      
      // Check if user already exists
      const existingUser = await this.findByEmail(email);
      if (existingUser) {
        throw new Error('El usuario ya existe');
      }

      // Hash password if provided, otherwise generate a random one
      const plainPassword = password || Math.random().toString(36).slice(-8);
      const password_hash = await bcrypt.hash(plainPassword, config.BCRYPT_ROUNDS);

      const result = await pool.query(
        `INSERT INTO users (email, password_hash, full_name, role) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, email, full_name, role, is_active, created_at, updated_at`,
        [email, password_hash, full_name, role]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error creating user:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error al crear usuario');
    }
  }

  async update(id: string, userData: UpdateUserRequest): Promise<User> {
    try {
      const user = await this.findById(id);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (userData.email !== undefined) {
        updates.push(`email = $${paramCount++}`);
        values.push(userData.email);
      }
      if (userData.full_name !== undefined) {
        updates.push(`full_name = $${paramCount++}`);
        values.push(userData.full_name);
      }
      if (userData.role !== undefined) {
        updates.push(`role = $${paramCount++}`);
        values.push(userData.role);
      }
      if (userData.is_active !== undefined) {
        updates.push(`is_active = $${paramCount++}`);
        values.push(userData.is_active);
      }

      if (updates.length === 0) {
        return user;
      }

      values.push(id);
      const query = `
        UPDATE users 
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $${paramCount}
        RETURNING id, email, full_name, role, is_active, created_at, updated_at
      `;

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating user:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error al actualizar usuario');
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await pool.query(
        'DELETE FROM users WHERE id = $1',
        [id]
      );
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error('Error al eliminar usuario');
    }
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, user.password_hash);
    } catch (error) {
      console.error('Error validating password:', error);
      return false;
    }
  }

  async changePassword(id: string, newPassword: string): Promise<boolean> {
    try {
      const password_hash = await bcrypt.hash(newPassword, config.BCRYPT_ROUNDS);
      
      const result = await pool.query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [password_hash, id]
      );

      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error('Error changing password:', error);
      throw new Error('Error al cambiar contraseña');
    }
  }

  async getUsersByRole(role: User['role']): Promise<User[]> {
    try {
      const result = await pool.query(
        'SELECT id, email, full_name, role, is_active, created_at, updated_at FROM users WHERE role = $1 AND is_active = true',
        [role]
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting users by role:', error);
      throw new Error('Error al obtener usuarios por rol');
    }
  }
}

export const userService = new UserService(); 