const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'reinas2025',
  user: 'postgres',
  password: 'admin',
  ssl: false,
});

async function checkUsers() {
  try {
    console.log('🔍 Verificando usuarios admin...');
    
    const result = await pool.query(
      'SELECT email, role, password_hash FROM users WHERE role IN ($1, $2)',
      ['admin', 'superadmin']
    );
    
    console.log(`📊 Encontrados ${result.rows.length} usuarios admin:`);
    result.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.role}) - Password: ${user.password_hash}`);
    });
    
    // También verificar si hay algún usuario
    const allUsers = await pool.query('SELECT COUNT(*) as total FROM users');
    console.log(`📈 Total usuarios en base de datos: ${allUsers.rows[0].total}`);
    
    pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    pool.end();
  }
}

checkUsers(); 