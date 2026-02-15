import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { query as dbQuery } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';

const ALLOWED_TABLES = new Set([
  'analytics_events',
  'performance_metrics',
  'transactions',
  'notifications',
  'users',
  'activities',
]);

type QueryFilter = {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'between';
  value: string | number | string[] | number[] | { start: number; end: number };
};

type QueryPayload = {
  table: string;
  fields: string[];
  filters?: QueryFilter[];
  limit?: number;
  offset?: number;
  orderBy?: { field: string; direction: 'asc' | 'desc' }[];
};

const isSafeIdentifier = (value: string) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value);

export async function POST(request: NextRequest) {
  const rateLimit = await withRateLimit(request, 'read');
  if (rateLimit) return rateLimit;

  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = (await request.json()) as QueryPayload;
    const { table, fields, filters = [], limit = 50, offset = 0, orderBy = [] } = body;

    if (!table || !ALLOWED_TABLES.has(table)) {
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
    }

    if (!Array.isArray(fields) || fields.length === 0) {
      return NextResponse.json({ error: 'Fields required' }, { status: 400 });
    }

    if (!fields.every(isSafeIdentifier)) {
      return NextResponse.json({ error: 'Invalid field selection' }, { status: 400 });
    }

    const selectedFields = fields.join(', ');
    const whereClauses: string[] = [];
    const params: Array<string | number> = [];

    let invalidFilterError: string | null = null;

    filters.forEach((filter) => {
      if (!isSafeIdentifier(filter.field)) return;

      const paramIndex = params.length + 1;
      switch (filter.operator) {
        case 'equals':
          whereClauses.push(`${filter.field} = $${paramIndex}`);
          params.push(filter.value as string | number);
          break;
        case 'not_equals':
          whereClauses.push(`${filter.field} <> $${paramIndex}`);
          params.push(filter.value as string | number);
          break;
        case 'greater_than':
          whereClauses.push(`${filter.field} > $${paramIndex}`);
          params.push(filter.value as string | number);
          break;
        case 'less_than':
          whereClauses.push(`${filter.field} < $${paramIndex}`);
          params.push(filter.value as string | number);
          break;
        case 'contains': {
          // API-12 Fix: Escape LIKE wildcards to prevent pattern injection
          const escapedValue = String(filter.value).replace(/[%_\\]/g, '\\$&');
          whereClauses.push(`${filter.field} ILIKE $${paramIndex} ESCAPE '\\'`);
          params.push(`%${escapedValue}%`);
          break;
        }
        case 'in': {
          const values = Array.isArray(filter.value) ? filter.value : [];
          if (values.length === 0) {
            invalidFilterError = 'Invalid IN filter';
            return;
          }
          const placeholders = values.map((_, idx) => `$${paramIndex + idx}`);
          whereClauses.push(`${filter.field} IN (${placeholders.join(', ')})`);
          params.push(...values);
          break;
        }
        case 'between': {
          const range = filter.value as { start: number; end: number };
          if (typeof range?.start !== 'number' || typeof range?.end !== 'number') {
            invalidFilterError = 'Invalid BETWEEN filter';
            return;
          }
          const startIndex = paramIndex;
          const endIndex = paramIndex + 1;
          whereClauses.push(`${filter.field} BETWEEN $${startIndex} AND $${endIndex}`);
          params.push(range.start, range.end);
          break;
        }
      }
    });

    if (invalidFilterError) {
      return NextResponse.json({ error: invalidFilterError }, { status: 400 });
    }

    const orderClauses = orderBy
      .filter((item) => isSafeIdentifier(item.field))
      .map((item) => `${item.field} ${item.direction === 'desc' ? 'DESC' : 'ASC'}`);

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const orderSql = orderClauses.length > 0 ? `ORDER BY ${orderClauses.join(', ')}` : '';

    const limitValue = Math.min(Math.max(Number(limit) || 1, 1), 200);
    const offsetValue = Math.max(Number(offset) || 0, 0);

    params.push(limitValue, offsetValue);

    const sql = `SELECT ${selectedFields} FROM ${table} ${whereSql} ${orderSql} LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await dbQuery(sql, params);

    return NextResponse.json({
      rows: result.rows,
      limit: limitValue,
      offset: offsetValue,
    });
  } catch (error) {
    console.error('[Reporting Query] Error:', error);
    return NextResponse.json({ error: 'Failed to execute query' }, { status: 500 });
  }
}