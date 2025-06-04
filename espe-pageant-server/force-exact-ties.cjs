const { Client } = require('pg');

// Configuración de conexión a PostgreSQL
const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'reinas2025',
  user: 'postgres',
  password: 'admin',
});

async function forceExactTies() {
  console.log('🔥 FORZANDO EMPATES EXACTOS EN BASE DE DATOS');
  console.log('============================================');
  
  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL reinas2025');
    
    // 1. Primero limpiar calificaciones anteriores
    console.log('\n🧹 Limpiando calificaciones anteriores...');
    await client.query('DELETE FROM judge_scores');
    console.log('✅ Calificaciones anteriores eliminadas');
    
    // 2. Obtener IDs necesarios
    console.log('\n📋 Obteniendo datos de candidatas, jueces y eventos...');
    
    const candidates = await client.query('SELECT * FROM candidates WHERE is_active = true ORDER BY name');
    const judges = await client.query("SELECT * FROM users WHERE role = 'judge' AND is_active = true ORDER BY full_name LIMIT 3");
    const events = await client.query("SELECT * FROM events ORDER BY name");
    
    console.log(`👥 Candidatas: ${candidates.rows.length}`);
    console.log(`👨‍⚖️ Jueces: ${judges.rows.length}`);
    console.log(`📋 Eventos: ${events.rows.length}`);
    
    // 3. Configuración de empates exactos
    console.log('\n🎯 CONFIGURACIÓN DE EMPATES EXACTOS:');
    console.log('===================================');
    
    // Mapeo de candidatas por nombre para facilitar
    const candidateMap = {};
    candidates.rows.forEach(c => {
      candidateMap[c.name] = c.id;
    });
    
    // Configuración de empates
    const tieConfig = [
      // Empate por el 1er lugar: 9.50 puntos exactos
      {
        candidates: ['Wendy Menéndez', 'Shary Díaz'],
        score: 9.5,
        description: 'Empate por el 1er lugar (REINA ESPE 2025)'
      },
      // Empate por el 2do lugar: 8.80 puntos exactos  
      {
        candidates: ['Jhadith Noboa', 'Adriana Zuleta'],
        score: 8.8,
        description: 'Empate por el 2do lugar (SRTA. CONFRATERNIDAD)'
      },
      // Empate por el 3er lugar: 8.30 puntos exactos
      {
        candidates: ['Danny Romero', 'Evelyn Villaroel'],
        score: 8.3,
        description: 'Empate por el 3er lugar (SRTA. SIMPATÍA)'
      }
    ];
    
    // Puntajes para candidatas sin empate
    const otherCandidateScores = {
      'Emily Torres': 7.9,
      'Emily Ramírez': 7.7,
      'María Aguirre': 7.5,
      'María Bastidaz': 7.3,
      'María Torres': 7.1,
      'Romina Gallegos': 6.9
    };
    
    tieConfig.forEach((tie, i) => {
      console.log(`${i+1}. ${tie.description}`);
      console.log(`   Candidatas: ${tie.candidates.join(' ⚖️ ')}`);
      console.log(`   Puntaje exacto: ${tie.score}/10.0`);
    });
    
    console.log('\n🎯 Otras candidatas:');
    Object.entries(otherCandidateScores).forEach(([name, score]) => {
      console.log(`   ${name}: ${score}/10.0`);
    });
    
    // 4. Insertar calificaciones con empates exactos
    console.log('\n💾 INSERTANDO CALIFICACIONES CON EMPATES...');
    console.log('============================================');
    
    let totalInserted = 0;
    
    for (const judge of judges.rows) {
      console.log(`\n👨‍⚖️ Insertando calificaciones para: ${judge.full_name}`);
      
      for (const event of events.rows) {
        console.log(`   📋 Evento: ${event.name}`);
        
        // Insertar empates exactos
        for (const tie of tieConfig) {
          for (const candidateName of tie.candidates) {
            const candidateId = candidateMap[candidateName];
            if (candidateId) {
              await client.query(`
                INSERT INTO judge_scores (judge_id, candidate_id, event_id, score) 
                VALUES ($1, $2, $3, $4)
              `, [judge.id, candidateId, event.id, tie.score]);
              
              console.log(`      ✅ ${candidateName}: ${tie.score}/10.0`);
              totalInserted++;
            }
          }
        }
        
        // Insertar puntajes para otras candidatas
        for (const [candidateName, score] of Object.entries(otherCandidateScores)) {
          const candidateId = candidateMap[candidateName];
          if (candidateId) {
            await client.query(`
              INSERT INTO judge_scores (judge_id, candidate_id, event_id, score) 
              VALUES ($1, $2, $3, $4)
            `, [judge.id, candidateId, event.id, score]);
            
            console.log(`      ✅ ${candidateName}: ${score}/10.0`);
            totalInserted++;
          }
        }
      }
    }
    
    console.log(`\n📊 Total de calificaciones insertadas: ${totalInserted}`);
    
    // 5. Verificar empates creados
    console.log('\n🔍 VERIFICANDO EMPATES CREADOS');
    console.log('==============================');
    
    const rankingQuery = `
      SELECT 
        c.name,
        c.department,
        ROUND(AVG(js.score), 2) as promedio,
        COUNT(js.score) as calificaciones
      FROM candidates c
      JOIN judge_scores js ON c.id = js.candidate_id
      GROUP BY c.id, c.name, c.department
      ORDER BY promedio DESC
    `;
    
    const ranking = await client.query(rankingQuery);
    
    console.log('\n🏅 RANKING CON EMPATES FORZADOS:');
    console.log('=================================');
    
    ranking.rows.forEach((candidate, i) => {
      const position = i + 1;
      let medal = `${position}.`;
      
      if (position <= 3) {
        medal = ['👑', '🥈', '🥉'][i];
      }
      
      console.log(`${medal} ${candidate.name} (${candidate.department}) - ${candidate.promedio}/10.0`);
    });
    
    // 6. Detectar empates automáticamente
    console.log('\n🚨 DETECCIÓN AUTOMÁTICA DE EMPATES:');
    console.log('===================================');
    
    const tiesFound = [];
    
    // Agrupar por puntaje igual
    const scoreGroups = {};
    ranking.rows.forEach((candidate, index) => {
      const score = candidate.promedio;
      if (!scoreGroups[score]) {
        scoreGroups[score] = [];
      }
      scoreGroups[score].push({
        ...candidate,
        position: index + 1
      });
    });
    
    // Identificar empates en TOP 3
    let empatesDetectados = false;
    Object.entries(scoreGroups).forEach(([score, candidates]) => {
      if (candidates.length > 1) {
        // Verificar si alguno está en TOP 3
        const topPositions = candidates.filter(c => c.position <= 3);
        if (topPositions.length > 1) {
          empatesDetectados = true;
          
          const titles = ['1er lugar (REINA)', '2do lugar (CONFRATERNIDAD)', '3er lugar (SIMPATÍA)'];
          const firstPosition = Math.min(...topPositions.map(c => c.position));
          
          console.log(`⚖️ EMPATE DETECTADO por el ${titles[firstPosition - 1]}`);
          console.log(`   🎯 Puntaje: ${score}/10.0`);
          console.log(`   👥 Candidatas empateadas:`);
          topPositions.forEach(candidate => {
            console.log(`      • ${candidate.name} (${candidate.department})`);
          });
          console.log('');
          
          tiesFound.push({
            position: firstPosition,
            score: parseFloat(score),
            candidates: topPositions
          });
        }
      }
    });
    
    if (empatesDetectados) {
      console.log('🎉 ¡EMPATES FORZADOS EXITOSAMENTE!');
      console.log(`📊 Total de empates en TOP 3: ${tiesFound.length}`);
      console.log('💡 El sistema debe activar protocolo de desempate');
    } else {
      console.log('❌ No se detectaron empates (algo salió mal)');
    }
    
    console.log('\n🎯 PRÓXIMOS PASOS:');
    console.log('==================');
    console.log('1. Ejecutar: node test-tie-detection.cjs');
    console.log('2. Verificar endpoint /api/admin/ties/current');
    console.log('3. Probar sistema de desempate en el frontend');
    
  } catch (error) {
    console.error('❌ Error forzando empates:', error);
  } finally {
    await client.end();
    console.log('\n🔌 Conexión PostgreSQL cerrada');
  }
}

// Ejecutar
if (require.main === module) {
  forceExactTies().catch(console.error);
}

module.exports = { forceExactTies }; 