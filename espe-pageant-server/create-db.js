import pkg from 'pg';
const { Pool } = pkg;

console.log('🔄 Creando base de datos y tablas para ESPE Pageant...');

// Conexión a la base de datos postgres para crear reinas2025
const adminPool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'admin',
  ssl: false,
});

async function createDatabase() {
  try {
    console.log('🔗 Conectando a PostgreSQL...');
    const client = await adminPool.connect();
    
    // Verificar si la base de datos existe
    const dbCheck = await client.query(`
      SELECT datname FROM pg_database WHERE datname = 'reinas2025'
    `);
    
    if (dbCheck.rows.length === 0) {
      console.log('📊 Creando base de datos reinas2025...');
      await client.query('CREATE DATABASE reinas2025');
      console.log('✅ Base de datos creada exitosamente');
    } else {
      console.log('✅ Base de datos reinas2025 ya existe');
    }
    
    client.release();
    await adminPool.end();
    
    // Ahora conectar a la base de datos reinas2025 para crear las tablas
    await createTables();
    
  } catch (error) {
    console.error('❌ Error creando base de datos:', error.message);
    process.exit(1);
  }
}

async function createTables() {
  const dbPool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'reinas2025',
    user: 'postgres',
    password: 'admin',
    ssl: false,
  });

  try {
    console.log('🔗 Conectando a base de datos reinas2025...');
    const client = await dbPool.connect();
    
    console.log('📊 Creando tablas...');
    
    // Crear tabla de usuarios
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('judge', 'admin', 'superadmin', 'notary', 'user')),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla users creada');
    
    // Crear tabla de candidatas
    await client.query(`
      CREATE TABLE IF NOT EXISTS candidates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        major VARCHAR(255) NOT NULL,
        department VARCHAR(100) NOT NULL,
        image_url TEXT,
        biography TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla candidates creada');
    
    // Crear tabla de eventos
    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('typical_costume', 'evening_gown', 'qa')),
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'closed')),
        start_time TIMESTAMP WITH TIME ZONE,
        end_time TIMESTAMP WITH TIME ZONE,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla events creada');
    
    // Insertar usuario administrador por defecto
    await client.query(`
      INSERT INTO users (email, password_hash, full_name, role) 
      VALUES ('admin@espe.edu.ec', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', 'Administrador Sistema', 'superadmin')
      ON CONFLICT (email) DO NOTHING
    `);
    console.log('✅ Usuario administrador creado (admin@espe.edu.ec / admin123)');
    
    // Insertar eventos por defecto
    await client.query(`
      INSERT INTO events (name, event_type, status) VALUES
      ('Traje Típico', 'typical_costume', 'pending'),
      ('Vestido de Gala', 'evening_gown', 'pending'),
      ('Preguntas y Respuestas', 'qa', 'pending')
      ON CONFLICT DO NOTHING
    `);
    console.log('✅ Eventos por defecto creados');
    
    // Verificar tablas creadas
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📋 Tablas en la base de datos:');
    tablesResult.rows.forEach(row => {
      console.log(`   📄 ${row.table_name}`);
    });
    
    client.release();
    await dbPool.end();
    
    console.log('🎉 Base de datos configurada exitosamente!');
    console.log('');
    console.log('📝 Credenciales de acceso:');
    console.log('   Email: admin@espe.edu.ec');
    console.log('   Password: admin123');
    
  } catch (error) {
    console.error('❌ Error creando tablas:', error.message);
    process.exit(1);
  }
}

createDatabase(); 