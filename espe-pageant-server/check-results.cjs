const { Client } = require('pg');

// Configuración de conexión a PostgreSQL
const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'reinas2025',
  user: 'postgres',
  password: 'admin',
});

async function quickCheck() {
  console.log('🎯 VERIFICACIÓN RÁPIDA DE RESULTADOS');
  console.log('====================================');
  
  try {
    await client.connect();
    
    // Verificar que tenemos datos
    const countQuery = await client.query('SELECT COUNT(*) as total FROM judge_scores');
    const totalScores = countQuery.rows[0].total;
    
    if (totalScores == 0) {
      console.log('❌ No hay calificaciones en la base de datos');
      console.log('💡 Ejecuta primero: node simulate-real-database.cjs');
      return;
    }
    
    console.log(`✅ Total de calificaciones en BD: ${totalScores}`);
    
    // Top 3 actual
    console.log('\n🏆 TOP 3 ACTUAL:');
    console.log('=================');
    
    const top3Query = `
      SELECT 
        ROW_NUMBER() OVER (ORDER BY ROUND(AVG(js.score), 2) DESC) as posicion,
        c.name,
        c.major,
        c.department,
        ROUND(AVG(js.score), 2) as promedio,
        COUNT(js.score) as total_calificaciones
      FROM candidates c
      JOIN judge_scores js ON c.id = js.candidate_id
      GROUP BY c.id, c.name, c.major, c.department
      ORDER BY promedio DESC
      LIMIT 3
    `;
    
    const top3 = await client.query(top3Query);
    const titles = ['👑 REINA ESPE 2025', '🥈 SRTA. CONFRATERNIDAD', '🥉 SRTA. SIMPATÍA'];
    
    top3.rows.forEach((candidate, i) => {
      console.log(`${i+1}. ${titles[i]}`);
      console.log(`   ${candidate.name}`);
      console.log(`   📚 ${candidate.major} (${candidate.department})`);
      console.log(`   🎯 Promedio: ${candidate.promedio}/10.0 pts`);
      console.log(`   📊 Calificaciones: ${candidate.total_calificaciones}`);
      console.log('');
    });
    
    // Estadísticas generales
    console.log('📊 ESTADÍSTICAS:');
    console.log('================');
    
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM candidates WHERE is_active = true) as candidatas,
        (SELECT COUNT(*) FROM users WHERE role = 'judge' AND is_active = true) as jueces,
        (SELECT COUNT(*) FROM events WHERE status = 'active') as eventos,
        (SELECT COUNT(*) FROM judge_scores) as calificaciones,
        (SELECT ROUND(AVG(score), 2) FROM judge_scores) as promedio_general
    `;
    
    const stats = await client.query(statsQuery);
    const stat = stats.rows[0];
    
    console.log(`👥 Candidatas activas: ${stat.candidatas}`);
    console.log(`👨‍⚖️ Jueces activos: ${stat.jueces}`);
    console.log(`📋 Eventos activos: ${stat.eventos}`);
    console.log(`🎯 Total calificaciones: ${stat.calificaciones}`);
    console.log(`📊 Promedio general: ${stat.promedio_general}/10.0`);
    
    // Validar que la simulación fue completa
    const expectedScores = stat.candidatas * stat.jueces * stat.eventos;
    const completionRate = (stat.calificaciones / expectedScores) * 100;
    
    console.log(`\n✅ INTEGRIDAD DE DATOS:`);
    console.log(`Expected: ${expectedScores} calificaciones`);
    console.log(`Actual: ${stat.calificaciones} calificaciones`);
    console.log(`Completitud: ${completionRate.toFixed(1)}%`);
    
    if (completionRate === 100) {
      console.log('🎉 ¡SIMULACIÓN COMPLETA Y PERFECTA!');
    } else {
      console.log('⚠️ Simulación incompleta o con errores');
    }
    
  } catch (error) {
    console.error('❌ Error conectando a la BD:', error.message);
    console.log('\n💡 Asegúrate de que:');
    console.log('• PostgreSQL esté corriendo');
    console.log('• La base de datos "reinas2025" exista');
    console.log('• Usuario "postgres" con contraseña "admin"');
  } finally {
    await client.end();
  }
}

// Función para obtener ranking completo
async function getFullRanking() {
  console.log('\n🏅 RANKING COMPLETO (12 candidatas):');
  console.log('====================================');
  
  try {
    await client.connect();
    
    const rankingQuery = `
      SELECT 
        ROW_NUMBER() OVER (ORDER BY ROUND(AVG(js.score), 2) DESC) as posicion,
        c.name,
        c.department,
        ROUND(AVG(js.score), 2) as promedio
      FROM candidates c
      JOIN judge_scores js ON c.id = js.candidate_id
      GROUP BY c.id, c.name, c.department
      ORDER BY promedio DESC
    `;
    
    const ranking = await client.query(rankingQuery);
    
    ranking.rows.forEach((candidate, i) => {
      const medal = i < 3 ? ['👑', '🥈', '🥉'][i] : `${i+1}.`;
      console.log(`${medal} ${candidate.name} (${candidate.department}) - ${candidate.promedio}/10.0`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

// Ejecutar según argumentos
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--full') || args.includes('-f')) {
    getFullRanking().catch(console.error);
  } else {
    quickCheck().catch(console.error);
  }
}

module.exports = { quickCheck, getFullRanking }; 