/**
 * Sanitization utilities using isomorphic-dompurify
 * 
 * This module provides XSS protection that works on both server and client.
 * Previously, DOMPurify was client-only, requiring a weak regex fallback on the server.
 * Now using isomorphic-dompurify for consistent, robust sanitization everywhere.
 * 
 * M-5 mitigation: DOMPurify now available server-side via isomorphic-dompurify
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize user input to prevent XSS attacks
 * Works on both server and client, providing consistent sanitization
 */
export function sanitizeInput(input: string, options?: {
  allowHTML?: boolean;
  allowedTags?: string[];
  allowedAttributes?: string[];
}): string {
  const {
    allowHTML = false,
    allowedTags = [],
    allowedAttributes = [],
  } = options || {};

  if (!allowHTML) {
    // Strip all HTML
    return DOMPurify.sanitize(input, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });
  }

  // Allow specific tags and attributes
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: allowedTags.length > 0 ? allowedTags : ['b', 'i', 'em', 'strong', 'a', 'br', 'p'],
    ALLOWED_ATTR: allowedAttributes.length > 0 ? allowedAttributes : ['href', 'target'],
  });
}

/**
 * Sanitize markdown-style input (allows basic formatting)
 */
export function sanitizeMarkdown(input: string): string {
  return sanitizeInput(input, {
    allowHTML: true,
    allowedTags: ['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li'],
    allowedAttributes: ['href', 'target', 'rel'],
  });
}

/**
 * Sanitize URL to prevent javascript: and data: URIs
 */
export function sanitizeURL(url: string): string {
  const trimmed = url.trim().toLowerCase();
  
  // Block dangerous protocols
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:')
  ) {
    return '';
  }

  // Allow https and relative URLs only
  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('./') ||
    trimmed.startsWith('../')
  ) {
    return url;
  }

  // Default to empty for unknown protocols
  return '';
}

/**
 * Validate and sanitize Ethereum address
 */
export function sanitizeAddress(address: string): string {
  const cleaned = address.trim();
  
  // Check if it's a valid Ethereum address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(cleaned)) {
    return '';
  }
  
  return cleaned.toLowerCase();
}

/**
 * Sanitize numeric input
 */
export function sanitizeNumber(input: string, options?: {
  min?: number;
  max?: number;
  decimals?: number;
}): string {
  const { min, max, decimals } = options || {};
  
  // Remove all non-numeric characters except decimal point
  let cleaned = input.replace(/[^\d.]/g, '');
  
  // Ensure only one decimal point
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }
  
  // Limit decimal places
  if (decimals !== undefined && parts.length === 2 && parts[0] !== undefined && parts[1] !== undefined) {
    cleaned = parts[0] + '.' + parts[1].substring(0, decimals);
  }
  
  const num = parseFloat(cleaned);
  
  // Apply min/max bounds
  if (!isNaN(num)) {
    if (min !== undefined && num < min) return min.toString();
    if (max !== undefined && num > max) return max.toString();
  }
  
  return cleaned;
}

/**
 * Sanitize file name to prevent path traversal
 */
export function sanitizeFileName(fileName: string): string {
  // Remove path traversal attempts
  let cleaned = fileName.replace(/\.\./g, '');
  
  // Remove path separators
  cleaned = cleaned.replace(/[\/\\]/g, '');
  
  // Remove special characters
  cleaned = cleaned.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  // Limit length
  if (cleaned.length > 255) {
    const ext = cleaned.split('.').pop() || '';
    const name = cleaned.substring(0, 250 - ext.length);
    cleaned = name + '.' + ext;
  }
  
  return cleaned;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize and validate email
 */
export function sanitizeEmail(email: string): string {
  const cleaned = email.trim().toLowerCase();
  return isValidEmail(cleaned) ? cleaned : '';
}
