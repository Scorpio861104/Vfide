/**
 * JWT authentication for WebSocket handshake.
 *
 * Reuses the same JWT_SECRET / PREV_JWT_SECRET rotation mechanism as the
 * HTTP API layer (lib/auth/jwt.ts), ensuring a single, audited token format
 * works across both transports.
 */

import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';

export interface JWTPayload {
  address: string;
  chainId?: number;
  iat?: number;
  exp?: number;
}

const JWT_ISSUER = 'vfide';
const JWT_AUDIENCE = 'vfide-app';

function requireSecret(name: string): string {
  const val = process.env[name];
  if (val && val.trim() !== '') return val;

  const filePath = process.env[`${name}_FILE`];
  if (filePath && filePath.trim() !== '') {
    try {
      const fromFile = readFileSync(filePath, 'utf8').trim();
      if (fromFile) return fromFile;
    } catch (error) {
      throw new Error(`Failed reading ${name}_FILE (${filePath}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(`Environment variable ${name} or ${name}_FILE is not set`);
}

function readOptionalSecret(name: string): string | null {
  const direct = process.env[name];
  if (direct && direct.trim() !== '') return direct;

  const filePath = process.env[`${name}_FILE`];
  if (!filePath || filePath.trim() === '') return null;

  try {
    const fromFile = readFileSync(filePath, 'utf8').trim();
    return fromFile || null;
  } catch (error) {
    throw new Error(`Failed reading ${name}_FILE (${filePath}): ${error instanceof Error ? error.message : String(error)}`);
  }
}

const BLACKLIST_PREFIX = 'token:blacklist:';

type UpstashGetResponse = { result?: string | null };

async function upstashGet(key: string): Promise<string | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Token revocation requires Upstash Redis in production');
    }
    return null;
  }

  const endpoint = `${url.replace(/\/$/, '')}/get/${encodeURIComponent(key)}`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Upstash get failed: HTTP ${response.status}`);
  }

  const data = (await response.json()) as UpstashGetResponse;
  const result = data.result;
  return typeof result === 'string' ? result : null;
}

async function ensureNotRevoked(token: string, payload: JWTPayload): Promise<void> {
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const tokenKey = `${BLACKLIST_PREFIX}${tokenHash}`;
  const tokenRevoked = await upstashGet(tokenKey);
  if (tokenRevoked !== null) {
    throw new Error('Token revoked');
  }

  const userKey = `${BLACKLIST_PREFIX}user:${payload.address.toLowerCase()}`;
  const userRevokedRaw = await upstashGet(userKey);
  if (!userRevokedRaw) {
    return;
  }

  let revokedAt = 0;
  try {
    const parsed = JSON.parse(userRevokedRaw) as { revokedAt?: number };
    revokedAt = Number(parsed.revokedAt ?? 0);
  } catch {
    throw new Error('Invalid user revocation payload');
  }

  const issuedAt = Number(payload.iat ?? 0);
  if (revokedAt > issuedAt) {
    throw new Error('User tokens revoked after this token was issued');
  }
}

/**
 * Verify a JWT string.  Accepts tokens signed with either JWT_SECRET or
 * PREV_JWT_SECRET (rotation window support).
 *
 * @throws {Error} if the token is invalid, expired, or uses an unknown secret.
 */
export async function verifyJWT(token: string): Promise<JWTPayload> {
  const secret = requireSecret('JWT_SECRET');

  const tryVerify = (s: string): JWTPayload => {
    const decoded = jwt.verify(token, s, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    if (typeof decoded === 'string' || !decoded.address) {
      throw new Error('Invalid token payload');
    }
    return decoded as JWTPayload;
  };

  try {
    const payload = tryVerify(secret);
    await ensureNotRevoked(token, payload);
    return payload;
  } catch (primaryErr) {
    const prevSecret = readOptionalSecret('PREV_JWT_SECRET');
    if (prevSecret) {
      try {
        const payload = tryVerify(prevSecret);
        await ensureNotRevoked(token, payload);
        return payload;
      } catch {
        // Both secrets failed — fall through to throw the primary error
      }
    }
    throw primaryErr;
  }
}
