const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'reinas2025',
  user: 'postgres',
  password: 'admin',
});

async function clearTiebreakers() {
  try {
    console.log('🧹 Limpiando desempates activos...');
    
    // Clear active tiebreakers
    await pool.query("DELETE FROM system_settings WHERE setting_key = 'active_tiebreaker'");
    console.log('✅ Desempates activos eliminados');
    
    // Clear tiebreaker scores
    await pool.query('DROP TABLE IF EXISTS tiebreaker_scores');
    console.log('✅ Tabla de votos de desempate eliminada');
    
    console.log('🎯 Sistema limpio - No hay desempates activos');
    
  } catch (error) {
    console.error('❌ Error limpiando desempates:', error.message);
  } finally {
    pool.end();
  }
}

clearTiebreakers(); 