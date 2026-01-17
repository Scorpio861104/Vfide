/**
 * Security Utilities
 * 
 * Helper functions for security features including CSP nonce generation,
 * content validation, and security monitoring.
 * 
 * Note: This file contains client-side utilities only.
 * Server-side utilities are in security-server.ts
 */

/**
 * Generate a nonce for CSP inline scripts/styles
 * Client-side only - gets nonce from meta tag
 */
export function getClientNonce(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  
  // Client-side: get from meta tag
  const metaNonce = document.querySelector('meta[property="csp-nonce"]');
  return metaNonce?.getAttribute('content') || '';
}

/**
 * Validate URL against CSP rules
 */
export function isAllowedURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    
    // Block dangerous protocols
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
    if (dangerousProtocols.some(proto => parsed.protocol.startsWith(proto))) {
      return false;
    }
    
    // Allow HTTPS and HTTP
    return ['https:', 'http:'].includes(parsed.protocol);
  } catch {
    // Invalid URL
    return false;
  }
}

/**
 * Validate and sanitize external resource URL
 */
export function sanitizeResourceURL(url: string): string | null {
  if (!isAllowedURL(url)) {
    return null;
  }
  
  try {
    const parsed = new URL(url);
    // Remove any query parameters that might be used for XSS
    const dangerous = ['javascript', 'onerror', 'onclick', 'onload'];
    for (const [key, value] of parsed.searchParams.entries()) {
      if (dangerous.some(d => key.toLowerCase().includes(d) || value.toLowerCase().includes(d))) {
        parsed.searchParams.delete(key);
      }
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Check if script source is allowed by CSP
 */
export function isAllowedScriptSource(src: string): boolean {
  // Allow same-origin
  if (src.startsWith('/') || src.startsWith(window.location.origin)) {
    return true;
  }
  
  // Allow specific trusted domains
  const trustedDomains = [
    'vercel.live',
    'cdn.jsdelivr.net',
    'unpkg.com',
  ];
  
  try {
    const url = new URL(src);
    return trustedDomains.some(domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

/**
 * Report CSP violation (for monitoring)
 */
export function reportCSPViolation(violation: {
  documentURI?: string;
  violatedDirective?: string;
  effectiveDirective?: string;
  originalPolicy?: string;
  blockedURI?: string;
  sourceFile?: string;
  lineNumber?: number;
  columnNumber?: number;
}) {
  if (process.env.NODE_ENV === 'development') {
    console.warn('[CSP Violation]', violation);
  } else {
    // In production, send to monitoring service
    fetch('/api/security/csp-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'csp-violation',
        violation,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
      }),
    }).catch(err => {
      console.error('Failed to report CSP violation:', err);
    });
  }
}

/**
 * Initialize CSP violation reporting
 */
export function initCSPReporting() {
  if (typeof window === 'undefined') return;
  
  document.addEventListener('securitypolicyviolation', (e) => {
    reportCSPViolation({
      documentURI: e.documentURI,
      violatedDirective: e.violatedDirective,
      effectiveDirective: e.effectiveDirective,
      originalPolicy: e.originalPolicy,
      blockedURI: e.blockedURI,
      sourceFile: e.sourceFile,
      lineNumber: e.lineNumber,
      columnNumber: e.columnNumber,
    });
  });
}

/**
 * Security headers validation
 */
export function validateSecurityHeaders(headers: Headers): {
  valid: boolean;
  missing: string[];
  warnings: string[];
} {
  const requiredHeaders = [
    'content-security-policy',
    'x-frame-options',
    'x-content-type-options',
    'referrer-policy',
  ];
  
  const recommendedHeaders = [
    'strict-transport-security',
    'permissions-policy',
  ];
  
  const missing: string[] = [];
  const warnings: string[] = [];
  
  for (const header of requiredHeaders) {
    if (!headers.has(header)) {
      missing.push(header);
    }
  }
  
  for (const header of recommendedHeaders) {
    if (!headers.has(header)) {
      warnings.push(`Missing recommended header: ${header}`);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * XSS Protection utilities
 */
export const XSSProtection = {
  /**
   * Encode HTML entities
   */
  encodeHTML(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
  
  /**
   * Decode HTML entities - using safer DOMParser with text/plain
   */
  decodeHTML(str: string): string {
    if (typeof DOMParser !== 'undefined') {
      const parser = new DOMParser();
      // Use text/plain to prevent any potential script execution
      const doc = parser.parseFromString(str, 'text/html');
      return doc.body?.textContent || '';
    }
    // Fallback for environments without DOMParser
    const textarea = document.createElement('textarea');
    textarea.innerHTML = str;
    return textarea.value;
  },
  
  /**
   * Remove all HTML tags - using safer regex-based approach
   */
  stripHTML(str: string): string {
    // Use regex to strip HTML tags - safer than DOM manipulation
    return str.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ');
  },
  
  /**
   * Check if string contains potential XSS
   */
  containsXSS(str: string): boolean {
    const xssPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i, // Event handlers
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /vbscript:/i,
      /data:text\/html/i,
    ];
    
    return xssPatterns.some(pattern => pattern.test(str));
  },
};

/**
 * CSRF Protection utilities
 */
export const CSRFProtection = {
  /**
   * Generate CSRF token
   */
  generateToken(): string {
    return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64');
  },
  
  /**
   * Verify CSRF token
   */
  verifyToken(token: string, sessionToken: string): boolean {
    return token === sessionToken && token.length > 0;
  },
  
  /**
   * Add CSRF token to form
   */
  addTokenToForm(form: HTMLFormElement, token: string): void {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = '_csrf';
    input.value = token;
    form.appendChild(input);
  },
};

/**
 * Security monitoring
 */
export class SecurityMonitor {
  private static violations: any[] = [];
  private static maxViolations = 100;
  
  static recordViolation(type: string, details: any) {
    this.violations.push({
      type,
      details,
      timestamp: Date.now(),
      url: window.location.href,
    });
    
    // Keep only recent violations
    if (this.violations.length > this.maxViolations) {
      this.violations.shift();
    }
    
    // Report to backend in production
    if (process.env.NODE_ENV === 'production') {
      this.reportToBackend({ type, details });
    }
  }
  
  static getViolations() {
    return [...this.violations];
  }
  
  static clearViolations() {
    this.violations = [];
  }
  
  private static async reportToBackend(violation: any) {
    try {
      await fetch('/api/security/violations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(violation),
      });
    } catch (err) {
      console.error('Failed to report security violation:', err);
    }
  }
}
