const { Client } = require('pg');

// Configuración de conexión a PostgreSQL
const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'reinas2025',
  user: 'postgres',
  password: 'admin',
});

async function monitorDatabase() {
  console.log('📊 MONITOR DE BASE DE DATOS EN TIEMPO REAL');
  console.log('==========================================');
  
  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL reinas2025\n');
    
    // 1. Estadísticas generales
    console.log('📈 ESTADÍSTICAS GENERALES:');
    console.log('==========================');
    
    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM candidates WHERE is_active = true) as candidatas_activas,
        (SELECT COUNT(*) FROM users WHERE role = 'judge' AND is_active = true) as jueces_activos,
        (SELECT COUNT(*) FROM events WHERE status = 'active') as eventos_activos,
        (SELECT COUNT(*) FROM judge_scores) as total_calificaciones,
        (SELECT ROUND(AVG(score), 2) FROM judge_scores) as promedio_general,
        (SELECT COUNT(DISTINCT judge_id) FROM judge_scores) as jueces_que_votaron
    `);
    
    const stat = stats.rows[0];
    console.log(`👥 Candidatas activas: ${stat.candidatas_activas}`);
    console.log(`👨‍⚖️ Jueces activos: ${stat.jueces_activos}`);
    console.log(`📋 Eventos activos: ${stat.eventos_activos}`);
    console.log(`🎯 Total calificaciones: ${stat.total_calificaciones}`);
    console.log(`📊 Promedio general: ${stat.promedio_general || 'N/A'}/10.0`);
    console.log(`✅ Jueces que han votado: ${stat.jueces_que_votaron}`);
    
    // 2. Ranking actual
    console.log('\n🏅 RANKING ACTUAL (TOP 10):');
    console.log('===========================');
    
    const ranking = await client.query(`
      SELECT 
        c.name,
        c.major,
        c.department,
        ROUND(AVG(js.score), 2) as promedio,
        COUNT(js.score) as calificaciones,
        COUNT(DISTINCT js.judge_id) as jueces_votantes
      FROM candidates c
      LEFT JOIN judge_scores js ON c.id = js.candidate_id
      WHERE c.is_active = true
      GROUP BY c.id, c.name, c.major, c.department
      HAVING COUNT(js.score) > 0
      ORDER BY promedio DESC
      LIMIT 10
    `);
    
    const medals = ['👑', '🥈', '🥉'];
    const titles = ['REINA ESPE 2025', 'SRTA. CONFRATERNIDAD', 'SRTA. SIMPATÍA'];
    
    ranking.rows.forEach((candidate, i) => {
      const medal = i < 3 ? medals[i] : `${i+1}.`;
      const title = i < 3 ? ` ${titles[i]}` : '';
      console.log(`${medal} ${candidate.name}${title}`);
      console.log(`   📚 ${candidate.major} (${candidate.department})`);
      console.log(`   🎯 Promedio: ${candidate.promedio}/10.0 pts`);
      console.log(`   📊 ${candidate.calificaciones} calificaciones de ${candidate.jueces_votantes} jueces`);
      console.log('');
    });
    
    // 3. Progreso por juez
    console.log('👨‍⚖️ PROGRESO POR JUEZ:');
    console.log('======================');
    
    const judgeProgress = await client.query(`
      SELECT 
        u.full_name,
        u.email,
        COUNT(js.score) as calificaciones_dadas,
        ROUND(AVG(js.score), 2) as promedio_juez,
        MIN(js.created_at) as primera_calificacion,
        MAX(js.created_at) as ultima_calificacion
      FROM users u
      LEFT JOIN judge_scores js ON u.id = js.judge_id
      WHERE u.role = 'judge' AND u.is_active = true
      GROUP BY u.id, u.full_name, u.email
      ORDER BY calificaciones_dadas DESC
    `);
    
    judgeProgress.rows.forEach((judge, i) => {
      console.log(`${i+1}. ${judge.full_name}`);
      console.log(`   📧 ${judge.email}`);
      console.log(`   🎯 Calificaciones dadas: ${judge.calificaciones_dadas || 0}`);
      console.log(`   📊 Promedio del juez: ${judge.promedio_juez || 'N/A'}/10.0`);
      if (judge.primera_calificacion) {
        console.log(`   ⏰ Primera calificación: ${new Date(judge.primera_calificacion).toLocaleString()}`);
        console.log(`   ⏰ Última calificación: ${new Date(judge.ultima_calificacion).toLocaleString()}`);
      }
      console.log('');
    });
    
    // 4. Progreso por evento
    console.log('📋 PROGRESO POR EVENTO:');
    console.log('======================');
    
    const eventProgress = await client.query(`
      SELECT 
        e.name,
        e.event_type,
        COUNT(js.score) as calificaciones_recibidas,
        ROUND(AVG(js.score), 2) as promedio_evento,
        COUNT(DISTINCT js.judge_id) as jueces_participantes,
        COUNT(DISTINCT js.candidate_id) as candidatas_evaluadas
      FROM events e
      LEFT JOIN judge_scores js ON e.id = js.event_id
      WHERE e.status = 'active'
      GROUP BY e.id, e.name, e.event_type
      ORDER BY calificaciones_recibidas DESC
    `);
    
    eventProgress.rows.forEach((event, i) => {
      console.log(`${i+1}. ${event.name} (${event.event_type})`);
      console.log(`   🎯 Calificaciones recibidas: ${event.calificaciones_recibidas || 0}`);
      console.log(`   📊 Promedio del evento: ${event.promedio_evento || 'N/A'}/10.0`);
      console.log(`   👨‍⚖️ Jueces participantes: ${event.jueces_participantes || 0}`);
      console.log(`   👥 Candidatas evaluadas: ${event.candidatas_evaluadas || 0}`);
      console.log('');
    });
    
    // 5. Últimas calificaciones
    console.log('🕐 ÚLTIMAS 10 CALIFICACIONES:');
    console.log('=============================');
    
    const recentScores = await client.query(`
      SELECT 
        c.name as candidata,
        e.name as evento,
        u.full_name as juez,
        js.score,
        js.created_at
      FROM judge_scores js
      JOIN candidates c ON js.candidate_id = c.id
      JOIN events e ON js.event_id = e.id
      JOIN users u ON js.judge_id = u.id
      ORDER BY js.created_at DESC
      LIMIT 10
    `);
    
    recentScores.rows.forEach((score, i) => {
      console.log(`${i+1}. ${score.candidata} - ${score.evento}`);
      console.log(`   👨‍⚖️ Juez: ${score.juez}`);
      console.log(`   🎯 Puntaje: ${score.score}/10.0`);
      console.log(`   ⏰ Fecha: ${new Date(score.created_at).toLocaleString()}`);
      console.log('');
    });
    
    console.log('💡 COMANDOS ÚTILES PARA SEGUIMIENTO:');
    console.log('====================================');
    console.log('• node monitor-database.js  - Ejecutar este monitor');
    console.log('• psql -U postgres -d reinas2025  - Conectar a BD');
    console.log('• \\dt  - Ver todas las tablas');
    console.log('• SELECT COUNT(*) FROM judge_scores;  - Contar calificaciones');
    console.log('• SELECT * FROM general_ranking;  - Ver ranking completo');
    
  } catch (error) {
    console.error('❌ Error monitoreando la BD:', error);
  } finally {
    await client.end();
    console.log('\n🔌 Conexión PostgreSQL cerrada');
  }
}

// Función para monitoreo continuo
async function continuousMonitoring(intervalSeconds = 5) {
  console.log(`🔄 Iniciando monitoreo continuo cada ${intervalSeconds} segundos`);
  console.log('Presiona Ctrl+C para detener\n');
  
  while (true) {
    try {
      console.clear();
      console.log(`🕐 ${new Date().toLocaleString()} - Actualizando...\n`);
      
      await monitorDatabase();
      
      console.log(`\n⏳ Próxima actualización en ${intervalSeconds} segundos...`);
      await new Promise(resolve => setTimeout(resolve, intervalSeconds * 1000));
      
    } catch (error) {
      console.error('❌ Error en monitoreo continuo:', error);
      break;
    }
  }
}

// Ejecutar según argumentos
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--continuous') || args.includes('-c')) {
    const interval = parseInt(args.find(arg => arg.startsWith('--interval=')));
    continuousMonitoring(interval || 5).catch(console.error);
  } else {
    monitorDatabase().catch(console.error);
  }
}

module.exports = { monitorDatabase, continuousMonitoring }; 