/**
 * Sentry Error Tracking Integration
 * 
 * Provides real-time error monitoring, performance tracking,
 * and user session replay for production debugging.
 */

import * as Sentry from '@sentry/nextjs';

// Initialize Sentry only if DSN is provided
const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const environment = process.env.NODE_ENV || 'development';
const isProduction = environment === 'production';

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    
    // Environment
    environment,
    
    // Release version (from package.json or git)
    release: process.env.NEXT_PUBLIC_APP_VERSION || 'development',
    
    // Performance monitoring
    tracesSampleRate: isProduction ? 0.1 : 1.0, // 10% in prod, 100% in dev
    
    // Session replay
    replaysSessionSampleRate: isProduction ? 0.1 : 0, // 10% in prod, disabled in dev
    replaysOnErrorSampleRate: 1.0, // 100% when errors occur
    
    // Integrations
    integrations: [
      new Sentry.BrowserTracing({
        // Track page loads and navigations
        tracePropagationTargets: [
          'localhost',
          /^https:\/\/.*\.vercel\.app/,
          /^https:\/\/vfide\.com/,
        ],
      }),
      new Sentry.Replay({
        // Mask all text content for privacy
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    
    // Filter out specific errors
    beforeSend(event, hint) {
      const error = hint.originalException;
      
      // Filter out common browser extension errors
      if (
        error &&
        typeof error === 'object' &&
        'message' in error &&
        typeof error.message === 'string'
      ) {
        if (
          error.message.includes('ResizeObserver loop') ||
          error.message.includes('Non-Error promise rejection captured')
        ) {
          return null;
        }
      }
      
      return event;
    },
    
    // Add custom tags
    initialScope: {
      tags: {
        'app.version': process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
        'app.build': process.env.NEXT_PUBLIC_BUILD_ID || 'unknown',
      },
    },
  });
}

// Export helper functions for manual error tracking
export function captureException(error: Error, context?: Record<string, any>) {
  if (SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: context,
    });
  } else {
    console.error('Error:', error, context);
  }
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  if (SENTRY_DSN) {
    Sentry.captureMessage(message, level);
  } else {
    console.log(`[${level}]`, message);
  }
}

export function setUser(user: { id: string; email?: string; username?: string }) {
  if (SENTRY_DSN) {
    Sentry.setUser(user);
  }
}

export function clearUser() {
  if (SENTRY_DSN) {
    Sentry.setUser(null);
  }
}

// Export Sentry for advanced usage
export { Sentry };
