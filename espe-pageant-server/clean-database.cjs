const { Client } = require('pg');

// Configuración de conexión a PostgreSQL
const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'reinas2025',
  user: 'postgres',
  password: 'admin',
});

async function cleanDatabase() {
  console.log('🧹 LIMPIANDO BASE DE DATOS COMPLETAMENTE');
  console.log('========================================');
  
  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL reinas2025');
    
    // 1. Eliminar todas las calificaciones
    console.log('\n🗑️ Eliminando calificaciones...');
    const deleteScores = await client.query('DELETE FROM judge_scores');
    console.log(`✅ ${deleteScores.rowCount} calificaciones eliminadas`);
    
    // 2. Eliminar votos públicos
    console.log('\n🗑️ Eliminando votos públicos...');
    const deleteVotes = await client.query('DELETE FROM public_votes');
    console.log(`✅ ${deleteVotes.rowCount} votos públicos eliminados`);
    
    // 3. Resetear eventos a estado inicial
    console.log('\n🔄 Reseteando eventos...');
    await client.query("UPDATE events SET status = 'pending'");
    console.log('✅ Eventos reseteados a estado pendiente');
    
    // 4. Mostrar estado final
    console.log('\n📊 VERIFICANDO LIMPIEZA:');
    console.log('========================');
    
    const verification = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM candidates WHERE is_active = true) as candidatas_activas,
        (SELECT COUNT(*) FROM users WHERE role = 'judge' AND is_active = true) as jueces_activos,
        (SELECT COUNT(*) FROM events) as eventos_totales,
        (SELECT COUNT(*) FROM judge_scores) as calificaciones_restantes,
        (SELECT COUNT(*) FROM public_votes) as votos_restantes
    `);
    
    const stats = verification.rows[0];
    console.log(`👥 Candidatas activas: ${stats.candidatas_activas}`);
    console.log(`👨‍⚖️ Jueces activos: ${stats.jueces_activos}`);
    console.log(`📋 Eventos totales: ${stats.eventos_totales}`);
    console.log(`🎯 Calificaciones restantes: ${stats.calificaciones_restantes}`);
    console.log(`🗳️ Votos restantes: ${stats.votos_restantes}`);
    
    if (stats.calificaciones_restantes === 0 && stats.votos_restantes === 0) {
      console.log('\n🎉 ¡BASE DE DATOS LIMPIADA EXITOSAMENTE!');
      console.log('✅ Lista para nueva simulación');
    } else {
      console.log('\n⚠️ Algunos datos no se eliminaron completamente');
    }
    
  } catch (error) {
    console.error('❌ Error limpiando la BD:', error.message);
  } finally {
    await client.end();
    console.log('\n🔌 Conexión PostgreSQL cerrada');
  }
}

// Función para reset completo (opcional)
async function fullReset() {
  console.log('🔥 RESET COMPLETO DE BASE DE DATOS');
  console.log('==================================');
  
  try {
    await client.connect();
    
    // Eliminar todo excepto estructura
    console.log('🗑️ Eliminando TODOS los datos...');
    await client.query('DELETE FROM judge_scores');
    await client.query('DELETE FROM public_votes');
    await client.query('DELETE FROM reports');
    
    // NO eliminamos users, candidates, events, system_settings 
    // para mantener la estructura básica
    
    console.log('✅ Reset completo finalizado');
    console.log('💡 Estructura y datos maestros conservados');
    
  } catch (error) {
    console.error('❌ Error en reset completo:', error.message);
  } finally {
    await client.end();
  }
}

// Ejecutar según argumentos
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--full') || args.includes('-f')) {
    fullReset().catch(console.error);
  } else {
    cleanDatabase().catch(console.error);
  }
}

module.exports = { cleanDatabase, fullReset }; 