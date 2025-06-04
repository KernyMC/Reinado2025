const fetch = require('node-fetch');

async function simpleTest() {
  console.log('🔍 Simple test starting...');
  
  try {
    // Test login first
    console.log('🔐 Testing login...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'superadmin@espe.edu.ec',
        password: 'super123'
      })
    });
    
    console.log('Login status:', loginResponse.status);
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Login successful');
      console.log('Token:', loginData.data.token.substring(0, 20) + '...');
      
      // Test different admin endpoints
      const endpoints = [
        { name: 'Reports Generate', url: '/api/admin/reports/generate', method: 'POST', body: { event: 'all', format: 'csv' } },
        { name: 'Reports Stats', url: '/api/admin/reports/stats', method: 'GET' },
        { name: 'Ties Current', url: '/api/admin/ties/current', method: 'GET' },
        { name: 'Events List', url: '/api/events', method: 'GET' }
      ];
      
      for (const endpoint of endpoints) {
        console.log(`\n📊 Testing ${endpoint.name}...`);
        
        const options = {
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${loginData.data.token}`
          }
        };
        
        if (endpoint.body) {
          options.body = JSON.stringify(endpoint.body);
        }
        
        const response = await fetch(`http://localhost:3000${endpoint.url}`, options);
        console.log(`${endpoint.name} status:`, response.status);
        
        if (response.ok) {
          console.log(`✅ ${endpoint.name} working`);
        } else {
          const errorText = await response.text();
          console.log(`❌ ${endpoint.name} error:`, errorText);
        }
      }
      
    } else {
      const loginError = await loginResponse.text();
      console.log('❌ Login error:', loginError);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

simpleTest(); 