const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'reinas2025',
  user: 'postgres',
  password: 'admin',
});

async function updateJudgesPasswords() {
  try {
    console.log('🔐 Updating judges passwords to simple ones...\n');
    
    const judgeUpdates = [
      { email: 'judge@espe.edu.ec', password: 'juez123' },
      { email: 'judge2@espe.edu.ec', password: 'juez123' },
      { email: 'judge3@espe.edu.ec', password: 'juez123' },
      { email: 'judge4@espe.edu.ec', password: 'juez123' },
      { email: 'judge5@espe.edu.ec', password: 'juez123' },
      { email: 'judge6@espe.edu.ec', password: 'juez123' },
      { email: 'judge7@espe.edu.ec', password: 'juez123' }
    ];
    
    for (const judge of judgeUpdates) {
      try {
        const result = await pool.query(
          'UPDATE users SET password_hash = $1 WHERE email = $2 AND role = $3 RETURNING email, full_name',
          [judge.password, judge.email, 'judge']
        );
        
        if (result.rows.length > 0) {
          console.log(`✅ Updated password for: ${result.rows[0].full_name || judge.email}`);
          console.log(`   Email: ${judge.email}`);
          console.log(`   New Password: ${judge.password}\n`);
        } else {
          console.log(`⚠️  Judge ${judge.email} not found or not a judge`);
        }
      } catch (error) {
        console.error(`❌ Error updating judge ${judge.email}:`, error.message);
      }
    }
    
    // Verify all judges
    console.log('\n📊 All judges with new passwords:');
    const allJudges = await pool.query(
      'SELECT email, full_name, is_active FROM users WHERE role = $1 ORDER BY email', 
      ['judge']
    );
    
    console.table(allJudges.rows);
    
    console.log('\n🔑 Login credentials for judges:');
    console.log('📧 Email                  | 🔐 Password   | 👤 Role');
    console.log('--------------------------|---------------|----------------');
    for (const judge of judgeUpdates) {
      console.log(`${judge.email.padEnd(25)} | ${judge.password.padEnd(13)} | Juez`);
    }
    
  } catch (error) {
    console.error('❌ Error updating judges passwords:', error.message);
  } finally {
    await pool.end();
  }
}

updateJudgesPasswords(); 