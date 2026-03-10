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

const WINDOW_MS = 10 * 60 * 1000;
const LOCK_MS = 30 * 60 * 1000;

const securityEvents = new Map<string, SecurityEvent[]>();
const accountLocks = new Map<string, LockRecord>();

function keyFor(address: string): string {
  return address.toLowerCase();
}

function prune(events: SecurityEvent[], now: number): SecurityEvent[] {
  return events.filter((e) => now - e.ts <= WINDOW_MS);
}

export function getAccountLock(address: string): LockRecord | null {
  const lock = accountLocks.get(keyFor(address));
  if (!lock) return null;
  if (Date.now() >= lock.until) {
    accountLocks.delete(keyFor(address));
    return null;
  }
  return lock;
}

export function isAccountLocked(address: string): boolean {
  return getAccountLock(address) !== null;
}

export function lockAccount(address: string, reason: string): void {
  accountLocks.set(keyFor(address), { until: Date.now() + LOCK_MS, reason });
}

export function recordSecurityEvent(address: string, event: SecurityEvent): { locked: boolean; reason?: string } {
  const key = keyFor(address);
  const now = Date.now();
  const existing = prune(securityEvents.get(key) || [], now);
  existing.push(event);
  securityEvents.set(key, existing);

  const failedAuth = existing.filter((e) => e.type === 'auth_fail').length;
  const keyRotations = existing.filter((e) => e.type === 'key_rotate').length;
  const highRiskPayments = existing.filter((e) => e.type === 'payment_high_risk').length;
  const distinctIps = new Set(existing.map((e) => e.ip)).size;

  if (failedAuth >= 5) {
    lockAccount(address, 'Too many failed authentication attempts');
    return { locked: true, reason: 'Too many failed authentication attempts' };
  }

  if (keyRotations >= 4) {
    lockAccount(address, 'Rapid key rotation detected');
    return { locked: true, reason: 'Rapid key rotation detected' };
  }

  if (highRiskPayments >= 3 && distinctIps >= 2) {
    lockAccount(address, 'Suspicious high-risk payment pattern detected');
    return { locked: true, reason: 'Suspicious high-risk payment pattern detected' };
  }

  if (distinctIps >= 3) {
    lockAccount(address, 'Impossible travel / IP anomaly detected');
    return { locked: true, reason: 'Impossible travel / IP anomaly detected' };
  }

  return { locked: false };
}

export function clearAuthFailureSignals(address: string): void {
  const key = keyFor(address);
  const now = Date.now();
  const existing = prune(securityEvents.get(key) || [], now).filter((e) => e.type !== 'auth_fail');
  securityEvents.set(key, existing);
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
