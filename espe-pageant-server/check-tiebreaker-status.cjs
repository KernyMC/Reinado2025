const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/judge/tiebreaker/current',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer test-token'
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const result = JSON.parse(body);
      console.log('🔍 Estado de desempates:');
      console.log('- Hay desempate activo:', result.data.hasActiveTiebreaker ? '✅ SÍ' : '❌ NO');
      
      if (result.data.hasActiveTiebreaker) {
        const tb = result.data.tiebreaker;
        console.log('- ID:', tb.id);
        console.log('- Descripción:', tb.description);
        console.log('- Candidatas:', tb.candidates.length);
        console.log('- Ha votado:', tb.hasVoted ? 'SÍ' : 'NO');
      }
    } catch(e) {
      console.log('📊 Response raw:', body);
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Error:', err.message);
});

req.end(); 