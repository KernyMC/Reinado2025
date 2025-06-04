const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'reinas2025',
  user: 'postgres',
  password: 'admin',
});

async function verifyScores() {
  try {
    console.log('🔍 Verifying scores in database...\n');
    
    const judge_id = '550e8400-e29b-41d4-a716-446655440000';
    
    // Check all scores
    console.log('📊 All scores in database:');
    const allScores = await pool.query('SELECT * FROM judge_scores ORDER BY created_at DESC');
    console.table(allScores.rows);
    
    // Check scores for our judge
    console.log('\n🎯 Scores for our judge:');
    const judgeScores = await pool.query('SELECT * FROM judge_scores WHERE judge_id = $1', [judge_id]);
    console.table(judgeScores.rows);
    
    // Check the JOIN query used by the API
    console.log('\n🔍 Testing API query:');
    const apiQuery = await pool.query(
      'SELECT js.*, c.name as candidate_name, e.name as event_name FROM judge_scores js JOIN candidates c ON js.candidate_id = c.id JOIN events e ON js.event_id = e.id WHERE js.judge_id = $1 ORDER BY js.created_at DESC',
      [judge_id]
    );
    console.table(apiQuery.rows);
    
    // Check if candidates and events exist for the scores
    console.log('\n📋 Checking candidates...');
    const candidates = await pool.query('SELECT id, name FROM candidates');
    console.log(`Found ${candidates.rows.length} candidates`);
    
    console.log('\n📋 Checking events...');
    const events = await pool.query('SELECT id, name FROM events');
    console.log(`Found ${events.rows.length} events`);
    
    console.log('\n✅ Verification completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

verifyScores(); 