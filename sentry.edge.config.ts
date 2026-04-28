// This file configures the initialization of Sentry for edge features (Middleware, Edge API Routes, and Server Side Rendering).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

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

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  void import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn,

  // Performance Monitoring
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Debug mode in development
      debug: process.env.NODE_ENV === "development",

  // Environment
      environment: process.env.NODE_ENV,

  // Release version
      release: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",

  // Filter out noisy errors
      ignoreErrors: [
        /^ECONNRESET$/,
        /^ECONNREFUSED$/,
      ],

  // Before sending an event, you can modify it here
      beforeSend(event, _hint) {
        // Don't send events in development unless specifically enabled
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
  });
}
