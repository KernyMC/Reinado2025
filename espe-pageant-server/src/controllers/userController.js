import { executeQuery } from '../database/connection.js';

export class UserController {
  
  static async getAllUsers(req, res) {
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
          error: 'Solo los administradores pueden ver usuarios'
        });
      }
      
      console.log('🔍 GET /api/users - Getting all users...');
      const result = await executeQuery(
        'SELECT id, email, full_name, role, is_active, created_at, updated_at FROM users ORDER BY created_at DESC'
      );
      
      console.log(`📊 Found ${result.rows.length} users`);
      
      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('❌ Error getting users:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async createUser(req, res) {
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
          error: 'Solo los administradores pueden crear usuarios'
        });
      }
      
      const { email, full_name, role, password } = req.body;
      
      if (!email || !full_name || !role) {
        return res.status(400).json({
          success: false,
          error: 'email, full_name y role son requeridos'
        });
      }
      
      console.log('📝 Creating user:', { email, full_name, role });
      
      // Simple password storage (in production, use bcrypt properly)
      let password_hash;
      if (password) {
        password_hash = password; // Store simple password for easy testing
      } else {
        password_hash = '123456'; // Default simple password
      }
      
      const result = await executeQuery(
        'INSERT INTO users (email, password_hash, full_name, role, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, full_name, role, is_active, created_at, updated_at',
        [email, password_hash, full_name, role, true]
      );
      
      console.log('✅ User created:', result.rows[0]);
      
      res.status(201).json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('❌ Error creating user:', error);
      if (error.code === '23505') {
        res.status(400).json({
          success: false,
          error: 'El email ya está en uso'
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  }

  static async updateUser(req, res) {
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
          error: 'Solo los administradores pueden actualizar usuarios'
        });
      }
      
      const { id } = req.params;
      const { email, full_name, role, is_active, password } = req.body;
      
      console.log('📝 Updating user:', { id, email, full_name, role, is_active, hasPassword: !!password });
      
      let updateQuery, updateParams;
      
      if (password) {
        // Update with password change
        updateQuery = 'UPDATE users SET email = $1, full_name = $2, role = $3, is_active = $4, password_hash = $5, updated_at = NOW() WHERE id = $6 RETURNING id, email, full_name, role, is_active, created_at, updated_at';
        updateParams = [email, full_name, role, is_active, password, id]; // Simple password storage for testing
      } else {
        // Update without password change
        updateQuery = 'UPDATE users SET email = $1, full_name = $2, role = $3, is_active = $4, updated_at = NOW() WHERE id = $5 RETURNING id, email, full_name, role, is_active, created_at, updated_at';
        updateParams = [email, full_name, role, is_active, id];
      }
      
      const result = await executeQuery(updateQuery, updateParams);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }
      
      console.log('✅ User updated:', result.rows[0]);
      
      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('❌ Error updating user:', error);
      if (error.code === '23505') {
        res.status(400).json({
          success: false,
          error: 'El email ya está en uso'
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  }

  static async deleteUser(req, res) {
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
          error: 'Solo los administradores pueden eliminar usuarios'
        });
      }
      
      const { id } = req.params;
      
      console.log('🗑️ Deleting user:', id);
      
      const result = await executeQuery('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }
      
      console.log('✅ User deleted:', id);
      
      res.json({
        success: true,
        message: 'Usuario eliminado exitosamente'
      });
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
} 