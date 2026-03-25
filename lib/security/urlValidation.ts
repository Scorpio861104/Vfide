/**
 * URL Validation Utilities
 * 
 * Provides safe URL validation and redirection to prevent open redirect vulnerabilities
 */

import { logger } from '@/lib/logger';

/**
 * List of allowed domains for redirects
 * In production, load from environment variables
 */
const ALLOWED_DOMAINS = [
  'vfide.io',
  'app.vfide.io',
  'testnet.vfide.io',
  'localhost',
  '127.0.0.1',
];

/**
 * List of allowed protocols for URLs
 */
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

/**
 * Validate if a URL is safe for redirect
 * @param url - URL to validate
 * @param allowRelative - Whether to allow relative URLs (default: true)
 * @returns true if URL is safe, false otherwise
 */
export function isUrlSafe(url: string, allowRelative: boolean = true): boolean {
  if (!url) return false;

  try {
    // Allow relative URLs if specified
    if (allowRelative && (url.startsWith('/') && !url.startsWith('//'))) {
      return true;
    }

    // Parse the URL
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'https://vfide.io');

    // Check protocol
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
      logger.warn(`[URL Validation] Blocked unsafe protocol: ${parsed.protocol}`);
      return false;
    }

    // For absolute URLs, check domain
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const hostname = parsed.hostname;
      
      // Check if domain is in allowed list
      const isAllowed = ALLOWED_DOMAINS.some(domain => {
        return hostname === domain || hostname.endsWith(`.${domain}`);
      });

      if (!isAllowed) {
        logger.warn(`[URL Validation] Blocked redirect to unauthorized domain: ${hostname}`);
        return false;
      }
    }

    return true;
  } catch (error) {
    logger.error('[URL Validation] Invalid URL format:', error);
    return false;
  }
}

/**
 * Safely redirect to a URL after validation
 * @param url - URL to redirect to
 * @param fallbackUrl - Fallback URL if validation fails (default: '/')
 */
export function safeRedirect(url: string, fallbackUrl: string = '/'): void {
  if (typeof window === 'undefined') {
    logger.warn('[URL Validation] Cannot redirect on server side');
    return;
  }

  const targetUrl = isUrlSafe(url) ? url : fallbackUrl;
  
  if (targetUrl !== url) {
    logger.warn(`[URL Validation] Redirect blocked, using fallback: ${fallbackUrl}`);
  }

  window.location.href = targetUrl;
}

/**
 * Safely assign a URL to window.location after validation
 * @param url - URL to assign
 * @param fallbackUrl - Fallback URL if validation fails (default: '/')
 */
export function safeLocationAssign(url: string, fallbackUrl: string = '/'): void {
  if (typeof window === 'undefined') {
    logger.warn('[URL Validation] Cannot assign location on server side');
    return;
  }

  const targetUrl = isUrlSafe(url) ? url : fallbackUrl;
  
  if (targetUrl !== url) {
    logger.warn(`[URL Validation] Location assignment blocked, using fallback: ${fallbackUrl}`);
  }

  window.location.assign(targetUrl);
}

/**
 * Validate and sanitize a notification action URL
 * @param actionUrl - Action URL from notification
 * @returns Safe URL or null if invalid
 */
export function validateNotificationUrl(actionUrl: string | undefined): string | null {
  if (!actionUrl) return null;

  // Notification URLs should always be relative or same-origin
  if (!isUrlSafe(actionUrl, true)) {
    logger.warn('[URL Validation] Notification action URL blocked:', { actionUrl });
    return null;
  }

  return actionUrl;
}

/**
 * Get allowed domains list (useful for configuration)
 */
export function getAllowedDomains(): readonly string[] {
  return ALLOWED_DOMAINS;
}

/**
 * Add a domain to the allowed list (runtime configuration)
 * Use with caution - only for trusted domains
 * @param domain - Domain to add
 */
export function addAllowedDomain(domain: string): void {
  if (!domain || domain.includes('*') || domain.includes('..')) {
    logger.error('[URL Validation] Invalid domain format:', new Error(domain));
    return;
  }

  if (!ALLOWED_DOMAINS.includes(domain)) {
    ALLOWED_DOMAINS.push(domain);
    logger.info('[URL Validation] Added allowed domain:', { domain });
  }
}
