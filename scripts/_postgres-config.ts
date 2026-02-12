import { PoolConfig } from 'pg';

/**
 * Shared PostgreSQL config for migration scripts.
 * Uses safe local defaults only (no remote host / hardcoded secrets).
 */
export function getPostgresConfig(): PoolConfig {
  return {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'kanban',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
  };
}

