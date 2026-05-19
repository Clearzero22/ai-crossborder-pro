import { Pool } from 'pg';
import type { IDatabaseDriver, QueryResult, DriverConfig } from './types';

const DEFAULT_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'crawler_db',
  user: process.env.DB_USER || 'crawler',
  password: process.env.DB_PASS || 'crawler_pass',
};

export class PostgresDriver implements IDatabaseDriver {
  readonly driverName = 'postgres' as const;
  private pool: Pool;

  constructor(config: DriverConfig) {
    this.pool = new Pool((config.pgConfig || DEFAULT_CONFIG) as any);
  }

  async connect(): Promise<void> {
    const client = await this.pool.connect();
    client.release();
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
  }

  async query(sql: string, params: unknown[] = []): Promise<QueryResult> {
    const result = await this.pool.query(sql, params as any[]);
    return { rows: result.rows as Record<string, unknown>[], rowCount: result.rowCount ?? 0 };
  }
}
