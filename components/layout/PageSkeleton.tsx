/**
 * PageSkeleton — generic loading skeleton for page-level Suspense fallbacks.
 *
 * Used in page.tsx Suspense boundaries to provide a consistent, on-brand
 * loading experience rather than a blank zinc-950 screen.
 * 
 * Vault has a custom skeleton; this covers all other pages.
 */
'use client';

interface PageSkeletonProps {
  /** Show a header bar placeholder (default true) */
  showHeader?: boolean;
  /** Show card placeholders. Pass count (default 3) */
  cards?: number;
  /** Show a full-width hero placeholder */
  showHero?: boolean;
}

export function PageSkeleton({
  showHeader = true,
  cards = 3,
  showHero = false,
}: PageSkeletonProps = {}) {
  return (
    <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] animate-pulse">
      <div className="container mx-auto px-4 max-w-6xl py-10">
        {showHero && (
          <div className="h-48 bg-white/5 rounded-2xl mb-8" />
        )}
        {showHeader && (
          <div className="mb-8 space-y-3">
            <div className="h-8 bg-white/5 rounded-xl w-48" />
            <div className="h-4 bg-white/5 rounded-lg w-80" />
          </div>
        )}
        {cards > 0 && (
          <div className={`grid gap-4 ${
            cards === 1 ? 'grid-cols-1' :
            cards === 2 ? 'grid-cols-1 md:grid-cols-2' :
            'grid-cols-1 md:grid-cols-3'
          }`}>
            {Array.from({ length: cards }).map((_, i) => (
              <div key={i} className="h-40 bg-white/5 rounded-2xl" />
            ))}
          </div>
        )}
        <div className="mt-6 h-64 bg-white/5 rounded-2xl" />
      </div>
    </div>
  );
}
