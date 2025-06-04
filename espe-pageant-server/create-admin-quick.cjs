const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'reinas2025',
  user: 'postgres',
  password: 'admin',
  ssl: false,
});

async function createAdmin() {
  try {
    console.log('🔧 Creando usuario administrador...');
    
    const result = await pool.query(`
      INSERT INTO users (email, password_hash, full_name, role, is_active) 
      VALUES ($1, $2, $3, $4, $5) 
      ON CONFLICT (email) 
      DO UPDATE SET 
        password_hash = $2,
        full_name = $3,
        role = $4,
        is_active = $5
      RETURNING id, email, full_name, role
    `, [
      'admin@espe.edu.ec',
      '123456', // Password simple para pruebas
      'Administrador Sistema',
      'admin',
      true
    ]);
    
    console.log('✅ Usuario administrador creado/actualizado:');
    console.log('📧 Email: admin@espe.edu.ec');
    console.log('🔑 Password: 123456');
    console.log('👤 Nombre: Administrador Sistema');
    console.log('🎭 Rol: admin');
    console.log('📊 Datos:', result.rows[0]);
    
    // También crear un juez de prueba
    const judgeResult = await pool.query(`
      INSERT INTO users (email, password_hash, full_name, role, is_active) 
      VALUES ($1, $2, $3, $4, $5) 
      ON CONFLICT (email) 
      DO UPDATE SET 
        password_hash = $2,
        full_name = $3,
        role = $4,
        is_active = $5
      RETURNING id, email, full_name, role
    `, [
      'juez1@espe.edu.ec',
      '123456',
      'Juez de Prueba',
      'judge',
      true
    ]);
    
    console.log('✅ Usuario juez creado/actualizado:');
    console.log('📧 Email: juez1@espe.edu.ec');
    console.log('🔑 Password: 123456');
    console.log('👤 Nombre: Juez de Prueba');
    console.log('🎭 Rol: judge');
    console.log('📊 Datos:', judgeResult.rows[0]);
    
  } catch (error) {
    console.error('❌ Error creando usuarios:', error.message);
  } finally {
    await pool.end();
    console.log('🔐 Usuarios listos para login');
  }
}

createAdmin(); 