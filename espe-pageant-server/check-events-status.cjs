const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'reinas2025',
  user: 'postgres',
  password: 'admin',
  ssl: false,
});

async function checkEventsStatus() {
  try {
    console.log('📋 Verificando estado de eventos...\n');

    const result = await pool.query(`
      SELECT 
        id, 
        name, 
        event_type, 
        status, 
        is_active, 
        is_mandatory, 
        weight, 
        bonus_percentage,
        created_at
      FROM events 
      ORDER BY created_at DESC
    `);

    if (result.rows.length === 0) {
      console.log('❌ No hay eventos en la base de datos');
      return;
    }

    console.log(`📊 Encontrados ${result.rows.length} eventos:\n`);

    result.rows.forEach((event, index) => {
      console.log(`${index + 1}. ${event.name}`);
      console.log(`   🆔 ID: ${event.id}`);
      console.log(`   📂 Tipo: ${event.event_type}`);
      console.log(`   📊 Estado: ${event.status}`);
      console.log(`   🔄 Activo: ${event.is_active ? '✅ SÍ' : '❌ NO'}`);
      console.log(`   📋 Obligatorio: ${event.is_mandatory ? '✅ SÍ' : '❌ NO'}`);
      console.log(`   ⚖️ Peso: ${event.weight}%`);
      console.log(`   🎁 Bonus: ${event.bonus_percentage}%`);
      console.log(`   📅 Creado: ${new Date(event.created_at).toLocaleString()}`);
      console.log('');
    });

    // Estadísticas
    const activeEvents = result.rows.filter(e => e.is_active);
    const inactiveEvents = result.rows.filter(e => !e.is_active);
    const mandatoryEvents = result.rows.filter(e => e.is_mandatory);
    const optionalEvents = result.rows.filter(e => !e.is_mandatory);

    console.log('📈 ESTADÍSTICAS:');
    console.log(`   Total eventos: ${result.rows.length}`);
    console.log(`   Eventos activos: ${activeEvents.length}`);
    console.log(`   Eventos inactivos: ${inactiveEvents.length}`);
    console.log(`   Eventos obligatorios: ${mandatoryEvents.length}`);
    console.log(`   Eventos opcionales: ${optionalEvents.length}`);

    if (mandatoryEvents.length > 0) {
      const totalWeight = mandatoryEvents.reduce((sum, e) => sum + parseFloat(e.weight || 0), 0);
      console.log(`   Peso total obligatorios: ${totalWeight}%`);
      console.log(`   ¿Peso válido?: ${Math.abs(totalWeight - 100) < 0.01 ? '✅ SÍ' : '❌ NO'}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkEventsStatus(); 