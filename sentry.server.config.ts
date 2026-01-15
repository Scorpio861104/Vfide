// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Debug mode in development
  debug: process.env.NODE_ENV === "development",

  // Environment
  environment: process.env.NODE_ENV,

  // Release version
  release: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",

  // Integrations for server-side
  integrations: [
    // Add profiling if needed
  ],

  // Filter out noisy errors
  ignoreErrors: [
    /^ECONNRESET$/,
    /^ECONNREFUSED$/,
    /^ETIMEDOUT$/,
    /^socket hang up$/,
  ],

  // Before sending an event, you can modify it here
  beforeSend(event, hint) {
    // Don't send events in development unless specifically enabled
    if (process.env.NODE_ENV === "development" && !process.env.SENTRY_DEBUG) {
      return null;
    }

    // Scrub sensitive data from server-side events
    if (event.request?.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["cookie"];
      delete event.request.headers["x-api-key"];
    }

    // Scrub environment variables that might leak
    if (event.extra) {
      const sensitiveKeys = [
        "DATABASE_URL",
        "API_KEY",
        "SECRET",
        "PASSWORD",
        "PRIVATE_KEY",
      ];
      for (const key of Object.keys(event.extra)) {
        if (sensitiveKeys.some((s) => key.toUpperCase().includes(s))) {
          delete event.extra[key];
        }
      }
    }

    return event;
  },
});
