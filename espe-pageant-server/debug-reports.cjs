const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'reinas2025',
  user: 'postgres',
  password: 'admin',
  ssl: false,
});

async function executeQuery(query, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result;
  } finally {
    client.release();
  }
}

async function debugReports() {
  try {
    console.log('🔍 Debugging reports generation...\n');

    // 1. Check candidates
    console.log('1️⃣ Checking candidates...');
    const candidatesQuery = `
      SELECT c.id, c.name, c.major as career, c.image_url as photo_url, c.department as faculty
      FROM candidates c 
      WHERE c.is_active = true 
      ORDER BY c.name
    `;
    const candidatesResult = await executeQuery(candidatesQuery);
    console.log(`📊 Found ${candidatesResult.rows.length} candidates`);
    console.log('📋 First candidate:', candidatesResult.rows[0]);

    // 2. Check events structure
    console.log('\n2️⃣ Checking events structure...');
    const eventsStructureQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'events'
    `;
    const eventsStructure = await executeQuery(eventsStructureQuery);
    console.log('📊 Events table structure:');
    eventsStructure.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    // 3. Check events data
    console.log('\n3️⃣ Checking events data...');
    const eventsQuery = 'SELECT * FROM events ORDER BY created_at';
    const eventsResult = await executeQuery(eventsQuery);
    console.log(`📊 Found ${eventsResult.rows.length} events`);
    eventsResult.rows.forEach((event, index) => {
      console.log(`  ${index + 1}. ${event.name} (ID: ${event.id})`);
    });

    // 4. Check scores with detailed JOIN
    console.log('\n4️⃣ Checking scores with JOIN...');
    const scoresQuery = `
      SELECT 
        js.candidate_id, 
        js.event_id, 
        js.score, 
        js.created_at,
        u.full_name as judge_name,
        c.name as candidate_name,
        e.name as event_name
      FROM judge_scores js
      JOIN users u ON js.judge_id = u.id
      JOIN events e ON js.event_id = e.id
      JOIN candidates c ON js.candidate_id = c.id
      WHERE 1=1
      LIMIT 5
    `;
    const scoresResult = await executeQuery(scoresQuery);
    console.log(`📊 Found ${scoresResult.rows.length} scores (showing first 5)`);
    scoresResult.rows.forEach((score, index) => {
      console.log(`  ${index + 1}. ${score.candidate_name} -> ${score.event_name}: ${score.score} (by ${score.judge_name})`);
    });

    // 5. Count all scores
    console.log('\n5️⃣ Counting all scores...');
    const totalScoresQuery = 'SELECT COUNT(*) as total FROM judge_scores';
    const totalScoresResult = await executeQuery(totalScoresQuery);
    console.log(`📊 Total scores in DB: ${totalScoresResult.rows[0].total}`);

    // 6. Test the problematic query
    console.log('\n6️⃣ Testing the problematic query...');
    const problematicQuery = `
      SELECT 
        js.candidate_id, 
        js.event_id, 
        js.score, 
        js.created_at,
        u.full_name as judge_name,
        e.event_type
      FROM judge_scores js
      JOIN users u ON js.judge_id = u.id
      JOIN events e ON js.event_id = e.id
      WHERE 1=1
    `;
    
    try {
      const problematicResult = await executeQuery(problematicQuery);
      console.log(`✅ Problematic query works! Found ${problematicResult.rows.length} results`);
    } catch (error) {
      console.log(`❌ Problematic query failed: ${error.message}`);
      
      // Try simplified version
      console.log('\n🔧 Trying simplified query...');
      const simplifiedQuery = `
        SELECT 
          js.candidate_id, 
          js.event_id, 
          js.score, 
          js.created_at,
          u.full_name as judge_name
        FROM judge_scores js
        JOIN users u ON js.judge_id = u.id
        WHERE 1=1
      `;
      const simplifiedResult = await executeQuery(simplifiedQuery);
      console.log(`✅ Simplified query works! Found ${simplifiedResult.rows.length} results`);
    }

    console.log('\n🎉 Debug completed!');

  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    pool.end();
  }
}

debugReports(); 