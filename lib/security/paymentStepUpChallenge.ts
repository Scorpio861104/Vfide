import crypto from 'crypto';
import { Redis } from '@upstash/redis';
import { verifyMessage } from 'viem';
import { logger } from '@/lib/logger';

interface StepUpChallengeRecord {
  nonce: string;
  address: string;
  payloadHash: string;
  issuedAt: number;
  expiresAt: number;
}

const CHALLENGE_TTL_MS = 30 * 60 * 1000;
const CHALLENGE_TTL_SECONDS = Math.floor(CHALLENGE_TTL_MS / 1000);
const PREFIX = 'auth:stepup:payment:';

let redisClient: Redis | null | undefined;
const inMemoryChallenges = new Map<string, StepUpChallengeRecord>();

function getRedisClient(): Redis | null {
  if (redisClient !== undefined) return redisClient;
  try {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      redisClient = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      return redisClient;
    }
  } catch (error) {
    logger.error('[PaymentStepUp] Failed to init Redis:', error as Error);
  }
  redisClient = null;
  return redisClient;
}

function challengeKey(address: string, nonce: string): string {
  return `${PREFIX}${address.toLowerCase()}:${nonce}`;
}

export function buildPaymentStepUpPayloadHash(input: {
  fromUserId: number;
  toUserId: number;
  amount: string;
  token: string;
}): string {
  const canonical = `${input.fromUserId}|${input.toUserId}|${input.amount}|${input.token.toUpperCase()}`;
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

export function buildPaymentStepUpMessage(input: {
  address: string;
  nonce: string;
  payloadHash: string;
  issuedAt: number;
  expiresAt: number;
}): string {
  return [
    'VFIDE high-risk payment request step-up',
    `Address: ${input.address.toLowerCase()}`,
    `Nonce: ${input.nonce}`,
    `Payload: ${input.payloadHash}`,
    `Issued At: ${new Date(input.issuedAt).toISOString()}`,
    `Expiration Time: ${new Date(input.expiresAt).toISOString()}`,
  ].join('\n');
}

export async function createPaymentStepUpChallenge(input: {
  address: string;
  payloadHash: string;
}): Promise<{ nonce: string; message: string; issuedAt: number; expiresAt: number }> {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + CHALLENGE_TTL_MS;
  const nonce = crypto.randomBytes(16).toString('hex');

  const record: StepUpChallengeRecord = {
    nonce,
    address: input.address.toLowerCase(),
    payloadHash: input.payloadHash,
    issuedAt,
    expiresAt,
  };

  const key = challengeKey(record.address, nonce);
  const redis = getRedisClient();
  if (redis) {
    await redis.set(key, JSON.stringify(record), { ex: CHALLENGE_TTL_SECONDS });
  } else {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Payment step-up challenge storage requires Redis in production');
    }
    inMemoryChallenges.set(key, record);
  }

  return {
    nonce,
    message: buildPaymentStepUpMessage({
      address: record.address,
      nonce,
      payloadHash: record.payloadHash,
      issuedAt,
      expiresAt,
    }),
    issuedAt,
    expiresAt,
  };
}

async function getChallengeRecord(address: string, nonce: string): Promise<StepUpChallengeRecord | null> {
  const key = challengeKey(address.toLowerCase(), nonce);
  const redis = getRedisClient();
  if (redis) {
    const raw = await redis.get<string>(key);
    return raw ? (JSON.parse(raw) as StepUpChallengeRecord) : null;
  }
  return inMemoryChallenges.get(key) ?? null;
}

async function consumeChallengeRecord(address: string, nonce: string): Promise<void> {
  const key = challengeKey(address.toLowerCase(), nonce);
  const redis = getRedisClient();
  if (redis) {
    await redis.getdel<string>(key);
    return;
  }
  inMemoryChallenges.delete(key);
}

export async function validateAndConsumePaymentStepUpChallenge(input: {
  address: string;
  nonce: string;
  signature: `0x${string}`;
  payloadHash: string;
  minAgeSeconds?: number;
}): Promise<{ ok: true } | { ok: false; error: string; cooldownSeconds?: number }> {
  const address = input.address.toLowerCase();
  const record = await getChallengeRecord(address, input.nonce);
  if (!record) {
    return { ok: false, error: 'Step-up challenge not found. Request a new challenge.' };
  }

  const now = Date.now();
  if (now > record.expiresAt) {
    await consumeChallengeRecord(address, input.nonce);
    return { ok: false, error: 'Step-up challenge expired. Request a new challenge.' };
  }

  if (record.payloadHash !== input.payloadHash) {
    return { ok: false, error: 'Step-up challenge does not match this payment request.' };
  }

  const minAgeMs = (input.minAgeSeconds ?? 0) * 1000;
  if (minAgeMs > 0 && now < record.issuedAt + minAgeMs) {
    const remaining = Math.ceil((record.issuedAt + minAgeMs - now) / 1000);
    return {
      ok: false,
      error: 'High-risk payment request requires delay acknowledgement window.',
      cooldownSeconds: remaining,
    };
  }

  const message = buildPaymentStepUpMessage({
    address,
    nonce: record.nonce,
    payloadHash: record.payloadHash,
    issuedAt: record.issuedAt,
    expiresAt: record.expiresAt,
  });

  const verified = await verifyMessage({
    address: address as `0x${string}`,
    message,
    signature: input.signature,
  });

  if (!verified) {
    return { ok: false, error: 'Invalid step-up signature.' };
  }

  await consumeChallengeRecord(address, input.nonce);
  return { ok: true };
}
