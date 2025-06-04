const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'reinas2025',
  user: 'postgres',
  password: 'admin',
});

async function createAdminUsers() {
  try {
    console.log('🔐 Creating administrative users...\n');
    
    const adminUsers = [
      {
        id: '550e8400-e29b-41d4-a716-446655441000',
        email: 'superadmin@espe.edu.ec',
        full_name: 'Super Administrador',
        role: 'superadmin',
        password: 'super123'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655441001',
        email: 'admin@espe.edu.ec',
        full_name: 'Administrador Sistema',
        role: 'admin',
        password: 'admin123'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655441002',
        email: 'notario@espe.edu.ec',
        full_name: 'Notario Oficial',
        role: 'notary',
        password: 'notario123'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655441003',
        email: 'usuario@espe.edu.ec',
        full_name: 'Usuario Normal',
        role: 'user',
        password: 'usuario123'
      }
    ];
    
    for (const user of adminUsers) {
      try {
        // Check if user already exists
        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [user.email]);
        
        if (existing.rows.length > 0) {
          console.log(`⚠️  User ${user.full_name} already exists, skipping...`);
          continue;
        }
        
        const result = await pool.query(
          'INSERT INTO users (id, email, password_hash, full_name, role, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
          [
            user.id,
            user.email,
            user.password, // Simple password storage
            user.full_name,
            user.role,
            true
          ]
        );
        
        console.log(`✅ Created user: ${user.full_name} (${user.email})`);
        console.log(`   Password: ${user.password}`);
        console.log(`   Role: ${user.role}\n`);
      } catch (error) {
        if (error.code === '23505') { // Unique constraint violation
          console.log(`⚠️  User ${user.full_name} already exists (email constraint), skipping...`);
        } else {
          console.error(`❌ Error creating user ${user.full_name}:`, error.message);
        }
      }
    }
    
    // Verify all administrative users
    console.log('\n📊 All administrative users in database:');
    const allUsers = await pool.query(
      'SELECT id, email, full_name, role, is_active FROM users WHERE role IN ($1, $2, $3, $4) ORDER BY role, full_name', 
      ['superadmin', 'admin', 'notary', 'user']
    );
    console.table(allUsers.rows);
    
    console.log(`\n✅ Total administrative users: ${allUsers.rows.length}`);
    
    console.log('\n🔑 Login credentials:');
    console.log('📧 Email                  | 🔐 Password   | 👤 Role');
    console.log('--------------------------|---------------|----------------');
    console.log('superadmin@espe.edu.ec    | super123      | Super Admin');
    console.log('admin@espe.edu.ec         | admin123      | Admin');
    console.log('notario@espe.edu.ec       | notario123    | Notario');
    console.log('usuario@espe.edu.ec       | usuario123    | Usuario');
    
  } catch (error) {
    console.error('❌ Error creating administrative users:', error.message);
  } finally {
    await pool.end();
  }
}

createAdminUsers(); 