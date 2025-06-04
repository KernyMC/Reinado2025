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

async function loginAdmin() {
  const loginOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const loginData = {
    email: 'admin@espe.edu.ec',
    password: 'admin123'
  };
  
  const result = await makeRequest(loginOptions, loginData);
  
  if (result.status === 200 && result.data.success) {
    return result.data.data.token;
  }
  return null;
}

async function getUsers(token) {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/users',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
  
  const result = await makeRequest(options);
  return result.status === 200 ? result.data.data : [];
}

async function createJudge(token, email, fullName) {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/users',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  
  const userData = {
    email: email,
    full_name: fullName,
    role: 'judge',
    password: '123456'
  };
  
  const result = await makeRequest(options, userData);
  return result.status === 201;
}

async function getEvents(token) {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/events',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
  
  const result = await makeRequest(options);
  return result.status === 200 ? result.data.data : [];
}

async function createEvent(token, eventData) {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/events',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  
  const result = await makeRequest(options, eventData);
  return result.status === 201;
}

async function setupJudgesAndEvents() {
  console.log('🔧 CONFIGURACIÓN DE JUECES Y EVENTOS');
  console.log('====================================');
  
  // Login as admin
  const token = await loginAdmin();
  if (!token) {
    console.log('❌ No se pudo autenticar como admin');
    return;
  }
  console.log('✅ Admin autenticado');
  
  // Check existing users
  const users = await getUsers(token);
  const judges = users.filter(user => user.role === 'judge');
  
  console.log(`\n📊 Usuarios existentes: ${users.length}`);
  console.log(`👨‍⚖️ Jueces existentes: ${judges.length}`);
  
  if (judges.length > 0) {
    console.log('🎯 Jueces encontrados:');
    judges.forEach((judge, index) => {
      console.log(`   ${index + 1}. ${judge.full_name} (${judge.email}) - ${judge.is_active ? 'Activo' : 'Inactivo'}`);
    });
  }
  
  // Create missing judges if needed
  const requiredJudges = [
    { email: 'judge1@espe.edu.ec', fullName: 'Juez Principal 1' },
    { email: 'judge2@espe.edu.ec', fullName: 'Juez Principal 2' },
    { email: 'judge3@espe.edu.ec', fullName: 'Juez Principal 3' }
  ];
  
  console.log('\n🔨 Verificando jueces requeridos...');
  
  for (const requiredJudge of requiredJudges) {
    const existingJudge = judges.find(j => j.email === requiredJudge.email);
    
    if (!existingJudge) {
      console.log(`➕ Creando juez: ${requiredJudge.fullName} (${requiredJudge.email})`);
      const success = await createJudge(token, requiredJudge.email, requiredJudge.fullName);
      if (success) {
        console.log(`   ✅ Juez creado exitosamente`);
      } else {
        console.log(`   ❌ Error creando juez`);
      }
    } else {
      console.log(`✅ Juez ya existe: ${requiredJudge.fullName} (${requiredJudge.email})`);
    }
  }
  
  // Check events
  const events = await getEvents(token);
  const activeEvents = events.filter(event => event.is_active);
  
  console.log(`\n📋 Eventos totales: ${events.length}`);
  console.log(`🎯 Eventos activos: ${activeEvents.length}`);
  
  if (activeEvents.length > 0) {
    console.log('🎭 Eventos activos encontrados:');
    activeEvents.forEach((event, index) => {
      console.log(`   ${index + 1}. ${event.name} (Peso: ${event.weight}%)`);
    });
  }
  
  // Create default events if none exist
  if (events.length === 0) {
    console.log('\n🔨 Creando eventos por defecto...');
    
    const defaultEvents = [
      {
        name: 'Traje Típico',
        event_type: 'typical_costume',
        description: 'Presentación en traje típico ecuatoriano',
        weight: 30,
        is_mandatory: true,
        bonus_percentage: 0,
        is_active: true
      },
      {
        name: 'Vestido de Gala',
        event_type: 'evening_gown',
        description: 'Presentación en vestido de gala',
        weight: 40,
        is_mandatory: true,
        bonus_percentage: 0,
        is_active: true
      },
      {
        name: 'Preguntas y Respuestas',
        event_type: 'qa',
        description: 'Ronda de preguntas y respuestas',
        weight: 30,
        is_mandatory: true,
        bonus_percentage: 0,
        is_active: true
      }
    ];
    
    for (const eventData of defaultEvents) {
      console.log(`➕ Creando evento: ${eventData.name}`);
      const success = await createEvent(token, eventData);
      if (success) {
        console.log(`   ✅ Evento creado exitosamente`);
      } else {
        console.log(`   ❌ Error creando evento`);
      }
    }
  }
  
  // Final check
  const finalUsers = await getUsers(token);
  const finalJudges = finalUsers.filter(user => user.role === 'judge');
  const finalEvents = await getEvents(token);
  const finalActiveEvents = finalEvents.filter(event => event.is_active);
  
  console.log('\n🎯 CONFIGURACIÓN FINAL:');
  console.log(`✅ Jueces disponibles: ${finalJudges.length}`);
  console.log(`✅ Eventos activos: ${finalActiveEvents.length}`);
  
  if (finalJudges.length >= 3 && finalActiveEvents.length > 0) {
    console.log('\n🚀 ¡SISTEMA LISTO PARA SIMULACIÓN!');
    console.log('Ejecuta: node simulate-voting.cjs');
  } else {
    console.log('\n❌ Sistema no está listo para simulación');
    if (finalJudges.length < 3) console.log(`   • Se necesitan al menos 3 jueces (tienes ${finalJudges.length})`);
    if (finalActiveEvents.length === 0) console.log(`   • Se necesita al menos 1 evento activo`);
  }
}

setupJudgesAndEvents().catch(console.error); 