const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'reinas2025',
  user: 'postgres',
  password: 'admin',
  ssl: false,
});

async function createAdminUser() {
  try {
    console.log('🔄 Creando usuario admin...');
    
    // Primero verificar si ya existe
    const existing = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      ['admin@espe.edu.ec']
    );
    
    if (existing.rows.length > 0) {
      console.log('⚠️ Usuario admin ya existe:', existing.rows[0]);
      
      // Actualizar la contraseña para asegurar que funcione
      const updated = await pool.query(
        'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING *',
        ['admin123', 'admin@espe.edu.ec']
      );
      console.log('✅ Contraseña actualizada:', updated.rows[0]);
    } else {
      // Crear nuevo usuario admin
      const result = await pool.query(
        'INSERT INTO users (email, password_hash, full_name, role, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        ['admin@espe.edu.ec', 'admin123', 'Administrador ESPE', 'admin', true]
      );
      
      console.log('✅ Usuario admin creado:', result.rows[0]);
    }
    
    // Verificar login
    console.log('\n🔄 Probando login...');
    const loginTest = await pool.query(
      'SELECT email, role, password_hash FROM users WHERE email = $1 AND password_hash = $2',
      ['admin@espe.edu.ec', 'admin123']
    );
    
    if (loginTest.rows.length > 0) {
      console.log('✅ Login funcionará correctamente:', loginTest.rows[0]);
    } else {
      console.log('❌ Error: Login no funcionará');
    }
    
    pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    pool.end();
  }
}

createAdminUser(); 