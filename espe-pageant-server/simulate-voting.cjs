const http = require('http');

async function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: jsonBody, headers: res.headers });
        } catch (error) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      const jsonData = JSON.stringify(data);
      req.write(jsonData);
    }
    
    req.end();
  });
}

// Generate realistic random score between 6.0 and 10.0
function generateRandomScore() {
  return Math.round((Math.random() * 4 + 6) * 10) / 10; // 6.0 - 10.0 with 1 decimal
}

async function loginJudge(email, password) {
  const loginOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const loginData = { email, password };
  const result = await makeRequest(loginOptions, loginData);
  
  if (result.status === 200 && result.data.success) {
    return {
      token: result.data.data.token,
      user: result.data.data.user
    };
  }
  return null;
}

async function getCandidates(token) {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/candidates',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
  
  const result = await makeRequest(options);
  return result.status === 200 ? result.data.data : [];
}

async function getActiveEvents(token) {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/events/active',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
  
  const result = await makeRequest(options);
  return result.status === 200 ? result.data.data : [];
}

async function submitScore(token, candidateId, eventId, score) {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/scores',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  
  const scoreData = {
    candidate_id: candidateId,
    event_id: eventId,
    score: score
  };
  
  const result = await makeRequest(options, scoreData);
  return result.status === 200 || result.status === 201;
}

async function simulateJudgeVoting(judgeInfo, candidates, events, judgeIndex) {
  const { token, user } = judgeInfo;
  console.log(`\n🎯 JUEZ ${judgeIndex + 1}: ${user.full_name} (${user.email})`);
  console.log(`📊 Iniciando votación para ${candidates.length} candidatas en ${events.length} eventos`);
  
  let totalScores = 0;
  let successfulScores = 0;
  
  for (const event of events) {
    console.log(`\n   📋 Evento: ${event.name}`);
    
    for (const candidate of candidates) {
      const score = generateRandomScore();
      totalScores++;
      
      // Add small random delay to simulate realistic timing
      const delay = Math.random() * 1000 + 500; // 500-1500ms
      await new Promise(resolve => setTimeout(resolve, delay));
      
      const success = await submitScore(token, candidate.id, event.id, score);
      
      if (success) {
        successfulScores++;
        console.log(`   ✅ ${candidate.name}: ${score}/10.0`);
      } else {
        console.log(`   ❌ ${candidate.name}: FALLÓ (${score})`);
      }
    }
  }
  
  console.log(`\n🏁 JUEZ ${judgeIndex + 1} COMPLETADO:`);
  console.log(`   • Calificaciones exitosas: ${successfulScores}/${totalScores}`);
  console.log(`   • Porcentaje de éxito: ${Math.round((successfulScores/totalScores)*100)}%`);
  
  return { totalScores, successfulScores, judgeName: user.full_name };
}

async function simulateVoting() {
  console.log('🚀 SIMULACIÓN DE VOTACIÓN SIMULTÁNEA');
  console.log('=====================================');
  
  // List of judges to try (first 3 that work)
  const judgeCredentials = [
    { email: 'judge1@espe.edu.ec', password: '123456' },
    { email: 'judge2@espe.edu.ec', password: '123456' },
    { email: 'judge3@espe.edu.ec', password: '123456' },
    { email: 'judge@espe.edu.ec', password: '123456' }, // También probar con 123456
    { email: 'judge4@espe.edu.ec', password: '123456' },
    { email: 'judge5@espe.edu.ec', password: '123456' },
    { email: 'judge6@espe.edu.ec', password: '123456' },
    { email: 'judge7@espe.edu.ec', password: '123456' },
    { email: 'juez1@espe.edu.ec', password: '123456' },
    { email: 'juez2@espe.edu.ec', password: '123456' },
    { email: 'juez3@espe.edu.ec', password: '123456' }
  ];
  
  console.log('🔐 Autenticando jueces...');
  const judges = [];
  
  for (const cred of judgeCredentials) {
    if (judges.length >= 3) break; // Solo necesitamos 3 jueces
    
    const judgeInfo = await loginJudge(cred.email, cred.password);
    if (judgeInfo) {
      judges.push(judgeInfo);
      console.log(`✅ Juez autenticado: ${judgeInfo.user.full_name} (${cred.email})`);
    } else {
      console.log(`❌ Falló autenticación: ${cred.email}`);
    }
  }
  
  if (judges.length < 3) {
    console.log(`❌ Solo se autenticaron ${judges.length} jueces. Se necesitan al menos 3.`);
    return;
  }
  
  console.log(`\n✅ ${judges.length} jueces autenticados exitosamente`);
  
  // Get candidates and events using first judge's token
  console.log('\n📋 Obteniendo candidatas y eventos...');
  const candidates = await getCandidates(judges[0].token);
  const events = await getActiveEvents(judges[0].token);
  
  if (candidates.length === 0) {
    console.log('❌ No se encontraron candidatas');
    return;
  }
  
  if (events.length === 0) {
    console.log('❌ No se encontraron eventos activos');
    return;
  }
  
  console.log(`📊 Candidatas encontradas: ${candidates.length}`);
  candidates.forEach((candidate, index) => {
    console.log(`   ${index + 1}. ${candidate.name} (${candidate.major})`);
  });
  
  console.log(`📋 Eventos activos: ${events.length}`);
  events.forEach((event, index) => {
    console.log(`   ${index + 1}. ${event.name} (Peso: ${event.weight}%)`);
  });
  
  // Start simultaneous voting
  console.log('\n🎲 INICIANDO VOTACIÓN SIMULTÁNEA...');
  console.log('=====================================');
  
  const startTime = Date.now();
  
  // Run all judges simultaneously
  const votingPromises = judges.slice(0, 3).map((judge, index) => 
    simulateJudgeVoting(judge, candidates, events, index)
  );
  
  const results = await Promise.all(votingPromises);
  
  const endTime = Date.now();
  const totalTimeSeconds = (endTime - startTime) / 1000;
  
  // Summary
  console.log('\n🏆 RESUMEN DE VOTACIÓN');
  console.log('======================');
  
  let totalScoresAll = 0;
  let successfulScoresAll = 0;
  
  results.forEach((result, index) => {
    console.log(`Juez ${index + 1} (${result.judgeName}):`);
    console.log(`   • Exitosas: ${result.successfulScores}/${result.totalScores}`);
    console.log(`   • Porcentaje: ${Math.round((result.successfulScores/result.totalScores)*100)}%`);
    
    totalScoresAll += result.totalScores;
    successfulScoresAll += result.successfulScores;
  });
  
  console.log(`\n📊 ESTADÍSTICAS GLOBALES:`);
  console.log(`   • Total de calificaciones: ${successfulScoresAll}/${totalScoresAll}`);
  console.log(`   • Porcentaje de éxito global: ${Math.round((successfulScoresAll/totalScoresAll)*100)}%`);
  console.log(`   • Tiempo total: ${totalTimeSeconds.toFixed(2)} segundos`);
  console.log(`   • Promedio por calificación: ${(totalTimeSeconds/successfulScoresAll).toFixed(2)} segundos`);
  
  // Test rankings after voting
  console.log('\n🏅 Verificando rankings actuales...');
  const adminToken = judges[0].token; // Use any token for rankings
  
  const rankingOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/reports/generate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    }
  };
  
  const rankingData = {
    event: 'all',
    format: 'json'
  };
  
  const rankingResult = await makeRequest(rankingOptions, rankingData);
  
  if (rankingResult.status === 200 && rankingResult.data.success) {
    const top3 = rankingResult.data.data.top3Rankings;
    console.log('\n🎯 TOP 3 ACTUAL:');
    top3.forEach((candidate, index) => {
      const titles = ['👑 REINA ESPE 2025', '🥈 SRTA. CONFRATERNIDAD', '🥉 SRTA. SIMPATÍA'];
      console.log(`   ${index + 1}. ${titles[index]}`);
      console.log(`      ${candidate.candidate.name} - ${candidate.finalScore}/10.0 pts (${candidate.judgeCount} votos)`);
    });
  }
  
  console.log('\n🎉 SIMULACIÓN COMPLETADA EXITOSAMENTE!');
}

simulateVoting().catch(console.error); 