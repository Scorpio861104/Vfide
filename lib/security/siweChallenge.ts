import { Redis } from '@upstash/redis';
import { isAddress } from 'viem';
import { getRequestIp as getRequestIpContext } from '@/lib/security/requestContext';
import { logger } from '@/lib/logger';

interface ChallengeRecord {
  nonce: string;
  address: string;
  domain: string;
  chainId: number;
  issuedAt: number;
  expiresAt: number;
}

function normalizeHost(value: string | null | undefined): string | null {
  if (!value) return null;

  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;

  try {
    return new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`).hostname.toLowerCase();
  } catch {
    return trimmed.split(':')[0] || null;
  }
}

function getConfiguredAuthHosts(): string[] {
  const hosts = [
    normalizeHost(process.env.APP_ORIGIN),
    normalizeHost(process.env.NEXT_PUBLIC_APP_URL),
  ].filter((host): host is string => Boolean(host));

  return Array.from(new Set(hosts));
}

export function resolveTrustedAuthDomain(headers: Headers): string | null {
  const requestHost = normalizeHost(headers.get('host'));
  const configuredHosts = getConfiguredAuthHosts();

  if (configuredHosts.length > 0) {
    if (requestHost && configuredHosts.includes(requestHost)) {
      return requestHost;
    }

    if (process.env.NODE_ENV !== 'production' && requestHost) {
      const isLocalHost = requestHost === 'localhost' || requestHost === '127.0.0.1';
      const isPreviewHost = requestHost.endsWith('.vercel.app');
      if (isLocalHost || isPreviewHost) {
        return requestHost;
      }
    }

    return null;
  }

  if (!requestHost) {
    return null;
  }

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return requestHost;
}

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const CHALLENGE_TTL_SECONDS = Math.floor(CHALLENGE_TTL_MS / 1000);
const CHALLENGE_PREFIX = 'auth:siwe:challenge:';
let redisClient: Redis | null | undefined;
const inMemoryChallenges = new Map<string, ChallengeRecord>();
let lastChallengePrune = Date.now();
const CHALLENGE_PRUNE_INTERVAL_MS = 2 * 60 * 1000;

function pruneExpiredChallenges(): void {
  const now = Date.now();
  if (now - lastChallengePrune < CHALLENGE_PRUNE_INTERVAL_MS) return;
  lastChallengePrune = now;

  for (const [key, record] of inMemoryChallenges) {
    if (now >= record.expiresAt) {
      inMemoryChallenges.delete(key);
    }
  }
}

function randomNonceHex(bytes = 16): string {
  const random = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(random, (b) => b.toString(16).padStart(2, '0')).join('');
}

function challengeKey(address: string): string {
  return `${CHALLENGE_PREFIX}${address.toLowerCase()}`;
}

function getRedisClient(): Redis | null {
  if (redisClient !== undefined) {
    return redisClient;
  }

  try {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      redisClient = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      return redisClient;
    }
  } catch (error) {
    logger.error('[SIWE Challenge] Failed to initialize Redis:', error as Error);
  }

  redisClient = null;
  return redisClient;
}

async function storeChallengeRecord(record: ChallengeRecord): Promise<void> {
  const redis = getRedisClient();
  const key = challengeKey(record.address);
  if (redis) {
    await redis.set(key, JSON.stringify(record), { ex: CHALLENGE_TTL_SECONDS });
    return;
  }

  pruneExpiredChallenges();
  inMemoryChallenges.set(key, record);
}

async function consumeChallengeRecord(address: string): Promise<ChallengeRecord | null> {
  const key = challengeKey(address);
  const redis = getRedisClient();
  if (redis) {
    const record = await redis.getdel<string>(key);
    return record ? JSON.parse(record) as ChallengeRecord : null;
  }

  const cached = inMemoryChallenges.get(key) ?? null;
  inMemoryChallenges.delete(key);
  return cached;
}

export function getRequestIp(headers: Headers): string {
  return getRequestIpContext(headers).ip;
}

export function buildSiweMessage(params: {
  domain: string;
  address: string;
  chainId: number;
  nonce: string;
  issuedAt: number;
  expiresAt: number;
}): string {
  return [
    `${params.domain} wants you to sign in with your Ethereum account:`,
    params.address,
    '',
    'Sign in to VFIDE',
    '',
    `URI: https://${params.domain}`,
    'Version: 1',
    `Chain ID: ${params.chainId}`,
    `Nonce: ${params.nonce}`,
    `Issued At: ${new Date(params.issuedAt).toISOString()}`,
    `Expiration Time: ${new Date(params.expiresAt).toISOString()}`,
  ].join('\n');
}

export async function createSiweChallenge(input: {
  address: string;
  domain: string;
  chainId: number;
  ip: string;
  userAgent: string;
}): Promise<{ message: string; nonce: string; expiresAt: number; issuedAt: number }> {
  if (!isAddress(input.address)) {
    throw new Error('Invalid address');
  }

  const issuedAt = Date.now();
  const expiresAt = issuedAt + CHALLENGE_TTL_MS;
  const nonce = randomNonceHex(16);
  const address = input.address.toLowerCase();

  const record: ChallengeRecord = {
    nonce,
    address,
    domain: input.domain,
    chainId: input.chainId,
    issuedAt,
    expiresAt,
  };

  await storeChallengeRecord(record);

  return {
    message: buildSiweMessage({
      domain: input.domain,
      address,
      chainId: input.chainId,
      nonce,
      issuedAt,
      expiresAt,
    }),
    nonce,
    expiresAt,
    issuedAt,
  };
}

function parseField(message: string, field: string): string | null {
  const match = message.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'));
  return match?.[1]?.trim() || null;
}

export async function consumeAndValidateSiweChallenge(input: {
  address: string;
  message: string;
  domain: string;
  chainId: number;
  ip: string;
  userAgent: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const address = input.address.toLowerCase();
  const record = await consumeChallengeRecord(address);

  if (!record) {
    return { ok: false, error: 'Challenge not found. Request a new challenge.' };
  }

  if (Date.now() > record.expiresAt) {
    return { ok: false, error: 'Challenge expired. Request a new challenge.' };
  }

  if (record.domain !== input.domain) {
    return { ok: false, error: 'Challenge domain mismatch' };
  }

  if (record.chainId !== input.chainId) {
    return { ok: false, error: 'Challenge chain mismatch' };
  }

  const messageNonce = parseField(input.message, 'Nonce');
  const messageChain = parseField(input.message, 'Chain ID');
  const messageExpiry = parseField(input.message, 'Expiration Time');

  if (!messageNonce || messageNonce !== record.nonce) {
    return { ok: false, error: 'Nonce mismatch' };
  }

  if (!messageChain || Number.parseInt(messageChain, 10) !== record.chainId) {
    return { ok: false, error: 'Chain ID mismatch' };
  }

  if (!messageExpiry || Number.isNaN(Date.parse(messageExpiry))) {
    return { ok: false, error: 'Invalid expiration time in message' };
  }

  if (Date.now() > Date.parse(messageExpiry)) {
    return { ok: false, error: 'Message expired' };
  }

  const expectedPrefix = `${input.domain} wants you to sign in with your Ethereum account:`;
  if (!input.message.startsWith(expectedPrefix)) {
    return { ok: false, error: 'Domain binding mismatch' };
  }

  if (!input.message.includes(`\n${address}\n`)) {
    return { ok: false, error: 'Address mismatch in message' };
  }

  return { ok: true };
}
