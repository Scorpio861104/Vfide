import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

type SecurityEventType = 'auth_fail' | 'auth_success' | 'key_rotate' | 'payment_high_risk';

interface SecurityEvent {
  ts: number;
  ip: string;
  type: SecurityEventType;
  amount?: number;
}

interface LockRecord {
  until: number;
  reason: string;
}

type SecurityLockSeverity = 'medium' | 'high' | 'critical';

const WINDOW_MS = 10 * 60 * 1000;
const LOCK_MS = 30 * 60 * 1000;
const RETENTION_MS = 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const LOCK_READ_RETRIES = 5;

const securityEvents = new Map<string, SecurityEvent[]>();
const accountLocks = new Map<string, LockRecord>();
let lastCleanupTs = 0;

function keyFor(address: string): string {
  return address.toLowerCase();
}

function prune(events: SecurityEvent[], now: number): SecurityEvent[] {
  return events.filter((e) => now - e.ts <= WINDOW_MS);
}

export async function getAccountLock(address: string): Promise<LockRecord | null> {
  const key = keyFor(address);
  const memoryLock = accountLocks.get(key);
  if (memoryLock && Date.now() < memoryLock.until) {
    return memoryLock;
  }

  if (memoryLock && Date.now() >= memoryLock.until) {
    accountLocks.delete(key);
  }

  try {
    for (let attempt = 0; attempt < LOCK_READ_RETRIES; attempt += 1) {
      const dbLockResult = await query<{ until_ts: string; reason: string }>(
        `SELECT until_ts::text, reason
         FROM security_account_locks
         WHERE address = $1
         LIMIT 1`,
        [key]
      );

      const dbLock = dbLockResult.rows[0];
      if (!dbLock) {
        if (attempt === LOCK_READ_RETRIES - 1) {
          return null;
        }
        continue;
      }

      const untilMs = Date.parse(dbLock.until_ts);
      if (!Number.isFinite(untilMs) || Date.now() >= untilMs) {
        await query('DELETE FROM security_account_locks WHERE address = $1', [key]);
        accountLocks.delete(key);
        return null;
      }

      const hydrated = { until: untilMs, reason: dbLock.reason };
      accountLocks.set(key, hydrated);
      return hydrated;
    }

    return null;
  } catch {
    // Fallback to memory if DB is unavailable.
    return memoryLock ?? null;
  }
}

export async function isAccountLocked(address: string): Promise<boolean> {
  return (await getAccountLock(address)) !== null;
}

export async function lockAccount(address: string, reason: string): Promise<void> {
  const key = keyFor(address);
  const until = Date.now() + LOCK_MS;
  accountLocks.set(key, { until, reason });

  try {
    await query(
      `INSERT INTO security_account_locks (address, until_ts, reason, updated_at)
       VALUES ($1, to_timestamp($2 / 1000.0), $3, NOW())
       ON CONFLICT (address)
       DO UPDATE SET
         until_ts = EXCLUDED.until_ts,
         reason = EXCLUDED.reason,
         updated_at = NOW()`,
      [key, until, reason]
    );
  } catch {
    // Memory lock still protects the current runtime when DB persistence fails.
  }
}

async function maybeRunSecurityDataCleanup(nowMs: number): Promise<void> {
  if (nowMs - lastCleanupTs < CLEANUP_INTERVAL_MS) {
    return;
  }

  lastCleanupTs = nowMs;

  try {
    await query(
      `DELETE FROM security_account_events
       WHERE ts < NOW() - INTERVAL '24 hours'`
    );
    await query(
      `DELETE FROM security_account_locks
       WHERE until_ts < NOW()`
    );
  } catch {
    // Cleanup is best-effort and must never break request flow.
  }
}

function resolveLockSeverity(params: {
  failedAuth: number;
  keyRotations: number;
  highRiskPayments: number;
  distinctIps: number;
}): SecurityLockSeverity {
  if (params.failedAuth >= 10 || params.keyRotations >= 6 || params.highRiskPayments >= 5 || params.distinctIps >= 5) {
    return 'critical';
  }
  if (params.failedAuth >= 5 || params.keyRotations >= 4 || params.highRiskPayments >= 3 || params.distinctIps >= 3) {
    return 'high';
  }
  return 'medium';
}

async function lockWithEscalation(params: {
  address: string;
  reason: string;
  signal: SecurityEventType;
  failedAuth: number;
  keyRotations: number;
  highRiskPayments: number;
  distinctIps: number;
}): Promise<{ locked: boolean; reason: string; severity: SecurityLockSeverity; signal: SecurityEventType }> {
  await lockAccount(params.address, params.reason);
  const severity = resolveLockSeverity(params);

  logger.warn('security.account_locked', {
    address: params.address,
    reason: params.reason,
    severity,
    signal: params.signal,
    failedAuth: params.failedAuth,
    keyRotations: params.keyRotations,
    highRiskPayments: params.highRiskPayments,
    distinctIps: params.distinctIps,
    securityEvent: 'account_locked',
  });

  return {
    locked: true,
    reason: params.reason,
    severity,
    signal: params.signal,
  };
}

export async function recordSecurityEvent(address: string, event: SecurityEvent): Promise<{ locked: boolean; reason?: string; severity?: SecurityLockSeverity; signal?: SecurityEventType }> {
  const key = keyFor(address);
  const now = Date.now();
  const existing = prune(securityEvents.get(key) || [], now);
  existing.push(event);
  securityEvents.set(key, existing);

  // Keep in-memory footprint bounded to security retention horizon.
  securityEvents.set(
    key,
    existing.filter((e) => now - e.ts <= RETENTION_MS)
  );

  let failedAuth = existing.filter((e) => e.type === 'auth_fail').length;
  let keyRotations = existing.filter((e) => e.type === 'key_rotate').length;
  let highRiskPayments = existing.filter((e) => e.type === 'payment_high_risk').length;
  let distinctIps = new Set(existing.map((e) => e.ip)).size;

  try {
    await maybeRunSecurityDataCleanup(now);

    await query(
      `INSERT INTO security_account_events (address, ts, ip, type, amount)
       VALUES ($1, to_timestamp($2 / 1000.0), $3, $4, $5)`,
      [key, event.ts, event.ip, event.type, event.amount ?? null]
    );

    const aggregate = await query<{
      failed_auth: string;
      key_rotations: string;
      high_risk_payments: string;
      distinct_ips: string;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE type = 'auth_fail')::text AS failed_auth,
         COUNT(*) FILTER (WHERE type = 'key_rotate')::text AS key_rotations,
         COUNT(*) FILTER (WHERE type = 'payment_high_risk')::text AS high_risk_payments,
         COUNT(DISTINCT ip)::text AS distinct_ips
       FROM security_account_events
       WHERE address = $1
         AND ts >= NOW() - INTERVAL '10 minutes'`,
      [key]
    );

    const row = aggregate.rows[0];
    if (row) {
      failedAuth = Number.parseInt(row.failed_auth || '0', 10);
      keyRotations = Number.parseInt(row.key_rotations || '0', 10);
      highRiskPayments = Number.parseInt(row.high_risk_payments || '0', 10);
      distinctIps = Number.parseInt(row.distinct_ips || '0', 10);
    }

  } catch {
    // Fall back to in-memory counters when DB persistence is unavailable.
  }

  if (failedAuth >= 5) {
    return lockWithEscalation({
      address,
      reason: 'Too many failed authentication attempts',
      signal: 'auth_fail',
      failedAuth,
      keyRotations,
      highRiskPayments,
      distinctIps,
    });
  }

  if (keyRotations >= 4) {
    return lockWithEscalation({
      address,
      reason: 'Rapid key rotation detected',
      signal: 'key_rotate',
      failedAuth,
      keyRotations,
      highRiskPayments,
      distinctIps,
    });
  }

  if (highRiskPayments >= 3 && distinctIps >= 2) {
    return lockWithEscalation({
      address,
      reason: 'Suspicious high-risk payment pattern detected',
      signal: 'payment_high_risk',
      failedAuth,
      keyRotations,
      highRiskPayments,
      distinctIps,
    });
  }

  if (distinctIps >= 3) {
    return lockWithEscalation({
      address,
      reason: 'Impossible travel / IP anomaly detected',
      signal: event.type,
      failedAuth,
      keyRotations,
      highRiskPayments,
      distinctIps,
    });
  }

  return { locked: false };
}

export async function clearAuthFailureSignals(address: string): Promise<void> {
  const key = keyFor(address);
  const now = Date.now();
  const existing = prune(securityEvents.get(key) || [], now).filter((e) => e.type !== 'auth_fail');
  securityEvents.set(key, existing);

  try {
    await query(
      `DELETE FROM security_account_events
       WHERE address = $1
         AND type = 'auth_fail'`,
      [key]
    );
  } catch {
    // Ignore DB failures; in-memory state was already cleared.
  }
}

export function getStepUpAndCooldownPolicy(amount: number): {
  isHighRisk: boolean;
  requiresStepUp: boolean;
  requiresDelay: boolean;
  cooldownSeconds: number;
  hardwareWalletRecommended: boolean;
} {
  if (amount >= 100000) {
    return {
      isHighRisk: true,
      requiresStepUp: true,
      requiresDelay: true,
      cooldownSeconds: 24 * 60 * 60,
      hardwareWalletRecommended: true,
    };
  }

  if (amount >= 25000) {
    return {
      isHighRisk: true,
      requiresStepUp: true,
      requiresDelay: true,
      cooldownSeconds: 2 * 60 * 60,
      hardwareWalletRecommended: true,
    };
  }

  return {
    isHighRisk: false,
    requiresStepUp: false,
    requiresDelay: false,
    cooldownSeconds: 0,
    hardwareWalletRecommended: false,
  };
}
