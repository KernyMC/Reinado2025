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

// Función para generar puntaje aleatorio realista
function generateRealisticScore() {
  // Puntajes más realistas: 6.5 - 9.8
  return Math.round((Math.random() * 3.3 + 6.5) * 10) / 10;
}

// Función para esperar (simular tiempo real)
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function simulateRealVoting() {
  console.log('🎯 SIMULACIÓN REAL EN BASE DE DATOS POSTGRESQL');
  console.log('=============================================');
  
  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL reinas2025');
    
    // 1. Limpiar datos anteriores si existen
    console.log('\n🧹 Limpiando datos anteriores...');
    await client.query('DELETE FROM judge_scores');
    await client.query('DELETE FROM public_votes');
    console.log('✅ Datos de votación limpiados');
    
    // 2. Verificar/Crear eventos
    console.log('\n📋 Configurando eventos...');
    
    // Verificar si existen eventos
    const existingEvents = await client.query('SELECT * FROM events ORDER BY name');
    
    if (existingEvents.rows.length === 0) {
      console.log('➕ Creando eventos por defecto...');
      await client.query(`
        INSERT INTO events (name, event_type, status, description) VALUES
        ('Traje Típico', 'typical_costume', 'active', 'Presentación en traje típico ecuatoriano'),
        ('Vestido de Gala', 'evening_gown', 'active', 'Presentación en vestido de gala'),
        ('Preguntas y Respuestas', 'qa', 'active', 'Ronda de preguntas y respuestas')
      `);
      console.log('✅ Eventos creados');
    } else {
      // Activar eventos existentes
      await client.query("UPDATE events SET status = 'active'");
      console.log('✅ Eventos activados');
    }
    
    const events = await client.query('SELECT * FROM events WHERE status = $1 ORDER BY name', ['active']);
    console.log(`📊 Eventos activos: ${events.rows.length}`);
    events.rows.forEach((event, i) => {
      console.log(`   ${i+1}. ${event.name} (${event.event_type})`);
    });
    
    // 3. Verificar/Crear candidatas
    console.log('\n👥 Verificando candidatas...');
    const candidates = await client.query('SELECT * FROM candidates WHERE is_active = true ORDER BY name');
    
    if (candidates.rows.length === 0) {
      console.log('➕ Insertando candidatas...');
      await client.query(`
        INSERT INTO candidates (name, major, department, image_url, biography, is_active) VALUES
        ('Jhadith Noboa', 'Ingeniería Industrial', 'STDGO', '/images/jhadith.jpg', 'Representante Santo Domingo, liderazgo en proyectos sociales', true),
        ('Wendy Menéndez', 'Administración de Empresas', 'LATAC', '/images/wendy.jpg', 'Presidenta club emprendimiento Latacunga', true),
        ('Emily Torres', 'Seguridad y Defensa', 'SEDEF', '/images/emily_t.jpg', 'Cadete de excelencia, voluntaria en prevención', true),
        ('María Bastidaz', 'Ciencias Exactas', 'CEXUA', '/images/maria_b.jpg', 'Tutora destacada, divulgación científica', true),
        ('Romina Gallegos', 'Medicina', 'CMEDI', '/images/romina.jpg', 'Interna rotativa, brigadas médicas rurales', true),
        ('Shary Díaz', 'Economía', 'CECON', '/images/shary.jpg', 'Ganadora concurso análisis económico', true),
        ('Emily Ramírez', 'Psicología', 'CHUMA', '/images/emily_r.jpg', 'Coordinadora apoyo emocional estudiantil', true),
        ('María Aguirre', 'Biología', 'CLVID', '/images/maria_a.jpg', 'Investigadora genética plantas endémicas', true),
        ('Danny Romer', 'Geología', 'CTIER', '/images/danny.jpg', 'Explorador geológico, mapeo de riesgos', true),
        ('Adriana Zuleta', 'Ingeniería Eléctrica', 'ELTEL', '/images/adriana.jpg', 'Sistema iluminación solar, mentora STEM', true),
        ('Evelyn Villaroel', 'Ingeniería en Computación', 'CCOMP', '/images/evelyn.jpg', 'Full-stack developer, app seguridad premiada', true),
        ('María Torres', 'Ingeniería Mecánica', 'CEMEC', '/images/maria_t.jpg', 'Capitana automovilismo eléctrico', true)
      `);
      console.log('✅ 12 candidatas insertadas');
    }
    
    const finalCandidates = await client.query('SELECT * FROM candidates WHERE is_active = true ORDER BY name');
    console.log(`👥 Candidatas activas: ${finalCandidates.rows.length}`);
    finalCandidates.rows.forEach((candidate, i) => {
      console.log(`   ${i+1}. ${candidate.name} (${candidate.major} - ${candidate.department})`);
    });
    
    // 4. Verificar/Crear jueces
    console.log('\n👨‍⚖️ Configurando jueces...');
    
    // Verificar jueces existentes
    const existingJudges = await client.query("SELECT * FROM users WHERE role = 'judge' ORDER BY full_name");
    
    if (existingJudges.rows.length < 3) {
      console.log('➕ Creando jueces necesarios...');
      
      const passwordHash = await bcrypt.hash('123456', 10);
      
      const judgesToCreate = [
        { email: 'juez1@espe.edu.ec', fullName: 'Dr. Carlos Mendoza', role: 'judge' },
        { email: 'juez2@espe.edu.ec', fullName: 'Dra. Ana Patricia López', role: 'judge' },
        { email: 'juez3@espe.edu.ec', fullName: 'Ing. Roberto Vásquez', role: 'judge' },
        { email: 'juez4@espe.edu.ec', fullName: 'Lcda. Sandra Morales', role: 'judge' },
        { email: 'juez5@espe.edu.ec', fullName: 'Dr. Fernando Castillo', role: 'judge' }
      ];
      
      for (const judge of judgesToCreate) {
        try {
          await client.query(`
            INSERT INTO users (email, password_hash, full_name, role, is_active) 
            VALUES ($1, $2, $3, $4, true)
          `, [judge.email, passwordHash, judge.fullName, judge.role]);
          console.log(`   ✅ Juez creado: ${judge.fullName} (${judge.email})`);
        } catch (error) {
          if (error.code === '23505') { // Unique constraint violation
            console.log(`   ⚠️ Juez ya existe: ${judge.email}`);
          } else {
            console.log(`   ❌ Error creando juez ${judge.email}:`, error.message);
          }
        }
      }
    }
    
    const judges = await client.query("SELECT * FROM users WHERE role = 'judge' AND is_active = true ORDER BY full_name LIMIT 3");
    console.log(`👨‍⚖️ Jueces activos: ${judges.rows.length}`);
    judges.rows.forEach((judge, i) => {
      console.log(`   ${i+1}. ${judge.full_name} (${judge.email})`);
    });
    
    if (judges.rows.length < 3) {
      console.log('❌ Se necesitan al menos 3 jueces activos');
      return;
    }
    
    // 5. ¡SIMULACIÓN DE VOTACIÓN REAL!
    console.log('\n🎲 INICIANDO SIMULACIÓN DE VOTACIÓN');
    console.log('===================================');
    
    const selectedJudges = judges.rows.slice(0, 3);
    const activeEvents = events.rows;
    const activeCandidates = finalCandidates.rows;
    
    console.log(`🎯 Configuración de simulación:`);
    console.log(`   • Jueces: ${selectedJudges.length}`);
    console.log(`   • Eventos: ${activeEvents.length}`);
    console.log(`   • Candidatas: ${activeCandidates.length}`);
    console.log(`   • Total calificaciones a generar: ${selectedJudges.length * activeEvents.length * activeCandidates.length}`);
    
    const startTime = Date.now();
    let totalScores = 0;
    let successfulScores = 0;
    
    // Simular votación por cada juez
    for (let j = 0; j < selectedJudges.length; j++) {
      const judge = selectedJudges[j];
      console.log(`\n🎯 JUEZ ${j+1}: ${judge.full_name}`);
      
      for (let e = 0; e < activeEvents.length; e++) {
        const event = activeEvents[e];
        console.log(`\n   📋 Evento: ${event.name}`);
        
        for (let c = 0; c < activeCandidates.length; c++) {
          const candidate = activeCandidates[c];
          const score = generateRealisticScore();
          totalScores++;
          
          try {
            await client.query(`
              INSERT INTO judge_scores (judge_id, candidate_id, event_id, score) 
              VALUES ($1, $2, $3, $4)
            `, [judge.id, candidate.id, event.id, score]);
            
            successfulScores++;
            console.log(`      ✅ ${candidate.name}: ${score}/10.0`);
            
            // Pequeña pausa para simular tiempo real
            await wait(Math.random() * 500 + 200); // 200-700ms
            
          } catch (error) {
            console.log(`      ❌ ${candidate.name}: ERROR - ${error.message}`);
          }
        }
      }
      
      console.log(`   🏁 Juez ${j+1} completado: ${Math.round((successfulScores/totalScores)*100)}% éxito`);
    }
    
    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000;
    
    // 6. GENERAR RESULTADOS Y RANKINGS
    console.log('\n🏆 CALCULANDO RESULTADOS FINALES');
    console.log('=================================');
    
    // Consulta para obtener el ranking
    const rankingQuery = `
      SELECT 
        c.name,
        c.major,
        c.department,
        ROUND(AVG(js.score), 2) as promedio_general,
        COUNT(js.score) as total_calificaciones,
        COUNT(DISTINCT js.judge_id) as jueces_votantes,
        COUNT(DISTINCT js.event_id) as eventos_evaluados
      FROM candidates c
      LEFT JOIN judge_scores js ON c.id = js.candidate_id
      WHERE c.is_active = true
      GROUP BY c.id, c.name, c.major, c.department
      HAVING COUNT(js.score) > 0
      ORDER BY promedio_general DESC
    `;
    
    const ranking = await client.query(rankingQuery);
    
    console.log(`\n📊 ESTADÍSTICAS GENERALES:`);
    console.log(`   • Calificaciones exitosas: ${successfulScores}/${totalScores}`);
    console.log(`   • Porcentaje de éxito: ${Math.round((successfulScores/totalScores)*100)}%`);
    console.log(`   • Tiempo total: ${totalTime.toFixed(2)} segundos`);
    console.log(`   • Promedio por calificación: ${(totalTime/successfulScores).toFixed(3)} segundos`);
    
    console.log(`\n🏅 RANKING FINAL (TOP 10):`);
    console.log('==========================');
    
    const medals = ['👑', '🥈', '🥉'];
    const titles = ['REINA ESPE 2025', 'SRTA. CONFRATERNIDAD', 'SRTA. SIMPATÍA'];
    
    ranking.rows.slice(0, 10).forEach((candidate, i) => {
      const medal = i < 3 ? medals[i] : `${i+1}.`;
      const title = i < 3 ? ` ${titles[i]}` : '';
      console.log(`${medal} ${candidate.name}${title}`);
      console.log(`   📚 ${candidate.major} (${candidate.department})`);
      console.log(`   🎯 Promedio: ${candidate.promedio_general}/10.0 pts`);
      console.log(`   📊 ${candidate.total_calificaciones} calificaciones de ${candidate.jueces_votantes} jueces`);
      console.log('');
    });
    
    // 7. GUARDAR CONSULTAS DE MONITOREO
    console.log('\n💻 CONSULTAS PARA MONITOREO EN CONSOLA');
    console.log('======================================');
    
    const monitoringQueries = [
      {
        name: 'Ver ranking actualizado',
        query: `SELECT c.name, c.department, ROUND(AVG(js.score), 2) as promedio 
                FROM candidates c 
                JOIN judge_scores js ON c.id = js.candidate_id 
                GROUP BY c.id, c.name, c.department 
                ORDER BY promedio DESC;`
      },
      {
        name: 'Contar calificaciones por juez',
        query: `SELECT u.full_name, COUNT(js.score) as calificaciones 
                FROM users u 
                JOIN judge_scores js ON u.id = js.judge_id 
                GROUP BY u.id, u.full_name 
                ORDER BY calificaciones DESC;`
      },
      {
        name: 'Promedio por evento',
        query: `SELECT e.name, ROUND(AVG(js.score), 2) as promedio_evento 
                FROM events e 
                JOIN judge_scores js ON e.id = js.event_id 
                GROUP BY e.id, e.name 
                ORDER BY promedio_evento DESC;`
      },
      {
        name: 'Estadísticas completas',
        query: `SELECT 
                  (SELECT COUNT(*) FROM candidates WHERE is_active = true) as candidatas_activas,
                  (SELECT COUNT(*) FROM users WHERE role = 'judge' AND is_active = true) as jueces_activos,
                  (SELECT COUNT(*) FROM events WHERE status = 'active') as eventos_activos,
                  (SELECT COUNT(*) FROM judge_scores) as total_calificaciones,
                  (SELECT ROUND(AVG(score), 2) FROM judge_scores) as promedio_general;`
      }
    ];
    
    console.log('🔍 Ejecuta estas consultas en psql para monitorear:\n');
    console.log('psql -U postgres -d reinas2025 -c "');
    
    monitoringQueries.forEach((mq, i) => {
      console.log(`-- ${i+1}. ${mq.name}`);
      console.log(`${mq.query.replace(/\s+/g, ' ').trim()}`);
      console.log('');
    });
    
    console.log('"');
    
    console.log('\n🎉 ¡SIMULACIÓN COMPLETADA EXITOSAMENTE!');
    console.log('Datos insertados directamente en PostgreSQL reinas2025');
    console.log('El cliente puede consultar la BD en tiempo real');
    
  } catch (error) {
    console.error('❌ Error en la simulación:', error);
  } finally {
    await client.end();
    console.log('\n🔌 Conexión PostgreSQL cerrada');
  }
}

// Ejecutar simulación
if (require.main === module) {
  simulateRealVoting().catch(console.error);
}

module.exports = { simulateRealVoting }; 