// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

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

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session Replay
  replaysSessionSampleRate: 0.1, // 10% of sessions for replay
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

  // Debug mode in development
  debug: process.env.NODE_ENV === "development",

  // Environment
  environment: process.env.NODE_ENV,

  // Release version
  release: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",

  // Integrations
  integrations: [
    Sentry.replayIntegration({
      // Additional SDK configuration goes in here
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Filter out noisy errors
  ignoreErrors: [
    // Browser extensions
    /^ResizeObserver loop/,
    /^Script error\.?$/,
    // Network errors that are expected
    /^NetworkError/,
    /^Failed to fetch/,
    // User aborted requests
    /^AbortError/,
    // Metamask/wallet errors that are user-initiated
    /User rejected/,
    /User denied/,
  ],

  // Before sending an event, you can modify it here
  beforeSend(event, _hint) {
    // Don't send events in development unless specifically enabled
    if (process.env.NODE_ENV === "development" && !process.env.SENTRY_DEBUG) {
      return null;
    }

    // Scrub sensitive data
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
