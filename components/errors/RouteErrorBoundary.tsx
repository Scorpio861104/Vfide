'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { logger } from '@/lib/logger';
import { Button, buttonVariants } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface RouteErrorBoundaryProps {
  /** The page heading shown to users (e.g. "Sanctum Error"). */
  title: string;
  /** The body text shown beneath the heading. String or any ReactNode (for dynamic content like `error.message`). */
  message: ReactNode;
  /** The error received by Next.js error.tsx. */
  error: Error & { digest?: string };
  /** The reset callback received by Next.js error.tsx. */
  reset: () => void;
  /**
   * Optional override for the logger.error prefix. Defaults to `${title} route error:`.
   * Use when the title is too user-friendly for log search (e.g. "Sanctum content unavailable"
   * but you want "Sanctum" in logs).
   */
  loggerScope?: string;
  /**
   * Optional extra content rendered between the message and the action buttons.
   * Use for page-specific guidance (e.g. "Your funds are safe — only the UI failed").
   */
  extraContent?: ReactNode;
}

/**
 * RouteErrorBoundary — VFIDE's canonical error.tsx body.
 *
 * Tier 3 Round 2 (2026-05-17). Built to consolidate the 96 near-identical
 * error boundaries across `app/`. Each route's `error.tsx` becomes ~12 LOC
 * (declare title + message + delegate) instead of the previous ~49 LOC of
 * duplicated layout chrome.
 *
 * Usage in any route's `app/<route>/error.tsx`:
 *
 *   'use client';
 *   import { RouteErrorBoundary } from '@/components/errors/RouteErrorBoundary';
 *
 *   export default function MyRouteError(props: {
 *     error: Error & { digest?: string };
 *     reset: () => void;
 *   }) {
 *     return (
 *       <RouteErrorBoundary
 *         {...props}
 *         title="My Route Error"
 *         message="My route failed to load. Please retry."
 *       />
 *     );
 *   }
 *
 * The boundary handles:
 *   • The error logging effect (via `lib/logger`)
 *   • Layout chrome (centered card with AlertTriangle icon)
 *   • The error digest display (when Next.js provides one)
 *   • Retry button (canonical Button primary) + Home link (canonical outline)
 */
export function RouteErrorBoundary({
  title,
  message,
  error,
  reset,
  loggerScope,
  extraContent,
}: RouteErrorBoundaryProps) {
  useEffect(() => {
    logger.error(`${loggerScope ?? title} route error:`, error);
  }, [error, loggerScope, title]);

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        <div className="w-20 h-20 mx-auto bg-red-600/20 border-2 border-red-600 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="w-10 h-10 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-100 mb-3">{title}</h1>
        <p className="text-zinc-400 mb-2">{message}</p>
        {error.digest && (
          <p className="text-sm text-zinc-400 mb-6 font-mono">Error ID: {error.digest}</p>
        )}
        {extraContent && <div className="mb-6">{extraContent}</div>}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="primary"
            size="lg"
            onClick={reset}
            leftIcon={<RefreshCw size={16} />}
          >
            Retry
          </Button>
          <Link
            href="/"
            className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}
          >
            <Home size={16} />
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
