import { Pool } from 'pg';
import { config } from '../config/environment';

export const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.database,
  user: config.database.user,
  password: config.database.password,
  ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('[Postgres Pool] Unexpected error on idle client:', err);
});

export async function closePool(): Promise<void> {
  await pool.end();
}
