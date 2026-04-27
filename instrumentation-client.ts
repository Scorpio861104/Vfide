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

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  debug: process.env.NODE_ENV === "development",
  environment: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
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

    return event;
  },
});
