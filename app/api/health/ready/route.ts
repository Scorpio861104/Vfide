/**
 * Deep Readiness Probe
 *
 * OP-4 FIX: The shallow `/api/health` endpoint only checks env vars are set.
 * It does NOT verify the dependencies the application actually needs to
 * serve traffic — DB, Redis, indexer freshness, contract addresses with
 * code on chain. A merchant whose checkout is silently broken because
 * Redis is down would not show as a health failure under the old probe.
 *
 * This endpoint is the dependency-aware readiness probe. Use it as the
 * load-balancer readiness check; keep `/api/health` as the cheap liveness
 * check.
 *
 * Returns 200 if every probed dependency is healthy.
 * Returns 503 if ANY critical dependency is unhealthy.
 * Always returns the `checks` map so an operator hitting the endpoint
 * directly can see WHICH dependency is unhealthy.
 *
 * Critical dependencies (block 503):
 *   - DB connectivity (`SELECT 1`)
 *   - Redis (rate limiter — fail-closed in production means a Redis
 *     outage = full site outage anyway, so we surface it explicitly)
 *
 * Soft dependencies (warning only, do not block):
 *   - Indexer last-block freshness (warn if older than 5 minutes)
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const INDEXER_FRESHNESS_WARN_SECONDS = 5 * 60; // 5 min

type CheckResult = {
  ok: boolean;
  detail?: string;
  ms?: number;
};

async function checkDb(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const { query } = await import('@/lib/db');
    await query('SELECT 1');
    return { ok: true, ms: Date.now() - start };
  } catch (e) {
    return {
      ok: false,
      detail: e instanceof Error ? e.message : 'unknown DB error',
      ms: Date.now() - start,
    };
  }
}

async function checkRedis(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      // Not configured — soft pass with warning detail.
      return {
        ok: true,
        detail: 'redis not configured (in-memory fallback in use)',
        ms: 0,
      };
    }
    // Direct REST PING via fetch keeps this independent of upstash SDK.
    const resp = await fetch(`${url}/ping`, {
      headers: { Authorization: `Bearer ${token}` },
      // Tight timeout so a slow Redis doesn't hold up the readiness check
      signal: AbortSignal.timeout(2000),
    });
    if (!resp.ok) {
      return {
        ok: false,
        detail: `redis ping returned ${resp.status}`,
        ms: Date.now() - start,
      };
    }
    return { ok: true, ms: Date.now() - start };
  } catch (e) {
    return {
      ok: false,
      detail: e instanceof Error ? e.message : 'unknown redis error',
      ms: Date.now() - start,
    };
  }
}

async function checkIndexer(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const { query } = await import('@/lib/db');
    const result = await query<{ last_block: string | number | null; updated_at: Date | null }>(
      `SELECT value AS last_block, updated_at FROM indexer_state WHERE key = 'last_block' LIMIT 1`,
    );
    const row = result.rows[0];
    if (!row || row.last_block == null) {
      // No indexer entry yet — soft warn but do not 503 (clean install case)
      return {
        ok: true,
        detail: 'no indexer state yet',
        ms: Date.now() - start,
      };
    }
    const updated = row.updated_at ? new Date(row.updated_at) : null;
    if (!updated) {
      return { ok: true, detail: 'indexer updated_at null', ms: Date.now() - start };
    }
    const ageSeconds = Math.floor((Date.now() - updated.getTime()) / 1000);
    if (ageSeconds > INDEXER_FRESHNESS_WARN_SECONDS) {
      return {
        ok: true, // soft — do not 503 on stale indexer
        detail: `indexer last update ${ageSeconds}s ago (threshold ${INDEXER_FRESHNESS_WARN_SECONDS}s)`,
        ms: Date.now() - start,
      };
    }
    return { ok: true, ms: Date.now() - start };
  } catch (e) {
    return {
      ok: true, // soft — DB issues already surface in checkDb
      detail: e instanceof Error ? e.message : 'unknown indexer error',
      ms: Date.now() - start,
    };
  }
}

export async function GET(_request: NextRequest) {
  const [db, redis, indexer] = await Promise.all([
    checkDb(),
    checkRedis(),
    checkIndexer(),
  ]);

  const criticalFail = !db.ok || !redis.ok;
  const status = criticalFail ? 503 : 200;
  const summary = criticalFail ? 'unready' : 'ready';

  if (criticalFail) {
    logger.warn('[Readiness] Critical dependency failure', {
      db: db.ok ? 'ok' : db.detail,
      redis: redis.ok ? 'ok' : redis.detail,
    });
  }

  return NextResponse.json(
    {
      ok: !criticalFail,
      status: summary,
      checks: {
        db,
        redis,
        indexer,
      },
    },
    { status },
  );
}
