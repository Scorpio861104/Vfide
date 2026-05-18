import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const DEFAULT_MAX_SKEW_SECONDS = 300;
const MAX_ALLOWED_SKEW_SECONDS = 3600;
const SIGNATURE_VERSION = 'v1';

export interface VerifyWebhookSignatureParams {
  body: string;
  signatureHeader: string | null | undefined;
  timestampHeader: string | null | undefined;
  secret: string;
  nowMs?: number;
  maxSkewSeconds?: number;
}

export interface VerifyWebhookSignatureResult {
  valid: boolean;
  reason?: string;
  replayKey?: string;
  timestamp?: number;
}

function parsePositiveInt(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function resolveMaxSkewSeconds(maxSkewSeconds: number | undefined): number {
  if (maxSkewSeconds === undefined) return DEFAULT_MAX_SKEW_SECONDS;
  if (!Number.isFinite(maxSkewSeconds)) return DEFAULT_MAX_SKEW_SECONDS;

  const normalized = Math.floor(maxSkewSeconds);
  if (normalized <= 0) return DEFAULT_MAX_SKEW_SECONDS;
  return Math.min(normalized, MAX_ALLOWED_SKEW_SECONDS);
}

function parseVersionedSignature(raw: string): { version: string; digest: string } | null {
  const trimmed = raw.trim();
  const parts = trimmed.split('=');
  if (parts.length !== 2) return null;

  const version = parts[0]?.trim();
  const digest = parts[1]?.trim().toLowerCase();
  if (!version || !digest) return null;
  if (!/^[a-f0-9]{64}$/.test(digest)) return null;

  return { version, digest };
}

function buildExpectedDigest(secret: string, timestampSeconds: number, body: string): string {
  return createHmac('sha256', secret).update(`${timestampSeconds}.${body}`).digest('hex');
}

function buildReplayKey(timestampSeconds: number, digest: string): string {
  return createHash('sha256').update(`${timestampSeconds}:${digest}`).digest('hex');
}

export function verifySignedWebhook(params: VerifyWebhookSignatureParams): VerifyWebhookSignatureResult {
  const secret = params.secret?.trim();
  if (!secret) {
    return { valid: false, reason: 'Missing webhook secret' };
  }

  if (!params.signatureHeader || !params.timestampHeader) {
    return { valid: false, reason: 'Missing signature headers' };
  }

  const parsedTimestamp = parsePositiveInt(params.timestampHeader);
  if (parsedTimestamp === null) {
    return { valid: false, reason: 'Invalid timestamp header' };
  }

  const parsedSignature = parseVersionedSignature(params.signatureHeader);
  if (!parsedSignature) {
    return { valid: false, reason: 'Invalid signature header format' };
  }

  if (parsedSignature.version !== SIGNATURE_VERSION) {
    return { valid: false, reason: 'Unsupported signature version' };
  }

  const nowMs = Number.isFinite(params.nowMs) ? Math.floor(params.nowMs as number) : Date.now();
  const maxSkewSeconds = resolveMaxSkewSeconds(params.maxSkewSeconds);
  const nowSeconds = Math.floor(nowMs / 1000);
  const skew = Math.abs(nowSeconds - parsedTimestamp);

  if (skew > maxSkewSeconds) {
    return { valid: false, reason: 'Timestamp outside allowed skew window' };
  }

  const expectedDigest = buildExpectedDigest(secret, parsedTimestamp, params.body);
  const actualBuffer = Buffer.from(parsedSignature.digest, 'hex');
  const expectedBuffer = Buffer.from(expectedDigest, 'hex');

  if (actualBuffer.length !== expectedBuffer.length) {
    return { valid: false, reason: 'Invalid signature length' };
  }

  const valid = timingSafeEqual(actualBuffer, expectedBuffer);
  if (!valid) {
    return { valid: false, reason: 'Invalid signature' };
  }

  return {
    valid: true,
    timestamp: parsedTimestamp,
    replayKey: buildReplayKey(parsedTimestamp, parsedSignature.digest),
  };
}
