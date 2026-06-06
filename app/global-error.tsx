'use client';

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Keep the global error UI free of telemetry imports. Importing
    // @sentry/nextjs from this client boundary pulls the server Sentry,
    // Prisma, and OpenTelemetry tree into every page/error compilation in dev,
    // which made the frontend hit memory/disk limits before rendering.
    // The Sentry instrumentation files still initialize reporting when DSNs are
    // configured; this boundary must never make rendering depend on telemetry.
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          fontFamily: 'system-ui, sans-serif',
          background: '#09090b',
          color: '#fafafa'
        }}>
          <h2 style={{ marginBottom: '1rem' }}>Something went wrong!</h2>
          <button
            onClick={reset}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: '#3b82f6',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
