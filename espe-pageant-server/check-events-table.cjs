const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'reinas2025',
  user: 'postgres',
  password: 'admin',
});

async function checkEventsTable() {
  try {
    console.log('📋 Revisando estructura de tabla events...\n');
    
    // Ver estructura de la tabla
    const structure = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'events' 
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Estructura actual:');
    console.table(structure.rows);
    
    // Ver eventos existentes
    const events = await pool.query('SELECT * FROM events ORDER BY created_at DESC');
    
    console.log('\n🎯 Eventos existentes:');
    console.table(events.rows);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkEventsTable(); 