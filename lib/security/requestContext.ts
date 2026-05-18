import { createHash, randomUUID } from 'node:crypto';
import { isIP } from 'node:net';

const HASH_PREFIX_LENGTH = 24;
const TRUST_PROXY_ENV = 'VFIDE_TRUST_PROXY_HEADERS';

function firstHeaderValue(headers: Headers, name: string): string {
  const value = headers.get(name) || '';
  return value.split(',')[0]?.trim() || '';
}

function normalizeIpCandidate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Handle IPv4:port and [IPv6]:port forms.
  const withoutPort = trimmed.startsWith('[')
    ? trimmed.replace(/^\[([^\]]+)\](?::\d+)?$/, '$1')
    : trimmed.replace(/:\d+$/, '');

  const normalized = withoutPort.startsWith('::ffff:') ? withoutPort.slice(7) : withoutPort;
  return isIP(normalized) ? normalized : null;
}

function shouldTrustProxyHeaders(): boolean {
  const configured = process.env[TRUST_PROXY_ENV];
  if (configured === 'true') return true;
  if (configured === 'false') return false;

  // Fail closed in production unless explicitly configured.
  return process.env.NODE_ENV !== 'production';
}

export function getRequestIp(headers: Headers): { ip: string; source: string } {
  if (!shouldTrustProxyHeaders()) {
    return { ip: 'unknown', source: 'proxy-headers-untrusted' };
  }

  const cfConnectingIp = normalizeIpCandidate(firstHeaderValue(headers, 'cf-connecting-ip'));
  if (cfConnectingIp) {
    return { ip: cfConnectingIp, source: 'cf-connecting-ip' };
  }

  const trueClientIp = normalizeIpCandidate(firstHeaderValue(headers, 'true-client-ip'));
  if (trueClientIp) {
    return { ip: trueClientIp, source: 'true-client-ip' };
  }

  const forwarded = headers.get('x-forwarded-for') || '';
  if (forwarded) {
    for (const candidate of forwarded.split(',')) {
      const ip = normalizeIpCandidate(candidate);
      if (ip) {
        return { ip, source: 'x-forwarded-for' };
      }
    }
  }

  const realIp = normalizeIpCandidate(firstHeaderValue(headers, 'x-real-ip'));
  if (realIp) {
    return { ip: realIp, source: 'x-real-ip' };
  }

  return { ip: 'unknown', source: 'none' };
}

export function getRequestId(headers: Headers): string {
  const providedRequestId = headers.get('x-request-id')?.trim();
  if (providedRequestId) {
    return providedRequestId;
  }
  return randomUUID();
}

export function hashIp(ip: string): string {
  const salt = process.env.LOG_IP_HASH_SALT || '';
  const digest = createHash('sha256').update(`${salt}:${ip}`).digest('hex');
  return digest.slice(0, HASH_PREFIX_LENGTH);
}

export function getRequestCorrelationContext(headers: Headers): {
  requestId: string;
  ipHash: string;
  ipSource: string;
} {
  const { ip, source } = getRequestIp(headers);
  return {
    requestId: getRequestId(headers),
    ipHash: hashIp(ip),
    ipSource: source,
  };
}
