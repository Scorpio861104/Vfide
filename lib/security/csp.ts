/**
 * Shared CSP utilities.
 *
 * `proxy.ts` is the single runtime enforcement point, while these helpers keep
 * policy construction centralized for tests and deployment validation.
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

export function buildCsp(nonce: string, env: NodeJS.ProcessEnv = process.env): string {
  const connectSrc = getConnectSrcAllowlist(env);

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
    "frame-ancestors 'none'",
    ...(env.NODE_ENV === 'production' ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}

export function generateNonce(): string {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
}
