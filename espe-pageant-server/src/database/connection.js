import pkg from 'pg';
const { Pool } = pkg;
import { config } from '../config/config.js';

// Create the pool instance
export const pool = new Pool(config.database);

export async function setupDatabase() {
  try {
    // Probar conexión
    const client = await pool.connect();
    console.log('✅ Conexión a base de datos establecida');
    client.release();
    return pool;
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error);
    throw error;
  }
}

export async function executeQuery(query, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result;
  } finally {
    client.release();
  }
} 