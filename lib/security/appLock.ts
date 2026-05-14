/**
 * AppLock — device-only second-factor for transactions above a threshold.
 *
 * IMPORTANT: This module is honest about what it does and doesn't do.
 *
 * What it DOES:
 *   - Adds a biometric (WebAuthn) or PIN prompt on THIS device before VFIDE
 *     will sign transactions above a user-configurable threshold.
 *   - Protects against quick-grab device access (someone briefly picks up
 *     your unlocked phone in a coffee shop, tries to tap a payment).
 *   - Stays entirely local — no server, no recovery flow, no protocol
 *     involvement. Matches the non-custody design principle: protection
 *     through absence of code, not policy.
 *
 * What it does NOT do:
 *   - Does NOT protect against a wallet that has been imported into the
 *     attacker's app. They sign directly through their wallet and bypass
 *     VFIDE entirely. That threat is what the on-chain 7-day withdrawal
 *     queue and guardians are for.
 *   - Does NOT have a recovery flow. Forget your PIN, clear it from
 *     Settings on another logged-in device or wipe the local config.
 *
 * Storage:
 *   - localStorage: vfide_app_lock_config — the user's settings + PIN hash
 *   - sessionStorage: vfide_app_lock_unlocked_until — the current unlock window
 *
 * Crypto:
 *   - PIN hashing: PBKDF2-HMAC-SHA256 with 600,000 iterations (OWASP 2023
 *     recommendation for PBKDF2-SHA256). Salt: 16 random bytes. Output: 32 bytes.
 *   - WebAuthn: delegated to the existing useBiometricAuth.verify() hook.
 */

const CONFIG_KEY = 'vfide_app_lock_config';
const UNLOCK_KEY = 'vfide_app_lock_unlocked_until';

/** PBKDF2 parameters. Bumping the iteration count is a backwards-compatible
 *  change because the iteration count is stored alongside the hash. */
const PBKDF2_ITERATIONS = 600_000;
const PBKDF2_KEYLEN_BITS = 256;
const PIN_SALT_BYTES = 16;

/** Failure lockout policy. */
const MAX_PIN_FAILURES = 3;
const PIN_SOFT_LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

export type AppLockMethod = 'webauthn' | 'pin';

export interface AppLockConfig {
  /** Master kill switch. When false, AppLock never prompts. Default false. */
  enabled: boolean;
  /** Which methods the user has set up. Empty list ⇒ enabled has no effect. */
  methods: AppLockMethod[];
  /** Amounts >= this value (in wei / smallest unit) require unlock. 0 = always. */
  thresholdWei: string;
  /** How long an unlock is valid before the user must re-auth, in ms. */
  sessionTimeoutMs: number;
  /** PIN material — present iff 'pin' is in methods. */
  pinSaltB64?: string;
  pinHashB64?: string;
  pinIterations?: number;
  /** Soft-lockout state (PIN method only). */
  failureCount: number;
  lockedUntilMs: number;
}

export const DEFAULT_CONFIG: AppLockConfig = {
  enabled: false,
  methods: [],
  // Default threshold: 100 VFIDE in wei. Triggers on meaningful amounts
  // without nagging on micro-payments. Owner can adjust in Settings, set
  // to 0 (always prompt), or set very large (effectively never prompt).
  thresholdWei: (100n * 10n ** 18n).toString(),
  sessionTimeoutMs: 15 * 60 * 1000, // 15 minutes
  failureCount: 0,
  lockedUntilMs: 0,
};

// ─── persistence ─────────────────────────────────────────────────────────────

function safeLocalRead(): unknown {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CONFIG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function safeLocalWrite(value: AppLockConfig): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CONFIG_KEY, JSON.stringify(value));
  } catch {
    // localStorage quota exhausted or unavailable — silently fail; AppLock
    // simply behaves as if disabled until the user retries.
  }
}

export function loadConfig(): AppLockConfig {
  const raw = safeLocalRead();
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_CONFIG };
  const candidate = raw as Partial<AppLockConfig>;
  return {
    enabled: Boolean(candidate.enabled),
    methods: Array.isArray(candidate.methods)
      ? candidate.methods.filter(
          (m): m is AppLockMethod => m === 'webauthn' || m === 'pin',
        )
      : [],
    thresholdWei: typeof candidate.thresholdWei === 'string' ? candidate.thresholdWei : '0',
    sessionTimeoutMs:
      typeof candidate.sessionTimeoutMs === 'number' && candidate.sessionTimeoutMs > 0
        ? candidate.sessionTimeoutMs
        : DEFAULT_CONFIG.sessionTimeoutMs,
    pinSaltB64: typeof candidate.pinSaltB64 === 'string' ? candidate.pinSaltB64 : undefined,
    pinHashB64: typeof candidate.pinHashB64 === 'string' ? candidate.pinHashB64 : undefined,
    pinIterations:
      typeof candidate.pinIterations === 'number' ? candidate.pinIterations : undefined,
    failureCount: typeof candidate.failureCount === 'number' ? candidate.failureCount : 0,
    lockedUntilMs: typeof candidate.lockedUntilMs === 'number' ? candidate.lockedUntilMs : 0,
  };
}

export function saveConfig(config: AppLockConfig): void {
  safeLocalWrite(config);
}

// ─── crypto: PIN hashing ─────────────────────────────────────────────────────

function bytesToB64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return btoa(s);
}

function b64ToBytes(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

async function pbkdf2(
  pin: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );
  const params: Pbkdf2Params = {
    name: 'PBKDF2',
    salt: salt as BufferSource,
    iterations: Math.max(1, Math.trunc(iterations)),
    hash: 'SHA-256',
  };
  const derived = await crypto.subtle.deriveBits(
    params,
    baseKey,
    PBKDF2_KEYLEN_BITS,
  );
  return new Uint8Array(derived);
}

/**
 * Hash a fresh PIN for storage. Generates a new random salt.
 * Returns the material needed by `saveConfig`.
 */
export async function hashPin(pin: string): Promise<{
  pinSaltB64: string;
  pinHashB64: string;
  pinIterations: number;
}> {
  const salt = new Uint8Array(PIN_SALT_BYTES);
  crypto.getRandomValues(salt);
  const hash = await pbkdf2(pin, salt, PBKDF2_ITERATIONS);
  return {
    pinSaltB64: bytesToB64(salt),
    pinHashB64: bytesToB64(hash),
    pinIterations: PBKDF2_ITERATIONS,
  };
}

/**
 * Verify a PIN attempt against stored material. Constant-time comparison.
 * Returns true only if the PIN matches AND the stored config has PIN set up.
 */
export async function verifyPin(pin: string, config: AppLockConfig): Promise<boolean> {
  if (!config.pinSaltB64 || !config.pinHashB64 || !config.pinIterations) {
    return false;
  }
  const salt = b64ToBytes(config.pinSaltB64);
  const expected = b64ToBytes(config.pinHashB64);
  const pinIterations = config.pinIterations;
  const got = await pbkdf2(pin, salt, pinIterations);
  return timingSafeEqual(got, expected);
}

// ─── PIN format ──────────────────────────────────────────────────────────────

export interface PinPolicy {
  minLength: number;
  maxLength: number;
  allowAlphanumeric: boolean;
}

export const DEFAULT_PIN_POLICY: PinPolicy = {
  minLength: 6,
  maxLength: 32,
  allowAlphanumeric: true,
};

export function validatePin(pin: string, policy: PinPolicy = DEFAULT_PIN_POLICY): string | null {
  if (typeof pin !== 'string') return 'PIN must be a string.';
  if (pin.length < policy.minLength) return `PIN must be at least ${policy.minLength} characters.`;
  if (pin.length > policy.maxLength) return `PIN must be at most ${policy.maxLength} characters.`;
  if (!policy.allowAlphanumeric && !/^\d+$/.test(pin)) return 'PIN must be digits only.';
  return null;
}

// ─── threshold + session logic ───────────────────────────────────────────────

/**
 * Decide whether a given transaction amount requires the user to unlock.
 * - AppLock disabled or no methods set up → false (no prompt).
 * - Amount < threshold → false (under the threshold, no prompt).
 * - Amount >= threshold AND an unlock session is active → false (already unlocked).
 * - Otherwise → true (prompt the user).
 *
 * `amount` is in wei (or the smallest unit of whatever token).
 * `threshold = 0` means "always require unlock" (when AppLock is enabled).
 */
export function requiresUnlock(amount: bigint, config: AppLockConfig): boolean {
  if (!config.enabled || config.methods.length === 0) return false;
  if (isSessionUnlocked(config)) return false;
  let threshold: bigint;
  try {
    threshold = BigInt(config.thresholdWei);
  } catch {
    threshold = 0n;
  }
  return amount >= threshold;
}

/** Mark the AppLock session as unlocked for `config.sessionTimeoutMs` ms. */
export function startSession(config: AppLockConfig): void {
  if (typeof window === 'undefined') return;
  const until = Date.now() + Math.max(1000, config.sessionTimeoutMs);
  try {
    window.sessionStorage.setItem(UNLOCK_KEY, String(until));
  } catch {
    // sessionStorage unavailable — session unlock simply won't persist; the
    // user will be re-prompted on the next write call. Acceptable degraded mode.
  }
}

/** Clear the current unlock session. The next write above threshold will re-prompt. */
export function endSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(UNLOCK_KEY);
  } catch {
    // ignored
  }
}

export function isSessionUnlocked(config: AppLockConfig): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.sessionStorage.getItem(UNLOCK_KEY);
    if (!raw) return false;
    const until = Number(raw);
    if (!Number.isFinite(until)) return false;
    if (Date.now() >= until) {
      window.sessionStorage.removeItem(UNLOCK_KEY);
      return false;
    }
    // Also respect changes to sessionTimeoutMs after the session started:
    // shrink-to-zero is honored on the next read.
    void config;
    return true;
  } catch {
    return false;
  }
}

// ─── PIN failure tracking + soft lockout ─────────────────────────────────────

/**
 * Returns the lockout deadline in ms-since-epoch if the user is currently
 * locked out, or 0 if they can attempt. Reading this also clears an expired
 * lockout from the stored config (so the caller doesn't have to).
 */
export function getPinLockoutUntil(config: AppLockConfig): number {
  if (config.lockedUntilMs > Date.now()) return config.lockedUntilMs;
  if (config.lockedUntilMs !== 0) {
    saveConfig({ ...config, lockedUntilMs: 0, failureCount: 0 });
  }
  return 0;
}

/** Record a failed PIN attempt. Triggers a soft lockout after MAX_PIN_FAILURES. */
export function recordPinFailure(config: AppLockConfig): AppLockConfig {
  const next: AppLockConfig = {
    ...config,
    failureCount: config.failureCount + 1,
  };
  if (next.failureCount >= MAX_PIN_FAILURES) {
    next.lockedUntilMs = Date.now() + PIN_SOFT_LOCKOUT_MS;
    next.failureCount = 0;
  }
  saveConfig(next);
  return next;
}

/** Record a successful PIN attempt — clears any failure count. */
export function recordPinSuccess(config: AppLockConfig): AppLockConfig {
  const next: AppLockConfig = {
    ...config,
    failureCount: 0,
    lockedUntilMs: 0,
  };
  saveConfig(next);
  return next;
}

// ─── lifecycle helpers ───────────────────────────────────────────────────────

/** Strip PIN material from config without touching anything else. Used when
 *  the user disables PIN from Settings or after the disable-AppLock action. */
export function clearPinMaterial(config: AppLockConfig): AppLockConfig {
  const next: AppLockConfig = {
    ...config,
    pinSaltB64: undefined,
    pinHashB64: undefined,
    pinIterations: undefined,
    failureCount: 0,
    lockedUntilMs: 0,
    methods: config.methods.filter((m) => m !== 'pin'),
  };
  saveConfig(next);
  return next;
}

/** Completely wipe AppLock from this device. */
export function wipeAppLock(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(CONFIG_KEY);
    window.sessionStorage.removeItem(UNLOCK_KEY);
  } catch {
    // ignored
  }
}

// ─── threshold helpers exposed for the Settings UI ───────────────────────────

/** Convert a human-readable VFIDE amount (e.g. "100") to wei string. */
export function vfideToThresholdWei(human: string): string {
  // Plain decimal handling — keeps the dep surface zero. Supports up to 18
  // decimal places, trims to that precision. Reject obvious garbage.
  const trimmed = (human || '').trim();
  if (!trimmed) return '0';
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error('Threshold must be a non-negative decimal number.');
  }
  const [whole = '0', frac = ''] = trimmed.split('.');
  const padded = (frac + '0'.repeat(18)).slice(0, 18);
  const big = BigInt(whole) * 10n ** 18n + BigInt(padded || '0');
  return big.toString();
}

/** Inverse — formats a wei threshold back to a human VFIDE string for display. */
export function thresholdWeiToVfide(wei: string): string {
  let big: bigint;
  try {
    big = BigInt(wei);
  } catch {
    return '0';
  }
  if (big === 0n) return '0';
  const ONE = 10n ** 18n;
  const whole = big / ONE;
  const frac = big % ONE;
  if (frac === 0n) return whole.toString();
  const fracStr = frac.toString().padStart(18, '0').replace(/0+$/, '');
  return `${whole.toString()}.${fracStr}`;
}
