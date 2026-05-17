export interface QueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
}

export interface DriverConfig {
  pgConfig?: Record<string, unknown>;
  sqlitePath?: string;
}

export interface IDatabaseDriver {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  query(sql: string, params?: unknown[]): Promise<QueryResult>;
  readonly driverName: 'postgres' | 'sqlite';
}
