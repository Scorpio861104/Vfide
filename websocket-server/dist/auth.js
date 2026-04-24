"use strict";
/**
 * JWT authentication for WebSocket handshake.
 *
 * Reuses the same JWT_SECRET / PREV_JWT_SECRET rotation mechanism as the
 * HTTP API layer (lib/auth/jwt.ts), ensuring a single, audited token format
 * works across both transports.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyJWT = verifyJWT;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = require("crypto");
const JWT_ISSUER = 'vfide';
const JWT_AUDIENCE = 'vfide-app';
function requireSecret(name) {
    const val = process.env[name];
    if (!val)
        throw new Error(`Environment variable ${name} is not set`);
    return val;
}
const BLACKLIST_PREFIX = 'token:blacklist:';
async function upstashGet(key) {
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
    const data = (await response.json());
    const result = data.result;
    return typeof result === 'string' ? result : null;
}
async function ensureNotRevoked(token, payload) {
    const tokenHash = (0, crypto_1.createHash)('sha256').update(token).digest('hex');
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
        const parsed = JSON.parse(userRevokedRaw);
        revokedAt = Number(parsed.revokedAt ?? 0);
    }
    catch {
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
async function verifyJWT(token) {
    const secret = requireSecret('JWT_SECRET');
    const tryVerify = (s) => {
        const decoded = jsonwebtoken_1.default.verify(token, s, {
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE,
        });
        if (typeof decoded === 'string' || !decoded.address) {
            throw new Error('Invalid token payload');
        }
        return decoded;
    };
    try {
        const payload = tryVerify(secret);
        await ensureNotRevoked(token, payload);
        return payload;
    }
    catch (primaryErr) {
        const prevSecret = process.env.PREV_JWT_SECRET;
        if (prevSecret) {
            try {
                const payload = tryVerify(prevSecret);
                await ensureNotRevoked(token, payload);
                return payload;
            }
            catch {
                // Both secrets failed — fall through to throw the primary error
            }
        }
        throw primaryErr;
    }
}
