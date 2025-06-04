const { Client } = require('pg');
const bcrypt = require('bcrypt');

// Configuración de conexión a PostgreSQL
const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'reinas2025',
  user: 'postgres',
  password: 'admin',
});

async function setupTiebreakerDemo() {
  console.log('🎯 CONFIGURACIÓN COMPLETA PARA DEMO DE DESEMPATE');
  console.log('================================================');
  
  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL reinas2025');
    
    // 1. Limpiar datos anteriores
    console.log('\n🧹 Limpiando datos anteriores...');
    await client.query('DELETE FROM judge_scores');
    // await client.query('DELETE FROM tiebreaker_scores'); // Table doesn't exist yet
    await client.query("DELETE FROM system_settings WHERE setting_key = 'active_tiebreaker'");
    console.log('✅ Datos anteriores limpiados');
    
    // 2. Verificar y crear usuarios de demo si no existen
    console.log('\n👥 Configurando usuarios de demo...');
    
    // Admin user
    const adminExists = await client.query("SELECT * FROM users WHERE email = 'admin@espe.edu.ec'");
    if (adminExists.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await client.query(`
        INSERT INTO users (email, password_hash, role, full_name, is_active) 
        VALUES ($1, $2, 'admin', 'Administrador Demo', true)
      `, ['admin@espe.edu.ec', hashedPassword]);
      console.log('✅ Usuario admin creado');
    } else {
      console.log('✅ Usuario admin ya existe');
    }
    
    // Judge users
    const judgesData = [
      { email: 'judge1@espe.edu.ec', name: 'Dr. Carlos Mendoza', password: 'judge123' },
      { email: 'judge2@espe.edu.ec', name: 'Dra. Ana Patricia López', password: 'judge123' },
      { email: 'judge3@espe.edu.ec', name: 'Ing. Roberto Vásquez', password: 'judge123' }
    ];
    
    for (const judge of judgesData) {
      const judgeExists = await client.query("SELECT * FROM users WHERE email = $1", [judge.email]);
      if (judgeExists.rows.length === 0) {
        const hashedPassword = await bcrypt.hash(judge.password, 10);
        await client.query(`
          INSERT INTO users (email, password_hash, role, full_name, is_active) 
          VALUES ($1, $2, 'judge', $3, true)
        `, [judge.email, hashedPassword, judge.name]);
        console.log(`✅ Juez creado: ${judge.name}`);
      } else {
        console.log(`✅ Juez ya existe: ${judge.name}`);
      }
    }
    
    // 3. Forzar empates exactos
    console.log('\n🔥 Forzando empates exactos...');
    
    // Obtener candidatas y eventos
    const candidates = await client.query('SELECT * FROM candidates WHERE is_active = true ORDER BY name');
    const judges = await client.query("SELECT * FROM users WHERE role = 'judge' AND is_active = true ORDER BY full_name");
    const events = await client.query("SELECT * FROM events ORDER BY name");
    
    console.log(`👥 Candidatas: ${candidates.rows.length}`);
    console.log(`👨‍⚖️ Jueces: ${judges.rows.length}`);
    console.log(`📋 Eventos: ${events.rows.length}`);
    
    // Configuración de empates exactos
    const candidateMap = {};
    candidates.rows.forEach(c => {
      candidateMap[c.name] = c.id;
    });
    
    const tieConfig = [
      {
        candidates: ['Wendy Menéndez', 'Shary Díaz'],
        score: 9.5,
        description: 'Empate por el 1er lugar (REINA ESPE 2025)'
      },
      {
        candidates: ['Jhadith Noboa', 'Adriana Zuleta'],
        score: 8.8,
        description: 'Empate por el 3er lugar (después del 2do)'
      }
    ];
    
    const otherCandidateScores = {
      'Emily Torres': 7.9,
      'Emily Ramírez': 7.7,
      'María Aguirre': 7.5,
      'María Bastidaz': 7.3,
      'María Torres': 7.1,
      'Romina Gallegos': 6.9,
      'Danny Romero': 6.7,
      'Evelyn Villaroel': 6.5
    };
    
    console.log('\n🎯 Configuración de empates:');
    tieConfig.forEach((tie, i) => {
      console.log(`${i+1}. ${tie.description}`);
      console.log(`   Candidatas: ${tie.candidates.join(' ⚖️ ')}`);
      console.log(`   Puntaje exacto: ${tie.score}/10.0`);
    });
    
    // Insertar calificaciones con empates exactos
    let totalInserted = 0;
    
    for (const judge of judges.rows) {
      for (const event of events.rows) {
        // Insertar empates exactos
        for (const tie of tieConfig) {
          for (const candidateName of tie.candidates) {
            const candidateId = candidateMap[candidateName];
            if (candidateId) {
              await client.query(`
                INSERT INTO judge_scores (judge_id, candidate_id, event_id, score) 
                VALUES ($1, $2, $3, $4)
              `, [judge.id, candidateId, event.id, tie.score]);
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
            totalInserted++;
          }
        }
      }
    }
    
    console.log(`\n📊 Total de calificaciones insertadas: ${totalInserted}`);
    
    // 4. Verificar empates creados
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
    
    console.log('\n🏅 RANKING CON EMPATES:');
    console.log('========================');
    
    ranking.rows.forEach((candidate, i) => {
      const position = i + 1;
      let medal = `${position}.`;
      
      if (position <= 3) {
        medal = ['👑', '🥈', '🥉'][i];
      }
      
      console.log(`${medal} ${candidate.name} (${candidate.department}) - ${candidate.promedio}/10.0`);
    });
    
    // 5. Detectar empates automáticamente
    console.log('\n🚨 DETECCIÓN DE EMPATES:');
    console.log('========================');
    
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
    
    let empatesDetectados = false;
    Object.entries(scoreGroups).forEach(([score, candidates]) => {
      if (candidates.length > 1) {
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
        }
      }
    });
    
    if (empatesDetectados) {
      console.log('\n🎉 ¡EMPATES CONFIGURADOS EXITOSAMENTE!');
    } else {
      console.log('\n❌ No se detectaron empates');
    }
    
    console.log('\n🎯 CREDENCIALES PARA PRUEBAS:');
    console.log('=============================');
    console.log('👨‍💼 ADMIN:');
    console.log('   Email: admin@espe.edu.ec');
    console.log('   Password: admin123');
    console.log('');
    console.log('👨‍⚖️ JUECES:');
    judgesData.forEach(judge => {
      console.log(`   ${judge.name}:`);
      console.log(`   Email: ${judge.email}`);
      console.log(`   Password: ${judge.password}`);
      console.log('');
    });
    
    console.log('🎯 PRÓXIMOS PASOS:');
    console.log('==================');
    console.log('1. Inicia el servidor: node server-complete.cjs');
    console.log('2. Prueba la API: node test-complete-tiebreaker.cjs');
    console.log('3. Inicia el frontend y login como admin');
    console.log('4. Ve a Eventos > Gestionar Empates');
    console.log('5. Activa un desempate');
    console.log('6. Login como juez y verifica modal obligatorio');
    
  } catch (error) {
    console.error('❌ Error configurando demo:', error);
  } finally {
    await client.end();
    console.log('\n🔌 Conexión PostgreSQL cerrada');
  }
}

// Ejecutar
if (require.main === module) {
  setupTiebreakerDemo().catch(console.error);
}

module.exports = { setupTiebreakerDemo }; 