// backend/db/index.ts
/**
 * Database connection module
 * Provides PostgreSQL connection pool for dashboard services
 */

import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://amazon:password@localhost:5433/amazon_crawler';

// Create connection pool
export const pool = new Pool({
  connectionString: DATABASE_URL,
});

// Handle connection errors
pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

// Test connection
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    client.release();
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.warn('⚠️  Database connection failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function closePool(): Promise<void> {
  await pool.end();
  console.log('Database pool closed');
}
