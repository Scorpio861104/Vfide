/**
 * Database-specific TypeScript type definitions
 */

// ============================================================================
// Base Model Types
// ============================================================================

export interface DatabaseModel {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SoftDeleteModel extends DatabaseModel {
  deletedAt: Date | null;
}

// ============================================================================
// Query Types
// ============================================================================

export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
  fields: QueryField[];
}

export interface QueryField {
  name: string;
  tableID: number;
  columnID: number;
  dataTypeID: number;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export interface WhereClause {
  field: string;
  operator: WhereOperator;
  value: unknown;
}

export type WhereOperator = '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN' | 'NOT IN';

// ============================================================================
// Migration Types
// ============================================================================

export interface MigrationRecord extends DatabaseModel {
  name: string;
  executedAt: Date;
  checksum: string;
}

export interface Migration {
  name: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

export interface MigrationStatus {
  name: string;
  applied: boolean;
  executedAt?: Date;
}

// ============================================================================
// Connection Types
// ============================================================================

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  maxConnections?: number;
}

export interface ConnectionPool {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
}
