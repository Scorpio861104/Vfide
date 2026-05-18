/**
 * Shared CSP utilities.
 *
 * `proxy.ts` is the single runtime enforcement point (Next.js 16 native convention,
 * formerly `middleware.ts` in Next.js ≤15). These helpers keep policy construction
 * centralized for tests and deployment validation.
 */

function protocolHost(value: string): string {
  const parsed = new URL(value);
  return `${parsed.protocol}//${parsed.host}`;
}

export function asOrigin(value: string | undefined): string | null {
  if (!value || value.trim() === '') return null;

  try {
    return protocolHost(value);
  } catch {
    return null;
  }
}

export function getConnectSrcAllowlist(env: NodeJS.ProcessEnv = process.env): string {
  const allowlist = new Set<string>([
    "'self'",
    'https://*.walletconnect.com',
    'https://*.walletconnect.org',
    'wss://*.walletconnect.com',
    'wss://*.walletconnect.org',
  ]);

  const configuredOrigins = [
    asOrigin(env.NEXT_PUBLIC_RPC_URL),
    asOrigin(env.RPC_URL),
    asOrigin(env.NEXT_PUBLIC_API_URL),
    asOrigin(env.NEXT_PUBLIC_WEBSOCKET_URL),
    asOrigin(env.NEXT_PUBLIC_WS_URL),
    asOrigin(env.NEXT_PUBLIC_APP_URL),
    asOrigin(env.NEXT_PUBLIC_EXPLORER_URL),
    asOrigin(env.NEXT_PUBLIC_SENTRY_DSN),
  ];

  for (const origin of configuredOrigins) {
    if (origin) {
      allowlist.add(origin);
    }
  }

  if (env.NODE_ENV !== 'production') {
    allowlist.add('http://localhost:*');
    allowlist.add('ws://localhost:*');
    allowlist.add('http://127.0.0.1:*');
    allowlist.add('ws://127.0.0.1:*');
  }

  return [...allowlist].join(' ');
}

export interface BuildCspOptions {
  /**
   * F-FE-004 FIX: when true, emit frame-ancestors that allows merchant pages
   * to embed this route via iframe. Without this, the entire embed feature
   * is DOA — proxy.ts X-Frame-Options:DENY plus this CSP frame-ancestors:none
   * make /embed routes un-embeddable in any parent.
   *
   * Operators can tighten by setting NEXT_PUBLIC_EMBED_ALLOWED_ANCESTORS to a
   * space-separated list (e.g. "https://*.merchantsite.com https://shop.example.io").
   * When unset, defaults to "https:" — any HTTPS parent. Defense-in-depth still
   * applies via per-merchant API auth: an attacker can frame a customer's checkout
   * widget but cannot mint orders on the merchant's behalf without the merchant's
   * signed key/JWT.
   */
  embeddable?: boolean;
}

export function buildCsp(
  nonce: string,
  options: BuildCspOptions = {},
  env: NodeJS.ProcessEnv = process.env,
): string {
  const connectSrc = getConnectSrcAllowlist(env);

  // F-FE-004 FIX: path-aware frame-ancestors. Embeddable routes get a
  // permissive (but HTTPS-only) ancestor allowlist; everything else stays
  // 'none' (default deny).
  let frameAncestors: string;
  if (options.embeddable) {
    const explicit = (env.NEXT_PUBLIC_EMBED_ALLOWED_ANCESTORS ?? '').trim();
    frameAncestors = explicit.length > 0 ? `frame-ancestors ${explicit}` : "frame-ancestors https:";
  } else {
    frameAncestors = "frame-ancestors 'none'";
  }

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://vercel.live https://*.walletconnect.com https://*.walletconnect.org`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src ${connectSrc}`,
    "frame-src 'self' https://*.walletconnect.com",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    frameAncestors,
    ...(env.NODE_ENV === 'production' ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}

export function generateNonce(): string {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
}
