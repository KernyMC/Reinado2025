const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'reinas2025',
  user: 'postgres',
  password: 'admin',
});

async function createJudges() {
  try {
    console.log('🎯 Creating 7 judges in database...\n');
    
    const judges = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'judge1@espe.edu.ec',
        full_name: 'Dr. Patricia Morales',
        role: 'judge'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        email: 'judge2@espe.edu.ec',
        full_name: 'Mg. Carlos Rodríguez',
        role: 'judge'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        email: 'judge3@espe.edu.ec',
        full_name: 'Dra. Ana Belén López',
        role: 'judge'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        email: 'judge4@espe.edu.ec',
        full_name: 'Mg. Roberto Sandoval',
        role: 'judge'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        email: 'judge5@espe.edu.ec',
        full_name: 'Dra. María Teresa Vásquez',
        role: 'judge'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440005',
        email: 'judge6@espe.edu.ec',
        full_name: 'Mg. Diego Herrera',
        role: 'judge'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440006',
        email: 'judge7@espe.edu.ec',
        full_name: 'Dra. Carmen Guerrero',
        role: 'judge'
      }
    ];
    
    for (const judge of judges) {
      try {
        // Check if judge already exists
        const existing = await pool.query('SELECT id FROM users WHERE id = $1', [judge.id]);
        
        if (existing.rows.length > 0) {
          console.log(`⚠️  Judge ${judge.full_name} already exists, skipping...`);
          continue;
        }
        
        const result = await pool.query(
          'INSERT INTO users (id, email, password_hash, full_name, role, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
          [
            judge.id,
            judge.email,
            '$2b$10$example_hash_for_judge',
            judge.full_name,
            judge.role,
            true
          ]
        );
        
        console.log(`✅ Created judge: ${judge.full_name} (${judge.email})`);
      } catch (error) {
        if (error.code === '23505') { // Unique constraint violation
          console.log(`⚠️  Judge ${judge.full_name} already exists (email constraint), skipping...`);
        } else {
          console.error(`❌ Error creating judge ${judge.full_name}:`, error.message);
        }
      }
    }
    
    // Verify all judges
    console.log('\n📊 All judges in database:');
    const allJudges = await pool.query('SELECT id, email, full_name, role, is_active FROM users WHERE role = $1 ORDER BY full_name', ['judge']);
    console.table(allJudges.rows);
    
    console.log(`\n✅ Total judges created/found: ${allJudges.rows.length}`);
    
  } catch (error) {
    console.error('❌ Error creating judges:', error.message);
  } finally {
    await pool.end();
  }
}

createJudges(); 