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

async function updateUserPassword(token, userId, userData) {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: `/api/users/${userId}`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  
  const result = await makeRequest(options, userData);
  return result.status === 200;
}

async function fixJudgePasswords() {
  console.log('🔑 ARREGLANDO CONTRASEÑAS DE JUECES');
  console.log('===================================');
  
  // Login as admin
  const token = await loginAdmin();
  if (!token) {
    console.log('❌ No se pudo autenticar como admin');
    return;
  }
  console.log('✅ Admin autenticado');
  
  // Get all users
  const users = await getUsers(token);
  const judges = users.filter(user => user.role === 'judge');
  
  console.log(`\n👨‍⚖️ Jueces encontrados: ${judges.length}`);
  
  // Update each judge's password
  for (const judge of judges) {
    console.log(`🔄 Actualizando contraseña para: ${judge.full_name} (${judge.email})`);
    
    const userData = {
      email: judge.email,
      full_name: judge.full_name,
      role: judge.role,
      is_active: true, // Also activate all judges
      password: '123456'
    };
    
    const success = await updateUserPassword(token, judge.id, userData);
    
    if (success) {
      console.log(`   ✅ Contraseña actualizada y juez activado`);
    } else {
      console.log(`   ❌ Error actualizando contraseña`);
    }
  }
  
  console.log('\n🎯 ACTUALIZACIÓN COMPLETADA');
  console.log('Ahora todos los jueces tienen contraseña: 123456');
  console.log('Ejecuta: node simulate-voting.cjs');
}

fixJudgePasswords().catch(console.error); 