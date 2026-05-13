'use client';

/**
 * Re-export of the canonical hook in @/hooks/usePrefersReducedMotion.
 *
 * Several files under app/components import from this local path; the
 * canonical home was hoisted to /hooks so global chrome components
 * (ProtocolTicker, MonumentCorner) can share it. Keeping this stub
 * in place avoids touching every callsite at once.
 */

export { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
