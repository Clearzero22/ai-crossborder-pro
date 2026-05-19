import type { IDatabaseDriver, DriverConfig } from './types';
import { SqliteDriver } from './sqlite-driver';
import { PostgresDriver } from './postgres-driver';

export type { IDatabaseDriver, QueryResult, DriverConfig } from './types';

export function createDatabaseDriver(type: 'postgres' | 'sqlite', config: DriverConfig): IDatabaseDriver {
  switch (type) {
    case 'sqlite':
      return new SqliteDriver(config);
    case 'postgres':
      return new PostgresDriver(config);
    default:
      throw new Error(`Unknown database driver: ${type}`);
  }
}
