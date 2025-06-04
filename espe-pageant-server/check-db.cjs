const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'reinas2025',
  user: 'postgres',
  password: 'admin',
});

async function checkDB() {
  try {
    const result = await pool.query('SELECT id, name, is_active, image_url FROM candidates ORDER BY created_at DESC');
    console.log('🔍 Candidatas en la base de datos:');
    console.table(result.rows);
    
    const activeCount = result.rows.filter(r => r.is_active).length;
    const inactiveCount = result.rows.filter(r => !r.is_active).length;
    
    console.log(`\n📊 Resumen:`);
    console.log(`   Total: ${result.rows.length}`);
    console.log(`   Activas: ${activeCount}`);
    console.log(`   Inactivas: ${inactiveCount}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    pool.end();
  }
}

checkDB(); 