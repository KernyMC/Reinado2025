const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'reinas2025',
  user: 'postgres',
  password: 'admin',
});

async function migrateEventsTable() {
  try {
    console.log('🔄 Iniciando migración de tabla events...\n');
    
    // Agregar columnas faltantes
    const migrations = [
      {
        name: 'weight',
        query: `ALTER TABLE events ADD COLUMN IF NOT EXISTS weight DECIMAL(5,2) DEFAULT 0 CHECK (weight >= 0 AND weight <= 100)`,
        description: 'Peso del evento en porcentaje (0-100)'
      },
      {
        name: 'is_mandatory',
        query: `ALTER TABLE events ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT true`,
        description: 'Si el evento es obligatorio o opcional'
      },
      {
        name: 'bonus_percentage',
        query: `ALTER TABLE events ADD COLUMN IF NOT EXISTS bonus_percentage DECIMAL(5,2) DEFAULT 0 CHECK (bonus_percentage >= 0 AND bonus_percentage <= 100)`,
        description: 'Porcentaje de bonificación para eventos opcionales'
      },
      {
        name: 'is_active',
        query: `ALTER TABLE events ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`,
        description: 'Si el evento está activo para calificaciones'
      }
    ];

    for (const migration of migrations) {
      console.log(`📝 Agregando columna: ${migration.name} - ${migration.description}`);
      try {
        await pool.query(migration.query);
        console.log(`✅ Columna ${migration.name} agregada correctamente`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`ℹ️ Columna ${migration.name} ya existe`);
        } else {
          throw error;
        }
      }
    }

    // Verificar la nueva estructura
    console.log('\n📋 Nueva estructura de tabla events:');
    const structure = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'events' 
      ORDER BY ordinal_position
    `);
    
    console.table(structure.rows);

    // Actualizar eventos existentes con valores por defecto
    console.log('\n🔄 Actualizando eventos existentes...');
    
    // Obtener eventos actuales
    const events = await pool.query('SELECT id, name, event_type FROM events');
    
    for (let i = 0; i < events.rows.length; i++) {
      const event = events.rows[i];
      let weight = 0;
      let is_mandatory = true;
      
      // Asignar pesos basados en el tipo de evento
      switch (event.event_type) {
        case 'typical_costume':
          weight = 40;
          break;
        case 'evening_gown':
          weight = 40;
          break;
        case 'qa':
          weight = 20;
          break;
        default:
          weight = Math.round(100 / events.rows.length); // Distribuir equitativamente
      }
      
      await pool.query(
        'UPDATE events SET weight = $1, is_mandatory = $2, bonus_percentage = 0, is_active = true WHERE id = $3',
        [weight, is_mandatory, event.id]
      );
      
      console.log(`✅ Actualizado: ${event.name} - Peso: ${weight}% - Activo: true`);
    }

    // Mostrar eventos actualizados
    console.log('\n🎯 Eventos actualizados:');
    const updatedEvents = await pool.query('SELECT name, event_type, weight, is_mandatory, bonus_percentage, is_active, status FROM events');
    console.table(updatedEvents.rows);

    console.log('\n✅ Migración completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en migración:', error.message);
  } finally {
    await pool.end();
  }
}

migrateEventsTable(); 