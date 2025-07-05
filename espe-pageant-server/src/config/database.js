/**
 * Database Configuration
 * @description Configuración y manejo de la conexión a PostgreSQL
 */

import { Pool } from 'pg';
import { ENV } from './environment.js';

/**
 * Pool de conexiones PostgreSQL
 */
export const pool = new Pool({
  host: ENV.DB_HOST,
  port: ENV.DB_PORT,
  database: ENV.DB_NAME,
  user: ENV.DB_USER,
  password: ENV.DB_PASSWORD,
  ssl: ENV.DB_SSL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

/**
 * Setup database connection
 * @returns {Promise<Object>} Pool instance
 */
export const setupDatabase = async () => {
  try {
    // Probar conexión
    const client = await pool.connect();
    console.log('✅ Conexión a base de datos establecida');
    console.log(`🗄️ Database: ${ENV.DB_NAME}@${ENV.DB_HOST}:${ENV.DB_PORT}`);
    client.release();
    return pool;
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error);
    throw error;
  }
};

/**
 * Ejecutar consulta SQL con manejo de errores
 * @param {string} query - Consulta SQL
 * @param {Array} params - Parámetros de la consulta
 * @returns {Promise<Object>} Resultado de la consulta
 */
export const executeQuery = async (query, params = []) => {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result;
  } finally {
    client.release();
  }
};

/**
 * Ejecutar transacción SQL
 * @param {Function} callback - Función que contiene las operaciones de la transacción
 * @returns {Promise<Object>} Resultado de la transacción
 */
export const executeTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Verificar conectividad de la base de datos
 * @returns {Promise<boolean>} True si la conexión es exitosa
 */
export const testConnection = async () => {
  try {
    const result = await executeQuery('SELECT NOW() as current_time, version() as version');
    console.log('✅ Database connection successful');
    console.log(`🕐 Current time: ${result.rows[0].current_time}`);
    console.log(`📊 PostgreSQL version: ${result.rows[0].version.split(' ').slice(0, 2).join(' ')}`);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

/**
 * Cerrar pool de conexiones
 */
export const closeConnection = async () => {
  try {
    await pool.end();
    console.log('📊 Database connection pool closed');
  } catch (error) {
    console.error('❌ Error closing database connection:', error.message);
  }
};

// Manejo de eventos del pool
pool.on('connect', (client) => {
  console.log('🔗 New database client connected');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err.message);
});

// Manejo graceful del cierre
process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, closing database connections...');
  closeConnection().then(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, closing database connections...');
  closeConnection().then(() => {
    process.exit(0);
  });
}); 