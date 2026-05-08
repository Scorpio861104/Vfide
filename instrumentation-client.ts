// Sentry client initialization entrypoint for Next.js 16+.
import * as Sentry from "@sentry/nextjs";

const SENSITIVE_HEADERS = [
  "authorization",
  "cookie",
  "x-api-key",
  "x-csrf-token",
  "x-auth-token",
  "x-vfide-alert-signature",
  "x-vfide-alert-timestamp",
  "proxy-authorization",
  "x-forwarded-for",
];

// F-FE-012 FIX: regex sets for wallet addresses, tx hashes, and ETH/USD
// amount-looking strings. These are scrubbed from breadcrumb messages,
// URLs, and any string fields that survive replay redaction so they
// cannot leak through Sentry to operators or via a Sentry breach.
const PII_REDACTION_RULES: Array<[RegExp, string]> = [
  [/0x[a-fA-F0-9]{40}/g, "[REDACTED_ADDRESS]"],
  [/0x[a-fA-F0-9]{64}/g, "[REDACTED_TX_HASH]"],
  // ENS names (best-effort, not exhaustive)
  [/\b[a-z0-9-]+\.eth\b/gi, "[REDACTED_ENS]"],
  // Long bigint amounts that look like wei values
  [/\b\d{15,}\b/g, "[REDACTED_AMOUNT]"],
];

function redactPii(input: string): string {
  let out = input;
  for (const [pattern, replacement] of PII_REDACTION_RULES) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  // F-FE-012 FIX: was 0.1 (10% of all sessions). For a financial / payment
  // app this still records 10% of users' wallets-in-action verbatim, which
  // is unacceptable PII volume. Drop to 0 in production — replays only on
  // explicit error. Operators who want session replay must opt in via
  // NEXT_PUBLIC_SENTRY_REPLAY_RATE env override AND ensure their consent
  // flow covers it.
  replaysSessionSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_REPLAY_RATE ?? 0),
  // Keep on-error replay (debug context for crashes), but with stronger
  // masking below. Operators can dial down via env if needed.
  replaysOnErrorSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_REPLAY_ERROR_RATE ?? 1.0),
  debug: process.env.NODE_ENV === "development",
  environment: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
      // F-FE-012 FIX: also mask network request/response bodies and headers
      // by default. Without these, fetch/XHR replay still records JSON
      // payloads containing addresses, amounts, and tx hashes.
      maskAllInputs: true,
      networkDetailAllowUrls: [],
      networkRequestHeaders: [],
      networkResponseHeaders: [],
    }),
  ],
  ignoreErrors: [
    /^ResizeObserver loop/,
    /^Script error\.?$/,
    /^NetworkError/,
    /^Failed to fetch/,
    /^AbortError/,
    /User rejected/,
    /User denied/,
  ],
  beforeBreadcrumb(breadcrumb) {
    // F-FE-012 FIX: scrub wallet addresses, tx hashes, ENS, and bigint
    // amounts from breadcrumb messages and URLs before they reach Sentry.
    if (breadcrumb.message) {
      breadcrumb.message = redactPii(breadcrumb.message);
    }
    if (breadcrumb.data && typeof breadcrumb.data === "object") {
      const data = breadcrumb.data as Record<string, unknown>;
      if (typeof data.url === "string") {
        data.url = redactPii(data.url);
      }
      if (typeof data.from === "string" && /^0x[a-fA-F0-9]{40}$/.test(data.from)) {
        data.from = "[REDACTED_ADDRESS]";
      }
      if (typeof data.to === "string" && /^0x[a-fA-F0-9]{40}$/.test(data.to)) {
        data.to = "[REDACTED_ADDRESS]";
      }
    }
    return breadcrumb;
  },
  beforeSend(event) {
    if (process.env.NODE_ENV === "development" && !process.env.SENTRY_DEBUG) {
      return null;
    }

    if (event.request?.headers) {
      for (const header of SENSITIVE_HEADERS) {
        delete event.request.headers[header];
        delete event.request.headers[header.toLowerCase()];
        delete event.request.headers[header.toUpperCase()];
      }
    }

    // F-FE-012 FIX: redact PII from request URL and any error message text.
    if (event.request?.url) {
      event.request.url = redactPii(event.request.url);
    }
    if (event.message) {
      event.message = redactPii(event.message);
    }
    if (event.exception?.values) {
      for (const ex of event.exception.values) {
        if (ex.value) ex.value = redactPii(ex.value);
      }
    }

    return event;
  },
});
