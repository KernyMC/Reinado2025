const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'reinas2025',
  user: 'postgres',
  password: 'admin',
  ssl: false,
});

async function simplifyEventsTable() {
  try {
    console.log('🔧 Simplificando tabla events...\n');

    // 1. Verificar campos actuales
    console.log('1. 📋 Verificando estructura actual:');
    const currentStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'events' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    console.log('Campos actuales:');
    currentStructure.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    // 2. Verificar si los campos existen antes de eliminarlos
    const hasEventType = currentStructure.rows.some(col => col.column_name === 'event_type');
    const hasStatus = currentStructure.rows.some(col => col.column_name === 'status');

    console.log('\n2. 🗑️ Eliminando campos innecesarios:');

    if (hasEventType) {
      await pool.query('ALTER TABLE events DROP COLUMN IF EXISTS event_type');
      console.log('   ✅ Eliminado campo: event_type');
    } else {
      console.log('   ℹ️ Campo event_type ya no existe');
    }

    if (hasStatus) {
      await pool.query('ALTER TABLE events DROP COLUMN IF EXISTS status');
      console.log('   ✅ Eliminado campo: status');
    } else {
      console.log('   ℹ️ Campo status ya no existe');
    }

    // También eliminar start_time y end_time si existen
    await pool.query('ALTER TABLE events DROP COLUMN IF EXISTS start_time');
    await pool.query('ALTER TABLE events DROP COLUMN IF EXISTS end_time');
    console.log('   ✅ Eliminados campos: start_time, end_time');

    // 3. Verificar estructura final
    console.log('\n3. ✅ Estructura final:');
    const finalStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'events' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    console.log('Campos restantes:');
    finalStructure.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    // 4. Mostrar eventos actuales
    console.log('\n4. 📊 Eventos existentes:');
    const events = await pool.query('SELECT id, name, is_active, is_mandatory, weight, bonus_percentage FROM events');
    
    if (events.rows.length === 0) {
      console.log('   ❌ No hay eventos en la tabla');
    } else {
      events.rows.forEach((event, index) => {
        console.log(`   ${index + 1}. ${event.name}`);
        console.log(`      🔄 Activo: ${event.is_active ? '✅' : '❌'}`);
        console.log(`      📋 Obligatorio: ${event.is_mandatory ? '✅' : '❌'}`);
        console.log(`      ⚖️ Peso: ${event.weight}%`);
        console.log(`      🎁 Bonus: ${event.bonus_percentage}%`);
      });
    }

    console.log('\n🎉 ¡Tabla events simplificada exitosamente!');
    console.log('\n📝 Campos eliminados:');
    console.log('   - event_type (ya no es necesario)');
    console.log('   - status (reemplazado por is_active)');
    console.log('   - start_time (no usado)');
    console.log('   - end_time (no usado)');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

simplifyEventsTable(); 