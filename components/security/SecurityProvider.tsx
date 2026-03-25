/**
 * Security Provider Component
 * 
 * Initializes client-side security features including CSP reporting,
 * XSS monitoring, and security headers validation.
 */

'use client';

import { useEffect } from 'react';
import { initCSPReporting } from '@/lib/security';
import { logger } from '@/lib/logger';

export function SecurityProvider() {
  useEffect(() => {
    // Initialize CSP violation reporting
    initCSPReporting();

    // Log security initialization in development
    if (process.env.NODE_ENV === 'development') {
      // CSP reporting initialized
    }

    // Monitor for unsafe inline scripts (development warning)
    if (process.env.NODE_ENV === 'development') {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeName === 'SCRIPT' && (node as HTMLScriptElement).innerHTML) {
              logger.warn('[Security] Inline script detected:', {
                content: (node as HTMLScriptElement).innerHTML.slice(0, 100),
                location: window.location.href,
              });
            }
          });
        });
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });

      return () => observer.disconnect();
    }
    return undefined;
  }, []);

  // No UI, just security initialization
  return null;
}
