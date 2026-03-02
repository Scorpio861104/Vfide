/**
 * JWT authentication for WebSocket handshake.
 *
 * Reuses the same JWT_SECRET / PREV_JWT_SECRET rotation mechanism as the
 * HTTP API layer (lib/auth/jwt.ts), ensuring a single, audited token format
 * works across both transports.
 */

import jwt from 'jsonwebtoken';

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
  if (!val) throw new Error(`Environment variable ${name} is not set`);
  return val;
}

/**
 * Verify a JWT string.  Accepts tokens signed with either JWT_SECRET or
 * PREV_JWT_SECRET (rotation window support).
 *
 * @throws {Error} if the token is invalid, expired, or uses an unknown secret.
 */
export function verifyJWT(token: string): JWTPayload {
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
    return tryVerify(secret);
  } catch (primaryErr) {
    const prevSecret = process.env.PREV_JWT_SECRET;
    if (prevSecret) {
      try {
        return tryVerify(prevSecret);
      } catch {
        // Both secrets failed — fall through to throw the primary error
      }
    }
    throw primaryErr;
  }
}
